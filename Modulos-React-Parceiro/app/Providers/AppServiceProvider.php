<?php

namespace App\Providers;

use App\Services\AI\Chat\BufferedSseChatStreamer;
use App\Services\AI\Chat\ChatContextFrameBuilder;
use App\Services\AI\Chat\Contracts\BuildsChatContextFrames;
use App\Services\AI\Chat\Contracts\SearchesWeb;
use App\Services\AI\Chat\Contracts\StreamsChatResponses;
use App\Services\AI\Chat\NullWebSearchService;
use App\Services\BrandDna\KnowledgeBase\Contracts\EmbedsKnowledgeContent;
use App\Services\BrandDna\KnowledgeBase\Contracts\ExtractsDocumentText;
use App\Services\BrandDna\KnowledgeBase\Contracts\ExtractsWebsiteKnowledgeSources;
use App\Services\BrandDna\KnowledgeBase\Contracts\RetrievesBrandKnowledge;
use App\Services\BrandDna\KnowledgeBase\Contracts\TranscribesKnowledgeSources;
use App\Services\BrandDna\KnowledgeBase\GeminiEmbeddingService;
use App\Services\BrandDna\KnowledgeBase\GeminiTranscriptionService;
use App\Services\BrandDna\KnowledgeBase\HybridBrandKnowledgeRetriever;
use App\Services\BrandDna\KnowledgeBase\SiteContentExtractor;
use App\Services\BrandDna\KnowledgeBase\TextDocumentExtractor;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(TranscribesKnowledgeSources::class, GeminiTranscriptionService::class);
        $this->app->bind(ExtractsWebsiteKnowledgeSources::class, SiteContentExtractor::class);
        $this->app->bind(ExtractsDocumentText::class, TextDocumentExtractor::class);
        $this->app->bind(EmbedsKnowledgeContent::class, GeminiEmbeddingService::class);
        $this->app->bind(RetrievesBrandKnowledge::class, HybridBrandKnowledgeRetriever::class);
        $this->app->bind(BuildsChatContextFrames::class, ChatContextFrameBuilder::class);
        $this->app->bind(StreamsChatResponses::class, BufferedSseChatStreamer::class);
        $this->app->bind(SearchesWeb::class, NullWebSearchService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
