import React, { useState } from 'react';

export default function BrandDnaIndex({ 
    initialBrands = [], 
    defaultBrandDnaId = null,
    currentUserId = null
}) {
    // --- ESTADOS ---
    const [search, setSearch] = useState('');
    const [brands, setBrands] = useState(initialBrands);
    const [activeDefaultId, setActiveDefaultId] = useState(defaultBrandDnaId);
    const [statusMessage, setStatusMessage] = useState(null); // Para simular a session('status')

    // --- MÉTODOS MOCKADOS (O dev conectará na API) ---
    const handleSetDefault = (brandId) => {
        if (activeDefaultId === brandId) {
            setActiveDefaultId(null);
            setStatusMessage('Brand DNA padrão removido.');
        } else {
            setActiveDefaultId(brandId);
            setStatusMessage('Brand DNA definido como padrão com sucesso.');
        }
        setTimeout(() => setStatusMessage(null), 3000);
    };

    const handleDelete = (brandId, brandName) => {
        if (window.confirm(`Excluir '${brandName}'? Esta ação não pode ser desfeita.`)) {
            setBrands(brands.filter(b => b.id !== brandId));
            if (activeDefaultId === brandId) setActiveDefaultId(null);
            setStatusMessage('Workspace excluído com sucesso.');
            setTimeout(() => setStatusMessage(null), 3000);
        }
    };

    // --- FILTRO VISUAL ---
    const filteredBrands = brands.filter(brand => {
        const term = search.toLowerCase();
        return brand.name?.toLowerCase().includes(term) || 
               brand.primary_product?.toLowerCase().includes(term) ||
               brand.niches?.some(n => n.name.toLowerCase().includes(term));
    });

    return (
        <section className="ai-module w-full">
            <div className="ai-shell">

                {/* BREADCRUMBS */}
                <div className="ai-breadcrumbs">
                    <a href="/dashboard">Dashboard</a>
                    <span>/</span>
                    <span className="text-slate-900">Brand DNA</span>
                </div>

                {/* HEADER STRIP */}
                <div className="tpl-catalog-header">
                    <div className="tpl-catalog-header-left">
                        <div className="tpl-catalog-logo" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.06))', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.2)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z"/>
                            </svg>
                        </div>
                        <div>
                            <h1 className="tpl-catalog-title">Brand DNA</h1>
                            <p className="tpl-catalog-subtitle">{brands.length} workspace{brands.length !== 1 ? 's' : ''} · Compartilhado com todos os usuários</p>
                        </div>
                    </div>
                    <div className="tpl-catalog-header-right">
                        <a href="/templates" className="ai-button ai-button-secondary !py-2 !px-3 !text-xs">Templates</a>
                        <a href="/brands/create" className="ai-button ai-button-primary !py-2 !px-4 !text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="inline-block size-3.5 mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
                            </svg>
                            Nova Brand DNA
                        </a>
                    </div>
                </div>

                {/* STATUS MESSAGE */}
                {statusMessage && (
                    <div className="ai-callout border-emerald-200 bg-emerald-50/90 text-emerald-700">
                        {statusMessage}
                    </div>
                )}

                {/* TOOLBAR */}
                <div className="tpl-toolbar">
                    <label className="tpl-search">
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6.043 6.043a7.5 7.5 0 0 0 10.607 10.607Z"/>
                        </svg>
                        <input 
                            type="text" 
                            placeholder="Buscar por marca, produto ou nicho..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </label>
                </div>

                {/* GRID DE BRANDS */}
                <div className="bdna-index-grid">
                    {filteredBrands.length > 0 ? (
                        filteredBrands.map(brand => {
                            const isDefault = activeDefaultId === brand.id;
                            const pct = brand.completionPercentage || 0; // Simulando o overallCompletion()

                            return (
                                <article key={brand.id} className="bdna-index-card">
                                    {/* Topo */}
                                    <div className="bdna-index-card-header">
                                        <div className="bdna-index-card-colors">
                                            {(brand.brand_colors || []).slice(0, 4).map((color, idx) => (
                                                <span key={idx} className="bdna-index-color-dot" style={{ background: color }} title={color}></span>
                                            ))}
                                        </div>
                                        
                                        <button
                                            type="button"
                                            className={`bdna-index-action-btn ${isDefault ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' : ''}`}
                                            onClick={() => handleSetDefault(brand.id)}
                                            title={isDefault ? 'Remover Brand DNA padrão' : 'Definir como Brand DNA padrão'}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill={isDefault ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
                                            </svg>
                                        </button>
                                        
                                        {/* Ações de Edição e Exclusão (Só se o usuário for o dono) */}
                                        {brand.user_id === currentUserId ? (
                                            <div className="bdna-index-actions">
                                                <a href={`/brands/${brand.id}/edit`} className="bdna-index-action-btn" title="Editar">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/>
                                                    </svg>
                                                </a>
                                                <button
                                                    type="button"
                                                    className="bdna-index-action-btn bdna-index-action-danger"
                                                    onClick={() => handleDelete(brand.id, brand.name)}
                                                    title="Excluir"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="ai-inline-pill bg-slate-100 text-slate-500 ring-1 ring-slate-200 !text-xs">Somente uso</span>
                                        )}
                                    </div>

                                    {/* Identidade */}
                                    <a href={`/brands/${brand.id}/edit`} className="bdna-index-card-link">
                                        <h2 className="bdna-index-card-name">{brand.name}</h2>
                                        <p className="bdna-index-card-product">{brand.primary_product}</p>
                                    </a>

                                    <p className="bdna-index-card-pitch text-xs !mb-0 text-slate-400">Criado por {brand.user?.name || 'Desconhecido'}</p>

                                    {/* Pitch preview */}
                                    {brand.pitch_bio && (
                                        <p className="bdna-index-card-pitch">
                                            {brand.pitch_bio.length > 100 ? `${brand.pitch_bio.substring(0, 100)}...` : brand.pitch_bio}
                                        </p>
                                    )}

                                    {/* Stats compactos */}
                                    <div className="bdna-index-stats">
                                        <span className="bdna-index-stat">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>
                                            {brand.personas_count || 0} persona{(brand.personas_count !== 1) ? 's' : ''}
                                        </span>
                                        <span className="bdna-index-stat">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/></svg>
                                            {brand.ready_knowledge_documents_count || 0} fonte{(brand.ready_knowledge_documents_count !== 1) ? 's' : ''}
                                        </span>
                                        <span className="bdna-index-stat">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>
                                            {brand.generations_count || 0} gerações
                                        </span>
                                    </div>

                                    {/* Tags */}
                                    <div className="bdna-index-tags">
                                        <span className="tpl-chip">{(brand.default_language || 'pt-BR').toUpperCase()}</span>
                                        <span className="tpl-chip">{brand.resolvedTone || 'Padrão'}</span>
                                        {(brand.niches || []).slice(0, 2).map((niche, idx) => (
                                            <span key={idx} className="tpl-chip">{niche.name}</span>
                                        ))}
                                        {brand.niches?.length > 2 && (
                                            <span className="tpl-chip tpl-chip-more">+{brand.niches.length - 2}</span>
                                        )}
                                    </div>

                                    {/* Progress strip */}
                                    <div className="bdna-index-progress">
                                        <div className="bdna-index-progress-bar">
                                            <div className="bdna-index-progress-fill" style={{ width: `${pct}%` }}></div>
                                        </div>
                                        <span className="bdna-index-progress-label">{pct}% configurado</span>
                                    </div>
                                </article>
                            );
                        })
                    ) : (
                        <div className="tpl-empty col-span-full">
                            <div className="run-empty-icon" style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b', opacity: 1 }}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z"/>
                                </svg>
                            </div>
                            <p className="run-empty-title">Nenhuma Brand DNA</p>
                            <p className="run-empty-sub">Crie o primeiro workspace para reutilizar contexto de marca nos templates de IA.</p>
                            <a href="/brands/create" className="ai-button ai-button-primary !py-2 !px-5">Criar Brand DNA</a>
                        </div>
                    )}
                </div>

            </div>
        </section>
    );
}