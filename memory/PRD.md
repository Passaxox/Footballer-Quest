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

## Backlog
- P1: Mixi Max (donatore aura, passiva ereditata, doppio ritratto)
- P1: Torre delle Sfide (dopo prima run vinta, roster scoperto, record separato, sinergie x1.5)
- P2: test salvataggio/refresh durante scelta ricompensa; playtest fino a wave 50
- P2: ampliare lista Spiriti Guerrieri
- P1: sprite delle tecniche/animazioni d'attacco, più eventi e boss rush post-50
- P1: bilanciamento avanzato (difficoltà, scaling nemici late game)
- P2: modalità Endless, sfide giornaliere, achievement/sblocchi per squadra
- P2: musica 8-bit di sottofondo
