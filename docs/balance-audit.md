# V2j — audit quantitativo Easy / Normal

Baseline: 8724ce1fd6ea2d1ba8d7bd10a97cedc57d180c15. Nessuna modifica gameplay.

## Metodo e limiti

`node frontend/tests/balance-audit.mjs` produce i risultati JSON riproducibili (seed 20260908, LCG). Sono 2.400 tracce di progressione: 300 per difficoltà e profilo, fino all'ingresso W20. Non è una simulazione di battaglia né una stima di sopravvivenza: tutte le battaglie sono vinte, tre starter iniziali, titolare fisso, nessun acquisto/reclutamento/fusione, nessun consumo HP simulato. Frequenze sintetiche di combattimento 25%/50%/75% rappresentano pochi/medi/molti scontri. W1 e boss obbligatori; distribuzione dimensione gruppi come nel motore. Tutti i nemici del medesimo incontro usano un livello campionato condiviso (nel gioco le estrazioni ordinarie sono separate). I nodi non combattimento danno solo travel XP: non simula le ricompense XP specifiche di eventi/allenamento. Le frequenze non sostituiscono le probabilità reali dei nodi.

Si riusano createPlayer, newRun, enemyLevel, grantCombatXp, completeNonCombatNode, scenari e catalogo reali. Profilo ko-stress: terzo membro forzato KO W4–9, poi rianimato; è un'ipotesi di sensibilità, NON un tasso KO stimato. I JSON includono media squadra, media del massimo individuale, percentili, gap, KO imposti, scenario e tier campionato (boss: media tier lineup). Enemy level è il potenziale avversario della wave anche nelle tracce che scelgono un nodo non combattimento. Nessun risultato dimostra una probabilità di vittoria reale.

## Formule reali

- Ordinari: max(1, wave + intero casuale [-1,2] + offset). Normal 0; Easy-v2 -1 fino W18, -2 W19–20. Vecchi Easy-v1 mantengono -1 e boss W20 Lv23.
- Boss: wave + checkpoint offset, altrimenti +3. W10 Normal 11/Easy 10; W20 Normal 23/Easy-v2 20.
- Eventi: wave + levelBonus; nessun ruleset né limite rispetto al team.
- Reclutamento diretto: max(1,wave-1), tier corrente con 20% di bonus +1; nessun adattamento alla squadra. Evento cane: livello wave, pool <=tier2. Reclutamento post-battaglia mantiene il livello nemico.
- Sfida di reclutamento: usa direttamente ctx.offer come nemico (forceRecruit), senza riscalarne il livello; eredita quindi wave-1 per offerta diretta o wave per offerta evento. Anche questo percorso non applica offset Easy aggiuntivi.
- EXP per nemico sconfitto: round((18+6*livelloNemico)*moltiplicatore*bonusBoss). Normal 1.50, Easy 1.75, boss 1.6. Panchina viva riceve round(EXP piena*0.70/0.75). KO: zero EXP combattimento e zero travel XP.
- Travel: 12/16 per nodo noncombattimento valido; niente duplicazione con EXP propria o combattimento. Effetti XP espliciti seguono il proprio percorso e possono interessare anche membri KO: non equipararli al travel.
- Soglia livello: floor(20+12*livello), invariata. Lv3→4 richiede 56 XP; Lv4→5 68. Statistica = floor(base*(1+.07*(livello-1))) + bonus.

## Wave 1–20

Livelli prima dell'incontro. Media = profilo medio; intervallo P10–P90 condizionato alle ipotesi sopra, non intervallo clinico/statistico dei tester. Gap = avversario campionato meno media squadra. Pochi/molti sono le medie dei rispettivi profili.

### NORMAL

