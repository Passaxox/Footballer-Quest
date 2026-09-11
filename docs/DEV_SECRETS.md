# Footballer Quest — DEV Mode, Secrets & Easter Eggs

**Status:** APPROVED_CONCEPT  
**Milestone:** M1/M2 QA foundation + later secret-content expansion  
**Purpose:** keep internal QA tooling, real player-facing secrets and DEV-character Easter eggs distinct while allowing them to share reusable condition/scenario infrastructure.

---

## 1. Three separate concepts

Footballer Quest should distinguish clearly between:

1. **DEV Mode** — hidden QA tooling for developers/selected testers.
2. **Secrets** — legitimate player-facing hidden gameplay/content.
3. **DEV Characters** — a small Easter-egg/Secret-content family that may be discoverable/recruitable in normal gameplay under special conditions.

These concepts may reuse condition flags, hidden unlock triggers, scenario selection and presentation hooks, but they must not be treated as the same feature.

---

## 2. DEV Mode = QA console

DEV Mode is not a normal progression reward and should not affect ordinary records/meta progression.

Historical preferred unlock pattern:

- hidden entry via repeated taps on the app/version information (working example: 7 taps);
- optional extra code/confirmation for selected tester access;
- once enabled, a DEV-only menu becomes visible.

Exact unlock gesture/code is implementation detail and may change.

### DEV difficulties / profiles

Preferred profiles:

- **DEV Normal** — normal balance, but Game Over may continue.
- **DEV Easy** — Easy-like tuning + continue safety net.
- **DEV Fast** — intentionally accelerated QA traversal: lower incoming pressure, faster progression/recovery and enough challenge to preserve real combat, switching, KO and progression behaviour.

DEV Fast should **not** be `9999 HP + one-shot everything`, because that would stop testing the real systems.

---

## 3. DEV run isolation

Every DEV run must be explicitly tagged and visually identifiable, e.g. `DEV RUN`.

DEV runs should be excluded from normal competitive/record/progression claims where they would pollute real-player data.

Useful later DEV telemetry:

- virtual deaths / would-have-ended-here points;
- continues used;
- final wave/checkpoint;
- scenarios/bosses/secret nodes visited;
- elapsed time;
- forced QA actions used.

The point is to learn where a real run would have failed while still allowing deep-content coverage.

---

## 4. Future mobile QA panel

A hidden QA panel may later expose targeted actions such as:

- Heal Team;
- grant XP / level progression;
- Next Wave;
- Next Checkpoint;
- Force Encounter;
- Force Scenario/Location;
- Force Event;
- Force Boss;
- inspect current run seed/state;
- inspect Trait/Condition snapshots;
- later force Manager/Team/Secret content when relevant.

This panel is a testing console, not a cheat menu for normal runs.

Its value increases as the catalog grows: testing a W40 boss, a rare scenario transition or one Secret Encounter should not require replaying dozens of unrelated waves.

---

## 5. Secrets = real gameplay

Secrets belong to the normal game world and may contribute to Collection/Dex, discovery, routes, CharacterVersions, Locations, Events or rare encounters.

Possible trigger families include:

- specific run flags/choices;
- uncommon team compositions or Traits;
- Guide/Manager conditions;
- scenario/location chains;
- rare event sequences;
- hidden codes/tap sequences/Easter eggs;
- Collection progress;
- special Character/CharacterVersion combinations;
- future challenge achievements.

Secrets must remain compatible with seeded/deterministic run logic where they participate in generated content.

---

## 6. Secret presentation language

The Scenario/Presentation system should eventually support interruptions of the normal encounter language such as:

- `???`
- `UNKNOWN AREA`
- altered/glitched reveal;
- unusual silhouette/team reveal;
- dedicated stinger/music profile;
- expanded or special presentation state for major secrets.

The goal is that the player recognises that something exceptional is happening before necessarily knowing what it is.

Presentation is secondary to gameplay eligibility: a Secret must first have clear conditions and state rules.

---

## 7. DEV Characters / Easter-egg collection

Historical DEV-character direction includes a small special family such as:

- Lorenzo DEV;
- Luca BT;
- Enrico BT;
- Morgan BT.

These are **not** ordinary enemy battles by default.

Preferred flow:

`Secret trigger -> Secret Encounter / recruitment event -> recruited/unlocked -> Collection/Dex -> future starter eligibility`

Once recruited, a DEV Character may become permanently available under the normal `RECRUITED -> STARTER UNLOCK` philosophy, unless a later explicit rule says otherwise.

Do not hardcode one DEV Character as a one-off special-case implementation if the same need can be handled by a small data-driven Secret/DEV content family.

---

## 8. DEV Mode must not unlock Secrets automatically

QA tooling may include explicit `Force Secret`/`Force Encounter` actions for testing, but enabling DEV Mode must not count as legitimate Secret discovery/unlock in normal progression.

If a QA run forces a secret, it should remain isolated from normal unlock/record state unless the test explicitly uses a dedicated migration/test account rule.

This separation protects the real discovery loop.

---

## 9. Relationship to Traits, Managers and Scenario System

The same future Condition Engine can power:

- Trait thresholds;
- Manager/Guide rules;
- Secret eligibility;
- rare scenario branches;
- special CharacterVersion encounters;
- DEV QA forcing/inspection.

Reuse the data model, not the product semantics.

Example:

- normal run: `Diamond Dust Trait >= II + glacier flag + rare roll -> Secret event eligible`;
- DEV QA: force that event directly for testing;
- Manager AI: reads the same TraitSnapshot but makes tactical decisions rather than unlocking the secret by fiat.

---

## 10. Scope guardrails

- Do not delay a gameplay milestone merely to build a giant DEV console.
- A light DEV unlock/profile system is valuable early; advanced force-tools can grow as content complexity grows.
- Secrets should not become a second fixed story campaign. They are hidden conditions/opportunities inside the roguelite world model.
- Avoid secrets that require external real-money, invasive device data or opaque irreversible account actions.
- Keep secret unlock conditions auditable enough that bugs can be reproduced internally even if they remain hidden from normal players.

---

## 11. Recommended implementation order

When promoted to Production:

1. DEV-run tag/isolation + hidden unlock;
2. DEV Normal / Easy / Fast profiles with Continue;
3. basic telemetry such as virtual deaths/continues;
4. one reusable hidden-condition/Secret foundation;
5. one Secret Encounter proof;
6. optional small QA panel hooks;
7. DEV-character family only after the generic secret/recruit path is data-driven enough to avoid one-off code.

This preserves the historical intent: **DEV is QA; Secrets are gameplay; DEV Characters are a special Secret-content family.**
