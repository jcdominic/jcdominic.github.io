// Anonymous solve results, kept in Supabase so puzzle difficulty can be measured.
// The publishable key can only add rows and read totals (see supabase/migrations/).
// Nothing here may slow down or break the game, so every call swallows failures.
const api = "https://ufeoypnxbuldjutdgmpt.supabase.co/rest/v1/";
const headers = {apikey: "sb_publishable_WX1xqAkjRC8n05QtHdlFRg_lNYf7DGo", "Content-Type": "application/json"};

// Plays on a laptop's own server would skew the numbers, so they aren't recorded
// unless the URL asks for it with ?record.
const local = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)|\.local$/.test(location.hostname);
export const recording = !local || new URLSearchParams(location.search).has("record");

function randomId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  // randomUUID only exists on https and localhost.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 15) | 64;
  b[8] = (b[8] & 63) | 128;
  const hex = [...b].map(x => x.toString(16).padStart(2, "0")).join("");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}
let player;
function playerId() {
  if (player) return player;
  try {
    player = localStorage.getItem("pocket-mini:player");
    if (!player) localStorage.setItem("pocket-mini:player", player = randomId());
  } catch {
    player = randomId();
  }
  return player;
}

// Each player sends at most one start, check and solve per issue. The browser
// remembers what it sent, and the table's unique key turns away any repeat.
export function record(row) {
  if (!recording) return Promise.resolve();
  const sent = "pocket-mini:sent:" + row.issue + ":" + row.event;
  try {
    if (localStorage.getItem(sent)) return Promise.resolve();
    localStorage.setItem(sent, "1");
  } catch {}
  return fetch(api + "mini_events", {
    method: "POST",
    headers: {...headers, Prefer: "return=minimal"},
    body: JSON.stringify({...row, player: playerId()}),
    keepalive: true,
  }).catch(() => {});
}

// How everyone has done on one issue, or null if that can't be found quickly.
export async function everyone(issue) {
  try {
    const response = await fetch(api + "rpc/mini_today", {
      method: "POST",
      headers,
      body: JSON.stringify({p_issue: issue}),
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    const [row] = await response.json();
    return row ?? null;
  } catch {
    return null;
  }
}
