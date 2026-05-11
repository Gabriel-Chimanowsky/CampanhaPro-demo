import React, { useState } from 'react';

export default function TemplateCatalog({
    counts = { all: 0, text: 0, image: 0 },
    initialTemplates = [],
    recentGenerations = []
}) {
    // --- ESTADOS ---
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');

    // Filtros visuais (opcionais, caso a filtragem seja feita no frontend. 
    // Se for no backend, o dev vai plugar um useEffect aqui pra chamar a API)
    const filteredTemplates = initialTemplates.filter(template => {
        const matchesSearch = template.name.toLowerCase().includes(search.toLowerCase()) || 
                              template.description.toLowerCase().includes(search.toLowerCase());
        
        if (filter === 'text' && !template.isText) return false;
        if (filter === 'image' && template.isText) return false;
        
        return matchesSearch;
    });

    return (
        <section className="ai-module w-full">
            <div className="ai-shell">

                {/* HEADER STRIP */}
                <div className="tpl-catalog-header">
                    <div className="tpl-catalog-header-left">
                        <div className="tpl-catalog-logo">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/>
                            </svg>
                        </div>
                        <div>
                            <h1 className="tpl-catalog-title">Templates de IA</h1>
                            <p className="tpl-catalog-subtitle">{counts.all} templates ativos · {counts.text} texto · {counts.image} imagem</p>
                        </div>
                    </div>

                    <div className="tpl-catalog-header-right">
                        <a href="/history" className="ai-button ai-button-secondary !py-2 !px-3 !text-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            Histórico
                        </a>
                    </div>
                </div>

                {/* SEARCH + FILTER BAR */}
                <div className="tpl-toolbar">
                    <label className="tpl-search">
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6.043 6.043a7.5 7.5 0 0 0 10.607 10.607Z"/>
                        </svg>
                        <input 
                            type="text" 
                            placeholder="Pesquisar templates..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </label>

                    <div className="tpl-filter-row">
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
                                <span className="tpl-filter-count">{counts[f.value]}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* RECENT GENERATION STRIP */}
                {recentGenerations.length > 0 && (
                    <div className="tpl-recents">
                        <span className="tpl-recents-label">Recentes</span>
                        <div className="tpl-recents-list">
                            {recentGenerations.slice(0, 4).map((generation, idx) => (
                                <a key={idx} href={`/history/${generation.id}`} className="tpl-recent-chip">
                                    <span className="tpl-recent-chip-name">{generation.template?.name}</span>
                                    {/* Placeholder simplificado do Status Badge */}
                                    <span className="ai-inline-pill bg-slate-100 text-slate-700 ring-1 ring-slate-200" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                                        {generation.status}
                                    </span>
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* GRID DE TEMPLATES */}
                <div className="tpl-grid">
                    {filteredTemplates.length > 0 ? (
                        filteredTemplates.map(template => {
                            const isText = template.isText;
                            const accentClasses = template.type?.accentClasses || 'bg-slate-100 text-slate-700';

                            return (
                                <a key={template.id} href={`/templates/${template.id}`} className="tpl-card">
                                    {/* Header do card */}
                                    <div className="tpl-card-header">
                                        <div className={`tpl-card-icon ${accentClasses}`}>
                                            {isText ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/></svg>
                                            )}
                                        </div>
                                        {/* Placeholder do Type Badge */}
                                        <span className="ai-inline-pill bg-slate-100 text-slate-700 ring-1 ring-slate-200 text-xs">
                                            {template.type?.label || 'Geral'}
                                        </span>
                                    </div>

                                    {/* Conteúdo */}
                                    <div className="tpl-card-body">
                                        <h2 className="tpl-card-name">{template.name}</h2>
                                        <p className="tpl-card-desc">{template.description}</p>
                                    </div>

                                    {/* Chips de campos */}
                                    <div className="tpl-card-chips">
                                        {template.input_schema?.slice(0, 3).map((field, idx) => (
                                            <span key={idx} className="tpl-chip">{field.label}</span>
                                        ))}
                                        {template.input_schema?.length > 3 && (
                                            <span className="tpl-chip tpl-chip-more">+{template.input_schema.length - 3}</span>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="tpl-card-footer">
                                        <span className="tpl-card-fields">{template.input_schema?.length || 0} campos</span>
                                        <span className="tpl-card-cta">
                                            Abrir
                                            <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
                                        </span>
                                    </div>
                                </a>
                            );
                        })
                    ) : (
                        <div className="tpl-empty md:col-span-2 xl:col-span-3">
                            <div className="run-empty-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z"/>
                                </svg>
                            </div>
                            <p className="run-empty-title">Nenhum template encontrado</p>
                            <p className="run-empty-sub">Ajuste a busca ou o filtro. Os templates configurados pela plataforma aparecem automaticamente.</p>
                        </div>
                    )}
                </div>

            </div>
        </section>
    );
}