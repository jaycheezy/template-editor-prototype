import { useEffect, useState } from 'react';
import { Modal, ModalOverlay, ModalContent, ModalCloseButton, ModalHeader, ModalBody, ModalFooter } from '@chakra-ui/react';
import { LuArrowLeft, LuArrowRight, LuBookmark, LuCheck, LuChevronRight, LuCircleCheck, LuCopy, LuExternalLink, LuFlag, LuImage, LuInfo, LuLayers, LuLayoutGrid, LuListFilter, LuPlus, LuRadio, LuRotateCcw, LuSearch, LuSettings2, LuTimer, LuTrash2, LuTrophy, LuWorkflow, LuX, LuZap } from 'react-icons/lu';
import { compatibility, conditionText, expiryText, initialRules, resolveCreative, scenarios, sets, stageLabels, teamLabels, triggerLabels } from './strategy';
import type { CreativeRule, Option, Scenario, Stage, Team, TemplateSet, Trigger } from './strategy';
import './ad-tag-options.css';

const options: { id: Option; name: string; description: string; detail: string; icon: typeof LuLayers }[] = [
  { id: 'stages', name: 'Stage cards', description: 'A familiar match journey', detail: 'Keep stages visible. Add moments where they belong.', icon: LuLayoutGrid },
  { id: 'rules', name: 'Creative rules', description: 'Every condition in one place', detail: 'Scan, edit and prioritise a growing set of rules.', icon: LuListFilter },
  { id: 'flow', name: 'Visual flow', description: 'Connect triggers to creative sets', detail: 'See the logic and extend it with new branches.', icon: LuWorkflow },
];
const storageKey = 'ad-tag-creative-options-v1';
const defaultName = 'Merkur Matchday';

function readSaved(): { name: string; rules: CreativeRule[]; size: string; reusable?: boolean } | null {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (saved && typeof saved.name === 'string' && ['522 × 928', '300 × 250', '1080 × 1920'].includes(saved.size) && Array.isArray(saved.rules) && saved.rules.length && saved.rules.every((r: CreativeRule) => typeof r.id === 'string' && typeof r.name === 'string' && ['pre', 'live', 'post'].includes(r.stage) && ['baseline', 'goal', 'substitution', 'winner'].includes(r.trigger) && ['any', 'home', 'away'].includes(r.team) && Number.isFinite(r.duration) && r.duration >= 0 && typeof r.enabled === 'boolean' && sets.some((s) => s.id === r.setId))) return saved;
  } catch { /* A missing or older local draft opens the sample strategy. */ }
  return null;
}

function readOption(): Option {
  const option = new URLSearchParams(window.location.search).get('option');
  return option === 'rules' || option === 'flow' ? option : 'stages';
}

function CreativeArtwork({ set, scenario = 'pre', compact = false, landscape = false, fallback = false }: { set?: TemplateSet; scenario?: Scenario; compact?: boolean; landscape?: boolean; fallback?: boolean }) {
  const treatment = fallback ? 'pre' : set?.treatment ?? 'pre';
  const goal = treatment === 'goal';
  const headline = fallback ? 'THE GAME\nIS ALWAYS ON.' : treatment === 'winner' ? 'WHAT A\nWIN.' : set?.id === 'score' ? 'GOAL\nRUSH.' : goal ? 'GET\nIN!' : treatment === 'substitution' ? 'FRESH\nLEGS.' : treatment === 'live' ? 'EVERY\nMOMENT\nCOUNTS.' : treatment === 'post' ? 'THE FINAL\nWHISTLE.' : set?.id === 'countdown' ? 'KICKOFF\nIS COMING.' : 'READY FOR\nMATCHDAY?';
  const score = scenario === 'winner' ? '2 : 1' : scenario === 'draw' ? '1 : 1' : scenario === 'away-goal' ? '1 : 1' : goal || scenario === 'home-goal' ? '2 : 0' : '1 : 0';
  return <div className={`creative-art creative-art--${treatment} ${set?.id === 'score' ? 'creative-art--score' : ''} ${fallback ? 'creative-art--fallback' : ''} ${compact ? 'creative-art--compact' : ''} ${landscape ? 'creative-art--landscape' : ''}`} aria-label={`${fallback ? 'Fallback' : set?.name ?? 'Matchday'} creative preview`}>
    <div className="art-stripes" /><div className="art-brand"><span className="sun-mark">✺</span> MERKUR<span> BETS</span></div>
    <div className="art-eyebrow">{fallback ? 'SPORTS. PASSION. PLAY.' : goal ? 'GOAL · 67′' : treatment === 'winner' || treatment === 'post' ? 'FULL TIME' : treatment === 'substitution' ? 'SUBSTITUTION · 72′' : treatment === 'live' ? 'LIVE · 65′' : 'AUSTRIAN BUNDESLIGA'}</div>
    <div className="art-headline">{headline.split('\n').map((line, i) => <span key={i}>{line}</span>)}</div>
    {!fallback && <div className="art-fixture"><div className="art-team"><span className="team-shield team-shield--home">A</span><span>AUSTRIA WIEN</span></div><strong className="art-score">{treatment === 'pre' ? 'VS' : score}</strong><div className="art-team"><span className="team-shield team-shield--away">R</span><span>RAPID WIEN</span></div></div>}
    {!compact && <div className="art-bottom"><span>{fallback ? 'YOUR NEXT MATCH STARTS HERE' : goal ? scenario === 'away-goal' ? 'RAPID WIEN ARE BACK IN IT' : 'AUSTRIA WIEN EXTEND THE LEAD' : treatment === 'pre' ? 'THE CITY. THE RIVALRY. THE GAME.' : 'FEEL EVERY SECOND.'}</span><strong>GAME ON <LuArrowRight /></strong><small>18+ · Play responsibly</small></div>}
  </div>;
}