| W | Nemico ordinario/boss min–max | Team pochi / medio / molti | Team medio P10–P90 | Max individuale medio | Gap medio / P90 |
|---|---|---|---|---|---|
| 1 | 1–3 | 3 / 3 / 3 | 3–3 | 3 | -1.17 / 0 |
| 2 | 1–4 | 3.27 / 3.27 / 3.25 | 3–4 | 3.4 | -0.79 / 1 |
| 3 | 2–5 | 3.72 / 3.89 / 4.02 | 3–4.33 | 4.19 | -0.45 / 1 |
| 4 | 3–6 | 4.18 / 4.47 / 4.71 | 4–5.33 | 4.8 | -0.07 / 1.67 |
| 5 | 4–7 | 4.54 / 5.04 / 5.42 | 4–6.33 | 5.45 | 0.54 / 2 |
| 6 | 5–8 | 4.89 / 5.62 / 6.23 | 4.33–7.33 | 6.14 | 0.99 / 3 |
| 7 | 6–9 | 5.3 / 6.23 / 7.02 | 5–7.67 | 6.86 | 1.27 / 3 |
| 8 | 7–10 | 5.78 / 6.92 / 7.81 | 5.33–8.33 | 7.63 | 1.53 / 3.67 |
| 9 | 8–11 | 6.29 / 7.56 / 8.74 | 6–9.33 | 8.33 | 1.96 / 4 |
| 10 | 11–11 | 6.75 / 8.18 / 9.54 | 6.33–9.67 | 9.06 | 2.82 / 4.67 |
| 11 | 10–13 | 10.67 / 11.66 / 12.69 | 10.33–13 | 13.08 | -0.12 / 1.67 |
| 12 | 11–14 | 11.07 / 12.25 / 13.48 | 10.67–14 | 13.73 | 0.28 / 2.33 |
| 13 | 12–15 | 11.42 / 12.81 / 14.1 | 11.33–14.67 | 14.35 | 0.7 / 3.33 |
| 14 | 13–16 | 11.76 / 13.38 / 14.86 | 11.67–15 | 14.98 | 1.12 / 3.33 |
| 15 | 14–17 | 12.04 / 13.89 / 15.56 | 11.67–16 | 15.56 | 1.66 / 4.33 |
| 16 | 15–18 | 12.43 / 14.49 / 16.32 | 12.67–17 | 16.23 | 1.91 / 4.33 |
| 17 | 16–19 | 12.76 / 15.04 / 17.09 | 12.67–17 | 16.86 | 2.5 / 5 |
| 18 | 17–20 | 13.13 / 15.59 / 17.76 | 13–18 | 17.47 | 2.9 / 5.33 |
| 19 | 18–21 | 13.56 / 16.15 / 18.52 | 14–18.33 | 18.1 | 3.41 / 6.33 |
| 20 | 23–23 | 13.95 / 16.71 / 19.32 | 14–19.33 | 18.73 | 6.29 / 9 |

### EASY

