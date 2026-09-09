# Royal + Zeus — COMPLETE (integrazione)

## Stato
Integrazione completata; build web riuscita. Nessun commit, push o APK.

## Sorgente e import
Lo sheet fornito dall'utente `0000 - 0199.png` è PNG RGB 662×1350.
SHA-256: `fdae76e3f4b7fd30857055155685fea40764d1508adfb7095192226a0736560b`.
La validazione PNG esistente controlla firma, chunk/CRC e decompressione;
Pillow verifica il file e tutti i separatori della griglia sono stati controllati.
Griglia: 10 colonne × 20 righe, celle 64×64, origine (2,2), gap (2,2).
Il footer non è incluso nei crop. Il confronto con cropCoordinates del planner
preservato conferma la geometria. Non viene usata la geometria d'esempio del README.

19 PNG RGBA nativi sono importati senza ridimensionamento o ricampionamento:
solo il colore di sfondo esatto collegato ai bordi diventa trasparente; i valori
RGB restano intatti. Controllo visivo completato su tutti i portrait.
Il manifest registra mapping VERIFIED dall'utente, hash sorgente e hash dei crop.
L'importer rifiuta sorgenti con hash diverso e output esistenti differenti;
`--verify` riproduce i crop senza scrivere. Richiede Python con Pillow.

55 file preesistenti controllati prima/dopo: 5 in tools/, 44 sprite legacy e
6 sheet in Downloads. Tutti hanno SHA-256 invariato; nessun originale copiato o
modificato. tools/ rimane non tracciata e integralmente preservata.

## Catalogo, versioni e asset
Totale: 61 Character, 63 CharacterVersion, 44 alias legacy invariati.
Aggiunte: 17 Character, 19 CharacterVersion, 18 mosse generiche.
I file della tabella sono in frontend/public/sprites/.

| CharacterVersion aggiunta | Portrait aggiunto | Cella VERIFIED |
| --- | --- | --- |
| peter-drent:royal | peter-drent-royal.png | s01-r04-c02 |
| ben-simmons:royal | ben-simmons-royal.png | s01-r04-c03 |
| alan-master:royal | alan-master-royal.png | s01-r04-c04 |
| gus-martin:royal | gus-martin-royal.png | s01-r04-c05 |
| herman-waldon:royal | herman-waldon-royal.png | s01-r04-c06 |
| john-bloom:royal | john-bloom-royal.png | s01-r04-c07 |
| derek-swing:royal | derek-swing-royal.png | s01-r04-c08 |
| daniel-hatch:royal | daniel-hatch-royal.png | s01-r04-c09 |
| jude:royal | jude-royal.png | s01-r04-c10 |
| poseidon:zeus | poseidon-zeus.png | s01-r16-c09 |
| apollon:zeus | apollon-zeus.png | s01-r16-c10 |
| hephais:zeus | hephais-zeus.png | s01-r17-c01 |
| ares:zeus | ares-zeus.png | s01-r17-c02 |
| dio:zeus | dio-zeus.png | s01-r17-c03 |
| artemis:zeus | artemis-zeus.png | s01-r17-c04 |
| hermes:zeus | hermes-zeus.png | s01-r17-c05 |
| athena:zeus | athena-zeus.png | s01-r17-c06 |
| jonas:zeus | jonas-zeus.png | s01-r17-c07 |
| hera:zeus | hera-zeus.png | s01-r17-c09 |

- `jude:royal` condivide Character jude e la mossa `jude:primary`; `jude:base` resta invariata.
- `jonas:zeus` è la versione Demeter del Character jonas. `jonas:base`, la sua mossa,
  il portrait errato legacy e tutti i suoi alias restano invariati. Nessuna migrazione
  automatica o sostituzione dei salvataggi. Poseidon è un Character separato.
- Byron/Aphrodi resta solo `byron:base`, con sprite byron.png e tier 4.
  La cella VERIFIED s01-r17-c08 è registrata come riuso, non importata.
- Nuove versioni: team Royal Academy/Zeus, arco football-frontier, era original,
  gameOrigin ie1, nessun legacyRosterId, nessuna rarità, variantId royal/zeus.
  Il genere resta non specificato.
