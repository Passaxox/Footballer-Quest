# V2k guardrails — confronto deterministico

Policy generation-only separata dai ruleset EXP immutati. Mediana esatta dei livelli interi validi con HP>0; con cardinalità pari media dei due centrali. Livello finale min(raw,floor(mediana+cap)), nessun nuovo floor. Nessun vivo valido: conserva raw, lasciando al flusso App il fallback KO. Un solo vivo: usa il suo livello.

Cap Easy ordinary/challenge +2, boss +3; Normal ordinary/challenge +4, boss +5. Formula raw ordinaria e boss invariata. Eventi: base wave + bonus originale + adjustment (-1 Easy, 0 Normal), minimo1, poi ceiling challenge. Adjustment challenge volutamente fisso, non ripete segmenti dello scaling ordinario: preserva bonus narrativi e usa il ceiling per contenerli. Alius conserva +3 e Rivali +2. Recruit challenge conserva il livello della proposta come raw e applica solo ceiling: nessun offset aggiuntivo, nessuna mutazione dell'offerta persistita. Statistiche runtime ricalcolate per il livello finale, basi/mosse/identità immutate. Solo nuove battaglie; pending già esistenti non riscritti. SaveVersion/metaSchemaVersion invariati.

## Metodo

Stesse 2400 tracce V2j, seed e estrazioni appaiati prima/dopo; quattro profili few/medium/many/ko-stress. Nessuna simulazione di vittoria: tutte le battaglie vinte, no economia/reclute, KO terzo membro W4–9 imposti. Il profilo KO non stima frequenze reali o KO lungo tutta la run. Cap% è frequenza sulle opportunità campionate di ogni wave, incluse quelle che poi diventano noncombattimento. EXP è cumulata combattimento effettivamente accreditata a tutta la squadra PRIMA della wave, non comprende viaggio. Livello squadra comprende KO; riferimento comprende solo vivi. Pesi/pool/numero avversari e RNG invariati. Le challenge speciali sono testate separatamente, non simulate. Risultati non stimano win rate né beneficio reale di sopravvivenza.

