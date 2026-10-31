import { useEffect, useMemo, useRef, useState } from "react";
import { canonicalCharacterId, resolveVersion } from "@/game/catalog";
import { starterGroups, filterStarterGroups, selectStarterVersion, starterTeamName, starterVersionName } from "@/game/starterBrowser";
import { TEAMS, ERAS } from "@/game/catalogMetadata";
import { ELEMENTS, ROLES } from "@/game/data";
import { createPlayer } from "@/game/engine";
import { DIFFICULTIES } from "@/game/rules";
import { sfx } from "@/game/audio";
import { Avatar, MoveInfo, StatLine } from "./ui";
import "./starterSelector.css";

const portrait = v => ({ versionId: v.versionId, element: v.element, name: v.displayName, uid: v.versionId });
function ChoicePanel({ title, options, value, onChoose, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal?.();
    return () => previous?.focus?.();
  }, []);
  return <dialog ref={dialog} className="ss-inspector ss-picker" aria-label={title}
    open={!HTMLDialogElement.prototype.showModal ? true : undefined} onCancel={onClose}
    onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }}>
    <header><h2>{title}</h2><button aria-label="Chiudi scelta" onClick={onClose}>×</button></header>
    <div className="ss-picker-options">{options.map(o => <button key={o.id} data-testid={`choice-${o.id || 'all'}`} aria-pressed={value === o.id} onClick={() => onChoose(o.id)}>{o.label}<span>{value === o.id ? "✓" : ""}</span></button>)}</div>
  </dialog>;
}
function StarterInspector({ group, version, selected, full, onVersion, onSelect, onClose }) {
  const dialog = useRef(null);
  const player = useMemo(() => createPlayer(version.versionId, 3, () => 0.5), [version.versionId]);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal?.();
    return () => previous?.focus?.();
  }, []);
  return <dialog ref={dialog} className="ss-inspector" aria-labelledby="ss-inspector-name"
    open={typeof HTMLDialogElement === "undefined" || !HTMLDialogElement.prototype.showModal ? true : undefined} onCancel={onClose}>
    <header><span className="ss-eyebrow">DOSSIER TITOLARE · LV 3</span><button aria-label="Chiudi dettagli" onClick={onClose}>×</button></header>
    <div className="ss-profile"><Avatar p={player} size={80} /><div><h2 id="ss-inspector-name">{group.name}</h2><p>{ELEMENTS[version.element].label} · {ROLES[version.role]}</p></div></div>
    {group.versions.length > 1 && <div className="ss-versions" aria-label="Versioni disponibili">
      {group.versions.map(v => <button key={v.versionId} data-testid={`version-${v.versionId}`} aria-pressed={v.versionId === version.versionId}
        onClick={() => onVersion(v.versionId)}>{starterVersionName(v)}</button>)}
    </div>}
    <div className="ss-context"><strong>{starterTeamName(version)}</strong><span>{ERAS.find(e => e.eraId === version.eraId)?.displayName || "Contesto non definito"}{version.variantId ? ` · ${version.variantId}` : ""}</span><span>Rarità: {version.rarityId || "non assegnata"}</span></div>
    <section aria-label="Statistiche titolare"><h3>In campo</h3><StatLine p={player} /></section>
    <section aria-label="Tecnica"><h3>Tecnica attuale</h3><MoveInfo move={player.move} /></section>
    <button className="ss-action" data-testid="starter-confirm" disabled={!selected && full} onClick={onSelect}>
      {selected === version.versionId ? "Rimuovi dai titolari" : selected ? "Usa questa versione" : full ? "Tre posti occupati" : "Scegli come titolare"}
    </button>
  </dialog>;
}

