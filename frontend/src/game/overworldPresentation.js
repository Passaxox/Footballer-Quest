import { OVERWORLD_ROUTES, routeNodes, ROYAL_CHECKPOINT, selectableOverworldNode } from "./overworld";

// Presentation only. Tags are extension points, not extra pool weights or rewards.
export const ENVIRONMENTS = {
  crossroads: { name: "Il bivio", palette: ["#19382e", "#82d4a1"], decoration: "district", tags: ["school", "urban"], description: "Tre strade. Una squadra. La Royal vi aspetta." },
  riverside: { name: "Lungofiume", palette: ["#143e38", "#86e4cc"], decoration: "river", tags: ["riverside", "urban"], description: "Tra argini e campetti, il talento gioca all'aperto." },
  training: { name: "Campi Raimon", palette: ["#203d2c", "#c6e69a"], decoration: "pitch", tags: ["school", "academy"], description: "Fischi, scatti e palloni: qui si cresce insieme." },
  metropolitan: { name: "Distretto sportivo", palette: ["#303747", "#ffc38c"], decoration: "streets", tags: ["urban", "street-football"], description: "Sotto i lampioni, ogni piazzale diventa uno stadio." },
  academy: { name: "Territorio Royal", palette: ["#30304b", "#e8cb86"], decoration: "academy", tags: ["academy", "stadium"], description: "Oltre i cancelli, il calcio diventa una sfida vera." },
};
const places = {
  riverside: ["Campetto sull'argine", "Panchina degli scout", "Ponte della ferrovia", "Chiosco sportivo", "Campo del parco", "Vecchio pontile", "Sfida sull'argine", "Centro tecnico Royal", "Tunnel dell'accademia"],
  grounds: ["Piazzale Raimon", "Campo di allenamento", "Campo sintetico", "Spogliatoi", "Campo delle riserve", "Tribuna degli scout", "Campo centrale", "Emporio Royal", "Tunnel dell'accademia"],
  town: ["Piazza del quartiere", "Negozio sportivo", "Sottopasso", "Centro tecnico", "Campo tra i palazzi", "Stazione degli scout", "Arena di strada", "Cortile Royal", "Tunnel dell'accademia"],
};
const flavour = {
  battle: "Un pallone rotola verso di voi. Dall'altra parte, qualcuno aspetta una sfida.",
  recruit: "Una promessa si allena da sola. Potrebbe esserci posto nella vostra squadra.",
  training: "Coni allineati e porte libere. È il momento di affinare la tecnica.",
  shop: "Scarpini in vetrina e scorte per il viaggio. Date un'occhiata prima di ripartire.",
  event: "Voci a bordo campo. Qualcosa di inatteso sta per succedere.",
};
export const MAP_LAYOUT = { width: 360, height: 1530, start: { x: 50, y: 62 }, checkpoint: { x: 50, y: 1410 } };
const winding = [50, 27, 43, 73, 57, 26, 42, 72, 54];
const overview = {
  riverside: [19, 14, 26, 17, 23, 13, 25, 20, 32],
  grounds: [50, 48, 57, 46, 53, 47, 55, 49, 51],
  town: [81, 86, 78, 84, 76, 87, 79, 83, 71],
};
export function placeFor(node) {
  const checkpoint = node.nodeId === ROYAL_CHECKPOINT.nodeId;
  return { ...node, name: checkpoint ? "Royal Academy" : places[node.routeId][node.wave - 1],
    environment: ENVIRONMENTS[node.environmentId], risk: checkpoint ? "Boss" : node.type === "battle" ? "Sfida" : node.type === "event" ? "Esito incerto" : node.type === "recruit" ? "Scelta libera" : "Nessuno scontro",
    description: checkpoint ? "I cancelli si aprono. La Royal vi sbarra la strada verso il Football Frontier." : flavour[node.type] };
}
export function mapNodes(run) {
  const route = OVERWORLD_ROUTES.find(r => r.id === run.overworld.routeId);
  return [...(route ? [route] : OVERWORLD_ROUTES).flatMap(r => routeNodes(r).map((n, i) => ({ ...placeFor(n),
    position: { x: route ? winding[i] : overview[r.id][i], y: 220 + i * 126 } }))),
    { ...placeFor(ROYAL_CHECKPOINT), position: MAP_LAYOUT.checkpoint }];
}
export function nodeState(run, node) {
  if (run.overworld.selectedNodeId === node.nodeId) return "current";
  if ((node.routeId === run.overworld.routeId || !node.routeId) && node.wave <= run.overworld.completedWave) return "completed";
  if (selectableOverworldNode(run, node.nodeId)) return "available";
  if (node.wave > run.wave + 1 && node.routeId) return "unknown";
  return "locked";
}
export function markerNode(run, nodes = mapNodes(run)) {
  return nodes.find(n => n.nodeId === run.overworld.selectedNodeId)
    || nodes.find(n => n.routeId === run.overworld.routeId && n.wave === run.overworld.completedWave)
    || { nodeId: "departure", name: "Partenza · Raimon", position: MAP_LAYOUT.start };
}
export function environmentFor(run) {
  if (run.overworld.environmentId) return ENVIRONMENTS[run.overworld.environmentId] || ENVIRONMENTS.crossroads;
  const route = OVERWORLD_ROUTES.find(r => r.id === run.overworld.routeId);
  return ENVIRONMENTS[run.wave >= 8 && route ? "academy" : route?.environmentId || "crossroads"];
}
