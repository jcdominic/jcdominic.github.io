// The HTML on top of the 3D scene: menu, hover label, hotbar, and info panels.

import { stations } from "./content.js";
import * as T from "./textures.js";

// Things in the room that aren't about you, so they don't live in content.js.
const fixtures = {
  door: {
    name: "Front door",
    hint: "Leave",
    title: "Heading out?",
    sections: [{ items: [{ title: "Back to the regular site", link: "/" }] }],
  },
  lamp: { name: "Desk lamp", hint: "On / off" },
};
const all = { ...stations, ...fixtures };

// Hidden stations are plain furniture for now: not clickable, not in the hotbar or the count.
export const clickable = (id) => id in all && !all[id].hidden;
const HOTBAR = ["tv", "desk", "fridge", "map", "bookshelf", "window", "dream"].filter(clickable);
const secrets = Object.keys(stations).filter(clickable);
const STORAGE = "apartment-found";

const $ = (s) => document.querySelector(s);
const menu = $("#menu");
const hover = $("#hover");
const hotbar = $("#hotbar");
const counter = $("#found");
const panel = $("#panel");
const panelTitle = $("#panel-title");
const panelBody = $("#panel-body");

let found = new Set();
try {
  found = new Set(JSON.parse(localStorage.getItem(STORAGE)) || []);
} catch {}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) {
    e.textContent = text;
    if (/^\[.*\]$/.test(text)) e.classList.add("placeholder");
  }
  return e;
}

let callbacks;

export function init({ onEnter, onClose, onPick }) {
  callbacks = { onClose };
  $("#enter").addEventListener("click", onEnter);

  for (const id of HOTBAR) {
    const slot = el("button", "slot");
    slot.dataset.id = id;
    const img = el("img");
    img.src = T.icon(id).toDataURL();
    img.alt = "";
    slot.append(img);
    slot.addEventListener("click", () => found.has(id) && onPick(id));
    hotbar.append(slot);
  }
  renderFound();

  panel.addEventListener("click", (e) => e.target === panel && close());
  $("#panel-close").addEventListener("click", close);
  // E closes a panel, like an inventory. Stop the event here so the game doesn't
  // see the same E press and open the panel right back up.
  // Esc closes on key *up*: if we grab the mouse back while Esc is still down,
  // the browser's own Esc handling lets go of it again straight away.
  document.addEventListener("keydown", (e) => {
    if (panel.hidden) return;
    if (e.code === "KeyE" && !e.repeat) {
      e.stopImmediatePropagation();
      close();
    }
    if (e.key === "Escape") e.preventDefault();
  });
  document.addEventListener("keyup", (e) => {
    if (e.key === "Escape" && !panel.hidden) close();
  });

  // Optional fullscreen. In Chrome and Edge it also lets Esc close panels without
  // the browser letting go of the mouse.
  const fs = $("#fullscreen");
  if (document.fullscreenEnabled) {
    fs.hidden = false;
    fs.addEventListener("click", toggleFullscreen);
    document.addEventListener("fullscreenchange", () => {
      fs.textContent = document.fullscreenElement ? "Fullscreen: on" : "Fullscreen: off";
    });
  }
}

export async function toggleFullscreen() {
  if (!document.fullscreenEnabled) return;
  try {
    if (document.fullscreenElement) return await document.exitFullscreen();
    await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    await navigator.keyboard?.lock?.(["Escape"]);
  } catch {}
}

export function closePanel() {
  if (!panel.hidden) close();
}

// ---------- the in-game cursor, for panels opened while the mouse is captured ----------

const cursor = $("#cursor");
let cx = 0, cy = 0, hot = null;

export function showCursor(show) {
  cursor.hidden = !show;
  document.body.classList.toggle("vcursor", show);
  if (show) {
    cx = innerWidth / 2;
    cy = innerHeight / 2;
    moveCursor(0, 0);
  } else setHot(null);
}

export function moveCursor(dx, dy) {
  cx = Math.max(0, Math.min(innerWidth - 1, cx + dx));
  cy = Math.max(0, Math.min(innerHeight - 1, cy + dy));
  cursor.style.transform = `translate(${cx}px, ${cy}px)`;
  setHot(document.elementFromPoint(cx, cy)?.closest("#panel a, #panel button") ?? null);
}

function setHot(el) {
  if (el === hot) return;
  hot?.classList.remove("hot");
  el?.classList.add("hot");
  hot = el;
}

export function clickCursor() {
  const el = document.elementFromPoint(cx, cy);
  if (!el || el === panel || el.closest("#panel-close")) return close(); // outside the box, or the x
  const link = el.closest("#panel a");
  if (!link) return;
  if (link.target === "_blank") window.open(link.href, "_blank", "noopener");
  else location.href = link.href;
}

export function scrollPanel(dy) {
  panelBody.scrollBy(0, dy);
}

function close() {
  panel.hidden = true;
  callbacks.onClose();
}

function renderFound() {
  for (const slot of hotbar.children) {
    const id = slot.dataset.id;
    const known = found.has(id);
    slot.classList.toggle("found", known);
    slot.title = known ? all[id].name : "Not found yet";
    slot.setAttribute("aria-label", known ? `${all[id].name}: ${all[id].hint}` : "Not found yet");
    slot.disabled = !known;
  }
  const n = secrets.filter((id) => found.has(id)).length;
  counter.textContent = n === secrets.length ? `All ${n} found!` : `${n} / ${secrets.length} found`;
}

export function markFound(id) {
  if (found.has(id)) return;
  found.add(id);
  try {
    localStorage.setItem(STORAGE, JSON.stringify([...found]));
  } catch {}
  renderFound();
}

export function showMenu(show) {
  menu.hidden = !show;
  if (show) $("#enter").textContent = menu.dataset.started ? "Back to the apartment" : "Step inside";
  else menu.dataset.started = "1";
}

export function setHover(id) {
  hover.replaceChildren();
  hover.hidden = !id;
  if (!id) return;
  const s = all[id];
  hover.append(el("strong", null, s.name), el("span", null, s.hint));
}

export function openPanel(id) {
  const s = all[id];
  panelTitle.textContent = s.title;
  panelBody.replaceChildren();
  if (s.intro) panelBody.append(el("p", "intro", s.intro));
  for (const paragraph of s.body || []) panelBody.append(el("p", "body", paragraph));
  if (s.art === "map") {
    const pins = s.sections.flatMap((sec) => sec.items).filter((i) => i.lat != null);
    const art = T.map(pins);
    art.className = "art";
    art.setAttribute("role", "img");
    art.setAttribute("aria-label", "Map of the United States with a pin on each park");
    panelBody.append(art);
  }
  for (const sec of s.sections || []) {
    const section = el("section");
    if (sec.heading) section.append(el("h3", null, sec.heading));
    const list = el("ul");
    for (const item of sec.items) {
      const li = el("li");
      const title = el(item.link ? "a" : "span", "title", item.title);
      if (item.link) {
        title.href = item.link;
        if (/^https?:/.test(item.link)) {
          title.target = "_blank";
          title.rel = "noopener";
        }
      }
      li.append(title);
      if (item.meta) li.append(el("span", "meta", item.meta));
      if (item.note) li.append(el("p", "note", item.note));
      if (item.photo) {
        const img = el("img");
        img.src = item.photo;
        img.alt = item.title;
        img.loading = "lazy";
        li.append(img);
      }
      list.append(li);
    }
    section.append(list);
    panelBody.append(section);
  }
  panel.hidden = false;
  panelBody.scrollTop = 0;
  $("#panel-close").focus();
}
