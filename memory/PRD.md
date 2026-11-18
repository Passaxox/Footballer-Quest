# Inazuma Rogue – PRD

## Problem statement (originale)
Gioco mobile-first, misto Pokerogue x Pokelike, a tema Inazuma Eleven: lotta 1v1 con una sola mossa per giocatore (stile Pokelike, cambio giocatore su KO), profondità di eventi casuali stile Pokerogue (oggetti, incontri speciali, Cuneo DNA per fondere due giocatori, eventi narrativi), 4 elementi (Fuoco, Aria, Terra, Natura), reclutamento durante la run.

## Scelte utente
- Persistenza: localStorage (nessun account)
- Struttura: sequenza lineare di ondate (50, boss ogni 10)
- Combattimento: duello 1v1 con cambio, una mossa per giocatore
- Nomi reali Inazuma Eleven (localizzazione europea)
- Stile pixel/GBA; sprite reali dei giochi DS/3DS (richiesta successiva)

## Architettura
- Frontend React (CRA + Tailwind), tutto il gioco è client-side: `src/game/{data,engine,storage,audio}.js`, schermate in `src/components/game/`
- Backend FastAPI minimale: `POST /api/runs`, `GET /api/leaderboard` (Albo d'Oro globale, MongoDB)
- Sprite: `public/sprites/{id}.png` scaricati dalla wiki Inazuma Eleven (script `scripts/fetch_sprites.py`); fallback avatar procedurale

## Implementato (06/2026)
- Titolo, selezione 3 titolari (8 sbloccati iniziali su 44), hub ondata, battaglia 1v1 (attacca/cambia/zaino/fuggi, effetti mossa, status brucia/parata/mod stat, ciclo elementale Aria>Terra>Fuoco>Natura>Aria)
- Ondate: battaglia singola/squadra, boss (Royal Academy, Zeus, Chaos, Genesis, Little Gigant), incontro reclutamento (sfida/convinci/ignora), mercante, allenamento, 17 eventi narrativi con scelte e esiti casuali
- Ricompense 1 su 3, 11 oggetti (Cuneo DNA, Fischietto, Pallone d'Oro...), squadra max 6, capitano, congeda, fusione DNA con anteprima e scelta mossa
- Salvataggio automatico run + collezione/record; game over/vittoria con invio punteggio globale
- Sprite reali DS/3DS per tutti i 44 giocatori, fusione mostra sprite diviso

## Iterazione 06/2026 (FOOTBALLER QUEST)
- Rebranding FOOTBALLER QUEST, fix env/build
- Sinergie/Traits stile Pokelike 2 (`game/traits.js`, `SynergyPanel.jsx`): 6 tier, buff solo runtime, x1.5 in Torre
- Fusione (Cuneo DNA): ricompensa rara (non più in negozio), 1 volta per run; A = base mantenuto (nome, ruolo, elemento, squadra-sinergia), B = donatore; tecnica ereditabile; slot liberato
- Spirito Guerriero (`game/spirits.js`): solo personaggi canonici (Mark = Gran Majin, Axel = Enma Gazard), pulsante in battaglia 1 volta per match, azione gratuita, moltiplicatori ATK/DIF finché resta in campo, +1 punto sinergia temporaneo per il match; badge "SG"

## Iterazione 06/2026 · Campagna 50 wave + Vantaggi
- Campagna (`game/campaign.js`): 5 atti (Raimon/Tokyo, Football Frontier, Alius risposta, Alius resa dei conti, FFI), mappa a nodi Pokelike per atto (3 corsie = location, bivi, rivali, anomalie temporali), boss W10/20/30/40/50 (W30 Fuoco/Ghiaccio da ramo), intro atto, dialogo boss con ritratti, conseguenze + sblocco versione (Jude Raimon, Byron, Gazelle/Torch, Xavier) con cambio versione sullo stesso slot, riepilogo percorso a fine run. STORY_LOCKS per versioni narrative.
- Spirito Guerriero sbloccabile in anomalia (3 turni di energia, cut-in a schermo intero). Mixi Max come variante anomalia (passiva per ruolo donatore A/C/D/P, doppio ritratto). Forme nel Dex (Collezione).
- Selezione titolari: griglia volti, chip filtri, dock con squadra.
- Vantaggi (`game/perks.js`, PerksScreen, PerkOfferScreen): 9 categorie, rarità + livelli I-III, valuta Spirito di squadra (fine run), maledetti, fusioni, offerta a inizio run e dopo ogni boss, banner HUD al tocco.
- Codice salvataggio copia/incolla (SaveCodeScreen).
- Limite canon: solo Mark (Gran Majin) e Axel (Enma Gazard) hanno Spirito nel catalogo attuale; Dark Emperors e Gemini Storm (membri) non presenti nel catalogo.

## Iterazione 06/2026 · Percorsi Pokelike, boss variabili, miniboss
- Mappa: a ogni wave si resta in corsia o si passa a quella vicina (edgesFrom ±1); corsie con carattere/pool propri.
- Boss W10/20/30/40 estratti col seed da `game/bossPools.js` (PHASE_POOLS, tag arc/difficulty per futura campagna 100 wave); W50 FISSA Little Gigant. W30 = due boss di ramo.
- Miniboss W5/15/25/35/45 (tutte le corsie), premio a scelta tra due: reclutamento specifico, oggetto raro, risveglio Spirito. Boss: Medaglia del Checkpoint esclusiva.
- Dataset canon v2: 78 giocatori con posizione verificata (`catalogCanonV2.js`, avatar pixel senza sprite DS). Squadre mancanti/ridotte: Kirkwood, Brainwashing, Wild, Dark Emperors, Gemini Storm (solo Jordan), Diamond Dust, The Kingdom, Red Matador; Genesis/Unicorn/Orpheus ridotte.

## Iterazione 06/2026 · Talenti, Sfide, fix intro atto
- Fix: testo "Perché conta" generato da miniboss/boss estratti; nessun duplicato miniboss/boss nello stesso atto (runPlan sameAct); stemmi = TeamCrest (placeholder con iniziali/colore/nome, immagini reali da /public/crests/<teamId>.png aggiungendo l'id in CREST_FILES).
- Talenti (`game/talents.js`, TalentsPanel): 3 vie (Bomber/Portiere/Mister) + maestrie, Punti Talento da boss battuti e Checkpoint perfetti, snapshot run.talentFx a inizio run, azzeramento con rimborso.
- Sfide: Checkpoint perfetto, Nessuna fuga, Cuore Raimon, Pochi ma buoni → Spirito extra a fine run (EndScreen).
- Rimandati alla versione 100 wave: personaggi GO, Armatura Spirito.

## Iterazione 06/2026 · Sprite canon, Facile esplorativo, Dark Emperors
- Sprite: `scripts/import_sprites.py` (inazumasprites.netlify.app) + `scripts/import_sprites_fandom.py` (Fandom, solo portrait/sprite) → 84/86 ritratti in public/sprites (canon-*, de-*). Mancano: Bomber (Prominence), André Pinson (Rose Griffon). Report: memory/sprite_import_report.json. Stemmi reali non trovati: placeholder TeamCrest con colori kit v3.
- Facile = ruleset easy-v3: livelli nemici più bassi, ricompense invariate, fino a W20 nessun KO in un colpo da HP pieni (resta a 1 HP), nemici -15% VEL. Miniboss W5/W15 solo difficoltà 1-2 (Occult, Royal Ricognizione); Zeus solo boss da W20. Dedupe per squadra.
- Dark Emperors (8/11 nel catalogo, ritratti reali) nei pool W30 boss / W35 miniboss.

## Backlog
- P1: Diario Rivali (registro boss/miniboss battuti con miglior risultato)
- P2: Brainwashing, Wild, Diamond Dust quando gli elementi saranno verificati; Kirkwood quando il roster esiste
- P1: Armatura (Armed) dello Spirito Guerriero
- P2: aggiungere personaggi GO (Tenma, Tsurugi, Shindou) con sprite per più Spiriti canon
- P1: Torre delle Sfide (dopo prima run vinta, roster scoperto, record separato, sinergie x1.5)
- P2: test salvataggio/refresh durante scelta ricompensa; playtest fino a wave 50
- P2: ampliare lista Spiriti Guerrieri
- P1: sprite delle tecniche/animazioni d'attacco, più eventi e boss rush post-50
- P1: bilanciamento avanzato (difficoltà, scaling nemici late game)
- P2: modalità Endless, sfide giornaliere, achievement/sblocchi per squadra
- P2: musica 8-bit di sottofondo