function RuleIcon({ trigger }: { trigger: Trigger }) {
  const Icon = trigger === 'goal' || trigger === 'substitution' ? LuZap : trigger === 'winner' ? LuTrophy : LuFlag;
  return <Icon size={16} />;
}

function SetButton({ rule, onClick, size, small = false }: { rule: CreativeRule; onClick: () => void; size: string; small?: boolean }) {
  const set = sets.find((s) => s.id === rule.setId);
  const issue = set ? compatibility(set, rule, size) : 'Choose a template set';
  return <button className={`set-button ${small ? 'set-button--small' : ''} ${issue ? 'set-button--incompatible' : ''}`} onClick={onClick} aria-label={`Choose template set for ${rule.name}`}>
    <div className="set-thumb"><CreativeArtwork set={set} compact /></div>
    <span><strong>{set?.name ?? 'Choose a set'}</strong><small>{issue ?? `${size} · ${set?.variants ?? 0} variants in set`}</small></span><LuChevronRight size={15} />
  </button>;
}

function RuleFields({ rule, onChange, size, chooseSet }: { rule: CreativeRule; onChange: (rule: CreativeRule) => void; size: string; chooseSet: () => void }) {
  const moment = rule.trigger !== 'baseline';
  const updateTrigger = (trigger: Trigger) => {
    const stage: Stage = trigger === 'winner' ? 'post' : 'live';
    const setId = trigger === 'goal' ? 'goal' : trigger === 'winner' ? 'winner' : 'lineup';
    onChange({ ...rule, trigger, stage, setId, duration: trigger === 'winner' ? 24 : 10 });
  };
  return <div className="rule-fields">
    <label>Rule name<input value={rule.name} onChange={(e) => onChange({ ...rule, name: e.target.value })} /></label>
    <div className="field-section"><span className="field-section-label"><LuZap /> WHEN</span>
      {moment ? <label>Trigger<select value={rule.trigger} onChange={(e) => updateTrigger(e.target.value as Trigger)}><option value="goal">Goal scored</option><option value="substitution">Substitution</option><option value="winner">Match won</option></select></label> : <div className="readonly-field"><LuFlag /> {conditionText(rule)}</div>}
      {moment && <label>Team<select value={rule.team} onChange={(e) => onChange({ ...rule, team: e.target.value as Team })}><option value="any">Any team</option><option value="home">Home team · Austria Wien</option><option value="away">Away team · Rapid Wien</option></select></label>}
      {rule.stage === 'pre' && <label>Start before kickoff<div className="number-field"><input type="number" min={1} max={168} value={rule.duration} onChange={(e) => onChange({ ...rule, duration: Math.max(1, Math.min(168, Number(e.target.value))) })} /><span>hours</span></div></label>}
    </div>
    <div className="field-section"><span className="field-section-label"><LuLayers /> SHOW</span><SetButton rule={rule} size={size} onClick={chooseSet} /></div>
    <div className="field-section"><span className="field-section-label"><LuTimer /> UNTIL</span>
      {rule.stage === 'live' && moment || rule.stage === 'post' ? <><label>{rule.stage === 'live' ? 'Keep active for' : 'Keep active after full time'}<div className="number-field"><input type="number" min={1} max={rule.stage === 'live' ? 60 : 168} value={rule.duration} onChange={(e) => onChange({ ...rule, duration: Math.max(1, Math.min(rule.stage === 'live' ? 60 : 168, Number(e.target.value))) })} /><span>{rule.stage === 'live' ? 'minutes' : 'hours'}</span></div></label><p className="field-hint">{rule.stage === 'live' ? 'Return to the live default when this window expires. Full time ends the moment early.' : rule.trigger === 'winner' ? 'Return to the post-game default if it is still active, otherwise use the fallback image.' : 'Use the fallback image after this window ends.'}</p></> : <div className="readonly-field"><LuTimer /> {expiryText(rule)}</div>}
    </div>
    <label className="toggle-line"><span>Rule enabled</span><input className="switch-input" type="checkbox" role="switch" checked={rule.enabled} onChange={(e) => onChange({ ...rule, enabled: e.target.checked })} /></label>
  </div>;
}

