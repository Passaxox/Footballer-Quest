import { act } from "react";
import { createRoot } from "react-dom/client";
import EventScreen from "./EventScreen";
import { RUN_EVENTS } from "@/game/events";
import { newRun } from "@/game/engine";

jest.mock("@/game/audio", () => ({ sfx: { confirm: jest.fn() } }));

let root;
let host;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  root = createRoot(host);
});

afterEach(async () => act(async () => root.unmount()));

test("mobile event view exposes seed, context, clear choices and persisted feedback", async () => {
  const event = RUN_EVENTS.find(candidate => candidate.eventId === "route-split");
  const run = { ...newRun(["mark", "axel", "jude"], "normal", "visible-seed"), pending: { type: "event", eventId: event.eventId } };
  const onChoose = jest.fn();
  await act(async () => root.render(<EventScreen run={run} event={event} onChoose={onChoose} onResolve={jest.fn()} />));
  expect(host.textContent).toContain("Seed visible-seed");
  expect(host.textContent).toContain(event.body);
  expect(host.querySelectorAll("[data-testid^='event-choice-']")).toHaveLength(2);
  await act(async () => host.querySelector("[data-testid='event-choice-1']").click());
  expect(onChoose).toHaveBeenCalledWith(1);

  const result = event.choices[1].outcomes[0];
  await act(async () => root.render(<EventScreen run={{ ...run, pending: { ...run.pending, result } }} event={event} onChoose={onChoose} onResolve={jest.fn()} />));
  expect(host.querySelector("[data-testid='event-result-text']").textContent).toBe(result.text);
  expect(host.querySelector("[data-testid='event-continue-btn']")).not.toBeNull();
});
