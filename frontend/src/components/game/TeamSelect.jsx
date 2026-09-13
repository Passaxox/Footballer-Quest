import { getCollectionProgress } from "@/game/collection";
import { CHARACTER_VERSIONS, CHARACTERS } from "@/game/catalog";
import { useState } from "react";
import { ELEMENTS } from "@/game/data";
import { createPlayer } from "@/game/engine";
import { DIFFICULTIES } from "@/game/rules";
import { sfx } from "@/game/audio";
import { Btn, Header, PlayerCard, StatLine } from "./ui";

export default function TeamSelect({ meta, onStart, onBack }) {
  const [sel, setSel] = useState([]);
  const [selectedVersions, setSelectedVersions] = useState({});
  const [difficultyId, setDifficultyId] = useState("normal");

  const roster = Object.values(CHARACTER_VERSIONS).filter(
    v => v.kind === "player" && getCollectionProgress(meta, v.versionId).starterUnlocked
  );

  // Group unlocked versions by canonical characterId
  const characterGroups = [];
  const groupMap = new Map();
  for (const v of roster) {
    if (!groupMap.has(v.characterId)) {
      const g = {
        characterId: v.characterId,
        character: CHARACTERS[v.characterId] || { displayName: v.name },
        versions: [],
      };
      groupMap.set(v.characterId, g);
      characterGroups.push(g);
    }
    groupMap.get(v.characterId).versions.push(v);
  }

  const getActiveVersionId = (group) => {
    const inTeam = group.versions.find(v => sel.includes(v.versionId));
    if (inTeam) return inTeam.versionId;
    return selectedVersions[group.characterId] || group.versions[0].versionId;
  };

  const toggleCharacter = (group, versionId) => {
    sfx.select();
    const charVersionIds = group.versions.map(v => v.versionId);
    const currentlySelectedId = sel.find(id => charVersionIds.includes(id));

    if (currentlySelectedId === versionId) {
      setSel(s => s.filter(id => id !== versionId));
    } else if (currentlySelectedId) {
      setSel(s => s.map(id => id === currentlySelectedId ? versionId : id));
    } else if (sel.length < 3) {
      setSel(s => [...s, versionId]);
    }
  };

  const handleSelectVersion = (group, versionId) => {
    sfx.select();
    setSelectedVersions(prev => ({ ...prev, [group.characterId]: versionId }));
    const charVersionIds = group.versions.map(v => v.versionId);
    setSel(s => {
      if (s.some(id => charVersionIds.includes(id))) {
        return s.map(id => charVersionIds.includes(id) ? versionId : id);
      }
      return s;
    });
  };

  return (
    <div data-testid="team-selection-screen" className="flex flex-col flex-1">
      <Header title="Scegli 3 titolari" sub={`${sel.length}/3 selezionati`} right={<Btn variant="ghost" data-testid="select-back-btn" onClick={onBack}>Menu</Btn>} />
      <div className="p-3 space-y-2 overflow-y-auto flex-1">
        <fieldset className="space-y-2 border-2 border-slate-600 p-2">
          <legend className="font-body text-amber-300">Difficoltà della nuova run</legend>
          {Object.entries(DIFFICULTIES).map(([id, difficulty]) => (
            <label key={id} className={`flex gap-2 p-2 cursor-pointer border ${difficultyId === id ? "border-amber-400 bg-slate-800" : "border-slate-700"}`}>
              <input type="radio" name="difficulty" value={id} data-testid={`difficulty-${id}`} checked={difficultyId === id} onChange={() => setDifficultyId(id)} />
              <span className="font-body text-base"><strong>{difficulty.label}</strong><span className="block text-sm text-slate-300">{difficulty.description}</span></span>
            </label>
          ))}
        </fieldset>
        <div className="font-body text-slate-400 text-base leading-tight mb-2">
          Ricorda il ciclo elementale: <span className={ELEMENTS.aria.text}>Aria</span> &gt; <span className={ELEMENTS.terra.text}>Terra</span> &gt; <span className={ELEMENTS.fuoco.text}>Fuoco</span> &gt; <span className={ELEMENTS.natura.text}>Natura</span> &gt; <span className={ELEMENTS.aria.text}>Aria</span>
        </div>
        {characterGroups.map((group) => {
          const activeVersionId = getActiveVersionId(group);
          const activeVersion = group.versions.find(v => v.versionId === activeVersionId) || group.versions[0];
          const p = createPlayer(activeVersion.versionId, 3);
          const on = sel.includes(activeVersion.versionId);
          const hasMultiple = group.versions.length > 1;

          return (
            <div key={group.characterId} className="space-y-1" data-testid={`starter-group-${group.characterId}`}>
              <PlayerCard
                p={p}
                selected={on}
                testId={`starter-${activeVersion.legacyRosterId || activeVersion.versionId}`}
                onClick={() => toggleCharacter(group, activeVersion.versionId)}
              />
              {hasMultiple && (
                <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-900 border-2 border-t-0 border-slate-700" data-testid={`version-selector-${group.characterId}`}>
                  <span className="font-pixel text-[8px] text-slate-400 self-center mr-1 uppercase">Forma:</span>
                  {group.versions.map((v) => {
                    const isTabActive = v.versionId === activeVersion.versionId;
                    return (
                      <button
                        key={v.versionId}
                        type="button"
                        data-testid={`starter-tab-${v.versionId}`}
                        data-starter-version={v.versionId}
                        className={`font-pixel text-[8px] px-2 py-1 rounded transition-colors border ${
                          isTabActive
                            ? "bg-amber-500/20 text-amber-300 border-amber-400 font-bold"
                            : "bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectVersion(group, v.versionId);
                        }}
                      >
                        {v.versionName || (v.teamTags?.[0] ? v.teamTags[0].toUpperCase() : v.versionId)}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="border-2 border-t-0 border-slate-700 p-2 bg-[#0b101d]">
                <StatLine p={p} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-3 bg-[#111827] border-t-4 border-slate-800">
        <Btn data-testid="start-run-btn" variant="primary" className="w-full" disabled={sel.length !== 3} onClick={() => { sfx.win(); onStart(sel, difficultyId); }}>Inizia · {DIFFICULTIES[difficultyId].label}</Btn>
      </div>
    </div>
  );
}
