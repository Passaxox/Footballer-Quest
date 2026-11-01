import { createOverworldArtPackV2, resolveOverworldArtPackV2, DEFAULT_OVERWORLD_ART_PACK_V2, LOCAL_OVERWORLD_ART_V2 } from "./overworldArtPackV2";

test("every slot has an embedded local fallback without any private asset dependency", () => {
  const resolved = resolveOverworldArtPackV2();
  expect(Object.keys(resolved)).toEqual(["background", "landmark", "caravan", "crest"]);
  for (const [key, value] of Object.entries(resolved)) {
    expect(value.src).toBeNull();
    expect(value.fallback).toEqual(LOCAL_OVERWORLD_ART_V2[key]);
    expect(value.fallback.src).toMatch(/^data:image\/svg\+xml,/);
    const xml = decodeURIComponent(value.fallback.src.split(",")[1]);
    const document = new DOMParser().parseFromString(xml, "image/svg+xml");
    expect(document.querySelector("parsererror")).toBeNull();
    expect(document.documentElement.tagName).toBe("svg");
    expect(document.querySelector("image, script, use")).toBeNull();
    expect(value.fallback.width).toBeGreaterThan(0);
    expect(value.fallback.height).toBeGreaterThan(0);
  }
  expect(resolveOverworldArtPackV2(DEFAULT_OVERWORLD_ART_PACK_V2, { environmentId: "unknown", locationId: "unknown", teamId: "unknown" })).toEqual(resolved);
});

test("partial private packs resolve per-frame backgrounds, relative paths and absolute URLs", () => {
  const pack = createOverworldArtPackV2({
    id: "private-test", basePath: "/private-art/",
    backgrounds: { "district:1:A": "maps/a.webp", "district:1:B": "maps/b.webp" },
    landmarks: { school: "/local/school.svg" },
    caravan: "https://assets.example.test/van.webp",
    crests: { team: "badges/team.webp" },
  });
  const selected = resolveOverworldArtPackV2(pack, { frameId: "district:1:A", locationId: "school", teamId: "team" });
  expect(selected.background.src).toBe("/private-art/maps/a.webp");
  expect(selected.landmark.src).toBe("/local/school.svg");
  expect(selected.caravan.src).toBe("https://assets.example.test/van.webp");
  expect(selected.crest.src).toBe("/private-art/badges/team.webp");
  expect(resolveOverworldArtPackV2(pack, { frameId: "district:1:B" }).background.src).toBe("/private-art/maps/b.webp");
  expect(resolveOverworldArtPackV2(pack, { frameId: "district:2:A" }).background.src).toBeNull();
  for (const [key, value] of Object.entries(selected)) expect(value.fallback).toEqual(LOCAL_OVERWORLD_ART_V2[key]);
  const root = createOverworldArtPackV2({ basePath: "/", caravan: "van.svg" });
  expect(resolveOverworldArtPackV2(root).caravan.src).toBe("/van.svg");
});

test("environment overrides inherit missing keys, support defaults and explicitly select local fallback with null", () => {
  const pack = createOverworldArtPackV2({
    basePath: "/art", backgrounds: { default: "day.webp", "district:1:A": "a.webp" },
    landmarks: { school: "school.webp" }, caravan: "van.webp", crests: { team: "team.webp" },
    environments: {
      night: { backgrounds: { default: "night.webp", "district:1:A": "a-night.webp" }, landmarks: { school: null }, caravan: null },
    },
  });
  const night = resolveOverworldArtPackV2(pack, { environmentId: "night", frameId: "district:1:A", locationId: "school", teamId: "team" });
  expect(night.background.src).toBe("/art/a-night.webp");
  expect(night.landmark.src).toBeNull();
  expect(night.caravan.src).toBeNull();
  expect(night.crest.src).toBe("/art/team.webp");
  expect(resolveOverworldArtPackV2(pack, { environmentId: "night", frameId: "district:1:B" }).background.src).toBe("/art/night.webp");
  expect(resolveOverworldArtPackV2(pack, { environmentId: "missing" }).background.src).toBe("/art/day.webp");
});

test("pack creation and resolution are deterministic and never mutate or freeze caller configuration", () => {
  const config = { backgrounds: { default: "map.svg" }, environments: { rain: { landmarks: { school: "wet.svg" } } } };
  const before = JSON.stringify(config), pack = createOverworldArtPackV2(config);
  expect(JSON.stringify(config)).toBe(before);
  expect(Object.isFrozen(config)).toBe(false);
  expect(Object.isFrozen(config.environments.rain.landmarks)).toBe(false);
  expect(Object.isFrozen(pack.environments.rain.landmarks)).toBe(true);
  const context = { environmentId: "rain", locationId: "school" };
  expect(resolveOverworldArtPackV2(pack, context)).toEqual(resolveOverworldArtPackV2(createOverworldArtPackV2(JSON.parse(before)), context));
  config.environments.rain.landmarks.school = "changed.svg";
  expect(resolveOverworldArtPackV2(pack, context).landmark.src).toBe("wet.svg");
  expect(Object.isFrozen(context)).toBe(false);
  expect(JSON.parse(JSON.stringify(pack))).toEqual(pack);
});
