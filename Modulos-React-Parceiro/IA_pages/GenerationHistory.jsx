import React, { useState } from 'react';

export default function GenerationHistory({
    initialGenerations = [],
    totalGenerations = 0,
    brands = [],
    hasPages = false
}) {
    // --- ESTADOS ---
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all'); // 'all', 'text', 'image'
    const [status, setStatus] = useState('all'); // 'all', 'pending', 'completed', 'failed'
    const [selectedBrand, setSelectedBrand] = useState('all');

    // Labels de status para o subtítulo
    const getStatusLabel = (s) => {
        const labels = { pending: 'Gerando', completed: 'Concluídos', failed: 'Falharam' };
        return labels[s] || s;
    };

    // --- FILTRO VISUAL MOCKADO ---
    // Opcional: Se a filtragem for no frontend. Se for no backend, 
    // o dev conectará esses estados em um useEffect para buscar novos dados.
    const filteredGenerations = initialGenerations.filter(gen => {
        const matchesSearch = gen.template?.name?.toLowerCase().includes(search.toLowerCase()) || 
                              gen.output_text?.toLowerCase().includes(search.toLowerCase());
        
        // Verifica se é texto/imagem. Assume que gen.isText é um boolean vindo da API
        const isText = gen.isText !== undefined ? gen.isText : true; 
        const matchesFilter = filter === 'all' || (filter === 'text' ? isText : !isText);
        
        const matchesStatus = status === 'all' || gen.status === status;
        const matchesBrand = selectedBrand === 'all' || String(gen.brandDna?.id) === String(selectedBrand);

        return matchesSearch && matchesFilter && matchesStatus && matchesBrand;
    });

    return (
        <section className="ai-module w-full">
            <div className="ai-shell">

                {/* HEADER STRIP */}
                <div className="tpl-catalog-header">
                    <div className="tpl-catalog-header-left">
                        <div className="tpl-catalog-logo">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <div>
                            <h1 className="tpl-catalog-title">Histórico de gerações</h1>
                            <p className="tpl-catalog-subtitle">
                                {totalGenerations} registro{totalGenerations !== 1 ? 's' : ''} carregado{totalGenerations !== 1 ? 's' : ''}
                                {filter !== 'all' && ` · ${filter === 'text' ? 'Texto' : 'Imagem'}`}
                                {status !== 'all' && ` · ${getStatusLabel(status)}`}
                            </p>
                        </div>
                    </div>
                    <div className="tpl-catalog-header-right">
                        <a href="/library" className="ai-button ai-button-secondary !py-2 !px-3 !text-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                            </svg>
                            Biblioteca
                        </a>
                        <a href="/templates" className="ai-button ai-button-secondary !py-2 !px-3 !text-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
                            </svg>
                            Templates
                        </a>
                    </div>
                </div>

                {/* TOOLBAR */}
                <div className="tpl-toolbar">
                    <label className="tpl-search">
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6.043 6.043a7.5 7.5 0 0 0 10.607 10.607Z"/>
                        </svg>
                        <input 
                            type="text" 
                            placeholder="Buscar por template, brand ou trecho..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </label>

                    <div className="tpl-filter-row">
                        {/* Filtro de Tipo */}
                        {[
                            { value: 'all', label: 'Todos' },
                            { value: 'text', label: 'Texto' },
                            { value: 'image', label: 'Imagem' }
                        ].map(f => (
                            <button 
                                key={f.value}
                                type="button"
                                className={`tpl-filter-btn ${filter === f.value ? 'tpl-filter-active' : ''}`}
                                onClick={() => setFilter(f.value)}
                            >
                                {f.label}
                            </button>
                        ))}

                        <div className="w-px h-5 bg-slate-200 self-center"></div>

                        {/* Filtro de Status */}
                        {[
                            { value: 'all', label: 'Todos status' },
                            { value: 'pending', label: 'Gerando' },
                            { value: 'completed', label: 'Concluídos' },
                            { value: 'failed', label: 'Falharam' }
                        ].map(s => (
                            <button 
                                key={s.value}
                                type="button"
                                className={`tpl-filter-btn ${status === s.value ? 'tpl-filter-active' : ''}`}
                                onClick={() => setStatus(s.value)}
                            >
                                {s.label}
                            </button>
                        ))}

                        {/* Filtro de Brand */}
                        {brands.length > 0 && (
                            <select 
                                value={selectedBrand} 
                                onChange={(e) => setSelectedBrand(e.target.value)}
                                className="ai-select !py-1.5 !px-3 !text-sm !rounded-full"
                            >
                                <option value="all">Todas as brands</option>
                                {brands.map(brandOption => (
                                    <option key={brandOption.id} value={brandOption.id}>{brandOption.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* GRID DE GERAÇÕES */}
                <div className="hist-grid">
                    {filteredGenerations.length > 0 ? (
                        filteredGenerations.map(generation => {
                            const isText = generation.isText !== undefined ? generation.isText : true;
                            
                            // Helpers para formatar a string de prévia
                            const previewRawText = generation.output_text || generation.error_message || generation.prompt_snapshot || '';
                            const previewText = previewRawText.length > 120 ? `${previewRawText.substring(0, 120)}...` : previewRawText;

                            return (
                                <a key={generation.id} href={`/history/${generation.id}`} className="hist-card">
                                    <div className="hist-card-header">
                                        <div className="hist-card-meta">
                                            {/* Placeholder para Type Badge */}
                                            <span className="ai-inline-pill bg-slate-100 text-slate-700 ring-1 ring-slate-200 text-xs px-2 py-0.5">
                                                {generation.type || (isText ? 'TX' : 'IMG')}
                                            </span>
                                            {generation.provider && (
                                                <span className="hist-provider-pill">{generation.provider.toUpperCase()}</span>
                                            )}
                                        </div>
                                        {/* Placeholder para Status Badge */}
                                        <span className={`ai-inline-pill ${generation.status === 'completed' ? 'bg-green-100 text-green-800' : generation.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'} ring-1 text-xs px-2 py-0.5`}>
                                            {getStatusLabel(generation.status)}
                                        </span>
                                    </div>

                                    <div className="hist-card-body">
                                        <p className="hist-card-name">{generation.template?.name}</p>
                                        {generation.brandDna && (
                                            <span className="hist-brand-pill">{generation.brandDna.name}</span>
                                        )}
                                    </div>

                                    <p className="hist-card-preview">
                                        {isText ? (
                                            previewText
                                        ) : generation.status === 'completed' ? (
                                            `Imagem gerada · ${generation.output_file_path ? generation.output_file_path.split('/').pop() : ''}`
                                        ) : (
                                            generation.error_message || 'Sem mensagem de erro registrada.'
                                        )}
                                    </p>

                                    <div className="hist-card-footer">
                                        <span className="hist-card-date">{generation.created_at || 'Data'}</span>
                                        <span className="hist-card-cta">
                                            Abrir
                                            <svg xmlns="http://www.w3.org/2000/svg" className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
                                            </svg>
                                        </span>
                                    </div>
                                </a>
                            );
                        })
                    ) : (
                        <div className="tpl-empty md:col-span-2 xl:col-span-3">
                            <div className="run-empty-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                            </div>
                            <p className="run-empty-title">Nenhuma geração encontrada</p>
                            <p className="run-empty-sub">Ajuste os filtros ou execute um template para ver o histórico.</p>
                        </div>
                    )}
                </div>

                {/* PAGINAÇÃO */}
                {hasPages && (
                    <div className="rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm mt-4">
                        {/* Componente de Paginação seria renderizado aqui */}
                        <div className="text-sm text-slate-500 text-center">Navegação de Páginas</div>
                    </div>
                )}

            </div>
        </section>
    );
}