export default function TeamSelect({ meta, onStart, onBack }) {
  const [selected, setSelected] = useState([]), [difficultyId, setDifficultyId] = useState("normal");
  const [overworldV2, setOverworldV2] = useState(false);
  const [filters, setFilters] = useState({ search: "", team: "", role: "", element: "" });
  const [choices, setChoices] = useState({}), [open, setOpen] = useState(null);
  const [picker, setPicker] = useState(null), [notice, setNotice] = useState("");
  const groups = useMemo(() => starterGroups(meta), [meta]);
  const visible = useMemo(() => filterStarterGroups(groups, filters), [groups, filters]);
  const teams = TEAMS.filter(t => groups.some(g => g.versions.some(v => v.primaryTeamId === t.teamId)));
  const selectedFor = id => selected.find(v => canonicalCharacterId(v) === id);
  const displayVersion = group => {
    const candidates = group.matchingVersions || group.versions;
    return candidates.find(v => v.versionId === (choices[group.characterId] || selectedFor(group.characterId))) || candidates[0];
  };
  const inspect = (group, version = displayVersion(group)) => { setChoices(c => ({ ...c, [group.characterId]: version.versionId })); setOpen(group.characterId); };
  const group = groups.find(g => g.characterId === open);
  const version = group && displayVersion(group);
  const switchVersion = id => {
    setChoices(c => ({ ...c, [open]: id }));
    setSelected(s => s.some(v => canonicalCharacterId(v) === open) ? selectStarterVersion(s, id) : s);
  };
  const confirm = () => {
    sfx.select();
    setNotice("");
    setSelected(s => s.includes(version.versionId) ? s.filter(v => v !== version.versionId) : selectStarterVersion(s, version.versionId));
    setOpen(null);
  };
  const add = id => {
    const characterId = canonicalCharacterId(id);
    setChoices(c => ({ ...c, [characterId]: id }));
    setSelected(s => selectStarterVersion(s, id));
    setNotice(""); setPicker(null); sfx.select();
  };
  const directAdd = g => {
    if (!selectedFor(g.characterId) && selected.length === 3) { setNotice("Tre posti occupati. Tocca un titolare nel riepilogo per rimuoverlo."); return; }
    const candidates = g.matchingVersions || g.versions;
    const preferred = candidates.find(v => v.versionId === choices[g.characterId]);
    if (candidates.length === 1 || preferred) add((preferred || candidates[0]).versionId);
    else setPicker({ title: `Scegli versione · ${g.name}`, options: candidates.map(v => ({ id: v.versionId, label: starterVersionName(v) })), value: selectedFor(g.characterId), onChoose: add });
  };
  const filterOptions = {
    team: [{ id: "", label: "Tutte" }, ...teams.map(t => ({ id: t.teamId, label: t.displayName }))],
    role: [{ id: "", label: "Tutti" }, ...Object.entries(ROLES).map(([id, label]) => ({ id, label }))],
    element: [{ id: "", label: "Tutti" }, ...Object.values(ELEMENTS).map(e => ({ id: e.id, label: e.label }))],
  };
  return <div className="ss-screen ss-with-mode" data-testid="team-selection-screen">
    <header className="ss-heading"><div><span className="ss-eyebrow">LA TUA SQUADRA, IL TUO VIAGGIO</span><h1>Scegli i titolari</h1></div><button data-testid="select-back-btn" onClick={onBack}>Menu</button></header>
    <div className="ss-browse"><div className="ss-controls">
      <label className="ss-mode"><input data-testid="overworld-v2-opt-in" type="checkbox" checked={overworldV2} onChange={e => setOverworldV2(e.target.checked)} />Overworld V2 sperimentale <span>{overworldV2 ? "Nuovo percorso · 50 wave" : "Predefinito: percorso V1"}</span></label>
      <label className="ss-search">Cerca nel roster<input aria-label="Cerca personaggio o squadra" placeholder="Nome, alias o squadra…" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} /></label>
      <div className="ss-filters">
        {[["team", "Squadra"], ["role", "Ruolo"], ["element", "Elemento"]].map(([key, label]) => <div className="ss-filter" key={key}><span>{label}</span><button aria-label={label} aria-haspopup="dialog" onClick={() => setPicker({ title: label, options: filterOptions[key], value: filters[key], onChoose: id => { setFilters(f => ({ ...f, [key]: id })); setPicker(null); } })}>{filterOptions[key].find(o => o.id === filters[key])?.label} ▾</button></div>)}
      </div>
      <div className="ss-count" aria-live="polite">{visible.length} personaggi disponibili <button onClick={() => setFilters({ search: "", team: "", role: "", element: "" })}>Azzera filtri</button></div>
    </div>
    <div className="ss-roster" aria-label="Roster personaggi">
      <div className="ss-grid">{visible.map(g => {
        const v = displayVersion(g), chosen = selectedFor(g.characterId);
        return <div className="ss-tile" key={g.characterId} data-selected={!!chosen}><button className="ss-tile-body" data-testid={`starter-${g.characterId}`} aria-label={`${g.name}, ${starterVersionName(v)}${chosen ? ", titolare" : ""}`} aria-pressed={!!chosen} onClick={() => inspect(g)}>
          <span className="ss-tile-top"><Avatar p={portrait(v)} size={48} /></span>
          <strong>{g.name}</strong><span>{ELEMENTS[v.element].label} · {ROLES[v.role]}</span><span className="ss-team">{v.primaryTeamId ? starterTeamName(v) : "Base"}</span>
          {g.versions.length > 1 && <span className="ss-version-count">{g.versions.length} versioni</span>}
        </button><button className="ss-add" data-testid={`add-${g.characterId}`} aria-label={`${chosen ? "Conferma" : "Aggiungi"} ${g.name}`} aria-pressed={!!chosen} onClick={e => { e.stopPropagation(); directAdd(g); }}>{chosen ? "✓" : "+"}</button></div>;
      })}</div>
      {!visible.length && <p className="ss-empty">Nessun titolare con questi filtri. Prova un'altra ricerca.</p>}
    </div>
    </div>
    <footer className="ss-footer">
      {notice && <p role="status" className="ss-notice">{notice}</p>}
      <div className="ss-summary-title"><strong>TITOLARI · {selected.length}/3</strong><span>Tocca per cambiare</span></div>
      <div className="ss-summary">{[0, 1, 2].map(i => {
        const v = resolveVersion(selected[i]); const g = v && groups.find(g => g.characterId === canonicalCharacterId(v));
        return v ? <button key={i} data-testid={`starter-slot-${i}`} aria-label={`Modifica ${g.name}`} onClick={() => inspect(g, v)}><Avatar p={portrait(v)} size={32} /><span><strong>{g.name}</strong><small>{starterVersionName(v)}</small></span></button> : <div key={i} className="ss-slot-empty">{i + 1}<span>Da scegliere</span></div>;
      })}</div>
      <div className="ss-launch"><fieldset><legend>Difficoltà</legend>{Object.entries(DIFFICULTIES).map(([id, d]) => <label key={id} title={d.description}><input data-testid={`difficulty-${id}`} type="radio" name="difficulty" checked={difficultyId === id} onChange={() => setDifficultyId(id)} />{d.label}</label>)}</fieldset>
        <button className="ss-action" data-testid="start-run-btn" disabled={selected.length !== 3} onClick={() => { sfx.win(); if (overworldV2) onStart(selected, difficultyId, 2); else onStart(selected, difficultyId); }}>Inizia · {DIFFICULTIES[difficultyId].label}{overworldV2 ? " · V2" : ""}</button></div>
    </footer>
    {group && <StarterInspector group={group} version={version} selected={selectedFor(open)} full={selected.length === 3} onVersion={switchVersion} onSelect={confirm} onClose={() => setOpen(null)} />}
    {picker && <ChoicePanel {...picker} onClose={() => setPicker(null)} />}
  </div>;
}
