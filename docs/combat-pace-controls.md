# Combat pace controls

Baseline: `a508fb587342de798070e1e70bbbe2877e6434c6`.

FAST cycles x1/x2/x3. It scales presentation waits and attack animation durations,
not combat formulas, RNG, turn order, status ticks or rewards. A speed change
affects subsequent waits; an already scheduled wait is not restarted.

AUTO dispatches the current technique through the normal attack function, only
at phase=menu/menu=main, after a cancellable 220 ms decision window. The same
synchronous busy guard excludes competing manual/automatic actions. No item,
switch, target-selection or resource policy is automated.

Manual attacks, opening the bag/switch menu, forced replacement, background and
battle end stop AUTO. Turning it off lets the current exchange finish but stops
future decisions. Focus return does not restart AUTO. Unmount clears pending
presentation waits and prevents late result callbacks. The game does not gain a
new full combat-pause system: a turn already resolving may finish in background.

Boss/elite introductions run at x1 and retain the manual prebattle choice.
Their new-opponent announcements also run at x1 and stop AUTO. The existing
manual battle flow requires no additional confirmation after each opponent.
Pixel fonts, sprites and existing effects are preserved.

The optional BattleScreen `manualMoment={id,message}` prop is an extension hook,
not new gameplay content. A new moment ID pauses automatic decisions, forces
normal-speed presentation and holds completed waits until acknowledgement.
Acknowledgement restores prior speed/AUTO preferences. Actual forced switches
and background events turn AUTO off rather than automatically resuming it.

Both controls reset to x1/OFF on each battle mount/reload. No save or meta schema
changes, preference storage or encounter changes.

## Verification

- 123 Node tests and all 99 UI tests pass; includes Epsilon W25, reward
  transitions, W10-W11, saves, team integrity and starter non-regression.
- 23 focused battle/pace tests include x1/x2/x3 wait timing, protected waits,
  manual interruption, bag, background, KO, unmount and a real seeded fight:
  x1 manual and x3 AUTO produce identical results and identical RNG draws.
- Balance audit and production web build pass. No new assets or QA fixtures.
- Real Chrome responsive QA at 320, 360, 390 and 430 px: controls readable,
  no horizontal overflow/overlap, 44 px button heights, content unobscured.
- Played W1 Mark versus Jack: manual x1, AUTO x1/x2/x3, ON/OFF, full speed cycle,
  and bag interruption. OFF completed the current exchange then waited; bag
  disabled AUTO. AUTO x3 completed the fight into one recruitment screen, with
  no captured console errors. Automated tests establish logical equivalence;
  the browser comparison establishes the pacing improvement qualitatively.
- No physical Android test in this session. At short portrait heights the
  existing battle page scrolls vertically; controls stay above the arena.

No full suite was rerun during final QA because no functional correction was
needed. Existing untracked output/ is preserved and excluded from the commit.
