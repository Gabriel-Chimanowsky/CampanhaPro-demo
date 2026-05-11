import React, { useState } from 'react';

export default function ExampleManager({ initialExamples = [] }) {
    // --- ESTADOS DA LISTA ---
    const [examples, setExamples] = useState(initialExamples);
    const [statusMessage, setStatusMessage] = useState(null);

    // --- ESTADOS DO FORMULÁRIO ---
    const [editingExampleId, setEditingExampleId] = useState(null);
    const [title, setTitle] = useState('');
    const [contentType, setContentType] = useState('');
    const [content, setContent] = useState('');
    const [notes, setNotes] = useState('');

    // --- AÇÕES ---
    const resetForm = () => {
        setEditingExampleId(null);
        setTitle('');
        setContentType('');
        setContent('');
        setNotes('');
    };

    const handleEdit = (example) => {
        setEditingExampleId(example.id);
        setTitle(example.title);
        setContentType(example.content_type || '');
        setContent(example.content || '');
        setNotes(example.notes || '');
    };

    const handleDelete = (id) => {
        if (window.confirm("Tem certeza que deseja excluir este exemplo?")) {
            setExamples(examples.filter(e => e.id !== id));
            setStatusMessage("Exemplo removido com sucesso.");
            setTimeout(() => setStatusMessage(null), 3000);
        }
    };

    const handleSave = () => {
        // MOCK: O dev do seu parceiro fará a integração com a API aqui
        const payload = { title, contentType, content, notes };
        console.log("Salvando exemplo:", payload);

        setStatusMessage("Exemplo salvo com sucesso!");
        resetForm();
        setTimeout(() => setStatusMessage(null), 3000);
    };

    return (
        <div className="space-y-6">
            {statusMessage && (
                <div className="ai-callout border-emerald-200 bg-emerald-50/90 text-emerald-700">
                    {statusMessage}
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),24rem]">
                
                {/* LISTA DE EXEMPLOS (ESQUERDA) */}
                <div className="space-y-4">
                    {examples.length > 0 ? (
                        examples.map(example => (
                            <article key={example.id} className="ai-card ai-panel">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="ai-panel-title">{example.title}</h3>
                                            {example.content_type && (
                                                <span className="ai-inline-pill bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                                                    {example.content_type}
                                                </span>
                                            )}
                                        </div>

                                        <p className="ai-muted text-sm">
                                            {example.content?.length > 220 
                                                ? `${example.content.substring(0, 220)}...` 
                                                : example.content}
                                        </p>

                                        {example.notes && (
                                            <p className="text-sm text-slate-500 italic">Obs: {example.notes}</p>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button type="button" className="ai-button ai-button-secondary !px-4 !py-2" onClick={() => handleEdit(example)}>Editar</button>
                                        <button type="button" className="ai-button ai-button-secondary !px-4 !py-2" onClick={() => handleDelete(example.id)}>Excluir</button>
                                    </div>
                                </div>
                            </article>
                        ))
                    ) : (
                        <div className="ai-card ai-panel">
                            <div className="ai-empty-state !min-h-[16rem]">
                                <div className="ai-empty-orb">E</div>
                                <div className="space-y-2">
                                    <h2 className="text-xl font-bold tracking-tight text-slate-900">Nenhum exemplo salvo</h2>
                                    <p className="mx-auto max-w-xl ai-muted">Use exemplos para ensinar formato, tamanho, CTA e o acabamento final esperado pela marca.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* FORMULÁRIO (DIREITA/SIDEBAR) */}
                <aside className="ai-card ai-panel space-y-4 h-fit sticky top-4">
                    <div className="ai-panel-header">
                        <h2 className="ai-panel-title">{editingExampleId ? 'Editar exemplo' : 'Novo exemplo'}</h2>
                        <p className="ai-muted">Oriente a padronização de formato da marca.</p>
                    </div>

                    <div className="ai-field">
                        <label htmlFor="example-title">Título</label>
                        <input 
                            id="example-title" 
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)} 
                            type="text" 
                            className="ai-input" 
                            maxLength="120" 
                        />
                    </div>

                    <div className="ai-field">
                        <label htmlFor="example-type">Tipo de conteúdo</label>
                        <input 
                            id="example-type" 
                            value={contentType} 
                            onChange={(e) => setContentType(e.target.value)} 
                            type="text" 
                            className="ai-input" 
                            maxLength="80" 
                            placeholder="Ex.: legenda, e-mail, anúncio" 
                        />
                    </div>

                    <div className="ai-field">
                        <label htmlFor="example-content">Conteúdo ideal</label>
                        <textarea 
                            id="example-content" 
                            value={content} 
                            onChange={(e) => setContent(e.target.value)} 
                            className="ai-textarea" 
                            rows="9"
                            placeholder="Cole aqui um texto que seja nota 10 para a marca..."
                        ></textarea>
                    </div>

                    <div className="ai-field">
                        <label htmlFor="example-notes">Observações</label>
                        <textarea 
                            id="example-notes" 
                            value={notes} 
                            onChange={(e) => setNotes(e.target.value)} 
                            className="ai-textarea" 
                            rows="3"
                            placeholder="Diga à IA por que este exemplo é bom..."
                        ></textarea>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                        <button type="button" className="ai-button ai-button-primary !py-2 !px-4" onClick={handleSave}>
                            Salvar exemplo
                        </button>
                        {editingExampleId && (
                            <button type="button" className="ai-button ai-button-secondary !py-2 !px-4" onClick={resetForm}>
                                Cancelar
                            </button>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}