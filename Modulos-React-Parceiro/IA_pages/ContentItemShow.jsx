import React, { useState } from 'react';

export default function ContentItemShow({ initialItem = {} }) {
    // --- ESTADOS ---
    const [contentItem, setContentItem] = useState(initialItem);
    const [friendlyError, setFriendlyError] = useState(null);
    const [rejectReason, setRejectReason] = useState(initialItem.meta?.reject_reason || '');
    const [editableBody, setEditableBody] = useState(initialItem.body || '');
    const [changeReason, setChangeReason] = useState('');
    const [editInstruction, setEditInstruction] = useState('');

    const isText = contentItem.isText !== undefined ? contentItem.isText : true; // Fallback se não for passado explicitamente

    // --- MÉTODOS MOCKADOS (O dev irá conectar com a API) ---
    const handleApprove = () => {
        // fetch('/api/items/.../approve', { method: 'POST' })
        setContentItem(prev => ({
            ...prev,
            status: { ...prev.status, value: 'approved', label: 'Aprovado', badgeClasses: 'bg-green-100 text-green-800' }
        }));
    };

    const handleSendToReview = () => {
        setContentItem(prev => ({
            ...prev,
            status: { ...prev.status, value: 'review', label: 'Em Revisão', badgeClasses: 'bg-amber-100 text-amber-800' }
        }));
    };

    const handleReject = () => {
        if (!rejectReason.trim()) {
            setFriendlyError('Por favor, informe o motivo da desaprovação.');
            return;
        }
        setFriendlyError(null);
        setContentItem(prev => ({
            ...prev,
            status: { ...prev.status, value: 'rejected', label: 'Desaprovado', badgeClasses: 'bg-red-100 text-red-800' },
            meta: { ...prev.meta, reject_reason: rejectReason }
        }));
    };

    const handleSaveManualEdit = (e) => {
        e.preventDefault();
        // fetch('/api/items/.../edit', { ... })
        const newVersion = {
            id: Date.now(),
            version_number: (contentItem.versions?.length || 0) + 1,
            edit_mode: 'Manual',
            change_reason: changeReason
        };
        
        setContentItem(prev => ({
            ...prev,
            body: editableBody,
            versions: [newVersion, ...(prev.versions || [])]
        }));
        setChangeReason('');
    };

    const handleApplyEditInstruction = (e) => {
        e.preventDefault();
        // Aqui seria a chamada à IA para editar o texto baseado na instrução
        const newVersion = {
            id: Date.now(),
            version_number: (contentItem.versions?.length || 0) + 1,
            edit_mode: 'Instrução AI',
            edit_instruction: editInstruction
        };
        
        setContentItem(prev => ({
            ...prev,
            versions: [newVersion, ...(prev.versions || [])]
        }));
        setEditInstruction('');
    };

    return (
        <section className="ai-module w-full">
            <div className="ai-shell">
                
                {/* BREADCRUMBS */}
                <div className="ai-breadcrumbs">
                    <a href="/dashboard">Dashboard</a>
                    <span>/</span>
                    <a href="/library">Biblioteca</a>
                    <span>/</span>
                    <span className="text-slate-900">{contentItem.title}</span>
                </div>

                {/* HEADER */}
                <div className="tpl-catalog-header">
                    <div className="tpl-catalog-header-left">
                        <div className="tpl-catalog-logo">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
                        </div>
                        <div>
                            <h1 className="tpl-catalog-title">{contentItem.title}</h1>
                            <p className="tpl-catalog-subtitle">
                                {contentItem.template?.name || 'Conteúdo gerado'}
                                {contentItem.brandDna && ` - ${contentItem.brandDna.name}`}
                            </p>
                        </div>
                    </div>
                    <div className="tpl-catalog-header-right">
                        <span className={`ai-inline-pill ${contentItem.status?.badgeClasses || 'bg-slate-100 text-slate-800'} ring-1`} style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}>
                            {contentItem.status?.label || 'Status'}
                        </span>
                        <a href="/library" className="ai-button ai-button-secondary !py-2 !px-3 !text-xs">
                            Biblioteca
                        </a>
                    </div>
                </div>

                {/* GLOBAL ERROR */}
                {friendlyError && (
                    <div className="ai-callout border-rose-200 bg-rose-50/90 text-rose-700">
                        {friendlyError}
                    </div>
                )}

                <div className="run-layout">
                    
                    {/* ================= LEFT (OUTPUT VIEW) ================= */}
                    <div className="run-output">
                        <div className="run-output-header">
                            <span className="run-output-title">Conteúdo</span>
                            <div className="run-output-meta">
                                {/* Placeholder Type Badge */}
                                <span className="ai-inline-pill bg-slate-100 text-slate-700 ring-1 ring-slate-200 text-xs">
                                    {contentItem.type || 'Tipo'}
                                </span>
                                {contentItem.channel && (
                                    <span className="hist-brand-pill">{contentItem.channel}</span>
                                )}
                            </div>
                        </div>

                        <div className="run-output-body">
                            {isText ? (
                                <div className="run-result-prose">{contentItem.body}</div>
                            ) : contentItem.output_file_path ? (
                                <div className="ai-image-frame">
                                    <img src={contentItem.output_file_path} alt={contentItem.title} />
                                </div>
                            ) : (
                                <div className="run-empty">
                                    <p className="run-empty-title">Arquivo indisponível</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ================= RIGHT (OPERATIONS/CONFIG) ================= */}
                    <div className="run-config">
                        <div className="run-config-header">
                            <span className="run-config-title">Operações</span>
                            <span className="text-xs text-slate-400">{contentItem.updated_at || 'Data'}</span>
                        </div>

                        <div className="run-config-body">
                            
                            {/* SECTION: STATUS EDITORIAL */}
                            <div className="run-config-section">
                                <span className="run-section-label">Status editorial</span>

                                <div className="flex flex-wrap gap-2">
                                    <button type="button" className="ai-button ai-button-primary !py-2 !px-3 !text-xs" onClick={handleApprove}>
                                        Aprovar
                                    </button>
                                    <button type="button" className="ai-button ai-button-secondary !py-2 !px-3 !text-xs" onClick={handleSendToReview}>
                                        Revisar
                                    </button>
                                </div>

                                <div className="ai-field">
                                    <label htmlFor="reject-reason" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ai-text)' }}>Motivo da desaprovação</label>
                                    <textarea 
                                        id="reject-reason" 
                                        value={rejectReason} 
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        className="ai-textarea" 
                                        rows="3" 
                                        placeholder="Explique o que precisa mudar"
                                    ></textarea>
                                </div>

                                <button type="button" className="ai-button ai-button-secondary !py-2 !px-3 !text-xs" onClick={handleReject}>
                                    Desaprovar
                                </button>

                                {contentItem.meta?.reject_reason && (
                                    <div className="ai-callout" style={{ fontSize: '0.8rem' }}>
                                        Último motivo: {contentItem.meta.reject_reason}
                                    </div>
                                )}
                            </div>

                            {/* SECTION: EDIT FOR TEXT ITEMS */}
                            {isText && (
                                <>
                                    <form onSubmit={handleSaveManualEdit} className="run-config-section">
                                        <span className="run-section-label">Editar resultado</span>

                                        <div className="ai-field">
                                            <label htmlFor="editable-body" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ai-text)' }}>Texto</label>
                                            <textarea 
                                                id="editable-body" 
                                                value={editableBody} 
                                                onChange={(e) => setEditableBody(e.target.value)}
                                                className="ai-textarea" 
                                                rows="10"
                                            ></textarea>
                                        </div>

                                        <div className="ai-field">
                                            <label htmlFor="change-reason" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ai-text)' }}>Motivo</label>
                                            <input 
                                                id="change-reason" 
                                                value={changeReason}
                                                onChange={(e) => setChangeReason(e.target.value)}
                                                className="ai-input" 
                                                type="text" 
                                                placeholder="Ex: ajuste manual" 
                                            />
                                        </div>

                                        <button type="submit" className="ai-button ai-button-primary !py-2 !px-3 !text-xs">
                                            Salvar edição
                                        </button>
                                    </form>

                                    <form onSubmit={handleApplyEditInstruction} className="run-config-section">
                                        <span className="run-section-label">Editar por instrução</span>

                                        <div className="ai-field">
                                            <label htmlFor="edit-instruction" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ai-text)' }}>Instrução</label>
                                            <input 
                                                id="edit-instruction" 
                                                value={editInstruction}
                                                onChange={(e) => setEditInstruction(e.target.value)}
                                                className="ai-input" 
                                                type="text" 
                                                placeholder="Ex: remova a linha 2" 
                                            />
                                        </div>

                                        <button type="submit" className="ai-button ai-button-secondary !py-2 !px-3 !text-xs">
                                            Aplicar
                                        </button>
                                    </form>
                                </>
                            )}

                            {/* SECTION: VERSIONS */}
                            <div className="run-config-section">
                                <span className="run-section-label">Versões</span>

                                {contentItem.versions && contentItem.versions.length > 0 ? (
                                    contentItem.versions.map(version => (
                                        <div key={version.id} className="rounded-xl border border-slate-200 bg-white p-3">
                                            <div className="mb-1 flex items-center justify-between gap-2">
                                                <span className="text-sm font-semibold text-slate-900">Versão {version.version_number}</span>
                                                <span className="text-xs text-slate-500">{version.edit_mode}</span>
                                            </div>
                                            {version.change_reason && (
                                                <p className="text-xs text-slate-600">{version.change_reason}</p>
                                            )}
                                            {version.edit_instruction && (
                                                <p className="text-xs text-slate-600">{version.edit_instruction}</p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-500">Nenhuma edição registrada.</p>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}