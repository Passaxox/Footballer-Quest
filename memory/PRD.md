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

## Backlog
- P1: sprite delle tecniche/animazioni d'attacco, più eventi e boss rush post-50
- P1: bilanciamento avanzato (difficoltà, scaling nemici late game)
- P2: modalità Endless, sfide giornaliere, achievement/sblocchi per squadra
- P2: musica 8-bit di sottofondo
