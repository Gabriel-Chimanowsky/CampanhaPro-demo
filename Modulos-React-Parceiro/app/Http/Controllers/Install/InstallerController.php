<?php

namespace App\Http\Controllers\Install;

use App\Http\Controllers\Controller;
use App\Services\Installation\DatabaseConnectionTester;
use App\Services\Installation\InstallationRunner;
use App\Services\Installation\InstallationState;
use App\Services\Installation\ServerRequirementChecker;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Throwable;

class InstallerController extends Controller
{
    public function __construct(
        protected InstallationState $state,
    ) {}

    public function index(): RedirectResponse
    {
        $this->abortIfInstalled();

        return redirect()->route('install.requirements');
    }

    public function requirements(ServerRequirementChecker $checker): View
    {
        $this->abortIfInstalled();

        return view('install.requirements', [
            'checks' => $checker->checks(),
            'hasBlockingFailures' => $checker->hasBlockingFailures(),
            'currentStep' => 'requirements',
        ]);
    }

    public function environment(Request $request, ServerRequirementChecker $checker): View|RedirectResponse
    {
        $this->abortIfInstalled();

        if ($checker->hasBlockingFailures()) {
            return redirect()->route('install.requirements');
        }

        return view('install.environment', [
            'currentStep' => 'environment',
            'environment' => $request->session()->get('install.environment', [
                'app_name' => config('app.name', 'GTFlow'),
                'app_url' => $request->getSchemeAndHttpHost(),
                'ai_default_provider' => 'openai',
                'embeddings_enabled' => true,
                'openai_api_key' => '',
                'gemini_api_key' => '',
                'openrouter_api_key' => '',
            ]),
        ]);
    }

    public function storeEnvironment(Request $request): RedirectResponse
    {
        $this->abortIfInstalled();

        $validated = $request->validate([
            'app_name' => ['required', 'string', 'max:80'],
            'app_url' => ['required', 'url', 'max:255'],
            'ai_default_provider' => ['required', 'in:openai,gemini,openrouter'],
            'embeddings_enabled' => ['nullable', 'boolean'],
            'openai_api_key' => ['nullable', 'string', 'max:255'],
            'gemini_api_key' => ['nullable', 'string', 'max:255'],
            'openrouter_api_key' => ['nullable', 'string', 'max:255'],
        ]);

        $validated['embeddings_enabled'] = $request->boolean('embeddings_enabled');

        $request->session()->put('install.environment', $validated);

        return redirect()->route('install.database');
    }

    public function database(Request $request): View
    {
        $this->abortIfInstalled();

        return view('install.database', [
            'currentStep' => 'database',
            'database' => $request->session()->get('install.database', [
                'driver' => 'mysql',
                'host' => 'localhost',
                'port' => '3306',
                'database' => '',
                'username' => '',
                'password' => '',
            ]),
        ]);
    }

    public function storeDatabase(Request $request, DatabaseConnectionTester $tester): RedirectResponse
    {
        $this->abortIfInstalled();

        $validated = $request->validate([
            'driver' => ['required', 'in:mysql,mariadb'],
            'host' => ['required', 'string', 'max:255'],
            'port' => ['required', 'integer', 'min:1', 'max:65535'],
            'database' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'max:255'],
        ]);

        $error = $tester->test($validated);

        if ($error !== null) {
            return back()
                ->withInput($request->except('password'))
                ->withErrors(['database' => 'Nao foi possivel conectar ao banco: '.$error]);
        }

        $request->session()->put('install.database', $validated);

        return redirect()->route('install.run');
    }

    public function run(Request $request): View|RedirectResponse
    {
        $this->abortIfInstalled();

        if (! $request->session()->has('install.environment')) {
            return redirect()->route('install.environment');
        }

        if (! $request->session()->has('install.database')) {
            return redirect()->route('install.database');
        }

        return view('install.run', [
            'currentStep' => 'run',
            'environment' => $request->session()->get('install.environment'),
            'database' => $request->session()->get('install.database'),
        ]);
    }

    public function execute(Request $request, InstallationRunner $runner): RedirectResponse
    {
        $this->abortIfInstalled();

        $environment = $request->session()->get('install.environment');
        $database = $request->session()->get('install.database');

        if (! is_array($environment) || ! is_array($database)) {
            return redirect()->route('install.requirements');
        }

        try {
            $steps = $runner->run($environment, $database);
        } catch (Throwable $exception) {
            report($exception);

            return back()->withErrors([
                'install' => 'A instalacao falhou: '.$exception->getMessage(),
            ]);
        }

        $request->session()->put('install.steps', $steps);
        $request->session()->put('install.completed_at', now()->toIso8601String());

        return redirect()->route('install.finish');
    }

    public function finish(Request $request): View
    {
        abort_unless($this->state->installed(), 404);
        abort_unless($request->session()->has('install.completed_at'), 404);

        return view('install.finish', [
            'currentStep' => 'finish',
            'steps' => $request->session()->get('install.steps', []),
        ]);
    }

    protected function abortIfInstalled(): void
    {
        abort_if($this->state->installed(), 404);
    }
}
