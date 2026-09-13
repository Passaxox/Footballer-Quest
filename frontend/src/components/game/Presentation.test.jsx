import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import BattleScreen from "./BattleScreen";
import HubScreen from "./HubScreen";
import RouteChoiceScreen from "./RouteChoiceScreen";
import EventScreen from "./EventScreen";
import RecruitScreen from "./RecruitScreen";
import RewardScreen from "./RewardScreen";
import RecoveryScreen from "./RecoveryScreen";
import * as engine from "@/game/engine";
import { getRunEvent } from "@/game/events";
import { STARTER_IDS } from "@/game/data";
import { getEncounterTier, resolveTeamAccent, formatVersionSubtitle } from "@/game/presentation";

jest.mock("@/game/audio", () => ({
  sfx: new Proxy({}, { get: () => jest.fn() }),
  setSoundEnabled: jest.fn(),
}));

let root, host;
const find = (id) => host.querySelector(`[data-testid="${id}"]`);
const click = async (id) => {
  const el = find(id);
  expect(el).not.toBeNull();
  await act(async () => el.click());
};
const settle = async (times = 15) => {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
  }
};

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("Footballer Quest Presentation Pass 1", () => {
  test("getEncounterTier and resolveTeamAccent classify encounter metadata cleanly", () => {
    expect(getEncounterTier({ kind: "boss" }).shortLabel).toBe("BOSS");
    expect(getEncounterTier({ kind: "miniboss" }).shortLabel).toBe("MINIBOSS");
    expect(getEncounterTier({ kind: "elite" }).shortLabel).toBe("ÉLITE");
    expect(getEncounterTier({ kind: "wild" }).shortLabel).toBe("SFIDA");

    const royal = resolveTeamAccent("Pattuglia d'Élite Royal", ["royal-academy"]);
    expect(royal.displayName).toBe("Royal Academy");
    expect(royal.borderClass).toBe("border-red-600");

    const alius = resolveTeamAccent("Pattuglia Epsilon", ["epsilon"]);
    expect(alius.shortLabel).toBe("Epsilon");
  });

  test("formatVersionSubtitle provides clean version subtitles without raw IDs", () => {
    const judeRoyal = { versionId: "jude:base", characterId: "jude", baseId: "jude" };
    const subtitle = formatVersionSubtitle(judeRoyal);
    expect(subtitle).not.toContain(":base");
    expect(subtitle.length).toBeGreaterThan(0);
  });

  test("BattleScreen renders header hierarchy: wave, segment context, tier badge, team name, and captain badge", async () => {
    const run = engine.newRun(STARTER_IDS.slice(0, 3));
    const enemyPlayer = { ...engine.createPlayer("david", 5), isCaptain: true };
    const encounter = {
      kind: "miniboss",
      teamName: "Pattuglia d'Élite Royal",
      enemies: [enemyPlayer],
      intro: "La Royal Academy vi sbarra il passo!",
    };

    const view = <BattleScreen run={run} encounter={encounter} onWin={jest.fn()} onLose={jest.fn()} onFlee={jest.fn()} onActiveChange={jest.fn()} />;
    await act(async () => root.render(view));

    // Encounter intro modal is shown initially
    expect(find("encounter-intro-panel")).not.toBeNull();
    expect(find("encounter-intro-team").textContent).toBe("Pattuglia d'Élite Royal");

    // Click [ AFFRONTA ] to skip intro immediately
    await click("encounter-intro-btn");
    await settle(2);

    // Verify battle header hierarchy
    expect(find("wave-counter-badge").textContent).toContain("ONDATA 1");
    expect(find("battle-segment-badge")).not.toBeNull();
    expect(find("encounter-tier-badge").textContent).toBe("MINIBOSS");
    expect(find("battle-team-name").textContent).toBe("Pattuglia d'Élite Royal");
    expect(find("battle-captain-badge").textContent).toContain("CAP: David");
    expect(find("enemy-captain-badge")).not.toBeNull();
  });

  test("BattleScreen flee button is disabled for boss and miniboss encounters", async () => {
    const run = engine.newRun(STARTER_IDS.slice(0, 3));
    const minibossEncounter = {
      kind: "miniboss",
      teamName: "Avanguardia Gemini",
      enemies: [engine.createPlayer("pat-box:gemini-ie2", 4)],
    };

    const view = <BattleScreen run={run} encounter={minibossEncounter} onWin={jest.fn()} onLose={jest.fn()} onFlee={jest.fn()} onActiveChange={jest.fn()} />;
    await act(async () => root.render(view));
    await click("encounter-intro-btn");
    await settle(2);
    await click("pre-battle-keep");
    await settle(2);

    const fleeBtn = find("flee-button");
    expect(fleeBtn).not.toBeNull();
    expect(fleeBtn.disabled).toBe(true);
  });

  test("BattleScreen displays trigger item banner when trigger items activate", async () => {
    const run = engine.newRun(STARTER_IDS.slice(0, 3));
    run.items.stendardo = 1;

    const enemy = engine.createPlayer("jack", 1);
    const encounter = {
      kind: "elite",
      teamName: "Formazione Élite",
      enemies: [enemy],
    };

    const view = <BattleScreen run={run} encounter={encounter} onWin={jest.fn()} onLose={jest.fn()} onFlee={jest.fn()} onActiveChange={jest.fn()} />;
    await act(async () => root.render(view));
    await click("encounter-intro-btn");
    await settle(2);
    await click("pre-battle-keep");
    await settle(2);

    // Attack triggers stendardo on first strike
    await click("attack-button");
    await act(async () => { jest.advanceTimersByTime(200); });

    expect(find("battle-trigger-banner")).not.toBeNull();
    expect(find("battle-trigger-banner").textContent).toContain("STENDARDO TATTICO ATTIVATO");
    await settle(5);
  });

  test("HubScreen renders segment start banner, structured Bonus Nodo panel, and route prestige multiplier", async () => {
    const run = engine.newRun(STARTER_IDS.slice(0, 3));
    run.activeNodeItems = ["grinta"];
    run.segmentState.prestigeMultiplier = 1.15;
    run.segmentState.step = 1;

    const view = <HubScreen run={run} onNext={jest.fn()} onTeam={jest.fn()} onPause={jest.fn()} onAbandon={jest.fn()} />;
    await act(async () => root.render(view));

    // Segment start card
    expect(find("segment-start-card")).not.toBeNull();
    expect(find("segment-start-card").textContent).toContain("INIZIO SEGMENTO 1");

    // Bonus Nodo panel groupings
    const bonusNodo = find("bonus-nodo");
    expect(bonusNodo).not.toBeNull();
    expect(find("active-node-items")).not.toBeNull();
    expect(find("active-node-items").textContent).toContain("Fino a fine nodo");
    expect(find("active-temporary-modifiers")).not.toBeNull();
    expect(find("active-temporary-modifiers").textContent).toContain("Bonus Percorso");
  });

  test("RouteChoiceScreen displays cards with risk, and shows confirmation panel before proceeding", async () => {
    const run = engine.newRun(STARTER_IDS.slice(0, 3));
    const choices = [
      {
        id: "zona-alius",
        name: "Zona d'Influenza Alius",
        description: "Area ostile",
        tendency: "Battaglie Élite",
        risk: "alto",
        modifierDesc: "+15% Prestigio",
        segmentLengthRange: [3, 4],
      },
    ];

    const onSelect = jest.fn();
    const view = <RouteChoiceScreen run={run} choices={choices} onSelect={onSelect} />;
    await act(async () => root.render(view));

    expect(find("route-choice-card-zona-alius")).not.toBeNull();
    await click("route-choice-btn-zona-alius");

    // Confirmation panel appears
    expect(find("route-confirmation-card")).not.toBeNull();
    expect(find("route-confirmation-card").textContent).toContain("Rotta Confermata");

    // Clicking confirm calls onSelect
    await click("route-confirm-proceed-btn");
    expect(onSelect).toHaveBeenCalledWith("zona-alius");
  });

  test("EventScreen renders event presentation with category and choice preview tags", async () => {
    const run = engine.newRun(STARTER_IDS.slice(0, 3));
    const event = getRunEvent("sideline-clinic");

    const onChoose = jest.fn();
    const view = <EventScreen run={run} event={event} onChoose={onChoose} onResolve={jest.fn()} />;
    await act(async () => root.render(view));

    expect(find("event-presentation")).not.toBeNull();
    expect(find("event-choice-0")).not.toBeNull();
    expect(find("event-choice-0").textContent).toContain("Cura tutta la squadra");

    await click("event-choice-0");
    expect(onChoose).toHaveBeenCalledWith(0);
  });

  test("RecruitScreen displays canonical name, version subtitle, and rarity badge", async () => {
    const run = engine.newRun(STARTER_IDS.slice(0, 3));
    const player = engine.createPlayer("shawn", 3);

    const view = <RecruitScreen run={run} player={player} mode="offer" onJoin={jest.fn()} onSkip={jest.fn()} />;
    await act(async () => root.render(view));

    expect(find("recruit-version-subtitle")).not.toBeNull();
    expect(find("recruit-rarity-badge")).not.toBeNull();
    expect(find("recruit-version-subtitle").textContent).not.toContain("shawn:base");
  });

  test("RewardScreen displays tier celebration banner for miniboss and boss", async () => {
    const view = <RewardScreen rewards={["grinta"]} bonus="trofeo" money={150} xpReport={null} encounterKind="miniboss" teamName="Avanguardia Gemini" onPick={jest.fn()} />;
    await act(async () => root.render(view));

    expect(find("reward-tier-banner")).not.toBeNull();
    expect(find("reward-tier-banner").textContent).toContain("VITTORIA MINIBOSS");
    expect(find("reward-guaranteed-bonus")).not.toBeNull();
  });

  test("RecoveryScreen displays treatment completion feedback upon choosing an option", async () => {
    const run = engine.newRun(STARTER_IDS.slice(0, 3));
    const onApply = jest.fn();

    const view = <RecoveryScreen run={run} onApplyOption={onApply} onLeave={jest.fn()} />;
    await act(async () => root.render(view));

    await click("recovery-option-rest");
    expect(onApply).toHaveBeenCalledWith("rest");
    expect(find("recovery-confirmed-feedback")).not.toBeNull();
  });
});