| Mode | Profilo | W | Raw | Rif. dopo | Enemy dopo | Cap % | Team prima→dopo | EXP cumulata delta % |
|---|---|---|---|---|---|---|---|---|
| normal | few | 8 | 8.52 | 5.54 | 8.29 | 19 | 5.78→5.78 | -0.1% |
| normal | few | 10 | 11 | 6.43 | 10.72 | 26.33 | 6.75→6.73 | -0.9% |
| normal | few | 18 | 18.56 | 12.27 | 16.16 | 81.33 | 13.13→13.01 | -2.2% |
| normal | few | 19 | 19.43 | 12.64 | 16.56 | 83.67 | 13.56→13.4 | -2.7% |
| normal | few | 20 | 23 | 12.94 | 17.94 | 99.67 | 13.95→13.71 | -3.2% |
| normal | medium | 8 | 8.45 | 6.57 | 8.37 | 8 | 6.92→6.92 | -0.0% |
| normal | medium | 10 | 11 | 7.73 | 10.97 | 3.33 | 8.18→8.17 | -0.2% |
| normal | medium | 18 | 18.49 | 14.62 | 17.74 | 39 | 15.59→15.56 | -0.5% |
| normal | medium | 19 | 19.56 | 15.13 | 18.55 | 45 | 16.15→16.1 | -0.7% |
| normal | medium | 20 | 23 | 15.63 | 20.55 | 84.33 | 16.71→16.63 | -0.9% |
| normal | many | 8 | 8.55 | 7.36 | 8.54 | 0.67 | 7.81→7.81 | 0.0% |
| normal | many | 10 | 11 | 8.96 | 11 | 0 | 9.54→9.54 | -0.0% |
| normal | many | 18 | 18.44 | 16.65 | 18.35 | 7 | 17.76→17.76 | -0.0% |
| normal | many | 19 | 19.41 | 17.35 | 19.28 | 11 | 18.52→18.5 | -0.1% |
| normal | many | 20 | 23 | 18.11 | 22.41 | 37.33 | 19.32→19.31 | -0.1% |
| normal | ko-stress | 8 | 8.39 | 7 | 8.36 | 3.67 | 6.08→6.08 | -0.0% |
| normal | ko-stress | 10 | 11 | 7.78 | 10.98 | 2 | 7.03→7.03 | -0.1% |
| normal | ko-stress | 18 | 18.56 | 14.62 | 17.75 | 43 | 15.01→14.97 | -0.5% |
| normal | ko-stress | 19 | 19.55 | 15.19 | 18.49 | 49.33 | 15.64→15.58 | -0.8% |
| normal | ko-stress | 20 | 23 | 15.7 | 20.6 | 81.33 | 16.25→16.16 | -1.0% |
| easy | few | 8 | 7.44 | 5.97 | 7.11 | 25.33 | 6.16→6.15 | -0.5% |
| easy | few | 10 | 10 | 6.91 | 9.47 | 44 | 7.19→7.15 | -1.7% |
| easy | few | 18 | 17.54 | 13.37 | 15.23 | 81.33 | 14.23→14 | -3.6% |
| easy | few | 19 | 17.48 | 13.75 | 15.48 | 73 | 14.68→14.4 | -4.0% |
| easy | few | 20 | 20 | 14.12 | 17.09 | 88.33 | 15.12→14.78 | -4.3% |
| easy | medium | 8 | 7.47 | 6.93 | 7.33 | 11.67 | 7.22→7.22 | -0.1% |
| easy | medium | 10 | 10 | 8.39 | 9.91 | 8.67 | 8.78→8.76 | -0.6% |
| easy | medium | 18 | 17.54 | 15.94 | 16.88 | 36 | 16.82→16.74 | -0.8% |
| easy | medium | 19 | 17.47 | 16.47 | 17.02 | 24.67 | 17.4→17.3 | -1.0% |
| easy | medium | 20 | 20 | 17.07 | 19.27 | 38.67 | 18.04→17.93 | -1.0% |
| easy | many | 8 | 7.52 | 7.87 | 7.48 | 3 | 8.26→8.26 | -0.0% |
| easy | many | 10 | 10 | 9.56 | 9.99 | 0.67 | 10.03→10.03 | -0.1% |
| easy | many | 18 | 17.48 | 18.12 | 17.4 | 4.67 | 19.09→19.08 | -0.1% |
| easy | many | 19 | 17.58 | 18.98 | 17.55 | 2 | 19.97→19.96 | -0.1% |
| easy | many | 20 | 20 | 19.73 | 19.95 | 4 | 20.78→20.77 | -0.1% |
| easy | ko-stress | 8 | 7.49 | 7.48 | 7.39 | 9.67 | 6.47→6.47 | -0.1% |
| easy | ko-stress | 10 | 10 | 8.41 | 9.91 | 9 | 7.47→7.46 | -0.6% |
| easy | ko-stress | 18 | 17.48 | 15.95 | 16.9 | 33.33 | 16.16→16.1 | -0.7% |
| easy | ko-stress | 19 | 17.47 | 16.55 | 17.04 | 24 | 16.79→16.72 | -0.9% |
| easy | ko-stress | 20 | 20 | 17.14 | 19.3 | 37 | 17.49→17.39 | -1.0% |

## Exploit e limiti

La mediana riduce l'influenza di un solo outlier ma non elimina manipolazioni: [10,10,1] dà10; [10,1] dà5.5; [10,10,1,1] dà5.5. Tenere KO i più forti può abbassare il riferimento; tenere KO i più deboli lo alza. Un unico superstite Lv1 produce cap3/5 negli ordinari. Reclutare un basso livello può spostare la mediana, soprattutto in squadre piccole o con tanti KO. Nessun anti-exploit aggiunto: comportamento richiesto, rischio esplicitato. Gli incontri persistiti non si riadattano quando cambia squadra, quindi non è possibile abbassarli dopo generazione.

Abbassare livelli riduce EXP come atteso: niente compensazione. Possibile retroazione di crescita più lenta nei profili poveri di vittorie; il modello non contabilizza le vittorie aggiuntive rese possibili dal ceiling. Prima di altri cambiamenti servono test Android sui checkpoint e sulle challenge, includendo reclutamento e cure.