| W | Nemico ordinario/boss min–max | Team pochi / medio / molti | Team medio P10–P90 | Max individuale medio | Gap medio / P90 |
|---|---|---|---|---|---|
| 1 | 1–2 | 3 / 3 / 3 | 3–3 | 3 | -1.76 / -1 |
| 2 | 1–3 | 3.4 / 3.39 / 3.36 | 3–4 | 3.39 | -1.64 / 0 |
| 3 | 1–4 | 3.94 / 4.02 / 4.19 | 3.33–5 | 4.33 | -1.58 / 0 |
| 4 | 2–5 | 4.33 / 4.59 / 4.88 | 4–5.33 | 4.85 | -1.14 / 0.67 |
| 5 | 3–6 | 4.78 / 5.13 / 5.65 | 4–6.33 | 5.48 | -0.59 / 1 |
| 6 | 4–7 | 5.24 / 5.85 / 6.49 | 5–7.33 | 6.25 | -0.37 / 1.67 |
| 7 | 5–8 | 5.66 / 6.47 / 7.41 | 5–8.33 | 6.94 | 0.14 / 2 |
| 8 | 6–9 | 6.16 / 7.22 / 8.26 | 6–8.67 | 7.8 | 0.25 / 2.67 |
| 9 | 7–10 | 6.67 / 7.98 / 9.12 | 6.33–9.67 | 8.66 | 0.57 / 2.67 |
| 10 | 10–10 | 7.19 / 8.78 / 10.03 | 7–10.67 | 9.52 | 1.22 / 3 |
| 11 | 9–12 | 11.37 / 12.48 / 13.43 | 11.33–13.67 | 13.69 | -2 / -0.33 |
| 12 | 10–13 | 11.73 / 13.05 / 14.22 | 11.33–14.67 | 14.26 | -1.51 / 0.67 |
| 13 | 11–14 | 12.11 / 13.68 / 15.07 | 11.67–15.67 | 14.95 | -1.1 / 1.33 |
| 14 | 12–15 | 12.54 / 14.31 / 15.88 | 12.67–16.67 | 15.66 | -0.92 / 1.33 |
| 15 | 13–16 | 12.98 / 14.89 / 16.73 | 12.67–17 | 16.31 | -0.42 / 2.33 |
| 16 | 14–17 | 13.39 / 15.52 / 17.51 | 13.33–18 | 17.01 | 0.15 / 2.67 |
| 17 | 15–18 | 13.76 / 16.17 / 18.28 | 13.67–18.67 | 17.73 | 0.34 / 3.33 |
| 18 | 16–19 | 14.23 / 16.82 / 19.09 | 14.67–19 | 18.44 | 0.72 / 3.33 |
| 19 | 16–19 | 14.68 / 17.4 / 19.97 | 14.67–20 | 19.07 | 0.07 / 3.33 |
| 20 | 20–20 | 15.12 / 18.04 / 20.78 | 15.67–21 | 19.77 | 1.96 / 4.33 |

## Limite teorico versus gap plausibile

Per ogni wave ordinaria, limite numerico contro un membro Lv1 = max livello ordinario -1; contro uno starter Lv3 = max livello ordinario -3. Per includere eventi nelle wave non-boss W2–19, usare max(livello ordinario massimo, wave+3). Non esiste envelope basato sul livello della squadra. Il limite non dimostra che un'intera squadra a quel livello possa superare le wave precedenti.

Massimo entro W20: Normal nemico Lv23 (boss20), Easy-v2 Lv22 (evento Alius19). Gap rispetto al minimo reclutabile Lv1: +22/+21; rispetto a Lv3: +20/+19. Easy-v1 legacy può avere +22 al boss20. Il gap medio plausibile nel modello è molto inferiore ma cresce nei percorsi poveri di combattimenti: W20 Normal +9.05 con pochi scontri, +6.29 medi; Easy +4.88/+1.96. W10 Normal +4.25/+2.82, Easy +2.81/+1.22.

KO-stress W10: media Normal 7.03 contro 8.18 senza KO; Easy 7.47 contro 8.78. Il massimo individuale resta circa 9.09/9.53: media e titolare raccontano situazioni diverse. Nessuna stima del numero reale di KO è possibile senza simulare battaglie e strategie. Reclute Lv1 a W2 e membri lasciati KO possono restare molto indietro; reclute tardive a wave-1 possono invece superare una squadra che cresce lentamente. Non esiste un difetto universalmente consistente di livello reclute troppo basso.

## Scenario composition

Raimon 10 tier1 sempre; urban 6/15/19 candidati ai tier1/2/3; FFI 5 ordinari dal tier3 e 6 con bonus reclutamento tier4. Prima W8, urban concentra gli incontri su sei identità; da W8 tier2 ha probabilità 9/15 contro 12/28 nel globale V2h. A tier3 urban ha 4/19 tier3, FFI 5/9 ponderato, globale V2h 11/39. FFI favorisce Unicorn con peso3 per membro; non aggiunge livelli.