export default function AdTagOptions() {
  const [saved] = useState(readSaved);
  const [rules, setRules] = useState<CreativeRule[]>(saved?.rules ?? initialRules);
  const [name, setName] = useState(saved?.name ?? defaultName);
  const [size, setSize] = useState(saved?.size ?? '522 × 928');
  const [option, setOption] = useState<Option>(readOption);
  const [scenario, setScenario] = useState<Scenario>('home-goal');
  const [elapsed, setElapsed] = useState(0);
  const [selectedId, setSelectedId] = useState('goal');
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CreativeRule | null>(null);
  const [pickerId, setPickerId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [reuse, setReuse] = useState(false);
  const [comparison, setComparison] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [toast, setToast] = useState('');
  const [strategyName, setStrategyName] = useState(name);
  const [reusable, setReusable] = useState(saved?.reusable ?? false);
  const [hasLocalSave, setHasLocalSave] = useState(!!saved);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    document.title = 'Ad Tags · Creative strategy options';
    const pop = () => setOption(readOption());
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  useEffect(() => { if (!toast) return; const timeout = window.setTimeout(() => setToast(''), 4000); return () => window.clearTimeout(timeout); }, [toast]);

  const changeOption = (next: Option) => {
    setOption(next);
    const url = new URL(window.location.href); url.searchParams.set('option', next); window.history.pushState({}, '', url);
  };
  const updateRule = (next: CreativeRule) => { setRules((prev) => prev.map((r) => r.id === next.id ? next : r)); setDirty(true); };
  const chooseSet = (id: string) => { setSearch(''); setPickerId(id); };
  const selected = rules.find((r) => r.id === selectedId) ?? rules[0];
  const editingRule = draft ?? rules.find((r) => r.id === editId);
  const pickerRule = draft?.id === pickerId ? draft : rules.find((r) => r.id === pickerId);
  const decision = resolveCreative(rules, scenario, elapsed, size);
  const activeSet = sets.find((s) => s.id === decision.rule?.setId);
  const activeStage = scenario === 'pre' ? 'pre' : scenario === 'winner' || scenario === 'draw' ? 'post' : 'live';
  const isTimedMoment = scenario === 'home-goal' || scenario === 'away-goal' || scenario === 'substitution';
  const isPost = scenario === 'winner' || scenario === 'draw';
  const missingBaseline = (['pre', 'live', 'post'] as Stage[]).filter((stage) => !rules.some((r) => r.stage === stage && r.trigger === 'baseline' && r.enabled));
  const save = (newName = name, newReusable = reusable) => {
    try { localStorage.setItem(storageKey, JSON.stringify({ name: newName, rules, size, reusable: newReusable })); setHasLocalSave(true); setDirty(false); setToast('Prototype saved in this browser.'); } catch { setToast('Browser storage is unavailable. Your changes are still available in this session.'); }
  };
  const addMoment = (stage: Stage = 'live') => {
    const winner = stage === 'post';
    setDraft({ id: `moment-${crypto.randomUUID()}`, name: winner ? 'Another winning moment' : 'A player is substituted', stage: winner ? 'post' : 'live', trigger: winner ? 'winner' : 'substitution', team: 'any', duration: winner ? 24 : 10, setId: winner ? 'winner' : 'lineup', enabled: true });
    setEditId(null);
  };
  const changeScenario = (next: Scenario) => { setScenario(next); setElapsed(0); };
  const removeRule = (id: string) => { setRules((prev) => prev.filter((r) => r.id !== id)); setEditId(null); setDirty(true); setToast('Moment removed from this prototype strategy.'); };
  const moveRule = (id: string, direction: -1 | 1) => {
    setRules((prev) => { const result = [...prev]; const i = result.findIndex((r) => r.id === id); const target = i + direction; if (target < 0 || target >= result.length) return prev; [result[i], result[target]] = [result[target], result[i]]; return result; }); setDirty(true);
  };

  return <div className="moments-app">
    <header className="mc-host"><a className="mc-wordmark" href="/"><span className="mc-launcher">⠿</span>Marketing <strong>Cloud</strong></a><span className="host-divider" /><span>Creative Hub</span><div className="host-right"><span className="prototype-badge">DESIGN EXPLORATION</span><div className="advertiser"><small>Advertiser</small><strong>Merkur Bets Austria</strong></div><span className="avatar">JC</span></div></header>
    <div className="moments-shell">
      <aside className="mc-sidebar"><div className="workspace-brand"><span className="sr-symbol">S</span><strong>Creative Hub</strong></div><p className="nav-label">WORKSPACE</p><a className="nav-item" href="/"><LuLayoutGrid />Templates<LuExternalLink size={13} /></a><div className="nav-item nav-item--active"><LuImage />Ad Tags<span className="nav-count">12</span></div><button className="nav-item" onClick={() => setReuse(true)}><LuLayers />Creative strategies<span className="new-label">NEW</span></button><div className="sidebar-bottom"><LuInfo /><span>A working concept with sample data. Changes stay in this browser.</span></div></aside>
      <main className="moments-main">
        <div className="page-top"><div className="breadcrumbs"><span>Creative Hub</span><LuChevronRight /><span>Ad Tags</span><LuChevronRight /><strong>Edit Ad Tag</strong></div><button className="text-button" onClick={() => setComparison(true)}><LuLayoutGrid size={15} />Compare options</button></div>
        <div className="page-heading"><div><p className="eyebrow">SPORTS MOMENTS · AD TAG SETUP</p><h1>A creative for every moment.</h1><p>Three ways to build the same reusable creative strategy.</p></div><button className="button button--primary" onClick={() => save()}><LuCheck />Save prototype</button></div>
        <div className="option-grid" role="tablist" aria-label="Creative strategy design options">{options.map((o, i) => <button role="tab" aria-selected={option === o.id} aria-controls="creative-option-panel" key={o.id} className={`option-card ${option === o.id ? 'option-card--active' : ''}`} onClick={() => changeOption(o.id)}><span className="option-icon"><o.icon /></span><span className="option-copy"><span className="option-number">OPTION 0{i + 1}{o.id === 'stages' && <span className="recommended">EASIEST TRANSITION</span>}</span><strong>{o.name}</strong><small>{o.description}</small></span><span className="option-radio">{option === o.id && <span />}</span></button>)}</div>
        <section className="setup-card">
          <div className="setup-title"><div><LuImage /><strong>Merkur · Austria Wien vs Rapid Wien</strong><span className="pill pill--muted">DOOH</span></div><span className="draft-status"><span className={dirty ? 'status-dot status-dot--amber' : 'status-dot'} />{dirty ? 'Unsaved changes' : hasLocalSave ? 'Local draft saved' : 'Sample draft'}</span></div>
          <div className="setup-steps"><span><span className="step-done"><LuCheck /></span>Basics<LuChevronRight /></span><span className="step-active"><span>2</span>Content<LuChevronRight /></span><span><span>3</span>Output</span></div>
          <div className="context-strip"><div><span className="small-label">SPORT & FIXTURE</span><strong><span className="football-dot">⚽</span>Soccer · Austria Wien vs Rapid Wien</strong></div><div><label className="small-label" htmlFor="tag-output-size">AD TAG SIZE</label><select id="tag-output-size" value={size} onChange={(e) => { setSize(e.target.value); setDirty(true); }}><option>522 × 928</option><option>300 × 250</option><option>1080 × 1920</option></select></div><div><span className="small-label">LANGUAGE</span><strong>English · Europe/Vienna</strong></div></div>
          <div className="strategy-bar"><div className="strategy-heading"><span className="strategy-symbol"><LuLayers /></span><div><span className="small-label">CREATIVE STRATEGY</span><input aria-label="Creative strategy name" value={name} onChange={(e) => { setName(e.target.value); setDirty(true); }} /></div><span className="pill pill--blue">{reusable ? 'Reusable' : 'Ad Tag draft'}</span></div><button className="button button--quiet" onClick={() => { setStrategyName(name); setReuse(true); }}><LuBookmark />Reuse strategy</button></div>
          <div className="strategy-body" id="creative-option-panel" role="tabpanel" aria-label={options.find((o) => o.id === option)?.name}>
            <div className="strategy-editor">
              <div className="section-title"><div><h2>{option === 'stages' ? 'Map the match journey' : option === 'rules' ? 'When this happens, show this' : 'Build your creative flow'}</h2><p>{options.find((o) => o.id === option)?.detail}</p></div><button className="button button--outline" onClick={() => addMoment()}><LuPlus />Add moment</button></div>
              {option === 'stages' && <div className="stage-grid">{(['pre', 'live', 'post'] as Stage[]).map((stage, i) => <section className={`stage-card ${activeStage === stage && scenario !== 'unavailable' ? 'stage-card--current' : ''}`} key={stage}><header className={`stage-header stage-header--${stage}`}><span>{stage === 'live' ? <LuRadio /> : stage === 'post' ? <LuTrophy /> : <LuFlag />}{stageLabels[stage]}</span><span className="stage-index">0{i + 1}</span></header><div className="stage-card-body">{rules.filter((r) => r.stage === stage && r.trigger === 'baseline').map((r) => <div className={`baseline-rule ${!r.enabled ? 'rule-disabled' : ''}`} key={r.id}><div className="rule-kicker">DEFAULT CREATIVE{decision.rule?.id === r.id && <span className="active-dot" />}</div><SetButton rule={r} size={size} onClick={() => chooseSet(r.id)} /><button className="condition-button" onClick={() => setEditId(r.id)}><LuTimer /><span>{conditionText(r)}<small>{expiryText(r)}</small></span><LuSettings2 /></button></div>)}{rules.filter((r) => r.stage === stage && r.trigger !== 'baseline').map((r) => <div className={`moment-rule ${decision.rule?.id === r.id ? 'moment-rule--active' : ''} ${!r.enabled ? 'rule-disabled' : ''}`} key={r.id}><button className="moment-condition" onClick={() => setEditId(r.id)}><span className="moment-symbol"><RuleIcon trigger={r.trigger} /></span><span><strong>{triggerLabels[r.trigger]}</strong><small>{teamLabels[r.team]} · {r.trigger === 'winner' ? 'Final result' : `last ${r.duration} min`}</small></span><LuSettings2 size={14} /></button><SetButton rule={r} size={size} small onClick={() => chooseSet(r.id)} /><div className="moment-expiry"><LuTimer />{r.trigger === 'winner' ? expiryText(r) : 'Then return to live default'}</div></div>)}{stage !== 'pre' && <button className="add-stage-moment" onClick={() => addMoment(stage)}><LuPlus />Add {stage === 'post' ? 'outcome' : 'moment'}</button>}</div></section>)}</div>}
              {option === 'rules' && <div className="rules-view"><div className="rules-table-scroll"><table className="rules-table"><thead><tr><th>When</th><th>Show template set</th><th>Until</th><th>On</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rules.map((r) => <tr className={`${decision.rule?.id === r.id ? 'rule-row--active' : ''} ${!r.enabled ? 'rule-disabled' : ''}`} key={r.id}><td><button className="table-condition" onClick={() => setEditId(r.id)}><span className={`table-rule-icon ${r.trigger !== 'baseline' ? 'table-rule-icon--moment' : ''}`}><RuleIcon trigger={r.trigger} /></span><span><strong>{conditionText(r)}</strong><small>{stageLabels[r.stage]}{r.trigger !== 'baseline' ? ` · ${teamLabels[r.team]}` : ' · Default'}</small></span></button></td><td><SetButton rule={r} size={size} small onClick={() => chooseSet(r.id)} /></td><td><span className="table-expiry">{expiryText(r)}</span></td><td><input aria-label={`Enable ${r.name}`} className="switch-input" type="checkbox" role="switch" checked={r.enabled} onChange={(e) => updateRule({ ...r, enabled: e.target.checked })} /></td><td><button className="icon-button" title="Edit rule" aria-label={`Edit ${r.name}`} onClick={() => setEditId(r.id)}><LuSettings2 /></button></td></tr>)}</tbody></table></div><div className="table-footnote"><LuInfo /><span>Matching moments override the stage default. When moments overlap, the first matching moment in this list wins.</span></div></div>}
              {option === 'flow' && <div className="flow-layout"><div className="flow-canvas"><div className="flow-label"><span className="small-label">MATCH JOURNEY</span><span><LuMousePointerHint />Select a node to configure</span></div><div className="flow-scroll"><div className="flow-board" style={{ width: '100%', transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}>{(['pre', 'live', 'post'] as Stage[]).map((stage) => <div className="flow-lane" key={stage}><div className="flow-stage-label">{stageLabels[stage]}</div>{rules.filter((r) => r.stage === stage).map((r) => <button key={r.id} className={`flow-node ${r.trigger !== 'baseline' ? 'flow-node--moment' : ''} ${selected.id === r.id ? 'flow-node--selected' : ''} ${!r.enabled ? 'rule-disabled' : ''}`} onClick={() => setSelectedId(r.id)}>{r.trigger === 'baseline' && stage !== 'post' && <span className="flow-edge flow-edge--stage" aria-hidden="true" />}{r.trigger === 'baseline' && rules.some((candidate) => candidate.stage === stage && candidate.trigger !== 'baseline') && <span className="flow-edge flow-edge--trunk" aria-hidden="true" />}{r.trigger !== 'baseline' && <span className="flow-edge flow-edge--moment" aria-hidden="true" />}<div className="flow-node-type"><RuleIcon trigger={r.trigger} /><span>{r.trigger === 'baseline' ? 'STAGE' : 'MOMENT'}</span>{decision.rule?.id === r.id && <span className="active-dot" />}</div><strong>{r.trigger === 'baseline' ? conditionText(r) : triggerLabels[r.trigger]}</strong><small>{r.trigger === 'baseline' ? expiryText(r) : `${teamLabels[r.team]} · ${r.duration} ${r.trigger === 'winner' ? 'hours' : 'min'}`}</small><div className="flow-node-set"><LuLayers /><span>{sets.find((s) => s.id === r.setId)?.name}</span></div></button>)}{stage !== 'pre' && <button className="flow-add" onClick={() => addMoment(stage)} aria-label={`Add ${stageLabels[stage]} moment`}><LuPlus /></button>}</div>)}</div></div><div className="flow-controls"><button className="icon-button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(70, z - 10))} disabled={zoom <= 70}>−</button><span>{zoom}%</span><button className="icon-button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(130, z + 10))} disabled={zoom >= 130}>+</button><button className="text-button" onClick={() => setZoom(100)}>Reset view</button></div><div className="flow-legend"><span><i />Stage default</span><span><i />Moment override</span></div></div><aside className="flow-inspector"><div className="inspector-heading"><LuSettings2 /><strong>Node properties</strong></div><RuleFields rule={selected} onChange={updateRule} size={size} chooseSet={() => chooseSet(selected.id)} />{selected.trigger !== 'baseline' && <button className="text-button danger" onClick={() => removeRule(selected.id)}><LuTrash2 />Remove moment</button>}</aside></div>}
              <div className="coverage-note"><span className={`coverage-icon ${missingBaseline.length ? 'coverage-icon--warning' : ''}`}><LuCircleCheck /></span><div><strong>{missingBaseline.length ? `${missingBaseline.map((s) => stageLabels[s]).join(', ')} uses the fallback` : 'Every stage is covered'}</strong><span>{rules.filter((r) => r.enabled).length} active rules · {rules.filter((r) => r.enabled && r.trigger !== 'baseline').length} moment overrides · fallback image configured</span></div><button className="text-button" onClick={() => changeScenario('unavailable')}>Test fallback<LuArrowRight /></button></div>
              <div className="simulation"><div className="simulation-heading"><span><LuRadio /><strong>Try a match moment</strong></span><span className="pill pill--muted">SIMULATED</span></div><div className="scenario-buttons" role="group" aria-label="Match scenarios">{scenarios.map((s) => <button key={s.id} aria-pressed={scenario === s.id} onClick={() => changeScenario(s.id)} className={scenario === s.id ? 'scenario-active' : ''}>{s.short}</button>)}</div>{(isTimedMoment || isPost) && <div className="elapsed-control"><label htmlFor="moment-age">{isPost ? 'Time after full time' : 'Time since the moment'}</label><input id="moment-age" aria-label={isPost ? 'Hours after full time' : 'Minutes since the moment'} type="range" min={0} max={isPost ? 48 : 60} value={elapsed} onChange={(e) => setElapsed(Number(e.target.value))} /><strong>{elapsed} {isPost ? 'h' : 'min'}</strong><button className="icon-button" aria-label="Restart moment" onClick={() => setElapsed(0)}><LuRotateCcw /></button></div>}</div>
            </div>
            <aside className="preview-panel"><div className="preview-title"><span className="small-label">AD TAG PREVIEW</span><span className="preview-live-dot" />Live simulation</div><div className="preview-stage"><span className={`pill ${decision.rule?.trigger !== 'baseline' && decision.rule ? 'pill--amber' : 'pill--blue'}`}>{decision.rule ? decision.rule.trigger === 'baseline' ? stageLabels[decision.rule.stage] : triggerLabels[decision.rule.trigger] : 'Fallback'}</span><span>{size}</span></div><div className="preview-art-wrap"><CreativeArtwork set={activeSet} scenario={scenario} landscape={size === '300 × 250'} fallback={!decision.rule} /></div><div className="preview-result"><span className="result-icon"><LuLayers /></span><div><span className="small-label">SHOWING NOW</span><strong>{activeSet?.name ?? 'Evergreen fallback'}</strong></div></div><p className="preview-reason">{decision.reason}</p><div className="preview-context"><span><LuFlag />{scenarios.find((s) => s.id === scenario)?.label}</span><span><LuTimer />{decision.rule ? expiryText(decision.rule) : 'Until compatible data returns'}</span></div><div className="binding-note"><LuCircleCheck /><span>One size-matched variant is served by this Ad Tag. The strategy can also supply other sizes and channels.</span></div></aside>
          </div>
          <div className="setup-footer"><span><LuInfo />Creative changes are independent of campaign activation.</span><button className="text-button" onClick={() => { setRules(initialRules); setReusable(false); setName(defaultName); setSize('522 × 928'); setScenario('home-goal'); setElapsed(0); setSelectedId('goal'); setDirty(true); setToast('Sample strategy restored. Save to replace the local draft.'); }}><LuRotateCcw />Reset example</button></div>
        </section>
        <div className="page-bottom"><span>Same strategy. Three editing experiences.</span><a href="/">Open template editor<LuExternalLink size={13} /></a></div>
      </main>
    </div>

    <Modal isOpen={!!editingRule} onClose={() => { setEditId(null); setDraft(null); }} size="lg" isCentered><ModalOverlay backdropFilter="blur(3px)" /><ModalContent className="moments-modal"><ModalHeader><span className="modal-eyebrow">{draft ? 'NEW MOMENT' : 'CREATIVE RULE'}</span>{draft ? 'Add a moment' : editingRule?.name}</ModalHeader><ModalCloseButton /><ModalBody>{editingRule && <RuleFields rule={editingRule} onChange={draft ? setDraft : updateRule} size={size} chooseSet={() => chooseSet(editingRule.id)} />}{!draft && editingRule?.trigger !== 'baseline' && <div className="rule-order"><span>Moment order</span><button className="button button--quiet" disabled={rules[0]?.id === editingRule?.id} onClick={() => editingRule && moveRule(editingRule.id, -1)}>Move up</button><button className="button button--quiet" disabled={rules.at(-1)?.id === editingRule?.id} onClick={() => editingRule && moveRule(editingRule.id, 1)}>Move down</button></div>}</ModalBody><ModalFooter className="modal-footer">{!draft && editingRule?.trigger !== 'baseline' && <button className="text-button danger" onClick={() => editingRule && removeRule(editingRule.id)}><LuTrash2 />Remove moment</button>}<div className="modal-footer-spacer" /><button className="button button--primary" disabled={!editingRule?.name.trim()} onClick={() => { if (draft) { setRules((prev) => [...prev, draft]); setSelectedId(draft.id); setDirty(true); } setDraft(null); setEditId(null); }}>{draft ? 'Add moment' : 'Done'}<LuCheck /></button></ModalFooter></ModalContent></Modal>

    <Modal isOpen={!!pickerRule} onClose={() => setPickerId(null)} size="3xl" isCentered><ModalOverlay backdropFilter="blur(3px)" /><ModalContent className="moments-modal"><ModalHeader><span className="modal-eyebrow">TEMPLATE LIBRARY</span>Choose a template set</ModalHeader><ModalCloseButton /><ModalBody><p className="modal-description">{pickerRule?.name} · Ad Tag variant: <strong>{size}</strong></p><div className="library-search"><LuSearch /><input aria-label="Search template sets" placeholder="Search template sets…" value={search} onChange={(e) => setSearch(e.target.value)} /></div><div className="set-library">{sets.filter((s) => `${s.name} ${s.description}`.toLowerCase().includes(search.toLowerCase())).map((set) => { const issue = pickerRule ? compatibility(set, pickerRule, size) : null; return <button key={set.id} disabled={!!issue} className={`library-set ${pickerRule?.setId === set.id ? 'library-set--selected' : ''}`} onClick={() => { if (!pickerRule) return; const next = { ...pickerRule, setId: set.id }; if (draft?.id === next.id) setDraft(next); else updateRule(next); setPickerId(null); }}><div className="library-art"><CreativeArtwork set={set} compact />{pickerRule?.setId === set.id && <span className="library-check"><LuCheck /></span>}</div><strong>{set.name}</strong><small>{set.description}</small><span className={issue ? 'set-incompatible' : 'set-compatible'}>{issue ? <LuInfo /> : <LuCircleCheck />}{issue ?? `${set.variants} variants · size matched`}</span></button>; })}</div>{!sets.some((s) => `${s.name} ${s.description}`.toLowerCase().includes(search.toLowerCase())) && <div className="empty-library"><LuSearch /><strong>No template sets found</strong><span>Try “goal”, “score” or “match”.</span></div>}</ModalBody><ModalFooter><span className="library-note"><LuInfo />The set is reusable. This Ad Tag selects its compatible size.</span></ModalFooter></ModalContent></Modal>

    <Modal isOpen={reuse} onClose={() => setReuse(false)} size="xl" isCentered><ModalOverlay backdropFilter="blur(3px)" /><ModalContent className="moments-modal"><ModalHeader><span className="modal-eyebrow">SHARED CREATIVE STRATEGY</span>Build once. Use across channels.</ModalHeader><ModalCloseButton /><ModalBody><p className="modal-description">Save this trigger-to-template logic as a reusable strategy. Each destination supplies its own fixture, size and language.</p><div className="reuse-destinations"><div><LuImage /><strong>Ad Tags</strong><small>HTML & image delivery</small></div><div><LuLayers /><strong>Social Catalogues</strong><small>Channel-sized assets</small></div><div><LuWorkflow /><strong>Activation Workflow</strong><small>Creative actions</small></div></div><label className="reuse-name">Strategy name<input value={strategyName} onChange={(e) => setStrategyName(e.target.value)} /></label><div className="reuse-summary"><LuCircleCheck /><span>{rules.filter((r) => r.enabled).length} active rules and their template sets will be included. Fixtures and tracking belong to the destination.</span></div><p className="field-hint">This prototype saves the strategy locally. No live tags or campaigns are changed.</p></ModalBody><ModalFooter className="modal-footer"><button className="button button--quiet" onClick={() => setReuse(false)}>Cancel</button><button className="button button--primary" disabled={!strategyName.trim()} onClick={() => { setName(strategyName.trim()); setReusable(true); save(strategyName.trim(), true); setReuse(false); setToast('Reusable strategy saved in this browser.'); }}><LuBookmark />Save reusable strategy</button></ModalFooter></ModalContent></Modal>

    <Modal isOpen={comparison} onClose={() => setComparison(false)} size="3xl" isCentered><ModalOverlay backdropFilter="blur(3px)" /><ModalContent className="moments-modal"><ModalHeader><span className="modal-eyebrow">THREE DESIGN OPTIONS</span>Choose the editing experience</ModalHeader><ModalCloseButton /><ModalBody><div className="comparison-grid">{options.map((o, i) => <div className="comparison-card" key={o.id}><o.icon /><span className="small-label">OPTION 0{i + 1}</span><h3>{o.name}</h3><p>{o.detail}</p><dl><dt>Best for</dt><dd>{o.id === 'stages' ? 'Migrating the current five dropdowns' : o.id === 'rules' ? 'Many moments and precise conditions' : 'Understanding branches and longer journeys'}</dd><dt>Trade-off</dt><dd>{o.id === 'stages' ? 'Less compact as moment rules grow' : o.id === 'rules' ? 'The match journey is less visual' : 'More space and a greater learning curve'}</dd></dl><button className="button button--outline" onClick={() => { changeOption(o.id); setComparison(false); }}>Explore option<LuArrowRight /></button></div>)}</div><div className="reuse-summary"><LuCopy /><span>All three edit the same strategy. Your changes and the simulator carry across when you switch options.</span></div></ModalBody><ModalFooter /></ModalContent></Modal>
    {toast && <div className="moments-toast" role="status"><LuCircleCheck /><span>{toast}</span><button aria-label="Dismiss notification" onClick={() => setToast('')}><LuX /></button></div>}
  </div>;
}

function LuMousePointerHint() { return <LuArrowLeft size={12} />; }