- I ruoli seguono la formazione Football Frontier originale (Royal: 4 D, 4 C,
  1 A; nuovi Zeus: 1 P, 4 D, 3 C, 2 A). Riferimento:
  [personaggi del primo gioco](https://it.wikipedia.org/wiki/Personaggi_minori_di_Inazuma_Eleven_%28primo_videogioco%29).
  Questo riferimento non sostituisce il mapping portrait VERIFIED dell'utente.
- Elementi, statistiche, tier e mosse generiche sono scelte di gameplay per questo
  gioco, non una trascrizione dei valori DS o una certificazione delle tecniche canoniche.
  Profili HP/ATK/DEF/SPD: P 94/24/42/22, D 82/28/36/26,
  C 72/34/30/34, A 74/40/26/32. Potenze P/D/C/A: 55/60/65/85.
  Jude Royal conserva la mossa della versione base. Il bilanciamento percepito
  beneficia ancora di playtest umani.

## Pool attivati
| Scenario | Requisiti | Candidati |
| --- | --- | --- |
| royal-academy | wave ≥8, tier ≥2 | 9 |
| zeus | wave ≥18, tier ≥3 | 10, oppure 11 al tier 4 con Byron |

La selezione naturale avviene ai cambi di segmento: normalmente Royal può essere
scelta dalla wave 13 e Zeus dalla wave 19. I nuovi pool non includono jude:base,
jonas:base o gli altri record Royal legacy non certificati per questa incarnazione.
Il pool Royal non contiene un portiere: non è stato inventato o recuperato Joseph.
Ha comunque più di tre candidati e copertura D/C/A compatibile con gli incontri.

Boss scripted invariati, inclusi i riferimenti legacy dei boss wave 10/20:
la remediation Jonas/Poseidon non viene applicata neppure lì.
Pesi, probabilità dei nodi, formule di livello/ricompensa, save schema e chiavi
localStorage restano invariati. Solo la composizione degli incontri può cambiare.
I pending già salvati non vengono rigenerati.

## File modificati
- frontend/src/game/engine.js: mantiene selezione tramite versionId.
- frontend/src/game/catalog.js: unisce l'espansione al catalogo legacy.
- frontend/src/game/scenarios.js: abilita i due pool.
- frontend/src/components/game/CollectionScreen.jsx: ID delle card distinti anche senza alias legacy.
- frontend/scripts/asset-audit.mjs: carica il nuovo modulo del catalogo.
- frontend/tests/foundation.test.mjs: integrazione, pool, backcompat, fusione e regressione runtime.
- frontend/tests/asset-audit.test.mjs: manifest, hash e geometria; baseline legacy preservata.
- frontend/tests/balance-audit.mjs: carica il nuovo modulo.
- frontend/src/components/game/CollectionScreen.test.jsx: portrait e draft delle nuove versioni.

File aggiunti oltre ai 19 portrait:
- frontend/src/game/catalogExpansion.js
- scripts/import_royal_zeus.py
- docs/royal-zeus-assets.json
- docs/royal-zeus-integration.md

## Controlli
- Node foundation + asset + planner tools + release tooling: **91 PASS, 0 FAIL**.
- Jest/frontend UI: **5 suite, 67 PASS, 0 FAIL**.
- Asset audit: **PASS**, 63 asset/63 versioni, zero missing/orphan/invalid.
- Importer --verify: **PASS**, tutti i 19 PNG coincidono con i crop riprodotti.
- Balance audit: **PASS**, 160 righe di scenari di progressione;
  è un modello di progressione, non una simulazione completa dei combattimenti.
- Identità Capacitor e origine https://localhost: **PASS**.
- Preservazione SHA-256 di tools/, sprite legacy e Downloads: **PASS**.
- git diff --check: **PASS**.
- Build web: **PASS**, compilazione production riuscita in .cache/web-build (nessun APK).
- Release check Android reale: non disponibile localmente, mancano numero run
  GitHub e segreti di firma. Unit test del tooling passati; nessun APK creato.

## Warning e limiti
L'audit mantiene 44 EXTENSION_FORMAT_MISMATCH (WebP sotto nomi .png) e 3 warning
identità preesistenti: Austin, Joseph, Jonas. Nessuna conversione/rinomina legacy.

Il yarn.lock del repository è un placeholder da 90 byte. L'installazione con
--frozen-lockfile fallisce già prima delle modifiche alle dipendenze (nessuna è
stata effettuata). Test UI e build usano le dipendenze risolte da package.json
e dalle sue resolutions in staging; il lockfile risolto è solo in
.cache/frontend-deps/yarn.lock. Il lockfile originale e package.json sono invariati.
La release riproducibile con dipendenze bloccate richiede una manutenzione separata.

Output di verifica locali: .cache/royal-zeus-asset-audit.json,
.cache/royal-zeus-balance-audit.json, .cache/royal-zeus-crop-check.jsonl,
.cache/royal-zeus-review.png. Build completata in .cache/web-build.

In attesa dell'approvazione finale dell'utente.