A parità di livello cambiano potenza, stats base, ruolo, elemento ed effetto: il livello da solo non misura difficoltà. FFI ordinario ha quattro attaccanti e un centrocampista, nessun portiere/difensore; aumenta la concentrazione offensiva. Raimon mantiene tier1 anche tardi ma comprende Axel con POT90: tier non è un moltiplicatore di forza. Urban comprende Darren (cura), Hurley/Fidio (drain), Thor (recoil) e tecniche forti: sustain e matchup contano quanto le medie. Il modello EXP non misura questi effetti: condizionato a vittoria, scenario non cambia direttamente EXP a stesso livello/numero nemici.

## Eventi e spike

Tutti gli effetti battle attuali sono due: `alius` (Dvalin fisso, levelBonus +3) e `rivali` (tre avversari casuali, +2). Entrambi ignorano Easy. Alius bypassa anche il tier ordinario perché usa IDs espliciti: Dvalin tier3 può comparire già W2 a Lv5. Rivali rispetta tierForWave ma moltiplica la pressione con tre nemici. W19 Easy: ordinario16–19, Rivali21, Alius22. Sono eventi opzionali, con possibilità di rifiutare; non boss obbligatori. Già presenti in V2h e invariati in V2i.

`cane` recluta <=tier2, senza battaglia, a livello wave: non è uno spike nemico. Nessun altro levelBonus/battle effect nel registry corrente. Le sfide evento ricevono EXP ordinaria, non moltiplicatore boss, perché il kind evento è distinto da boss.

## Cause e raccomandazioni NON applicate

1. Scaling dipendente dalla wave, non dalle occasioni EXP. Lv4 vs Lv10 è possibile W8 Normal/W9 Easy; KO e poche vittorie amplificano il divario. Non è prova di bug di xpForLevel.
2. W10 e soprattutto W20 Normal sono discontinuità obbligatorie. Il bonus boss EXP aiuta solo DOPO il checkpoint, non a superarlo.
3. Le sfide evento ignorano Easy e Alius anticipa un tier alto: prima priorità separata di correzione.
4. V2i cambia probabilità di archetipi/tier, non le formule; il playtest deve separare scenario e wave.

Proposta sperimentale envelope (da validare, non implementata): Lref = mediana livelli membri vivi; con un solo vivo usare il suo livello. Easy ordinari cap Lref+2, boss Lref+3; Normal ordinari Lref+4, boss Lref+5. Applicare min(livello attuale, cap), minimo1, al momento della prima generazione, mai rigenerando pending. Il cap non impone un floor artificiale che alzi nemici già deboli. Rischio exploit mediante sostituzioni/KO e riduzione EXP nemica: confrontare anche mediana dei tre più alti e riferimento persistito all'ingresso segmento prima di scegliere. Non usare solo il più debole né il titolare liberamente selezionabile.

Eventi: passare dal ruleset centrale anche per challenge; candidati Easy Alius +1, Rivali +0 rispetto al livello base Easy, Normal Alius +2/Rivali +1, con stessi cap espliciti; valutare una soglia wave/tier per Dvalin invece di forzare il catalogo. Rendere visibile la difficoltà della sfida prima di accettarla. Sono proposte alternative da confrontare, non valori approvati.

Non aumentare ora EXP globale né modificare xpForLevel. Se permane deficit dei pochi-combattimenti dopo envelope/eventi, misurare travel 12→16 Normal /16→20 Easy come esperimento separato. Per KO valutare un recupero mirato dopo rianimazione anziché XP gratuita continua; nessuna formula proposta senza dati di durata KO.

Prossimo audit: replay di run reali con scelta nodi, roster, HP, KO, cure, scenario e rulesetId. Confrontare cap e challenge separatamente, su W8/W10/W18/W19/W20, includendo perdita di EXP quando il cap riduce enemy level. Queste tracce non giustificano da sole un rebalance.
