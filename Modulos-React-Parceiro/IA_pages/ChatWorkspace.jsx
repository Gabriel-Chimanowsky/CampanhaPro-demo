import React, { useState, useEffect, useRef } from 'react';

export default function ChatWorkspace({ initialState = {} }) {
    // --- ESTADOS (Migrados do Alpine.js) ---
    const [sessions, setSessions] = useState(initialState.sessions || []);
    const [activeSession, setActiveSession] = useState(initialState.activeSession || null);
    const [messages, setMessages] = useState(initialState.messages || []);
    const [allModels] = useState(initialState.allModels || []);
    const [roles] = useState(initialState.roles || []);
    const [brands] = useState(initialState.brands || []);
    
    const [context, setContext] = useState({
        provider: initialState.context?.provider || '',
        model: initialState.context?.model || '',
        brand_dna_id: initialState.context?.brand_dna_id ? String(initialState.context.brand_dna_id) : '',
        brand_dna_persona_id: initialState.context?.brand_dna_persona_id ? String(initialState.context.brand_dna_persona_id) : '',
        knowledge_enabled: !!initialState.context?.knowledge_enabled,
        web_search_enabled: false,
        role: initialState.context?.role || '',
    });

    const [draft, setDraft] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    
    // Select unificado de provider:model
    const [modelKey, setModelKey] = useState(
        (initialState.context?.provider && initialState.context?.model) 
            ? `${initialState.context.provider}:${initialState.context.model}` 
            : ''
    );

    // Refs
    const messageListRef = useRef(null);
    const textareaRef = useRef(null);

    // --- DERIVADOS ---
    const selectedBrand = brands.find(b => String(b.id) === String(context.brand_dna_id)) || null;

    const modelGroups = () => {
        const groups = [];
        const seen = new Set();
        for (const m of allModels) {
            if (!seen.has(m.group)) {
                seen.add(m.group);
                groups.push({ label: m.group, models: [] });
            }
            groups.find(g => g.label === m.group).models.push(m);
        }
        return groups;
    };

    const currentModelLabel = () => {
        const model = allModels.find(m => m.key === modelKey);
        return model?.label || '';
    };

    // --- EFEITOS ---
    // Inicialização (scroll)
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Handle mudança de modelo
    useEffect(() => {
        const model = allModels.find(m => m.key === modelKey);
        if (model) {
            setContext(prev => ({ ...prev, provider: model.provider, model: model.model }));
            // mock queuePersistContext();
        }
    }, [modelKey, allModels]);

    // Handle mudança de brand (limpar persona se brand mudar)
    useEffect(() => {
        if (!selectedBrand) {
            setContext(prev => ({ ...prev, brand_dna_persona_id: '', knowledge_enabled: false }));
        } else {
            if (!selectedBrand.personas.find(p => String(p.id) === String(context.brand_dna_persona_id))) {
                setContext(prev => ({ ...prev, brand_dna_persona_id: '' }));
            }
            if (selectedBrand.ready_knowledge_documents_count === 0) {
                setContext(prev => ({ ...prev, knowledge_enabled: false }));
            }
        }
    }, [context.brand_dna_id, selectedBrand]);

    // --- FUNÇÕES DE INTERFACE ---
    const scrollToBottom = () => {
        if (messageListRef.current) {
            messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
    };

    const sessionMonogram = (session) => {
        const title = (session?.title || 'NC').trim();
        return title.split(/\s+/).slice(0, 2).map(word => word.charAt(0)).join('').toUpperCase();
    };

    const handlePromptClick = (text) => {
        setDraft(text);
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    };

    const submitMessage = async (e) => {
        if (e) e.preventDefault();
        
        const messageText = draft.trim();
        if (!messageText || isStreaming) return;

        setIsStreaming(true);
        setDraft('');

        const turnKey = `turn-${Date.now()}`;
        const userMessageKey = `${turnKey}-user`;
        const assistantMessageKey = `${turnKey}-assistant`;

        const userMessage = {
            client_key: userMessageKey,
            id: null,
            role: 'user',
            content: messageText,
            status: 'completed',
            sources: []
        };

        const assistantMessage = {
            client_key: assistantMessageKey,
            id: null,
            role: 'assistant',
            content: '',
            status: 'streaming',
            sources: []
        };

        setMessages(prev => [...prev, userMessage, assistantMessage]);

        // AQUI O DEV PARCEIRO VAI PLUGAR O FETCH / EventSource PARA A API DELE
        console.log("Enviando para API:", { message: messageText, context });
        
        // Simulação simples de resposta (Mock)
        setTimeout(() => {
            setMessages(prev => prev.map(m => {
                if (m.client_key === assistantMessageKey) {
                    return { ...m, status: 'completed', content: 'Esta é uma resposta simulada do assistente convertido em React.' };
                }
                return m;
            }));
            setIsStreaming(false);
        }, 2000);
    };

    // Componente auxiliar de fontes (Collapsible)
    const SourcesFooter = ({ sources }) => {
        const [open, setOpen] = useState(false);
        return (
            <div className="cw-sources-footer">
                <button type="button" className="cw-sources-toggle" onClick={() => setOpen(!open)}>
                    <svg className="cw-sources-toggle-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 6l4 4 4-4"/>
                    </svg>
                    <span>{sources.length} fonte{sources.length > 1 ? 's' : ''} utilizada{sources.length > 1 ? 's' : ''}</span>
                </button>
                {open && (
                    <div className="cw-sources-collapse">
                        <ol className="cw-sources-list">
                            {sources.map((source, idx) => (
                                <li key={idx} className="cw-source-item">
                                    <div className="cw-source-item-head">
                                        <strong>{source.title || `Fonte ${source.rank}`}</strong>
                                        {source.score && <span className="cw-source-score">{(source.score * 100).toFixed(0)}%</span>}
                                    </div>
                                    {source.excerpt && <p className="cw-source-excerpt">{source.excerpt}</p>}
                                    {source.url && (
                                        <a href={source.url} target="_blank" rel="noreferrer" className="cw-source-link">Abrir referência ↗</a>
                                    )}
                                </li>
                            ))}
                        </ol>
                    </div>
                )}
            </div>
        );
    };

    return (
        <section className="cw-root">
            <div className="cw-chrome">

                {/* ── LEFT: CONVERSATIONS SIDEBAR ───────────────────────────────── */}
                <aside className="cw-sidebar">
                    <div className="cw-sidebar-top">
                        <div className="cw-sidebar-brand">
                            <div className="cw-sidebar-brand-dot"></div>
                            <span>Conversas</span>
                        </div>
                        <a href="/chat" className="cw-new-btn" title="Nova conversa">
                            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/>
                            </svg>
                        </a>
                    </div>

                    {/* Active session insight */}
                    {activeSession && (
                        <div className="cw-session-now">
                            <span className="cw-session-now-label">ativo</span>
                            <strong>{activeSession.title || 'Nova conversa'}</strong>
                            <span>{selectedBrand ? `⬡ ${selectedBrand.name}` : 'sem Brand DNA'}</span>
                        </div>
                    )}

                    {/* Session list */}
                    <div className="cw-session-list">
                        {sessions.length === 0 ? (
                            <div className="cw-session-empty">
                                <div className="cw-session-empty-glyph">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                    </svg>
                                </div>
                                <div>
                                    <strong>Histórico vazio</strong>
                                    <p>Inicie uma conversa para criar a primeira sessão.</p>
                                </div>
                            </div>
                        ) : (
                            sessions.map(session => (
                                <a
                                    key={session.id}
                                    href={session.url || '#'}
                                    className={`cw-session-item ${activeSession?.id === session.id ? 'is-active' : ''}`}
                                >
                                    <div className="cw-session-mono">{sessionMonogram(session)}</div>
                                    <div className="cw-session-body">
                                        <div className="cw-session-row">
                                            <span className="cw-session-title">{session.title}</span>
                                            {activeSession?.id === session.id && <span className="cw-session-badge">ao vivo</span>}
                                        </div>
                                        <time className="cw-session-time">{session.last_used_at || 'agora'}</time>
                                    </div>
                                </a>
                            ))
                        )}
                    </div>
                </aside>

                {/* ── CENTER: CHAT STAGE ─────────────────────────────────────────── */}
                <main className="cw-stage">
                    {/* Stage toolbar */}
                    <div className="cw-stage-bar">
                        <div className="cw-stage-bar-left">
                            <div className="cw-stage-breadcrumb">
                                <a href="/dashboard">Dashboard</a>
                                <svg viewBox="0 0 6 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 1l4 4-4 4"/></svg>
                                <span>Chat IA</span>
                            </div>
                            <h1 className="cw-stage-title">{activeSession?.title || 'Nova conversa'}</h1>
                        </div>

                        <div className="cw-stage-chips">
                            {currentModelLabel() && <span className="cw-chip cw-chip-model">{currentModelLabel()}</span>}
                            {selectedBrand && <span className="cw-chip cw-chip-brand">{selectedBrand.name}</span>}
                            {context.role && <span className="cw-chip cw-chip-role">{context.role}</span>}
                        </div>
                    </div>

                    {/* Thread */}
                    <div className="cw-thread" ref={messageListRef}>
                        {messages.length === 0 ? (
                            <div className="cw-empty">
                                <div className="cw-empty-orb">
                                    <div className="cw-empty-orb-ring"></div>
                                    <div className="cw-empty-orb-core">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7z"/>
                                            <circle cx="12" cy="9" r="2.5"/>
                                        </svg>
                                    </div>
                                </div>

                                <div className="cw-empty-copy">
                                    <p className="cw-empty-eye">Pronto para conversar</p>
                                    <h2 className="cw-empty-headline">Seu assistente de IA<br/><em>está esperando</em></h2>
                                    <p className="cw-empty-sub">Configure o modelo e Brand DNA na barra abaixo, depois envie sua primeira mensagem.</p>
                                </div>

                                <div className="cw-empty-prompts">
                                    <button type="button" className="cw-prompt-chip" onClick={() => handlePromptClick('Crie uma estratégia de campanha de lançamento para o produto')}>
                                        Criar estratégia de campanha
                                    </button>
                                    <button type="button" className="cw-prompt-chip" onClick={() => handlePromptClick('Resuma o Brand DNA atual e seus pontos-chave')}>
                                        Resumir Brand DNA
                                    </button>
                                    <button type="button" className="cw-prompt-chip" onClick={() => handlePromptClick('Planeje um fluxo comercial completo para captação de leads')}>
                                        Planejar fluxo comercial
                                    </button>
                                </div>
                            </div>
                        ) : (
                            messages.map(message => (
                                <div key={message.client_key || message.id} className={`cw-msg-row ${message.role === 'user' ? 'cw-msg-user' : 'cw-msg-ai'}`}>
                                    <div className={`cw-msg-avatar ${message.role === 'user' ? 'cw-avatar-user' : 'cw-avatar-ai'}`}>
                                        {message.role === 'user' ? 'VO' : 'GT'}
                                    </div>

                                    <div className="cw-msg-stack">
                                        <div className="cw-msg-meta">
                                            <span className="cw-msg-author">{message.role === 'user' ? 'Você' : 'GTFlow AI'}</span>
                                            <span className={`cw-msg-status ${message.status === 'streaming' ? 'is-streaming' : ''} ${message.status === 'failed' ? 'is-error' : ''}`}>
                                                {message.status === 'streaming' ? 'digitando…' : (message.status === 'failed' ? 'erro na resposta' : '')}
                                            </span>
                                        </div>

                                        <div className={`cw-bubble ${message.role === 'user' ? 'cw-bubble-user' : 'cw-bubble-ai'}`} data-state={message.status}>
                                            {message.content ? (
                                                <div className="cw-bubble-text">{message.content}</div>
                                            ) : (
                                                message.status === 'streaming' && (
                                                    <div className="cw-typing">
                                                        <span></span><span></span><span></span>
                                                    </div>
                                                )
                                            )}
                                        </div>

                                        {/* Sources */}
                                        {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                                            <SourcesFooter sources={message.sources} />
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Composer */}
                    <form className="cw-composer" onSubmit={submitMessage}>
                        {/* Toolbar */}
                        <div className="cw-composer-toolbar">
                            <div className="cw-toolbar-group">
                                <label className="cw-toolbar-label" htmlFor="cw-model-select">Modelo</label>
                                <select id="cw-model-select" className="cw-toolbar-select" value={modelKey} onChange={(e) => setModelKey(e.target.value)}>
                                    {modelGroups().map(group => (
                                        <optgroup key={group.label} label={group.label}>
                                            {group.models.map(m => (
                                                <option key={m.key} value={m.key}>{m.label}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>

                            <div className="cw-toolbar-group">
                                <label className="cw-toolbar-label" htmlFor="cw-role-select">Papel</label>
                                <select id="cw-role-select" className="cw-toolbar-select" value={context.role} onChange={(e) => setContext({...context, role: e.target.value})}>
                                    <option value="">Sem papel</option>
                                    {roles.map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="cw-toolbar-group">
                                <label className="cw-toolbar-label" htmlFor="cw-brand-select">Brand DNA</label>
                                <select id="cw-brand-select" className="cw-toolbar-select" value={context.brand_dna_id} onChange={(e) => setContext({...context, brand_dna_id: e.target.value})}>
                                    <option value="">Nenhum</option>
                                    {brands.map(brand => (
                                        <option key={brand.id} value={String(brand.id)}>{brand.name}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedBrand && (
                                <div className="cw-toolbar-extras">
                                    {selectedBrand.personas && selectedBrand.personas.length > 0 && (
                                        <div className="cw-toolbar-group">
                                            <label className="cw-toolbar-label" htmlFor="cw-persona-select">Persona</label>
                                            <select id="cw-persona-select" className="cw-toolbar-select" value={context.brand_dna_persona_id} onChange={(e) => setContext({...context, brand_dna_persona_id: e.target.value})}>
                                                <option value="">Sem persona</option>
                                                {selectedBrand.personas.map(persona => (
                                                    <option key={persona.id} value={String(persona.id)}>{persona.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <label className={`cw-toolbar-toggle ${selectedBrand.ready_knowledge_documents_count === 0 ? 'is-disabled' : ''}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={context.knowledge_enabled} 
                                            disabled={selectedBrand.ready_knowledge_documents_count === 0}
                                            onChange={(e) => setContext({...context, knowledge_enabled: e.target.checked})}
                                        />
                                        <span className="cw-toolbar-toggle-track"></span>
                                        <span className="cw-toolbar-toggle-label">
                                            RAG
                                            <small>{selectedBrand.ready_knowledge_documents_count} doc{selectedBrand.ready_knowledge_documents_count !== 1 ? 's' : ''}</small>
                                        </span>
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Text area */}
                        <div className="cw-composer-field">
                            <textarea
                                ref={textareaRef}
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                rows="1"
                                className="cw-composer-input"
                                placeholder="Escreva sua pergunta, tarefa ou briefing…"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        submitMessage();
                                    }
                                }}
                            ></textarea>

                            <div className="cw-composer-actions">
                                <span className="cw-composer-hint">↵ Enviar &nbsp; ⇧↵ Nova linha</span>
                                <button type="submit" className="cw-send-btn" disabled={isStreaming || !draft.trim()}>
                                    {!isStreaming ? (
                                        <span>
                                            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 0 0-1.788 0l-7 14a1 1 0 0 0 1.169 1.409l2.98-.744.995 3.98a1 1 0 0 0 1.844.265L10 18.118l2.906 3.345a1 1 0 0 0 1.844-.265l.995-3.98 2.98.744a1 1 0 0 0 1.169-1.409l-7-14z"/></svg>
                                            Enviar
                                        </span>
                                    ) : (
                                        <span>
                                            <span className="cw-sending-dots"><span></span><span></span><span></span></span>
                                            Gerando…
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </main>
            </div>
        </section>
    );
}