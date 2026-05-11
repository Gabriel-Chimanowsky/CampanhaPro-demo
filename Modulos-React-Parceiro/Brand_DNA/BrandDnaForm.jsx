import React, { useState } from 'react';

// Placeholders para os sub-componentes que criaremos depois
const PersonaManager = () => <div className="p-4 bg-white rounded-xl border">Componente PersonaManager em breve...</div>;
const KnowledgeBaseManager = () => <div className="p-4 bg-white rounded-xl border">Componente KnowledgeBaseManager em breve...</div>;
const ExampleManager = () => <div className="p-4 bg-white rounded-xl border">Componente ExampleManager em breve...</div>;

export default function BrandDnaForm({ 
    initialBrandDna = null,
    recentGenerations = []
}) {
    // --- ESTADOS GERAIS E NAVEGAÇÃO ---
    const [activeSection, setActiveSection] = useState('overview');
    const [showHistory, setShowHistory] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [descOpen, setDescOpen] = useState(false);
    const [saveState, setSaveState] = useState('saved'); // 'saved', 'saving', 'error'
    const [saveStateMessage, setSaveStateMessage] = useState('Todas as alterações salvas');

    // --- ESTADOS DO FORMULÁRIO (BASIC) ---
    const [name, setName] = useState(initialBrandDna?.name || '');
    const [primaryProduct, setPrimaryProduct] = useState(initialBrandDna?.primary_product || '');
    const [pitchBio, setPitchBio] = useState('');
    const [brandDescription, setBrandDescription] = useState('');
    const [competitiveDifferentiators, setCompetitiveDifferentiators] = useState('');
    const [brandColors, setBrandColors] = useState(['#000000']);
    const [defaultLanguage, setDefaultLanguage] = useState('pt-BR');
    
    // Arrays e Inputs temporários
    const [niches, setNiches] = useState([]);
    const [nicheInput, setNicheInput] = useState('');

    // --- ESTADOS DO FORMULÁRIO (COMMUNICATION) ---
    const [defaultTone, setDefaultTone] = useState('profissional');
    const [customTone, setCustomTone] = useState('');
    
    const [writingStyles, setWritingStyles] = useState([]);
    const [writingStyleInput, setWritingStyleInput] = useState('');
    
    const [frequentTerms, setFrequentTerms] = useState([]);
    const [frequentTermInput, setFrequentTermInput] = useState('');
    
    const [forbiddenWords, setForbiddenWords] = useState([]);
    const [forbiddenWordInput, setForbiddenWordInput] = useState('');
    
    const [communicationNotes, setCommunicationNotes] = useState('');

    // --- LÓGICA DE PROGRESSO (Mockada baseada nos estados preenchidos) ---
    const completion = name && primaryProduct ? 45 : 10; 
    const circumference = 2 * 3.14159 * 18;
    const dashOffset = circumference - (circumference * completion / 100);

    const navSections = [
        { key: 'overview', icon: 'grid', label: 'Visão geral', progress: completion },
        { key: 'basic', icon: 'id', label: 'Identidade', progress: name ? 100 : 0 },
        { key: 'communication', icon: 'chat', label: 'Comunicação', progress: 50 },
        { key: 'personas', icon: 'users', label: 'Personas', progress: 0 },
        { key: 'knowledge', icon: 'book', label: 'Conhecimento', progress: 0 },
        { key: 'examples', icon: 'star', label: 'Exemplos', progress: 0 },
    ];

    // --- HELPERS PARA LISTAS ---
    const handleAddItem = (e, input, setInput, list, setList) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (input.trim() && !list.includes(input.trim())) {
                setList([...list, input.trim()]);
                setInput('');
            }
        }
    };

    const handleRemoveItem = (index, list, setList) => {
        setList(list.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        setSaveState('saving');
        setSaveStateMessage('Salvando...');
        // MOCK API CALL
        setTimeout(() => {
            setSaveState('saved');
            setSaveStateMessage('Salvo com sucesso!');
        }, 1000);
    };

    // Função auxiliar para renderizar os ícones do menu
    const renderIcon = (iconName) => {
        switch (iconName) {
            case 'grid': return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/></svg>;
            case 'id': return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z"/></svg>;
            case 'chat': return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/></svg>;
            case 'users': return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>;
            case 'book': return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/></svg>;
            case 'star': return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/></svg>;
            default: return null;
        }
    };

    return (
        <section className="ai-module w-full">
            <div className="ai-shell">
                
                {/* HEADER COMPACTO */}
                <div className="bdna-header">
                    <div className="bdna-header-left">
                        <div className="ai-breadcrumbs">
                            <a href="/dashboard">Dashboard</a>
                            <span>/</span>
                            <a href="/brands">Brand DNA</a>
                            <span>/</span>
                            <span className="text-slate-900 font-semibold">{initialBrandDna ? initialBrandDna.name : 'Novo workspace'}</span>
                        </div>
                    </div>

                    <div className="bdna-header-right">
                        <div className={`ai-inline-pill ${saveState === 'saved' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200' : (saveState === 'saving' ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-200' : 'bg-rose-100 text-rose-800 ring-1 ring-rose-200')}`}>
                            {saveStateMessage}
                        </div>

                        {initialBrandDna && (
                            <button type="button" className="ai-button ai-button-secondary !py-2 !px-3 !text-xs" onClick={() => setShowHistory(true)}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                Histórico
                            </button>
                        )}

                        <button type="button" className="ai-button ai-button-primary !py-2 !px-4" onClick={handleSave} disabled={saveState === 'saving'}>
                            {saveState === 'saving' ? 'Salvando...' : (initialBrandDna ? 'Salvar' : 'Criar workspace')}
                        </button>
                    </div>
                </div>

                {/* LAYOUT 2 COLUNAS */}
                <div className="bdna-layout">
                    
                    {/* SIDEBAR COMPACTA */}
                    <aside className="bdna-sidebar">
                        <div className="bdna-progress-block">
                            <div className="bdna-progress-ring">
                                <svg viewBox="0 0 40 40">
                                    <circle className="bdna-progress-ring-bg" cx="20" cy="20" r="18"/>
                                    <circle className="bdna-progress-ring-fill" cx="20" cy="20" r="18"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={dashOffset}
                                    />
                                </svg>
                                <span className="bdna-progress-ring-label">{completion}%</span>
                            </div>
                            <div className="bdna-progress-info">
                                <span className="bdna-progress-title">Nível Iniciante</span>
                                <span className="bdna-progress-sub">Treinamento IA</span>
                            </div>
                        </div>

                        <nav className="bdna-nav">
                            {navSections.map(section => {
                                const isActive = activeSection === section.key;
                                const dotClass = section.progress >= 100 ? 'bdna-dot-complete' : (section.progress >= 45 ? 'bdna-dot-progress' : 'bdna-dot-empty');

                                return (
                                    <button
                                        key={section.key}
                                        type="button"
                                        className={`bdna-nav-item ${isActive ? 'bdna-nav-item-active' : ''}`}
                                        onClick={() => setActiveSection(section.key)}
                                    >
                                        <span className="bdna-nav-icon">{renderIcon(section.icon)}</span>
                                        <span className="bdna-nav-label">{section.label}</span>
                                        <span className={`bdna-nav-dot ${dotClass}`}></span>
                                    </button>
                                );
                            })}
                        </nav>
                    </aside>

                    {/* CONTEÚDO PRINCIPAL */}
                    <div className="bdna-content">
                        
                        {/* ======== OVERVIEW ======== */}
                        {activeSection === 'overview' && (
                            <>
                                <div className="bdna-stat-strip">
                                    <span className="bdna-stat-chip"><strong>0</strong> personas</span>
                                    <span className="bdna-stat-chip"><strong>0</strong> fontes</span>
                                    <span className="bdna-stat-chip"><strong>0</strong> exemplos</span>
                                    <span className="bdna-stat-chip">{defaultLanguage.toUpperCase()}</span>
                                </div>

                                <div className="ai-card ai-panel">
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                        <div className="space-y-2">
                                            <span className="ai-inline-pill bg-amber-100 text-amber-800 ring-1 ring-amber-200">Próxima melhor ação</span>
                                            <h2 className="ai-panel-title">Preencha a Identidade Básica</h2>
                                            <p className="ai-muted">Sua marca ainda não tem nome ou produto principal definido.</p>
                                        </div>
                                        <button type="button" className="ai-button ai-button-primary !py-2 !px-4" onClick={() => setActiveSection('basic')}>
                                            Ir para Identidade
                                        </button>
                                    </div>
                                </div>

                                <div className="bdna-overview-grid mt-4">
                                    {navSections.filter(s => s.key !== 'overview').map(section => (
                                        <button key={section.key} type="button" className="bdna-overview-card" onClick={() => setActiveSection(section.key)}>
                                            <div className="bdna-overview-card-top">
                                                <span className="bdna-overview-card-label">{section.label}</span>
                                                <span className="bdna-overview-card-pct">{section.progress}%</span>
                                            </div>
                                            <div className="bdna-overview-card-bar">
                                                <div className="bdna-overview-card-bar-fill" style={{ width: `${section.progress}%` }}></div>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <div className="bdna-collapsible mt-6" data-open={previewOpen.toString()}>
                                    <button type="button" className="bdna-collapsible-trigger" onClick={() => setPreviewOpen(!previewOpen)}>
                                        <span>Como a IA entende esta marca hoje</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
                                    </button>
                                    {previewOpen && (
                                        <div className="bdna-collapsible-body">
                                            <div className="ai-result-prose">
                                                Complete as seções principais para ver um espelho mais rico do contexto atual.
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="bdna-collapsible mt-4" data-open={descOpen.toString()}>
                                    <button type="button" className="bdna-collapsible-trigger" onClick={() => setDescOpen(!descOpen)}>
                                        <span>Descrição operacional</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
                                    </button>
                                    {descOpen && (
                                        <div className="bdna-collapsible-body">
                                            <p className="ai-muted">Resumo operacional ainda não gerado.</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* ======== INFORMAÇÕES BÁSICAS ======== */}
                        {activeSection === 'basic' && (
                            <>
                                <div className="ai-card ai-panel">
                                    <div className="ai-panel-header">
                                        <h2 className="ai-panel-title">Identidade principal</h2>
                                        <p className="ai-muted">Nome, oferta, pitch, descrição e diferenciais formam o centro do Brand DNA.</p>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="ai-field">
                                            <label htmlFor="brand-name">Nome da marca</label>
                                            <input id="brand-name" value={name} onChange={(e) => setName(e.target.value)} type="text" className="ai-input" maxLength="120" />
                                        </div>

                                        <div className="ai-field">
                                            <label htmlFor="primary-product">Principal produto</label>
                                            <input id="primary-product" value={primaryProduct} onChange={(e) => setPrimaryProduct(e.target.value)} type="text" className="ai-input" maxLength="120" />
                                        </div>
                                    </div>

                                    <div className="ai-field mt-4">
                                        <label htmlFor="pitch-bio">Pitch ou bio</label>
                                        <textarea id="pitch-bio" value={pitchBio} onChange={(e) => setPitchBio(e.target.value)} className="ai-textarea" rows="3" maxLength="1000"></textarea>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2 mt-4">
                                        <div className="ai-field">
                                            <label htmlFor="brand-description">Descrição da marca</label>
                                            <textarea id="brand-description" value={brandDescription} onChange={(e) => setBrandDescription(e.target.value)} className="ai-textarea" rows="4"></textarea>
                                        </div>

                                        <div className="ai-field">
                                            <label htmlFor="brand-differentiators">Diferenciais competitivos</label>
                                            <textarea id="brand-differentiators" value={competitiveDifferentiators} onChange={(e) => setCompetitiveDifferentiators(e.target.value)} className="ai-textarea" rows="4"></textarea>
                                        </div>
                                    </div>
                                </div>

                                <div className="ai-card ai-panel mt-6">
                                    <div className="ai-panel-header">
                                        <h2 className="ai-panel-title">Logos, paleta e nichos</h2>
                                        <p className="ai-muted">Visual e contexto operacional para reutilização em IA.</p>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-3">
                                        {['Logo principal', 'Logo monocromática', 'Logo ícone'].map((label, idx) => (
                                            <div key={idx} className="brand-logo-card">
                                                <div className="ai-field">
                                                    <label>{label}</label>
                                                    <input type="file" className="ai-input" />
                                                </div>
                                                <p className="brand-upload-hint">Nenhum arquivo enviado.</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid gap-6 lg:grid-cols-2 mt-5">
                                        <div className="ai-field">
                                            <label>Cores da marca</label>
                                            <div className="brand-color-editor">
                                                {brandColors.map((color, index) => (
                                                    <div key={index} className="brand-color-editor-item">
                                                        <input 
                                                            type="color" 
                                                            value={color} 
                                                            onChange={(e) => {
                                                                const newColors = [...brandColors];
                                                                newColors[index] = e.target.value;
                                                                setBrandColors(newColors);
                                                            }} 
                                                            className="brand-color-picker" 
                                                        />
                                                        <input 
                                                            type="text" 
                                                            value={color}
                                                            onChange={(e) => {
                                                                const newColors = [...brandColors];
                                                                newColors[index] = e.target.value;
                                                                setBrandColors(newColors);
                                                            }}
                                                            className="ai-input" 
                                                            maxLength="7" 
                                                        />
                                                        {brandColors.length > 1 && (
                                                            <button type="button" className="brand-remove-button" onClick={() => handleRemoveItem(index, brandColors, setBrandColors)}>Remover</button>
                                                        )}
                                                    </div>
                                                ))}
                                                <button type="button" className="brand-add-button" onClick={() => setBrandColors([...brandColors, '#000000'])}>+</button>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="ai-field">
                                                <label htmlFor="default-language">Idioma padrão</label>
                                                <select id="default-language" value={defaultLanguage} onChange={(e) => setDefaultLanguage(e.target.value)} className="ai-select">
                                                    <option value="pt-BR">Português (BR)</option>
                                                    <option value="en-US">English (US)</option>
                                                    <option value="es-ES">Español</option>
                                                </select>
                                            </div>

                                            <div className="ai-field">
                                                <label htmlFor="niche-input">Nichos reutilizáveis</label>
                                                <input 
                                                    id="niche-input" 
                                                    value={nicheInput} 
                                                    onChange={(e) => setNicheInput(e.target.value)}
                                                    onKeyDown={(e) => handleAddItem(e, nicheInput, setNicheInput, niches, setNiches)}
                                                    type="text" 
                                                    className="ai-input" 
                                                    placeholder="Digite e pressione Enter" 
                                                />
                                            </div>

                                            <div className="ai-field-list">
                                                {niches.map((niche, index) => (
                                                    <button key={index} type="button" className="brand-tag" onClick={() => handleRemoveItem(index, niches, setNiches)}>
                                                        {niche} <span>x</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ======== COMUNICAÇÃO ======== */}
                        {activeSection === 'communication' && (
                            <div className="ai-card ai-panel space-y-5">
                                <div className="ai-panel-header">
                                    <h2 className="ai-panel-title">Tom, estilos e termos</h2>
                                    <p className="ai-muted">Orientações textuais para guiar a IA dessa marca.</p>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="ai-field">
                                        <label htmlFor="default-tone">Tom de voz padrão</label>
                                        <select id="default-tone" value={defaultTone} onChange={(e) => setDefaultTone(e.target.value)} className="ai-select">
                                            <option value="profissional">Profissional</option>
                                            <option value="descontraido">Descontraído</option>
                                            <option value="tecnico">Técnico</option>
                                        </select>
                                    </div>

                                    <div className="ai-field">
                                        <label htmlFor="custom-tone">Tom complementar</label>
                                        <input id="custom-tone" value={customTone} onChange={(e) => setCustomTone(e.target.value)} type="text" className="ai-input" maxLength="120" />
                                    </div>
                                </div>

                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-4">
                                        <div className="ai-field">
                                            <label htmlFor="writing-style-input">Estilos de escrita</label>
                                            <input 
                                                id="writing-style-input" 
                                                value={writingStyleInput}
                                                onChange={(e) => setWritingStyleInput(e.target.value)}
                                                onKeyDown={(e) => handleAddItem(e, writingStyleInput, setWritingStyleInput, writingStyles, setWritingStyles)}
                                                type="text" 
                                                className="ai-input" 
                                                placeholder="Ex.: educacional, consultivo" 
                                            />
                                        </div>
                                        <div className="ai-field-list">
                                            {writingStyles.map((style, index) => (
                                                <button key={index} type="button" className="brand-tag" onClick={() => handleRemoveItem(index, writingStyles, setWritingStyles)}>
                                                    {style} <span>x</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="ai-field">
                                            <label htmlFor="frequent-term-input">Termos prioritários</label>
                                            <input 
                                                id="frequent-term-input" 
                                                value={frequentTermInput}
                                                onChange={(e) => setFrequentTermInput(e.target.value)}
                                                onKeyDown={(e) => handleAddItem(e, frequentTermInput, setFrequentTermInput, frequentTerms, setFrequentTerms)}
                                                type="text" 
                                                className="ai-input" 
                                                placeholder="Digite e pressione Enter" 
                                            />
                                        </div>
                                        <div className="ai-field-list">
                                            {frequentTerms.map((term, index) => (
                                                <button key={index} type="button" className="brand-tag" onClick={() => handleRemoveItem(index, frequentTerms, setFrequentTerms)}>
                                                    {term} <span>x</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-4">
                                        <div className="ai-field">
                                            <label htmlFor="forbidden-word-input">Palavras proibidas</label>
                                            <input 
                                                id="forbidden-word-input" 
                                                value={forbiddenWordInput}
                                                onChange={(e) => setForbiddenWordInput(e.target.value)}
                                                onKeyDown={(e) => handleAddItem(e, forbiddenWordInput, setForbiddenWordInput, forbiddenWords, setForbiddenWords)}
                                                type="text" 
                                                className="ai-input" 
                                                placeholder="Digite e pressione Enter" 
                                            />
                                        </div>
                                        <div className="ai-field-list">
                                            {forbiddenWords.map((word, index) => (
                                                <button key={index} type="button" className="brand-tag" onClick={() => handleRemoveItem(index, forbiddenWords, setForbiddenWords)}>
                                                    {word} <span>x</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="ai-field">
                                        <label htmlFor="communication-notes">Notas de comunicação</label>
                                        <textarea id="communication-notes" value={communicationNotes} onChange={(e) => setCommunicationNotes(e.target.value)} className="ai-textarea" rows="6"></textarea>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ======== SUB-MANAGERS (Personas, Knowledge, Examples) ======== */}
                        {activeSection === 'personas' && (
                            initialBrandDna ? <PersonaManager brandDna={initialBrandDna} /> : (
                                <div className="ai-card ai-panel">
                                    <div className="ai-empty-state !min-h-[16rem]">
                                        <div className="ai-empty-orb">1</div>
                                        <div className="space-y-2">
                                            <h2 className="text-xl font-bold tracking-tight text-slate-900">Crie o workspace primeiro</h2>
                                            <p className="mx-auto max-w-xl ai-muted">Depois do primeiro salvamento, o sistema libera o gerenciador de personas.</p>
                                        </div>
                                    </div>
                                </div>
                            )
                        )}

                        {activeSection === 'knowledge' && (
                            initialBrandDna ? <KnowledgeBaseManager brandDna={initialBrandDna} /> : (
                                <div className="ai-card ai-panel">
                                    <div className="ai-empty-state !min-h-[16rem]">
                                        <div className="ai-empty-orb">2</div>
                                        <div className="space-y-2">
                                            <h2 className="text-xl font-bold tracking-tight text-slate-900">Salve as informações básicas primeiro</h2>
                                            <p className="mx-auto max-w-xl ai-muted">A base de conhecimento precisa de um Brand DNA persistido para associar documentos.</p>
                                        </div>
                                    </div>
                                </div>
                            )
                        )}

                        {activeSection === 'examples' && (
                            initialBrandDna ? <ExampleManager brandDna={initialBrandDna} /> : (
                                <div className="ai-card ai-panel">
                                    <div className="ai-empty-state !min-h-[16rem]">
                                        <div className="ai-empty-orb">3</div>
                                        <div className="space-y-2">
                                            <h2 className="text-xl font-bold tracking-tight text-slate-900">Finalize o cadastro inicial</h2>
                                            <p className="mx-auto max-w-xl ai-muted">Depois disso, você pode salvar exemplos ideais de saída para orientar a IA.</p>
                                        </div>
                                    </div>
                                </div>
                            )
                        )}

                    </div>
                </div>
            </div>

            {/* ======== MODAL DE HISTÓRICO ======== */}
            {initialBrandDna && showHistory && (
                <div className="bdna-modal-backdrop" onClick={() => setShowHistory(false)}>
                    <div className="bdna-modal" onClick={e => e.stopPropagation()}>
                        <div className="bdna-modal-header">
                            <h2 className="bdna-modal-title">Histórico de treinamento</h2>
                            <button type="button" className="bdna-modal-close" onClick={() => setShowHistory(false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div className="bdna-modal-body">
                            {recentGenerations.length > 0 ? (
                                recentGenerations.map(generation => (
                                    <article key={generation.id} className="ai-card ai-panel mb-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-2">
                                                <h3 className="ai-panel-title">{generation.template?.name}</h3>
                                                <p className="ai-muted">Gerado em {generation.created_at || 'Data'}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="ai-inline-pill bg-slate-100 ring-1">{generation.status}</span>
                                            </div>
                                        </div>
                                        <p className="brand-copy mt-3">{generation.output_text || generation.prompt_snapshot}</p>
                                    </article>
                                ))
                            ) : (
                                <div className="ai-empty-state !min-h-[12rem]">
                                    <div className="ai-empty-orb">H</div>
                                    <div className="space-y-2">
                                        <h2 className="text-xl font-bold tracking-tight text-slate-900">Sem histórico por enquanto</h2>
                                        <p className="mx-auto max-w-xl ai-muted">Quando este Brand DNA entrar no fluxo de IA, as gerações aparecem aqui.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}