import { ROLES } from "@/game/data";
import { CHARACTERS, CHARACTER_VERSIONS, PRIMARY_MOVES } from "@/game/catalog";
import { getCollectionState, getCollectionProgress } from "@/game/collection";
import { isFreshPlayerVersion } from "@/game/scenarios";
import { TEAMS } from "@/game/catalogMetadata";
import { SPIRITS } from "@/game/spirits";
import { Btn, Header, Avatar, ElementBadge, MoveInfo } from "./ui";

export default function CollectionScreen({ meta, onBack }) {
  const versions = Object.values(CHARACTER_VERSIONS);
  const unlocked = versions.filter(v => isFreshPlayerVersion(v) && getCollectionProgress(meta, v.versionId).starterUnlocked).length;
  return (
    <div data-testid="collection-screen" className="flex flex-col flex-1">
      <Header title="Collezione" sub={`${unlocked}/${versions.filter(isFreshPlayerVersion).length} starter disponibili`} right={<Btn variant="ghost" data-testid="collection-back-btn" onClick={onBack}>Menu</Btn>} />
      <div className="px-3 pt-3" data-testid="collection-forms">
        <div className="font-pixel text-[9px] text-fuchsia-300 mb-1">FORME DI COMBATTIMENTO</div>
        {Object.entries(SPIRITS).map(([id, sp]) => {
          const got = (meta.forms || []).find((f) => f.formId === `${id}:keshin`);
          return <div key={id} data-testid={`collection-form-${id}`} className="font-body text-base text-slate-300 border border-fuchsia-800 px-2 py-1 mb-1">
            Spirito Guerriero · {got ? <b className="text-fuchsia-200">{sp.name} ({CHARACTERS[id]?.displayName})</b> : "??? · da risvegliare in un'anomalia temporale"}</div>;
        })}
        {(meta.forms || []).filter((f) => f.kind === "mixi").map((f) => <div key={f.formId} data-testid={`collection-form-${f.formId}`} className="font-body text-base text-cyan-200 border border-cyan-800 px-2 py-1 mb-1">Mixi Max · {f.name}</div>)}
        {!(meta.forms || []).some((f) => f.kind === "mixi") && <div className="font-body text-base text-slate-400 border border-cyan-900 px-2 py-1 mb-1">Mixi Max · ??? · da ottenere in un'anomalia temporale</div>}
      </div>
      <div className="p-3 grid grid-cols-2 gap-2 overflow-y-auto">
        {versions.map(v => {
          const state = getCollectionState(meta, v.versionId);
          const progress = getCollectionProgress(meta, v.versionId);
          const name = v.displayName || CHARACTERS[v.characterId]?.displayName || "Sconosciuto";
          return (
            <div key={v.versionId} data-testid={`collection-${v.legacyRosterId || v.versionId}`} className="p-2 border-2 border-slate-700 bg-[#141c2e] space-y-2">
              {state === "UNKNOWN" ? <>
                <div aria-label="Personaggio sconosciuto" className="h-24 grid place-items-center bg-slate-800 text-slate-500 text-4xl">?</div>
                <div className="font-pixel text-[9px] text-slate-400">???</div>
              </> : <>
                <div className="flex justify-center"><Avatar p={{ baseId: v.legacyRosterId, versionId: v.versionId, element: v.element, uid: v.versionId, name }} size={88} /></div>
                <div className="font-pixel text-[9px] text-white">{name}</div>
                <div className="font-body text-slate-400">{ROLES[v.role] || v.role}</div>
                <div className="font-body text-sm text-sky-300">Versione: {TEAMS.find((t) => t.teamId === v.primaryTeamId)?.displayName || "Indipendente"}</div>
                <ElementBadge element={v.element} />
                <div className="font-body text-sm text-slate-300">{state === "RECRUITED" ? "Reclutato" : "Scoperto · non ancora reclutato"}</div>
                {state === "RECRUITED" && <>
                  <div className="font-body text-sm text-slate-300">Base: HP {v.baseStats.hp} · ATK {v.baseStats.atk} · DIF {v.baseStats.def} · VEL {v.baseStats.spd}</div>
                  <MoveInfo move={PRIMARY_MOVES[v.primaryMoveId]} />
                </>}
              </>}
              {progress.starterUnlocked && <div className="font-body text-sm text-amber-300">{isFreshPlayerVersion(v) ? "Disponibile nel draft" : "Archivio · solo run esistenti"}</div>}
            </div>
          );
        })}
      </div>
      <div className="p-3 font-body text-slate-400 text-base">Scopri i calciatori incontrandoli. Reclutali per sbloccarli nel draft.</div>
    </div>
  );
}
