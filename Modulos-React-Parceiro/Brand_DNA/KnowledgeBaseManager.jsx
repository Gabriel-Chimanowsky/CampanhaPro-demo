import React, { useState } from 'react';

export default function KnowledgeBaseManager({ 
    initialDocuments = [], 
    typeOptions = { 
        text: 'Texto Manual', 
        site: 'Website', 
        youtube: 'YouTube', 
        file: 'Documento (PDF/TXT)', 
        mp4_transcript: 'Vídeo (MP4)' 
    } 
}) {
    // --- ESTADOS DA LISTA ---
    const [documents, setDocuments] = useState(initialDocuments);
    const [statusMessage, setStatusMessage] = useState(null);

    // --- ESTADOS DO FORMULÁRIO ---
    const [editingDocumentId, setEditingDocumentId] = useState(null);
    const [type, setType] = useState('text');
    const [title, setTitle] = useState('');
    const [summary, setSummary] = useState('');
    const [content, setContent] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [knowledgeFile, setKnowledgeFile] = useState(null);

    // --- AÇÕES ---
    const resetForm = () => {
        setEditingDocumentId(null);
        setType('text');
        setTitle('');
        setSummary('');
        setContent('');
        setSourceUrl('');
        setKnowledgeFile(null);
    };

    const handleEdit = (doc) => {
        setEditingDocumentId(doc.id);
        setType(doc.type);
        setTitle(doc.title);
        setSummary(doc.summary || '');
        setContent(doc.content || '');
        setSourceUrl(doc.source_url || '');
    };

    const handleDelete = (id) => {
        if (window.confirm("Tem certeza que deseja excluir esta fonte e seus chunks?")) {
            setDocuments(documents.filter(d => d.id !== id));
            setStatusMessage("Fonte excluída com sucesso.");
        }
    };

    const handleSave = () => {
        // MOCK: Aqui o dev conectará na API
        const payload = { type, title, summary, content, sourceUrl, knowledgeFile };
        console.log("Salvando documento:", payload);
        
        setStatusMessage("Documento processado com sucesso!");
        resetForm();
    };

    return (
        <div className="space-y-6">
            {statusMessage && (
                <div className="ai-callout border-emerald-200 bg-emerald-50/90 text-emerald-700">
                    {statusMessage}
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),24rem]">
                
                {/* LISTA DE DOCUMENTOS (ESQUERDA) */}
                <div className="space-y-4">
                    {documents.length > 0 ? (
                        documents.map(doc => (
                            <article key={doc.id} className="ai-card ai-panel">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="ai-panel-title">{doc.title}</h3>
                                            <span className="ai-inline-pill bg-slate-100 text-slate-700 ring-1 ring-slate-200">{doc.type}</span>
                                            <span className={`ai-inline-pill ring-1 ${
                                                doc.ingestion_status === 'ready' ? 'bg-emerald-100 text-emerald-800 ring-emerald-200' : 
                                                (doc.ingestion_status === 'failed' ? 'bg-rose-100 text-rose-800 ring-rose-200' : 'bg-amber-100 text-amber-800 ring-amber-200')
                                            }`}>
                                                {doc.ingestion_status}
                                            </span>
                                        </div>

                                        <p className="ai-muted text-xs">{doc.source_label || 'Fonte interna'}</p>

                                        {doc.summary && <p className="text-sm text-slate-500">{doc.summary}</p>}
                                        {doc.ingestion_error && <p className="text-sm text-rose-600">{doc.ingestion_error}</p>}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button type="button" className="ai-button ai-button-secondary !px-4 !py-2" onClick={() => handleEdit(doc)}>Editar</button>
                                        <button type="button" className="ai-button ai-button-secondary !px-4 !py-2" onClick={() => handleDelete(doc.id)}>Excluir</button>
                                    </div>
                                </div>

                                <div className="ai-field-list mt-3">
                                    <span className="ai-field-chip">{doc.chunks_count || 0} chunk(s)</span>
                                    {doc.last_processed_at && (
                                        <span className="ai-field-chip">Processado em {doc.last_processed_at}</span>
                                    )}
                                </div>

                                {doc.content && (
                                    <p className="brand-copy mt-3">
                                        {doc.content.length > 240 ? `${doc.content.substring(0, 240)}...` : doc.content}
                                    </p>
                                )}
                            </article>
                        ))
                    ) : (
                        <div className="ai-card ai-panel">
                            <div className="ai-empty-state !min-h-[16rem]">
                                <div className="ai-empty-orb">KB</div>
                                <div className="space-y-2">
                                    <h2 className="text-xl font-bold tracking-tight text-slate-900">Base de conhecimento vazia</h2>
                                    <p className="mx-auto max-w-xl ai-muted">Adicione textos, sites, vídeos ou documentos para transformar este Brand DNA em um segundo cérebro factual.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* FORMULÁRIO (DIREITA/SIDEBAR) */}
                <aside className="ai-card ai-panel space-y-4 h-fit sticky top-4">
                    <div className="ai-panel-header">
                        <h2 className="ai-panel-title">{editingDocumentId ? 'Editar fonte' : 'Nova fonte'}</h2>
                        <p className="ai-muted">A ingestão roda em background após o salvamento.</p>
                    </div>

                    {!editingDocumentId && (
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(typeOptions).map(([val, label]) => (
                                <button 
                                    key={val}
                                    type="button" 
                                    className={`ai-filter-btn text-xs ${type === val ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}
                                    onClick={() => setType(val)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="ai-field">
                        <label htmlFor="knowledge-title">Título</label>
                        <input id="knowledge-title" value={title} onChange={(e) => setTitle(e.target.value)} type="text" className="ai-input" maxLength="160" />
                    </div>

                    <div className="ai-field">
                        <label htmlFor="knowledge-summary">Resumo</label>
                        <textarea id="knowledge-summary" value={summary} onChange={(e) => setSummary(e.target.value)} className="ai-textarea" rows="2"></textarea>
                    </div>

                    {/* CAMPOS DINÂMICOS BASEADOS NO TIPO */}
                    {(editingDocumentId || type === 'text') ? (
                        <div className="ai-field">
                            <label htmlFor="knowledge-content">Conteúdo</label>
                            <textarea id="knowledge-content" value={content} onChange={(e) => setContent(e.target.value)} className="ai-textarea" rows="8"></textarea>
                        </div>
                    ) : (type === 'site' || type === 'youtube') ? (
                        <div className="ai-field">
                            <label htmlFor="knowledge-url">URL da fonte</label>
                            <input id="knowledge-url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} type="url" className="ai-input" placeholder="https://..." />
                        </div>
                    ) : (
                        <div className="ai-field">
                            <label htmlFor="knowledge-file">Arquivo</label>
                            <input id="knowledge-file" type="file" onChange={(e) => setKnowledgeFile(e.target.files[0])} className="ai-input" />
                            <p className="text-[10px] text-slate-500 mt-1">
                                {type === 'mp4_transcript' 
                                    ? 'Limite de 200 MB. O binário não fica salvo após o processamento.' 
                                    : 'Formatos aceitos: PDF, TXT, MD, CSV, JSON.'}
                            </p>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-3 pt-2">
                        <button type="button" className="ai-button ai-button-primary !py-2 !px-4" onClick={handleSave}>
                            {editingDocumentId ? 'Salvar alterações' : 'Adicionar fonte'}
                        </button>
                        <button type="button" className="ai-button ai-button-secondary !py-2 !px-4" onClick={resetForm}>Limpar</button>
                    </div>
                </aside>
            </div>
        </div>
    );
}