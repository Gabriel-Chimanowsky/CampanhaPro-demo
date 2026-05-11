import React, { useState } from 'react';

export default function PersonaManager({ 
    initialPersonas = [], 
    awarenessLevels = ['Inconsciente', 'Consciente do Problema', 'Consciente da Solução', 'Consciente do Produto', 'Totalmente Consciente'] 
}) {
    // --- ESTADOS DA LISTA ---
    const [personas, setPersonas] = useState(initialPersonas);
    const [statusMessage, setStatusMessage] = useState(null);

    // --- ESTADOS DO FORMULÁRIO ---
    const [editingPersonaId, setEditingPersonaId] = useState(null);
    const [label, setLabel] = useState('');
    const [characteristics, setCharacteristics] = useState('');
    const [awarenessLevel, setAwarenessLevel] = useState('');
    const [objections, setObjections] = useState('');
    const [desiredOutcomes, setDesiredOutcomes] = useState('');

    // --- AÇÕES ---
    const resetForm = () => {
        setEditingPersonaId(null);
        setLabel('');
        setCharacteristics('');
        setAwarenessLevel('');
        setObjections('');
        setDesiredOutcomes('');
    };

    const handleEdit = (persona) => {
        setEditingPersonaId(persona.id);
        setLabel(persona.label);
        setCharacteristics(persona.characteristics || '');
        setAwarenessLevel(persona.awareness_level || '');
        setObjections(persona.objections || '');
        setDesiredOutcomes(persona.desired_outcomes || '');
    };

    const handleDelete = (id) => {
        if (window.confirm("Tem certeza que deseja excluir esta persona?")) {
            setPersonas(personas.filter(p => p.id !== id));
            setStatusMessage("Persona excluída com sucesso.");
            setTimeout(() => setStatusMessage(null), 3000);
        }
    };

    const handleSave = () => {
        // MOCK: O dev do seu parceiro conectará o POST/PUT aqui
        const payload = { label, characteristics, awarenessLevel, objections, desiredOutcomes };
        console.log("Salvando persona:", payload);

        setStatusMessage("Persona salva com sucesso!");
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

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),22rem]">
                
                {/* LISTA DE PERSONAS (ESQUERDA) */}
                <div className="space-y-4">
                    {personas.length > 0 ? (
                        personas.map(persona => (
                            <article key={persona.id} className="ai-card ai-panel">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-2">
                                        <h3 className="ai-panel-title">{persona.label}</h3>
                                        <p className="ai-muted text-sm">{persona.characteristics}</p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button type="button" className="ai-button ai-button-secondary !px-4 !py-2" onClick={() => handleEdit(persona)}>Editar</button>
                                        <button type="button" className="ai-button ai-button-secondary !px-4 !py-2" onClick={() => handleDelete(persona.id)}>Excluir</button>
                                    </div>
                                </div>

                                <div className="ai-field-list mt-3">
                                    {persona.awareness_level && (
                                        <span className="ai-field-chip">{persona.awareness_level}</span>
                                    )}
                                    {persona.objections && (
                                        <span className="ai-field-chip">Objeções mapeadas</span>
                                    )}
                                    {persona.desired_outcomes && (
                                        <span className="ai-field-chip">Resultados desejados</span>
                                    )}
                                </div>
                            </article>
                        ))
                    ) : (
                        <div className="ai-card ai-panel">
                            <div className="ai-empty-state !min-h-[16rem]">
                                <div className="ai-empty-orb">P</div>
                                <div className="space-y-2">
                                    <h2 className="text-xl font-bold tracking-tight text-slate-900">Nenhuma persona cadastrada</h2>
                                    <p className="mx-auto max-w-xl ai-muted">Cadastre pelo menos uma persona para adaptar melhor o contexto da marca nas gerações.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* FORMULÁRIO (DIREITA/SIDEBAR) */}
                <aside className="ai-card ai-panel space-y-4 h-fit sticky top-4">
                    <div className="ai-panel-header">
                        <h2 className="ai-panel-title">{editingPersonaId ? 'Editar persona' : 'Nova persona'}</h2>
                        <p className="ai-muted">Mapeie contexto, nível de consciência e desejos.</p>
                    </div>

                    <div className="ai-field">
                        <label htmlFor="persona-label">Nome da persona</label>
                        <input 
                            id="persona-label" 
                            value={label} 
                            onChange={(e) => setLabel(e.target.value)} 
                            type="text" 
                            className="ai-input" 
                            maxlength="120" 
                        />
                    </div>

                    <div className="ai-field">
                        <label htmlFor="persona-characteristics">Características</label>
                        <textarea 
                            id="persona-characteristics" 
                            value={characteristics} 
                            onChange={(e) => setCharacteristics(e.target.value)} 
                            className="ai-textarea" 
                            rows="4"
                        ></textarea>
                    </div>

                    <div className="ai-field">
                        <label htmlFor="persona-awareness">Nível de consciência</label>
                        <select 
                            id="persona-awareness" 
                            value={awarenessLevel} 
                            onChange={(e) => setAwarenessLevel(e.target.value)} 
                            className="ai-select"
                        >
                            <option value="">Opcional</option>
                            {awarenessLevels.map(level => (
                                <option key={level} value={level}>{level}</option>
                            ))}
                        </select>
                    </div>

                    <div className="ai-field">
                        <label htmlFor="persona-objections">Objeções</label>
                        <textarea 
                            id="persona-objections" 
                            value={objections} 
                            onChange={(e) => setObjections(e.target.value)} 
                            className="ai-textarea" 
                            rows="3"
                        ></textarea>
                    </div>

                    <div className="ai-field">
                        <label htmlFor="persona-outcomes">Resultados desejados</label>
                        <textarea 
                            id="persona-outcomes" 
                            value={desiredOutcomes} 
                            onChange={(e) => setDesiredOutcomes(e.target.value)} 
                            className="ai-textarea" 
                            rows="3"
                        ></textarea>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                        <button type="button" className="ai-button ai-button-primary !py-2 !px-4" onClick={handleSave}>
                            Salvar persona
                        </button>
                        {editingPersonaId && (
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