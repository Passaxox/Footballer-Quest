import fs from "fs";
import path from "path";
import { act } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

jest.mock("./game/audio", () => ({ setSoundEnabled: jest.fn() }));

const css = fs.readFileSync(path.join(__dirname, "index.css"), "utf8");

test("safe-area CSS uses env() insets with zero fallback and dynamic viewport height", () => {
  expect(css).toMatch(/--fq-inset-bottom:\s*max\(env\(safe-area-inset-bottom,\s*0px\),\s*var\(--safe-area-inset-bottom,\s*0px\)\)/);
  expect(css).toMatch(/--fq-inset-top:\s*max\(env\(safe-area-inset-top,\s*0px\),\s*var\(--safe-area-inset-top,\s*0px\)\)/);
  expect(css).toMatch(/\.fq-safe\s*\{[^}]*padding-bottom:\s*var\(--fq-inset-bottom\)/);
  expect(css).toMatch(/padding-top:\s*var\(--fq-inset-top\)/);
  expect(css).toMatch(/min-height:\s*100dvh/);
  expect(css).toMatch(/\.fq-safe-fit\s*\{[^}]*height:\s*100dvh/);
  expect(css).toMatch(/\.fq-scroll\s*\{[^}]*min-height:\s*0/);
});

test("non-Overworld screens get the safe-area wrapper; Overworld shell stays untouched", () => {
  const src = fs.readFileSync(path.join(__dirname, "App.js"), "utf8");
  expect(src).toContain('${owHub ? "" : screen === "select" ? "fq-safe-top" : "fq-safe"}');
  expect(src).toContain('${screen === "battle" || screen === "team" ? "fq-safe-fit" : ""}');
  expect(css).not.toMatch(/\.ow-/);
});

test("title screen renders inside the safe-area container", async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => { root.render(<App />); });
  expect(el.querySelector(".fq-safe")).not.toBeNull();
  expect(el.querySelector(".ow-shell")).toBeNull();
  await act(async () => { root.unmount(); });
  el.remove();
});
