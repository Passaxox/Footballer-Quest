import { act } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";
import RecordsScreen from "./RecordsScreen";
import EndScreen from "./EndScreen";
import { newRun } from "@/game/engine";
import { recordFinishedRun, loadMeta } from "@/game/storage";
import { STARTER_IDS } from "@/game/data";

jest.mock("axios", () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock("@/game/audio", () => ({ sfx: new Proxy({}, { get: () => jest.fn() }) }));
let root, host;
const originalBackend = process.env.REACT_APP_BACKEND_URL;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear(); jest.clearAllMocks();
  host = document.createElement("div"); root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  if (originalBackend === undefined) delete process.env.REACT_APP_BACKEND_URL;
  else process.env.REACT_APP_BACKEND_URL = originalBackend;
});
const meta = () => recordFinishedRun(loadMeta(), newRun(STARTER_IDS.slice(0, 3), "easy"), "lose");

test("empty backend keeps offline records and history visible without a request", async () => {
  process.env.REACT_APP_BACKEND_URL = "";
  await act(async () => root.render(<RecordsScreen meta={meta()} />));
  expect(axios.get).not.toHaveBeenCalled();
  expect(host.textContent).toContain("Classifica globale non disponibile");
  expect(host.querySelector('[data-testid="run-history-0"]').textContent).toContain("FACILE");
  expect(host.textContent).toContain("Mark Evans Lv3");
});

test.each(["network", "http", "html", "object", "malformed rows"])("%s response cannot hide the local archive", async mode => {
  process.env.REACT_APP_BACKEND_URL = "https://example.invalid";
  if (mode === "network" || mode === "http") axios.get.mockRejectedValue(new Error(mode));
  else axios.get.mockResolvedValue({ data: mode === "html" ? "<html>offline</html>" : mode === "object" ? {} : [null] });
  await act(async () => root.render(<RecordsScreen meta={meta()} />));
  expect(host.textContent).toContain("Classifica globale non disponibile");
  expect(host.querySelector('[data-testid="local-record-0"]')).not.toBeNull();
  expect(host.querySelector('[data-testid="run-history-0"]')).not.toBeNull();
});

test("valid online rows coexist with legacy local history", async () => {
  process.env.REACT_APP_BACKEND_URL = "https://example.invalid";
  axios.get.mockResolvedValue({ data: [{ id: "1", nickname: "Tester", wave: 19, glory: 200 }] });
  await act(async () => root.render(<RecordsScreen meta={{ records: [{ wave: 8, glory: 100 }] }} />));
  expect(host.textContent).toContain("Tester");
  expect(host.textContent).toContain("Run precedente: dettagli non registrati");
});

test("offline EndScreen does not offer an unusable score upload", async () => {
  process.env.REACT_APP_BACKEND_URL = "";
  await act(async () => root.render(<EndScreen run={newRun(STARTER_IDS.slice(0, 3))} result="lose" />));
  expect(host.textContent).toContain("Classifica globale non disponibile");
  expect(host.querySelector('[data-testid="submit-score-btn"]')).toBeNull();
  expect(axios.post).not.toHaveBeenCalled();
});
