<?php

namespace App\Livewire\Dashboard;

use App\Models\AiGeneration;
use Illuminate\Support\Facades\Auth;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Layout;
use Livewire\Component; // <--- 1) Importe esta linha

#[Layout('layouts.app')] // <--- 2) Coloque isso em cima da definição da classe
class Dashboard extends Component
{
    #[Computed]
    public function recentGenerations()
    {
        return AiGeneration::with('template')
            ->ownedBy(Auth::user())
            ->latest()
            ->take(5)
            ->get();
    }

    public function render()
    {
        // 3) Agora limpamos a view() deixando ela simples de novo e sem erros pro Intelephense!
        return view('dashboard');
    }
}
