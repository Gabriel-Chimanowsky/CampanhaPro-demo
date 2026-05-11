<?php

namespace App\Livewire\BrandDna;

use App\Models\BrandDna;
use App\Models\BrandDnaPersona;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Livewire\Attributes\Computed;
use Livewire\Component;

class PersonaManager extends Component
{
    use AuthorizesRequests;

    public BrandDna $brandDna;

    public ?int $editingPersonaId = null;

    public string $label = '';

    public string $characteristics = '';

    public string $awarenessLevel = '';

    public string $objections = '';

    public string $desiredOutcomes = '';

    public function mount(BrandDna $brandDna): void
    {
        $this->authorize('update', $brandDna);

        $this->brandDna = $brandDna;
    }

    public function savePersona(): void
    {
        $validated = $this->validate([
            'label' => ['required', 'string', 'max:120'],
            'characteristics' => ['required', 'string'],
            'awarenessLevel' => ['nullable', 'string', 'in:'.implode(',', config('brand_dna.awareness_levels', []))],
            'objections' => ['nullable', 'string'],
            'desiredOutcomes' => ['nullable', 'string'],
        ], attributes: [
            'label' => 'nome da persona',
            'characteristics' => 'caracteristicas',
            'awarenessLevel' => 'nivel de consciencia',
            'objections' => 'objecoes',
            'desiredOutcomes' => 'resultados desejados',
        ]);

        $persona = $this->editingPersonaId
            ? $this->brandDna->personas()->findOrFail($this->editingPersonaId)
            : new BrandDnaPersona(['brand_dna_id' => $this->brandDna->id]);

        $persona->fill([
            'label' => $validated['label'],
            'characteristics' => $validated['characteristics'],
            'awareness_level' => $validated['awarenessLevel'] ?: null,
            'objections' => $validated['objections'] ?: null,
            'desired_outcomes' => $validated['desiredOutcomes'] ?: null,
        ])->save();

        $this->resetPersonaForm();
        session()->flash('brand_dna_persona_status', 'Persona salva com sucesso.');
    }

    public function editPersona(int $personaId): void
    {
        $persona = $this->brandDna->personas()->findOrFail($personaId);

        $this->editingPersonaId = $persona->id;
        $this->label = $persona->label;
        $this->characteristics = $persona->characteristics;
        $this->awarenessLevel = $persona->awareness_level ?? '';
        $this->objections = $persona->objections ?? '';
        $this->desiredOutcomes = $persona->desired_outcomes ?? '';
    }

    public function deletePersona(int $personaId): void
    {
        $this->brandDna->personas()->findOrFail($personaId)->delete();

        if ($this->editingPersonaId === $personaId) {
            $this->resetPersonaForm();
        }

        session()->flash('brand_dna_persona_status', 'Persona removida com sucesso.');
    }

    public function resetPersonaForm(): void
    {
        $this->reset(['editingPersonaId', 'label', 'characteristics', 'awarenessLevel', 'objections', 'desiredOutcomes']);
    }

    #[Computed]
    public function personas()
    {
        return $this->brandDna->personas()->orderBy('label')->get();
    }

    #[Computed]
    public function awarenessLevels(): array
    {
        return config('brand_dna.awareness_levels', []);
    }

    public function render()
    {
        return view('livewire.brand-dna.persona-manager');
    }
}
