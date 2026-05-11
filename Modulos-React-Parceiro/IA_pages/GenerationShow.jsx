import React from 'react';

export default function GenerationShow({ 
    generation = {}, 
    friendlyError = null, 
    relatedGenerations = [] 
}) {
    // Helpers para lidar com os dados que viriam do backend
    const isText = generation.isText !== undefined ? generation.isText : true;
    const inputPayload = generation.input_payload || {};
    const contentItems = generation.contentItems || [];

    // Helper de status (substituindo o Enum do Laravel)
    const getStatusLabel = (status) => {
        const labels = { pending: 'Pendente', completed: 'Concluído', failed: 'Falhou' };
        return labels[status] || status;
    };

    const getStatusClasses = (status) => {
        if (status === 'completed') return 'bg-green-100 text-green-800';
        if (status === 'failed') return 'bg-red-100 text-red-800';
        return 'bg-amber-100 text-amber-800';
    };

    return (
        <section className="ai-module w-full">
            <div className="ai-shell">
                
                {/* BREADCRUMBS */}
                <div className="ai-breadcrumbs">
                    <a href="/dashboard">Dashboard</a>
                    <span>/</span>
                    <a href="/history">Histórico</a>
                    <span>/</span>
                    <span className="text-slate-900">Geração #{generation.id}</span>
                </div>

                {/* HERO SECTION */}
                <div className="ai-hero">
                    <div className="ai-hero-grid">
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Status Badge */}
                                <span className={`ai-inline-pill ${getStatusClasses(generation.status)} ring-1`} style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}>
                                    {getStatusLabel(generation.status)}
                                </span>
                                
                                {/* Type Badge */}
                                <span className="ai-inline-pill bg-slate-100 text-slate-700 ring-1 ring-slate-200 text-xs px-2 py-0.5">
                                    {generation.type || (isText ? 'Texto' : 'Imagem')}
                                </span>
                                
                                {generation.brandDna && (
                                    <span className="ai-inline-pill bg-amber-100 text-amber-800 ring-1 ring-amber-200">
                                        {generation.brandDna.name}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-3">
                                <h1 className="ai-hero-title !max-w-[16ch]">{generation.template?.name || 'Geração sem template'}</h1>
                                <p className="ai-hero-subtitle">
                                    Execução registrada em {generation.created_at || 'Data'} com provider{' '}
                                    <strong>{generation.provider ? generation.provider.toUpperCase() : 'N/A'}</strong>.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                {generation.template && (
                                    <a href={`/templates/${generation.template.id}?source_generation_id=${generation.id}`} className="ai-button ai-button-primary">
                                        Usar como base
                                    </a>
                                )}
                                {generation.template && (
                                    <a href={`/templates/${generation.template.id}`} className="ai-button ai-button-secondary">
                                        Rodar em branco
                                    </a>
                                )}
                                <a href="/history" className="ai-button ai-button-secondary">
                                    Voltar ao histórico
                                </a>
                            </div>
                        </div>

                        <div className="ai-quick-grid md:grid-cols-2">
                            <div className="ai-metric-card">
                                <span className="ai-metric-label">Provider e modelo</span>
                                <div className="ai-metric-value !text-[1.05rem]">
                                    {generation.provider ? generation.provider.toUpperCase() : '-'} / {generation.model || 'Default do provider'}
                                </div>
                                <p className="ai-metric-copy">Prompt snapshot salvo para auditoria e troubleshooting.</p>
                            </div>

                            <div className="ai-metric-card">
                                <span className="ai-metric-label">Campos enviados</span>
                                <div className="ai-metric-value !text-[1.45rem]">{Object.keys(inputPayload).length}</div>
                                <p className="ai-metric-copy">Cada valor foi validado com base no schema do template.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SHOWCASE GRID */}
                <div className="ai-showcase-grid">
                    
                    {/* LEFT COLUMN: RESULT */}
                    <div className="ai-card ai-panel">
                        <div className="ai-panel-header">
                            <h2 className="ai-panel-title">Resultado</h2>
                            <p className="ai-muted">Texto ou imagem persistidos depois da execução.</p>
                        </div>

                        {generation.status === 'completed' ? (
                            isText ? (
                                <div className="ai-result-prose whitespace-pre-wrap">
                                    {generation.output_text}
                                </div>
                            ) : (
                                <div>
                                    <div className="ai-image-frame">
                                        <img src={generation.output_file_path} alt="Resultado Gerado" />
                                    </div>
                                    <p className="mt-4 text-sm text-slate-500">
                                        Arquivo salvo em <code>{generation.output_file_path}</code>
                                    </p>
                                </div>
                            )
                        ) : generation.status === 'failed' ? (
                            <div className="ai-callout border-rose-200 bg-rose-50/90 text-rose-700">
                                {generation.error_message || 'Erro desconhecido'}
                            </div>
                        ) : (
                            <div className="ai-callout">
                                Esta geração ainda está pendente.
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: DETAILS */}
                    <div className="space-y-4">
                        
                        {/* CONTENT ITEMS */}
                        {contentItems.length > 0 ? (
                            <div className="ai-card ai-panel">
                                <div className="ai-panel-header">
                                    <h2 className="ai-panel-title">Content items</h2>
                                    <p className="ai-muted">Unidades operacionais criadas a partir desta geração.</p>
                                </div>

                                <div className="space-y-3">
                                    {contentItems.map(item => {
                                        const reuseUrl = item.template ? `/templates/${item.template.id}?source_brief_id=${item.guided_brief_id}` : null;
                                        
                                        return (
                                            <div key={item.id} className="rounded-2xl border border-slate-200/70 bg-white/90 p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-900">{item.title}</p>
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            <span className={`ai-inline-pill ${item.status?.badgeClasses || 'bg-slate-100'} ring-1`} style={{ fontSize: '0.7rem', padding: '0.2rem 0.55rem' }}>
                                                                {item.status?.label || 'Status'}
                                                            </span>
                                                            {item.channel && (
                                                                <span className="ai-field-chip">{item.channel}</span>
                                                            )}
                                                            {item.objective && (
                                                                <span className="ai-field-chip">
                                                                    {item.objective.length > 36 ? `${item.objective.substring(0, 36)}...` : item.objective}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <a href={`/library/${item.id}`} className="run-copy-btn">
                                                        Abrir item
                                                    </a>
                                                    {reuseUrl && (
                                                        <a href={reuseUrl} className="run-copy-btn">
                                                            Usar como base
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : generation.status === 'completed' && (
                            <div className="ai-card ai-panel">
                                <div className="ai-panel-header">
                                    <h2 className="ai-panel-title">Content items</h2>
                                    <p className="ai-muted">Geração legada sem item operacional vinculado.</p>
                                </div>
                            </div>
                        )}

                        {/* BRAND DNA */}
                        {generation.brandDna && (
                            <div className="ai-card ai-panel">
                                <div className="ai-panel-header">
                                    <h2 className="ai-panel-title">Brand DNA vinculada</h2>
                                    <p className="ai-muted">Contexto de marca usado para o pré-preenchimento desta geração.</p>
                                </div>

                                <div className="space-y-3">
                                    <p className="font-semibold text-slate-900">{generation.brandDna.name}</p>
                                    <p className="text-sm text-slate-500">{generation.brandDna.primary_product}</p>

                                    <div className="ai-field-list">
                                        <span className="ai-field-chip">{generation.brandDna.resolvedTone || 'Tom Padrão'}</span>
                                        {generation.brandDna.niches?.map((niche, idx) => (
                                            <span key={idx} className="ai-field-chip">{niche.name}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PAYLOAD */}
                        <div className="ai-card ai-panel">
                            <div className="ai-panel-header">
                                <h2 className="ai-panel-title">Payload</h2>
                                <p className="ai-muted">Valores validados no backend antes de montar o prompt final.</p>
                            </div>

                            <div className="ai-field-list">
                                {Object.entries(inputPayload).map(([key, value]) => (
                                    <span key={key} className="ai-field-chip">
                                        <strong>{key}:</strong> {String(value).length > 80 ? `${String(value).substring(0, 80)}...` : String(value)}
                                    </span>
                                ))}
                                {Object.keys(inputPayload).length === 0 && (
                                    <span className="text-sm text-slate-500">Nenhum payload registrado.</span>
                                )}
                            </div>
                        </div>

                        {/* PROMPT SNAPSHOT */}
                        <div className="ai-card ai-panel">
                            <div className="ai-panel-header">
                                <h2 className="ai-panel-title">Prompt snapshot</h2>
                                <p className="ai-muted">Salvo para auditoria, reprodução e depuração do fluxo.</p>
                            </div>

                            <pre className="overflow-x-auto whitespace-pre-wrap text-sm leading-7 text-slate-600">
                                {generation.prompt_snapshot || 'Nenhum snapshot de prompt disponível.'}
                            </pre>
                        </div>
                    </div>
                </div>

                {/* RELATED GENERATIONS */}
                {relatedGenerations.length > 0 && (
                    <div className="space-y-4 mt-8">
                        <div>
                            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Outras gerações recentes</h2>
                            <p className="ai-muted">Acesso rápido para continuar revisando seu histórico.</p>
                        </div>

                        <div className="ai-history-grid">
                            {relatedGenerations.map(related => (
                                <a key={related.id} href={`/history/${related.id}`} className="ai-history-item">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-bold text-slate-900">{related.template?.name}</p>
                                        <span className={`ai-inline-pill ${getStatusClasses(related.status)} ring-1`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                                            {getStatusLabel(related.status)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500">{related.created_at || 'Data'}</p>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
                
            </div>
        </section>
    );
}