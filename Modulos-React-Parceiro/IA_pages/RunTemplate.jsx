import React, { useState } from 'react';

export default function RunTemplate({ 
    template = { 
        name: 'Nome do Template', 
        description: 'Descrição do template', 
        isText: true, 
        type: { accentClasses: 'bg-blue-100 text-blue-700' },
        input_schema: [] 
    },
    initialGeneration = null,
    brandOptions = [],
    selectedBrandPersonas = [],
    providerOptions = [{ key: 'openai', label: 'OpenAI' }],
    modelOptions = [{ id: 'gpt-4', label: 'GPT-4' }],
    briefQuestions = []
}) {
    // --- ESTADOS (Substituindo as variáveis do Livewire) ---
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [friendlyError, setFriendlyError] = useState(null);
    const [contextNotice, setContextNotice] = useState(null);
    const [activeGeneration, setActiveGeneration] = useState(initialGeneration);
    const [generatedContentItems, setGeneratedContentItems] = useState([]);

    // Configurações do formulário
    const [useBrandDna, setUseBrandDna] = useState(false);
    const [selectedBrandDna, setSelectedBrandDna] = useState(null);
    const [useKnowledgeBase, setUseKnowledgeBase] = useState(false);
    const [selectedBrandPersonaId, setSelectedBrandPersonaId] = useState('');
    const [brandSearch, setBrandSearch] = useState('');
    
    const [selectedProvider, setSelectedProvider] = useState(providerOptions[0]?.key || '');
    const [selectedModel, setSelectedModel] = useState(modelOptions[0]?.id || '');
    const [resultCount, setResultCount] = useState(1);
    
    const [briefAnswers, setBriefAnswers] = useState({});
    const [advancedMode, setAdvancedMode] = useState(false);
    const [inputs, setInputs] = useState({});

    const typeLabel = template.isText ? 'TX' : 'IMG';

    // --- FUNÇÕES ---
    const copyText = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        setIsGenerating(true);
        
        // Aqui o dev do seu parceiro vai plugar a chamada da API do backend dele
        console.log("Enviando payload para a IA:", {
            template: template.name,
            provider: selectedProvider,
            model: selectedModel,
            results: resultCount,
            brandDna: useBrandDna ? selectedBrandDna : null,
            briefing: briefAnswers,
            inputs: inputs
        });

        // Simulação de carregamento e resposta...
        setTimeout(() => {
            setIsGenerating(false);
            // mock setGeneratedContentItems(...)
        }, 2000);
    };

    return (
        <section className="ai-module w-full">
            <div className="ai-shell">
                
                {/* BREADCRUMBS */}
                <div className="ai-breadcrumbs">
                    <a href="/dashboard">Dashboard</a>
                    <span>/</span>
                    <a href="/templates">Templates</a>
                    <span>/</span>
                    <span className="text-slate-900">{template.name}</span>
                </div>

                {/* HEADER STRIP */}
                <div className="run-header-strip">
                    <div className="run-header-left">
                        <span className={`run-template-icon ${template.type?.accentClasses}`}>
                            {typeLabel}
                        </span>
                        <div style={{ minWidth: 0 }}>
                            <div className="run-header-name">{template.name}</div>
                            <div className="run-header-desc">{template.description}</div>
                        </div>
                    </div>
                    <div className="run-header-right">
                        {/* Placeholder para o componente de badge que vc tinha em Blade: <x-ai.template-type-badge /> */}
                        <span className="ai-inline-pill bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                            {template.isText ? 'Texto' : 'Imagem'}
                        </span>

                        {activeGeneration && (
                            <span className="ai-inline-pill bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                                última: há pouco
                            </span>
                        )}
                        <a href="/history" className="ai-button ai-button-secondary !py-2 !px-3 !text-xs">
                            Histórico
                        </a>
                    </div>
                </div>

                {/* ERROR GLOBAL */}
                {friendlyError && (
                    <div className="ai-callout border-rose-200 bg-rose-50/90 text-rose-700">
                        {friendlyError}
                    </div>
                )}

                {contextNotice && (
                    <div className="ai-callout border-amber-200 bg-amber-50/90 text-amber-800">
                        {contextNotice}
                    </div>
                )}

                {/* LAYOUT STUDIO: ESQUERDA = CONFIG | DIREITA = OUTPUT */}
                <div className="run-layout">

                    {/* ======= CONFIG PANEL ======= */}
                    <form onSubmit={handleGenerate} className="run-config">
                        <div className="run-config-header">
                            <span className="run-config-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </span>
                            <span className="run-config-title">Configuração</span>
                            <span className="text-xs text-slate-400">{template.input_schema?.length || 0} campos</span>
                        </div>

                        <div className="run-config-body">

                            {/* BRAND DNA */}
                            <div className="run-config-section">
                                <span className="run-section-label">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                    </svg>
                                    Brand DNA
                                </span>

                                <div className="run-toggle-row">
                                    <div>
                                        <div className="run-toggle-label">Usar Brand DNA</div>
                                        <div className="run-toggle-sublabel">Contexto de marca no prompt</div>
                                    </div>
                                    <label className="brand-switch">
                                        <input type="checkbox" checked={useBrandDna} onChange={(e) => setUseBrandDna(e.target.checked)} />
                                        <span className="brand-switch-track"></span>
                                    </label>
                                </div>

                                {useBrandDna && (
                                    selectedBrandDna ? (
                                        <div className="run-brand-selected">
                                            <div style={{ minWidth: 0 }}>
                                                <div className="run-brand-selected-name">{selectedBrandDna.name}</div>
                                                <div className="run-brand-selected-sub">{selectedBrandDna.primary_product}</div>
                                            </div>
                                            <button type="button" className="run-copy-btn" onClick={() => setSelectedBrandDna(null)}>
                                                Limpar
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="ai-field">
                                            <input
                                                type="text"
                                                className="ai-input"
                                                style={{ fontSize: '0.84rem' }}
                                                placeholder="Buscar marca..."
                                                value={brandSearch}
                                                onChange={(e) => setBrandSearch(e.target.value)}
                                            />
                                        </div>
                                    )
                                )}
                            </div>

                            {/* PROVIDER / MODEL */}
                            <div className="run-config-section">
                                <span className="run-section-label">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
                                    </svg>
                                    Modelo de IA
                                </span>

                                <div className="run-provider-grid">
                                    <div className="ai-field" style={{ gap: '0.35rem' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--ai-text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Provider</label>
                                        <select value={selectedProvider} onChange={(e) => setSelectedProvider(e.target.value)} className="ai-select" style={{ fontSize: '0.84rem', padding: '0.5rem 0.75rem' }}>
                                            {providerOptions.map(p => (
                                                <option key={p.key} value={p.key}>{p.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="ai-field" style={{ gap: '0.35rem' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--ai-text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Modelo</label>
                                        <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="ai-select" style={{ fontSize: '0.84rem', padding: '0.5rem 0.75rem' }}>
                                            {modelOptions.map(m => (
                                                <option key={m.id} value={m.id}>{m.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="ai-field" style={{ gap: '0.35rem' }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--ai-text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Resultados</label>
                                    <select value={resultCount} onChange={(e) => setResultCount(Number(e.target.value))} className="ai-select" style={{ fontSize: '0.84rem', padding: '0.5rem 0.75rem' }}>
                                        {[1, 2, 3, 4, 5].map(count => (
                                            <option key={count} value={count}>{count} resultado{count > 1 ? 's' : ''}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* BRIEFING GUIADO */}
                            {briefQuestions.length > 0 && (
                                <div className="run-config-section">
                                    <span className="run-section-label">Briefing guiado</span>
                                    {briefQuestions.map(q => (
                                        <div key={q.key} className="ai-field" style={{ gap: '0.35rem' }}>
                                            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ai-text)' }}>{q.label}</label>
                                            {q.type === 'textarea' ? (
                                                <textarea
                                                    className="ai-textarea"
                                                    rows="3"
                                                    style={{ fontSize: '0.84rem', minHeight: '5rem' }}
                                                    placeholder={q.placeholder}
                                                    value={briefAnswers[q.key] || ''}
                                                    onChange={(e) => setBriefAnswers({...briefAnswers, [q.key]: e.target.value})}
                                                />
                                            ) : (
                                                <input
                                                    className="ai-input"
                                                    type="text"
                                                    style={{ fontSize: '0.84rem', padding: '0.5rem 0.75rem' }}
                                                    placeholder={q.placeholder}
                                                    value={briefAnswers[q.key] || ''}
                                                    onChange={(e) => setBriefAnswers({...briefAnswers, [q.key]: e.target.value})}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* MODO AVANÇADO */}
                            <div className="run-toggle-row mt-4">
                                <div>
                                    <div className="run-toggle-label">Campos técnicos</div>
                                    <div className="run-toggle-sublabel">Campos técnicos do template</div>
                                </div>
                                <label className="brand-switch">
                                    <input type="checkbox" checked={advancedMode} onChange={(e) => setAdvancedMode(e.target.checked)} />
                                    <span className="brand-switch-track"></span>
                                </label>
                            </div>

                            {/* CAMPOS DO TEMPLATE */}
                            {advancedMode && template.input_schema && (
                                <div className="run-config-section">
                                    <span className="run-section-label">Entrada Avançada</span>
                                    {template.input_schema.map(field => (
                                        <div key={field.name} className="ai-field" style={{ gap: '0.35rem' }}>
                                            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ai-text)' }}>{field.label}</label>
                                            
                                            {field.type === 'textarea' ? (
                                                <textarea
                                                    className="ai-textarea"
                                                    rows="4"
                                                    style={{ fontSize: '0.84rem', minHeight: '6rem' }}
                                                    placeholder={`${field.label}...`}
                                                    value={inputs[field.name] || ''}
                                                    onChange={(e) => setInputs({...inputs, [field.name]: e.target.value})}
                                                />
                                            ) : field.type === 'select' ? (
                                                <select
                                                    className="ai-select"
                                                    style={{ fontSize: '0.84rem', padding: '0.5rem 0.75rem' }}
                                                    value={inputs[field.name] || ''}
                                                    onChange={(e) => setInputs({...inputs, [field.name]: e.target.value})}
                                                >
                                                    <option value="">Selecione...</option>
                                                    {field.options?.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    className="ai-input"
                                                    type={field.type === 'number' ? 'number' : 'text'}
                                                    style={{ fontSize: '0.84rem', padding: '0.5rem 0.75rem' }}
                                                    placeholder={`${field.label}...`}
                                                    value={inputs[field.name] || ''}
                                                    onChange={(e) => setInputs({...inputs, [field.name]: e.target.value})}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* BOTÃO GERAR */}
                        <button type="submit" className="run-submit" disabled={isGenerating}>
                            {isGenerating ? (
                                <span>
                                    <svg className="inline-block size-4 mr-1 -mt-0.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                                    Gerando...
                                </span>
                            ) : (
                                <span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="inline-block size-4 mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"/></svg>
                                    Gerar agora
                                </span>
                            )}
                        </button>
                    </form>

                    {/* ======= OUTPUT PANEL ======= */}
                    <div className="run-output">
                        <div className="run-output-header">
                            <span className="run-output-title">Resultado</span>
                            <div className="run-output-meta">
                                {activeGeneration && activeGeneration.status === 'completed' && template.isText && (
                                    <button type="button" className="run-copy-btn" onClick={() => copyText(activeGeneration.output_text)}>
                                        {copied ? 'Copiado!' : 'Copiar'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* LOADING STATE */}
                        {isGenerating && (
                            <div className="run-output-body">
                                <div className="run-loading">
                                    <div className="run-loading-orb"></div>
                                    <p className="run-loading-text">Gerando conteúdo<span className="run-loading-dots"></span></p>
                                </div>
                            </div>
                        )}

                        {/* RESULTADOS */}
                        {!isGenerating && (
                            <div className="run-output-body">
                                {generatedContentItems.length > 0 ? (
                                    <div className="space-y-4">
                                        {generatedContentItems.map((item, idx) => (
                                            <article key={idx} className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                                                {item.isText ? (
                                                    <div className="run-result-prose">{item.body}</div>
                                                ) : (
                                                    <div className="ai-image-frame">
                                                        <img src={item.outputUrl} alt="Output" />
                                                    </div>
                                                )}
                                            </article>
                                        ))}
                                    </div>
                                ) : activeGeneration ? (
                                    activeGeneration.status === 'failed' ? (
                                        <div className="run-empty">
                                            <p className="run-empty-title">A geração falhou</p>
                                            <p className="run-empty-sub">{activeGeneration.error_message}</p>
                                        </div>
                                    ) : (
                                        template.isText ? (
                                            <div className="run-result-prose">{activeGeneration.output_text}</div>
                                        ) : (
                                            <div className="ai-image-frame">
                                                <img src={activeGeneration.outputUrl} alt="Output" />
                                            </div>
                                        )
                                    )
                                ) : (
                                    <div className="run-empty">
                                        <p className="run-empty-title">Pronto para gerar</p>
                                        <p className="run-empty-sub">
                                            Preencha os campos ao lado e clique em <strong>Gerar agora</strong>.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}