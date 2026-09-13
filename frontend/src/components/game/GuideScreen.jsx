import { useState } from "react";
import { ELEMENTS, ITEM_CLASSES, ITEM_RARITIES, BOSSES, FINAL_WAVE } from "@/game/data";
import { ELEMENT_SYNERGY_CONFIG } from "@/game/synergies";
import { Btn, Header, Panel, ElementBadge } from "./ui";
import { BookOpen, Shield, Zap, Sparkles, MapPin, Package, Users, Compass, HelpCircle } from "lucide-react";

export default function GuideScreen({ onBack }) {
  const [activeTab, setActiveTab] = useState("elements");

  const SECTIONS = [
    { id: "elements", label: "Elementi", icon: Zap, testId: "guide-section-elements" },
    { id: "synergies", label: "Sinergie", icon: Sparkles, testId: "guide-section-synergies" },
    { id: "rarity", label: "Rarità", icon: Shield, testId: "guide-section-rarity" },
    { id: "nodes", label: "Nodi & Mappa", icon: MapPin, testId: "guide-section-nodes" },
    { id: "items", label: "Oggetti", icon: Package, testId: "guide-section-items" },
    { id: "versions", label: "Forme & Versioni", icon: Users, testId: "guide-section-versions" },
    { id: "events", label: "Eventi", icon: Compass, testId: "guide-section-events" },
    { id: "glossary", label: "Glossario", icon: HelpCircle, testId: "guide-section-glossary" },
  ];

  return (
    <div data-testid="guide-screen" className="flex flex-col flex-1">
      <Header
        title="Guida di Gioco"
        sub="Manuale & Strategia"
        right={<Btn variant="ghost" data-testid="guide-back-btn" onClick={onBack}>Indietro</Btn>}
      />

      {/* Mobile-friendly horizontal scrolling category selector */}
      <div className="flex gap-1 p-2 bg-[#0b101d] border-b-2 border-slate-700 overflow-x-auto shrink-0 no-scrollbar">
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeTab === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              data-testid={`guide-tab-${sec.id}`}
              onClick={() => setActiveTab(sec.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded font-pixel text-[8px] whitespace-nowrap uppercase transition-colors border ${
                isActive
                  ? "bg-amber-500/20 text-amber-300 border-amber-400"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
              }`}
            >
              <Icon size={12} />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Guide Content Area */}
      <div className="p-3 space-y-3 flex-1 overflow-y-auto font-body text-base">
        {activeTab === "elements" && (
          <Panel data-testid="guide-section-elements" className="space-y-3">
            <h3 className="font-pixel text-[10px] text-amber-300 flex items-center gap-1.5">
              <Zap size={14} /> Ciclo Elementale
            </h3>
            <p className="text-slate-300">
              Ogni calciatore e mossa speciale appartiene a uno dei 4 elementi naturali. Il vantaggio di tipo conferisce un moltiplicatore di <strong className="text-emerald-300">x1.3 danni inflitti</strong>, mentre lo svantaggio riduce l'efficacia a <strong className="text-orange-300">x0.7</strong>. Gli scontri neutri infliggono danni standard (x1.0).
            </p>
            <div className="p-2.5 bg-slate-900 border border-slate-700 rounded text-center space-y-1">
              <div className="font-pixel text-[8px] text-slate-400 uppercase">La Ruota dei Tipi:</div>
              <div className="flex items-center justify-center gap-1 text-sm font-semibold flex-wrap">
                <span className={ELEMENTS.aria.text}>Aria</span> &gt;{" "}
                <span className={ELEMENTS.terra.text}>Terra</span> &gt;{" "}
                <span className={ELEMENTS.fuoco.text}>Fuoco</span> &gt;{" "}
                <span className={ELEMENTS.natura.text}>Natura</span> &gt;{" "}
                <span className={ELEMENTS.aria.text}>Aria</span>
              </div>
            </div>
            <div className="space-y-2">
              {Object.entries(ELEMENTS).map(([key, elem]) => (
                <div key={key} className="flex items-start gap-2 p-2 bg-slate-900/60 border border-slate-800 rounded">
                  <ElementBadge element={key} />
                  <div className="text-sm text-slate-300">
                    Vantaggioso contro <strong className="text-white capitalize">{elem.strongAgainst}</strong> · Svantaggiato contro <strong className="text-white capitalize">{elem.weakAgainst}</strong>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {activeTab === "synergies" && (
          <Panel data-testid="guide-section-synergies" className="space-y-3">
            <h3 className="font-pixel text-[10px] text-amber-300 flex items-center gap-1.5">
              <Sparkles size={14} /> Sinergie di Squadra
            </h3>
            <p className="text-slate-300">
              Schierare compagni dello stesso elemento crea un legame tattico che potenzia l'intera squadra in partita.
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-1 bg-slate-900/80 p-2.5 rounded border border-slate-700">
              <li><strong>Attivazione:</strong> richiede almeno <strong>2 compagni dello stesso elemento in vita</strong> (non KO).</li>
              <li><strong>Cap massimo:</strong> possono essere attive contemporaneamente al massimo <strong>2 intese</strong>.</li>
              <li><strong>Esclusione KO:</strong> i giocatori esausti non contribuiscono al conteggio delle intese né ricevono cure.</li>
            </ul>
            <div className="space-y-2">
              {Object.entries(ELEMENT_SYNERGY_CONFIG).map(([key, syn]) => (
                <div key={key} className="p-2.5 bg-slate-900 border border-slate-700 rounded space-y-1">
                  <div className="flex items-center gap-2">
                    <ElementBadge element={key} />
                    <span className="font-pixel text-[9px] text-white">{syn.label}</span>
                  </div>
                  <div className="text-sm text-slate-200">
                    <strong>Effetto:</strong> {syn.description}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {activeTab === "rarity" && (
          <Panel data-testid="guide-section-rarity" className="space-y-3">
            <h3 className="font-pixel text-[10px] text-amber-300 flex items-center gap-1.5">
              <Shield size={14} /> Rarità & Frequenza
            </h3>
            <p className="text-slate-300">
              In Footballer Quest, la rarità descrive la <strong>frequenza, l'esclusività e la reperibilità</strong> nei mercanti e nelle ricompense, <em>non</em> la potenza grezza o la superiorità intrinseca.
            </p>
            <div className="space-y-2">
              {Object.entries(ITEM_RARITIES).map(([key, r]) => (
                <div key={key} className={`p-2 border rounded ${r.cardClass}`}>
                  <div className={`font-pixel text-[9px] ${r.accentClass}`}>{r.label}</div>
                  <div className="text-sm text-slate-300 mt-1">
                    Peso nel pool ricompense: <strong>{r.rewardWeight}</strong>. Oggetti o calciatori con questo profilo compaiono con frequenza proporzionata al loro valore situazionale.
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {activeTab === "nodes" && (
          <Panel data-testid="guide-section-nodes" className="space-y-3">
            <h3 className="font-pixel text-[10px] text-amber-300 flex items-center gap-1.5">
              <MapPin size={14} /> Struttura Run 2.0: Segmenti, Percorsi & Miniboss
            </h3>
            <p className="text-slate-300">
              Ogni run si snoda lungo <strong>{FINAL_WAVE} ondate</strong> organizzate in <strong>segmenti multi-passo (2–5 passi)</strong> culminanti in un <em>checkpoint terminale</em>.
            </p>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="p-2 bg-slate-900 border border-slate-700 rounded">
                <strong className="text-white font-pixel text-[8px]">SEGMENTI & BIVIO STRATEGICO:</strong> Al termine di ogni segmento, una schermata di <em>Scelta Percorso</em> vi permette di pianificare la rotta successiva. Ciascun tragitto (Sentiero Alpino, Zona Alius, Distretto Commerciale, Campi Federali, Circuito Grandi Stadi, Linea Diretta, Zona Costiera) presenta tendenze marcate di apparizione nodi, durata del segmento e livello di rischio.
              </div>
              <div className="p-2 bg-slate-900 border border-slate-700 rounded">
                <strong className="text-amber-300 font-pixel text-[8px]">CHECKPOINT MINIBOSS & BOSS:</strong> Ogni segmento termina obbligatoriamente con uno scontro decisivo. I checkpoint intermedi schierano <em>Miniboss</em> tematici regionali (Pattuglia Royal, Avanguardia Gemini, Muro Alpine, Stelle Regionali, Pattuglia d'Assalto Epsilon, Avanguardia dei Ghiacci, Fronte Prominence, Rappresentativa Mondiale, Ricognizione Genesis). Alle ondate 10, 20, 30, 40 e 50 vi attendono invece i maestosi <em>Boss Principali</em> con guarigione totale successiva della squadra.
              </div>
              <div className="p-2 bg-slate-900 border border-slate-700 rounded">
                <strong className="text-rose-300 font-pixel text-[8px]">BATTAGLIE STANDARD ED ÉLITE:</strong> Le battaglie standard variano tra duelli 1v1 e formazioni a squadre (1-3 calciatori standard, 4 rari, 5-6 con sblocco progressivo). Le <em>Battaglie d'Élite</em> schierano avversari potenziati con capitani d'esperienza e ricompense garantite di alto livello.
              </div>
              <div className="p-2 bg-slate-900 border border-slate-700 rounded">
                <strong className="text-emerald-300 font-pixel text-[8px]">AREA DI RECUPERO:</strong> Nodi di ristoro dedicati che offrono tre opzioni di pronto soccorso: Riposo gratuito (+35% HP), Fisioterapia con rimozione bruciature (35 P) e Intervento Medico Completo con rianimazione compagni KO (60 P).
              </div>
              <div className="p-2 bg-slate-900 border border-slate-700 rounded">
                <strong className="text-sky-300 font-pixel text-[8px]">MERCANTE, RECLUTE & ALLENAMENTO:</strong> Nodi interattivi in cui acquistare scorte, accogliere nuovi calciatori tramite reclutamento o sfida, e perfezionare le statistiche con gli allenamenti federali.
              </div>
            </div>
          </Panel>
        )}

        {activeTab === "items" && (
          <Panel data-testid="guide-section-items" className="space-y-3">
            <h3 className="font-pixel text-[10px] text-amber-300 flex items-center gap-1.5">
              <Package size={14} /> Le 3 Classi di Oggetti
            </h3>
            <p className="text-slate-300">
              Gli oggetti sono suddivisi rigorosamente in 3 classi con funzionamento e permanenza distinti:
            </p>
            <div className="space-y-3">
              <div className="p-2.5 bg-slate-900 border-2 border-sky-600/60 rounded space-y-1">
                <div className="font-pixel text-[9px] text-sky-300">1. CONSUMABILI MANUALI (Manual)</div>
                <p className="text-sm text-slate-300">
                  Conservati nello zaino e utilizzati manualmente su un singolo giocatore tra le ondate o in battaglia. Includono barrette energetiche, bibite inazuma, impacchi curativi, cuneo DNA e kit di allenamento permanente.
                </p>
              </div>
              <div className="p-2.5 bg-slate-900 border-2 border-amber-600/60 rounded space-y-1">
                <div className="font-pixel text-[9px] text-amber-300">2. BONUS NODO (Node) — PERSISTENZA DI SEGMENTO</div>
                <p className="text-sm text-slate-300">
                  <strong>Non occupano spazio nello zaino!</strong> Si attivano istantaneamente all'ottenimento e applicano vantaggi tattici circoscritti alla squadra (es. Grinta +1 ATK, Slancio Spericolato, Tessera Scout, Sigillo dello Sfidante). Con la struttura Run 2.0, i bonus nodo <strong>persistono lungo tutti i passi interni del segmento</strong> e scadono esclusivamente al confine del checkpoint terminale!
                </p>
              </div>
              <div className="p-2.5 bg-slate-900 border-2 border-emerald-600/60 rounded space-y-1">
                <div className="font-pixel text-[9px] text-emerald-300">3. INNESCHI SITUAZIONALI (Trigger)</div>
                <p className="text-sm text-slate-300">
                  Custoditi nello zaino, non si consumano con un'azione manuale, ma si <strong>innescano automaticamente</strong> al verificarsi di specifiche condizioni in battaglia (es. Cerotto sotto il 30% HP, Balsamo previene la prima bruciatura, Cavigliera salva dal KO una volta lasciando 1 HP, Stendardo potenzia il primo assalto).
                </p>
              </div>
            </div>
          </Panel>
        )}

        {activeTab === "versions" && (
          <Panel data-testid="guide-section-versions" className="space-y-3">
            <h3 className="font-pixel text-[10px] text-amber-300 flex items-center gap-1.5">
              <Users size={14} /> Character & Versioni
            </h3>
            <p className="text-slate-300">
              Il gioco separa l'identità fondamentale (<strong>Character</strong>) dalle sue molteplici incarnazioni (<strong>CharacterVersion</strong>). Il roster conta oltre 110 versioni giocabili ed esplorabili!
            </p>
            <div className="p-2.5 bg-slate-900 border border-slate-700 rounded space-y-2 text-sm text-slate-300">
              <p>
                Per esempio, <em>Jude Sharp</em> è una singola identità canonica, ma può essere schierato nella forma <strong>Raimon (Base)</strong> o nella celebre versione <strong>Royal Academy</strong>. Lo stesso vale per <em>Shawn Frost</em> (Raimon o Alpine), <em>Torch</em> (Prominence o Chaos), <em>Gazelle</em> (Diamond Dust o Chaos) e <em>Xavier Foster</em> (Genesis o Base). Ciascuna incarnazione offre statistiche, ruoli ed elementi dedicati.
              </p>
              <div className="p-2 bg-amber-950/40 border border-amber-600 rounded text-amber-200">
                <strong>Regola del Draft:</strong> 1 calciatore occupa esattamente 1 slot squadra. Non è permesso schierare due incarnazioni dello stesso calciatore nello stesso team: nel selettore iniziale puoi alternare la forma desiderata tramite gli appositi selettori.
              </div>
            </div>
          </Panel>
        )}

        {activeTab === "events" && (
          <Panel data-testid="guide-section-events" className="space-y-3">
            <h3 className="font-pixel text-[10px] text-amber-300 flex items-center gap-1.5">
              <Compass size={14} /> Eventi & Decisioni
            </h3>
            <p className="text-slate-300">
              Durante il cammino incontrerai allenatori, reporter e vecchi rivali che proporranno scelte impreviste.
            </p>
            <p className="text-sm text-slate-300">
              Le tue decisioni possono conferire Prestigio extra, strumenti rari o modificatori temporanei alla run (come bonus o penalità per un numero stabilito di ondate). Valuta attentamente rischi e benefici in base allo stato attuale di salute della squadra.
            </p>
          </Panel>
        )}

        {activeTab === "glossary" && (
          <Panel data-testid="guide-section-glossary" className="space-y-3">
            <h3 className="font-pixel text-[10px] text-amber-300 flex items-center gap-1.5">
              <HelpCircle size={14} /> Glossario & Consigli Tattici
            </h3>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="p-2 bg-slate-900 border border-slate-700 rounded">
                <strong className="text-red-400">KO (Fuori Gioco):</strong> Il calciatore ha 0 HP. Non può attaccare, non contribuisce alle sinergie elementali e non ottiene esperienza da combattimento a meno che non venga rianimato prima del termine della lotta.
              </div>
              <div className="p-2 bg-slate-900 border border-slate-700 rounded">
                <strong className="text-sky-300">PARATA (Guard):</strong> Dimezza (50%) i danni subiti dal prossimo colpo.
              </div>
              <div className="p-2 bg-slate-900 border border-slate-700 rounded">
                <strong className="text-orange-400">BRUCIATURA (Burn):</strong> Causa danno residuo pari al 10% degli HP massimi a ogni fine turno per 3 turni.
              </div>
              <div className="p-2 bg-slate-900 border border-slate-700 rounded">
                <strong className="text-amber-300">STADI DI STATISTICA:</strong> Gli stadi variano da -3 a +3 e alterano moltiplicativamente l'attacco o la difesa in battaglia o fino alla fine del nodo.
              </div>
              <div className="p-2 bg-slate-900 border border-slate-700 rounded">
                <strong className="text-emerald-400">RUOLI IN CAMPO:</strong> A (Attaccante), C (Centrocampista), D (Difensore), P (Portiere). Bilancia la rosa per gestire ogni tipologia di avversario.
              </div>
            </div>
          </Panel>
        )}
      </div>

      <div className="p-3 bg-[#111827] border-t-4 border-slate-800">
        <Btn data-testid="guide-close-btn" variant="primary" className="w-full" onClick={onBack}>Chiudi Guida</Btn>
      </div>
    </div>
  );
}
