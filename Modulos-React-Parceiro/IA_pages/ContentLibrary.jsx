import React, { useState } from 'react';

export default function ContentLibrary({ 
    initialItems = [], 
    totalItems = 0,
    statusOptions = { 'all': 'Todos', 'approved': 'Aprovados', 'review': 'Em Revisão' },
    brands = [],
    channels = [],
    hasPages = false // Substituiria o $this->items->hasPages()
}) {
    // --- ESTADOS ---
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [favoritesOnly, setFavoritesOnly] = useState(false);
    const [selectedBrand, setSelectedBrand] = useState('all');
    const [selectedChannel, setSelectedChannel] = useState('all');
    
    // Gerenciamento local para o botão de favoritar e aprovar (apenas visual, deve chamar a API)
    const [items, setItems] = useState(initialItems);

    const toggleFavorite = (itemId) => {
        // MOCK: Atualiza o estado local. O dev plugará a chamada à API aqui.
        setItems(prevItems => prevItems.map(item => 
            item.id === itemId ? { ...item, is_favorited: !item.is_favorited } : item
        ));
    };

    const approveContentItem = (itemId) => {
         // MOCK: Atualiza o estado local. O dev plugará a chamada à API aqui.
         setItems(prevItems => prevItems.map(item => 
            item.id === itemId ? { ...item, status: { ...item.status, value: 'approved', label: 'Aprovado' } } : item
        ));
    };

    // --- FILTRO VISUAL (Opcional, se o backend fizer a paginação, isso pode sair) ---
    const filteredItems = items.filter(item => {
        const matchesSearch = item.title?.toLowerCase().includes(search.toLowerCase()) || 
                              item.body?.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = status === 'all' || item.status?.value === status;
        const matchesFavorite = !favoritesOnly || item.is_favorited;
        const matchesBrand = selectedBrand === 'all' || String(item.brandDna?.id) === String(selectedBrand);
        const matchesChannel = selectedChannel === 'all' || item.channel === selectedChannel;

        return matchesSearch && matchesStatus && matchesFavorite && matchesBrand && matchesChannel;
    });

    return (
        <section className="ai-module w-full">
            <div className="ai-shell">
                <div className="tpl-catalog-header">
                    <div className="tpl-catalog-header-left">
                        <div className="tpl-catalog-logo">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                            </svg>
                        </div>
                        <div>
                            <h1 className="tpl-catalog-title">Biblioteca de conteúdo</h1>
                            <p className="tpl-catalog-subtitle">
                                {totalItems} item{totalItems !== 1 ? 's' : ''} operacional{totalItems !== 1 ? 'is' : ''}
                            </p>
                        </div>
                    </div>
                    <div className="tpl-catalog-header-right">
                        <a href="/templates" className="ai-button ai-button-secondary !py-2 !px-3 !text-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"/>
                            </svg>
                            Templates
                        </a>
                    </div>
                </div>

                <div className="tpl-toolbar">
                    <label className="tpl-search">
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6.043 6.043a7.5 7.5 0 0 0 10.607 10.607Z"/>
                        </svg>
                        <input 
                            type="text" 
                            placeholder="Buscar por item, template, brand ou objetivo..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </label>

                    <div className="tpl-filter-row">
                        {Object.entries(statusOptions).map(([value, label]) => (
                            <button 
                                key={value}
                                type="button"
                                className={`tpl-filter-btn ${status === value ? 'tpl-filter-active' : ''}`}
                                onClick={() => setStatus(value)}
                            >
                                {label}
                            </button>
                        ))}

                        <label className={`tpl-filter-btn ${favoritesOnly ? 'tpl-filter-active' : ''} cursor-pointer`}>
                            <input 
                                type="checkbox" 
                                checked={favoritesOnly}
                                onChange={(e) => setFavoritesOnly(e.target.checked)}
                                className="sr-only" 
                            />
                            Favoritos
                        </label>

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

                        {channels.length > 0 && (
                            <select 
                                value={selectedChannel} 
                                onChange={(e) => setSelectedChannel(e.target.value)}
                                className="ai-select !py-1.5 !px-3 !text-sm !rounded-full"
                            >
                                <option value="all">Todos canais</option>
                                {channels.map(channelOption => (
                                    <option key={channelOption} value={channelOption}>{channelOption}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                <div className="hist-grid">
                    {filteredItems.length > 0 ? (
                        filteredItems.map(item => {
                            const detailUrl = `/library/${item.id}`;
                            const reuseUrl = item.template ? `/templates/${item.template.id}?source_brief_id=${item.guided_brief_id}` : null;
                            const isText = item.isText !== undefined ? item.isText : true; // Fallback se não definido

                            return (
                                <article key={item.id} className="hist-card">
                                    <div className="hist-card-header">
                                        <div className="hist-card-meta">
                                            {/* Placeholder para x-ai.template-type-badge */}
                                            <span className="ai-inline-pill bg-slate-100 text-slate-700 ring-1 ring-slate-200" style={{ fontSize: '0.7rem', padding: '0.2rem 0.55rem' }}>
                                                {item.type || 'Tipo'}
                                            </span>
                                            
                                            <span className={`ai-inline-pill ${item.status?.badgeClasses || 'bg-blue-100 text-blue-700'} ring-1`} style={{ fontSize: '0.7rem', padding: '0.2rem 0.55rem' }}>
                                                {item.status?.label || 'Status'}
                                            </span>
                                        </div>
                                        <button type="button" className="run-copy-btn" onClick={() => toggleFavorite(item.id)}>
                                            {item.is_favorited ? 'Favorito' : 'Favoritar'}
                                        </button>
                                    </div>

                                    <div className="hist-card-body">
                                        <a href={detailUrl} className="hist-card-name hover:text-slate-700">{item.title}</a>
                                        <div className="flex flex-wrap gap-2">
                                            {item.brandDna && (
                                                <span className="hist-brand-pill">{item.brandDna.name}</span>
                                            )}
                                            {item.channel && (
                                                <span className="hist-brand-pill">{item.channel}</span>
                                            )}
                                        </div>
                                    </div>

                                    <p className="hist-card-preview">
                                        {isText ? (
                                            item.body ? (item.body.length > 140 ? `${item.body.substring(0, 140)}...` : item.body) : ''
                                        ) : (
                                            `Imagem gerada ${item.output_file_path ? `· ${item.output_file_path.split('/').pop()}` : ''}`
                                        )}
                                    </p>

                                    <div className="hist-card-footer">
                                        <span className="hist-card-date">{item.updated_at || 'Data'}</span>
                                        <span className="flex items-center gap-2">
                                            {item.status?.value !== 'approved' && (
                                                <button type="button" className="run-copy-btn" onClick={() => approveContentItem(item.id)}>
                                                    Aprovar
                                                </button>
                                            )}
                                            <a href={detailUrl} className="run-copy-btn">
                                                Abrir
                                            </a>
                                            {reuseUrl && (
                                                <a href={reuseUrl} className="hist-card-cta">
                                                    Usar como base
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
                                                    </svg>
                                                </a>
                                            )}
                                        </span>
                                    </div>
                                </article>
                            );
                        })
                    ) : (
                        <div className="tpl-empty md:col-span-2 xl:col-span-3">
                            <div className="run-empty-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                                </svg>
                            </div>
                            <p className="run-empty-title">Nenhum item encontrado</p>
                            <p className="run-empty-sub">Aprove outputs em revisão ou ajuste os filtros da biblioteca.</p>
                        </div>
                    )}
                </div>

                {hasPages && (
                    <div className="rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm">
                        {/* Componente de Paginação seria renderizado aqui */}
                        <div className="text-sm text-slate-500 text-center">Paginação</div>
                    </div>
                )}
            </div>
        </section>
    );
}