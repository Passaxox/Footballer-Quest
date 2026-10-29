import fs from "fs";
import path from "path";
import { act } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

jest.mock("./game/audio", () => ({ setSoundEnabled: jest.fn() }));

const css = fs.readFileSync(path.join(__dirname, "index.css"), "utf8");

test("safe-area CSS uses env() insets with zero fallback and dynamic viewport height", () => {
  expect(css).toMatch(/\.fq-safe\s*\{[^}]*padding-bottom:\s*env\(safe-area-inset-bottom,\s*0px\)/);
  expect(css).toMatch(/padding-top:\s*env\(safe-area-inset-top,\s*0px\)/);
  expect(css).toMatch(/min-height:\s*100dvh/);
});

test("non-Overworld screens get the safe-area wrapper; Overworld shell stays untouched", () => {
  const src = fs.readFileSync(path.join(__dirname, "App.js"), "utf8");
  expect(src).toContain('${owHub ? "" : screen === "select" ? "fq-safe-top" : "fq-safe"}');
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
