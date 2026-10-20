"use strict";
// KINSHIFT annotator dashboard. Static page; everything stays in this browser
// until the annotator exports a file and sends it to the team.

const APP_VERSION = "0.2.6";
const SCHEMA = "kinshift-annotation/1";
const D = {};            // loaded data files
const BATCH = {};        // decrypted batches per round, or null when not ready
let S = null;            // session: {handle, language, role, demo, code}
let leaving = null;      // called before leaving an item, to bank time spent

// ---------- helpers ----------
const $ = (sel, el = document) => el.querySelector(sel);
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false)
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  return el;
}
async function getJSON(path, optional) {
  const r = await fetch(`${path}?v=${APP_VERSION}`, { cache: "no-store" });
  if (!r.ok) { if (optional && r.status === 404) return null; throw new Error(`${path}: ${r.status}`); }
  return r.json();
}
async function sha256hex(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
// Must match kinshift/annotation/crypto.py
async function decryptBatch(blob, code) {
  const d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: d(blob.salt), iterations: blob.iter },
    base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: d(blob.iv) }, key, d(blob.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}
window.decryptBatch = decryptBatch;
let toastTimer = null;
function toast(msg, bad) {
  const t = $("#toast"); t.textContent = msg; t.className = bad ? "bad" : "";
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add("hidden"), 4000);
}
const seg = (options, value, onPick) => h("div", { class: "seg" }, ...options.map(([v, label, cls]) =>
  h("button", { type: "button", class: (value === v ? "on " : "") + (cls || ""), onclick: () => onPick(v) }, label)));

// ---------- storage ----------
const K = (round) => `kinshift:${S.handle}:${round}`;
function readKey(k, fallback) {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function writeKey(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; }
  catch { toast("Could not save in this browser. Export your work now and tell the team.", true); return false; }
}
function loadRound(round) { return readKey(K(round), { rows: {}, updated: null }); }
function saveRound(round, data) { data.updated = new Date().toISOString(); writeKey(K(round), data); updateBanner(); }
// Save one row into whatever is stored now, so another tab or a restore is never overwritten by a stale copy.
function saveRow(round, id, row) {
  const cur = loadRound(round); cur.rows[id] = row; saveRound(round, cur);
}

// ---------- session ----------
function loadSession() { return readKey("kinshift:session", null); }
function signOut() {
  try { localStorage.removeItem("kinshift:session"); } catch {}
  S = null; for (const k of Object.keys(BATCH)) delete BATCH[k]; go("#/login");
}

// ---------- export / import ----------
function roundIds() { return D.rounds.map(r => r.id); }
function exportAll() {
  const rounds = {};
  for (const id of roundIds()) { const r = readKey(K(id), null); if (r) rounds[id] = r; }
  const payload = { schema: SCHEMA, app_version: APP_VERSION, handle: S.handle, language: S.language,
                    role: S.role, demo: !!S.demo, exported_at: new Date().toISOString(), rounds };
  const stamp = payload.exported_at.slice(0, 16).replace(/[-:T]/g, "");
  const blob = new Blob([JSON.stringify(payload, null, 1)], { type: "application/json" });
  const a = h("a", { href: URL.createObjectURL(blob), download: `kinshift_${S.handle}_${stamp}.json` });
  document.body.append(a); a.click(); a.remove();
  writeKey(`kinshift:${S.handle}:lastExport`, payload.exported_at);
  updateBanner();
  toast("Exported. Send the downloaded file to the KINSHIFT team.");
}
async function importFile(file) {
  let p;
  try { p = JSON.parse(await file.text()); } catch { return toast("That file is not a KINSHIFT export.", true); }
  if (p.schema !== SCHEMA) return toast("That file is not a KINSHIFT export.", true);
  if (p.handle !== S.handle) return toast(`That file belongs to ${p.handle}, not ${S.handle}.`, true);
  let restored = 0;
  for (const [id, incoming] of Object.entries(p.rounds || {})) {
    const cur = loadRound(id);
    for (const [key, row] of Object.entries(incoming.rows || {})) {
      const mine = cur.rows[key];
      if (!mine || (row.last_edit || "") > (mine.last_edit || "")) { cur.rows[key] = row; restored++; }
    }
    for (const [k, v] of Object.entries(incoming)) if (k !== "rows" && k !== "updated" && cur[k] == null) cur[k] = v;
    saveRound(id, cur);
  }
  toast(`Restored ${restored} answers from your file.`);
  route();
}

// ---------- banner ----------
function updateBanner() {
  const b = $("#banner");
  if (!S) return b.classList.add("hidden");
  const last = readKey(`kinshift:${S.handle}:lastExport`, "");
  const newest = roundIds().map(id => loadRound(id).updated || "").sort().pop() || "";
  if (newest && newest > last) {
    b.replaceChildren(h("span", {}, innerWidth < 680 ? "Not exported yet." : "You have work that is not exported yet. Export at the end of every sitting and send the file to the team."),
                      h("button", { class: "small primary", onclick: exportAll }, "Export now"));
    b.classList.remove("hidden");
  } else b.classList.add("hidden");
}

// ---------- routing ----------
function go(hash) { if (location.hash !== hash) location.hash = hash; else route(); }
window.addEventListener("hashchange", route);
function setMain(...kids) { $("#app").replaceChildren(...kids.filter(Boolean)); window.scrollTo(0, 0); }
function lang() { return D.languages[S.language]; }
function setFocusbar(...kids) {
  const f = $("#focusbar");
  if (!kids.length) { f.classList.add("hidden"); f.replaceChildren(); return; }
  f.replaceChildren(...kids); f.classList.remove("hidden");
}

async function route() {
  if (leaving) { leaving(); leaving = null; }
  $("#palette").classList.add("hidden");
  setFocusbar();
  if (!S) S = loadSession();
  renderWho();
  if (!S) return renderLogin();
  document.body.className = `font-${lang().font}`;
  updateBanner();
  const [page, a, b] = (location.hash || "#/home").slice(2).split("/").map(decodeURIComponent);
  if (page === "r0") return renderR0();
  if (page === "r1") return a ? renderR1Item(a, +(b || 0)) : renderR1List();
  if (page === "r1b" || page === "r2") return renderBatchRound(page, +(a || 0));
  return renderHome();
}
function renderWho() {
  const w = $("#who");
  if (!S) return w.replaceChildren();
  w.replaceChildren(h("span", {}, `${S.handle} · ${D.languages[S.language].name}${S.demo ? " · demo" : ""}`),
                    h("button", { class: "ghost small", onclick: signOut }, "Sign out"));
}

// ---------- login ----------
function renderLogin() {
  document.body.className = "";
  const handle = h("input", { type: "text", id: "handle", autocomplete: "username", placeholder: "e.g. sd-a1" });
  const code = h("input", { type: "password", id: "code", autocomplete: "current-password", placeholder: "xxxx-xxxx-xxxx-xxxx" });
  const msg = h("p", { class: "bad" });
  async function submit(e) {
    e.preventDefault();
    const hd = handle.value.trim().toLowerCase(), cd = code.value.trim().toLowerCase();
    const acc = D.assignments.find(x => x.handle === hd);
    if (!acc || acc.check !== await sha256hex(`kinshift:${hd}:${cd}`)) {
      msg.textContent = "Handle or access code not recognised. Check both and try again."; return;
    }
    S = { handle: acc.handle, language: acc.language, role: acc.role, demo: acc.demo, code: cd };
    writeKey("kinshift:session", S); go("#/home");
  }
  setMain(h("div", { class: "login" },
    h("div", { class: "card" }, h("h2", {}, "Sign in"),
      h("form", { onsubmit: submit },
        h("label", { class: "lbl", for: "handle" }, "Handle"), handle,
        h("label", { class: "lbl", for: "code", style: "margin-top:12px" }, "Access code"), code,
        h("div", { style: "margin-top:16px" }, h("button", { class: "primary", type: "submit" }, "Sign in")), msg)),
    h("p", { class: "muted", style: "font-size:13px" },
      "Use the handle and access code the KINSHIFT team sent you. Your answers are kept in this browser, so use the same browser and device each time.")));
}

// ---------- home ----------
function r0Done() { const r = loadRound("r0"); return !!(r.consent && r.background && r.quiz && r.quiz.passed); }
async function loadBatch(round) {
  if (round in BATCH) return BATCH[round];
  const blob = await getJSON(`data/${round}/${S.handle}.json`, true);
  try { BATCH[round] = blob ? (await decryptBatch(blob, S.code)).items : null; }
  catch { BATCH[round] = null; toast("Could not open your batch. Sign out and sign in again with your code.", true); }
  return BATCH[round];
}
function progressOf(round, items, isDone) {
  const rows = loadRound(round).rows;
  return items.filter(it => isDone(rows[it.id], it)).length;
}
async function renderHome() {
  const mine = D.rounds.filter(r => r.who.includes(S.role));
  const rowsEl = h("div", { class: "rows" });
  for (const r of mine) {
    let right = null, href = null, done = false, locked = false;
    if (r.id === "r0") { done = r0Done(); right = h("span", { class: "tag " + (done ? "good" : "accent") }, done ? "done" : "start here"); href = "#/r0"; }
    else if (!r0Done()) { locked = true; right = h("span", { class: "tag" }, "after onboarding"); }
    else if (r.id === "r1") {
      const n = progressOf("r1", D.relations, r1Done); done = n === D.relations.length;
      right = h("span", { class: "tag " + (done ? "good" : "") }, `${n} / ${D.relations.length}`); href = "#/r1";
    } else {
      const items = await loadBatch(r.id);
      if (!items) { locked = true; right = h("span", { class: "tag" }, "not ready yet"); }
      else { const n = progressOf(r.id, items, BATCH_DONE[r.id]); done = n === items.length;
             right = h("span", { class: "tag " + (done ? "good" : "") }, `${n} / ${items.length}`); href = `#/${r.id}/0`; }
    }
    rowsEl.append(h(href && !locked ? "a" : "div", { class: `list-row${done ? " done" : ""}${locked ? " locked" : ""}`, href: locked ? null : href },
      h("div", {}, h("div", { class: "title" }, r.title), h("div", { class: "sub" }, r.about)), right, h("span")));
  }
  const fileIn = h("input", { type: "file", accept: "application/json", class: "hidden",
                              onchange: e => e.target.files[0] && importFile(e.target.files[0]) });
  setMain(h("h1", {}, `Welcome, ${S.handle}`),
    h("p", { class: "lead" }, `${lang().name} · ${S.role === "adjudicator" ? "reviewer" : "annotator"}. Work through the rounds in order; your answers save automatically.`),
    h("div", { class: "card" }, h("h2", {}, "Your rounds"), rowsEl),
    h("div", { class: "card" }, h("h2", {}, "Your files"),
      h("p", { class: "muted", style: "margin-top:0" }, "Export at the end of every sitting and send the file to the team. If you change browser or device, restore your last file there first."),
      h("div", { class: "alt" }, h("button", { class: "primary", onclick: exportAll }, "Export my work"),
        h("button", { onclick: () => fileIn.click() }, "Restore from a file"), fileIn)));
}

// ---------- R0: onboarding ----------
function renderR0() {
  const data = loadRound("r0"), bg = data.background || {};
  const field = (key, text, el) => { el.id = `bg-${key}`; el.value = bg[key] || ""; return h("div", {}, h("label", { class: "lbl", for: el.id }, text), el); };
  const sel = (opts) => h("select", {}, h("option", { value: "" }, "choose"), ...opts.map(o => h("option", { value: o }, o)));
  const consent = h("input", { type: "checkbox", id: "consent" }); consent.checked = !!data.consent;
  const read = h("input", { type: "checkbox", id: "read" }); read.checked = !!data.read_guidelines;
  const fields = [
    field("region", "City or district where you grew up", h("input", { type: "text" })),
    field("dialect", "What do you call the dialect you speak?", h("input", { type: "text" })),
    field("age_band", "Age", sel(["18-24", "25-34", "35-44", "45-54", "55+"])),
    field("sex", "Sex", sel(["woman", "man", "prefer not to say"])),
  ];
  const quizBox = h("div");
  function drawQuiz() {
    const q = data.quiz || {};
    quizBox.replaceChildren(...D.quiz.map((item, i) => h("div", { class: "q" },
      h("h3", {}, `${i + 1}. ${item.q}`),
      h("div", { class: "choices" }, ...item.options.map((o, j) => {
        const r = h("input", { type: "radio", name: `q${i}`, value: j });
        if (q.answers && q.answers[i] === j) r.checked = true;
        return h("label", {}, r, h("span", {}, o));
      })),
      q.checked && q.answers[i] !== item.answer ? h("div", { class: "warn" }, `Not quite. The answer is: ${item.options[item.answer]}`) : null)));
  }
  drawQuiz();
  const status = h("p", { class: "bad" });
  function save() {
    const b = {};
    for (const f of fields) { const el = $("input,select", f); b[el.id.slice(3)] = el.value.trim(); }
    const answers = D.quiz.map((_, i) => { const r = $(`input[name=q${i}]:checked`); return r ? +r.value : null; });
    const score = answers.filter((a, i) => a === D.quiz[i].answer).length;
    Object.assign(data, { background: b, consent: consent.checked, read_guidelines: read.checked,
      quiz: { answers, score, passed: score === D.quiz.length, checked: true, attempts: ((data.quiz && data.quiz.attempts) || 0) + 1 } });
    saveRound("r0", data); drawQuiz();
    const missing = Object.values(b).filter(v => !v).length;
    if (!consent.checked) status.textContent = "Please tick the consent box to take part.";
    else if (missing) status.textContent = "Please answer all four questions about you.";
    else if (!read.checked) status.textContent = "Please read the guidelines and tick the box.";
    else if (!data.quiz.passed) status.textContent = `${score} of ${D.quiz.length} correct. Read the notes and try again.`;
    else { toast("Onboarding complete."); go("#/home"); }
  }
  setMain(h("h1", {}, "Onboarding"), h("p", { class: "lead" }, "About 20 minutes. You do this once."),
    h("div", { class: "card" }, h("h2", {}, "Consent"),
      h("p", { style: "margin-top:0" }, "KINSHIFT is a research benchmark of family words in Pakistani languages. Your answers will be published as part of the dataset under your handle, never your name. " +
        "Your background answers are reported only in summary. The page records time spent and pasted text, to check quality. You can stop at any time."),
      h("label", { class: "check" }, consent, "I agree to take part on these terms.")),
    h("div", { class: "card" }, h("h2", {}, "About you"), h("div", { class: "grid2" }, ...fields)),
    h("div", { class: "card" }, h("h2", {}, "Guidelines"),
      h("p", { style: "margin-top:0" }, h("a", { href: "guidelines.html", target: "_blank" }, "Open the guidelines"), " and read them fully (about 10 minutes)."),
      h("label", { class: "check" }, read, "I have read the guidelines.")),
    h("div", { class: "card" }, h("h2", {}, "Quick check"), h("p", { class: "muted", style: "margin:0" }, "Five questions to make sure the task is clear. You can retry."), quizBox,
      h("div", { style: "margin-top:16px" }, h("button", { class: "primary", onclick: save }, "Save and check")), status));
}

// ---------- R1: kinship words ----------
const WORD = { F: "father", M: "mother", B: "brother", Z: "sister", S: "son", D: "daughter", H: "husband", W: "wife" };
const AGE = { e: "elder ", y: "younger " };
const LATIN = /[A-Za-z]/, ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

function r1Done(r, rel) {
  if (!r || !r.confidence) return false;
  if (r.same_word_as) return true;
  if (r.no_single_word) return !!r.phrase_native;
  if (!(r.reference_native && r.reference_roman)) return false;
  if (rel && rel.tier === "far") return true;
  return r.address_same === "yes" || (r.address_same === "no" && !!r.address_native);
}
function groups() {
  const out = [];
  for (const r of D.relations) {
    let g = out.find(x => x.group === r.group);
    if (!g) out.push(g = { group: r.group, tier: r.tier, items: [] });
    g.items.push(r);
  }
  return out;
}
function speakerNote(r) {
  if (r.ego_sex === "f") return "The speaker is a married woman.";
  if (r.ego_sex === "m") return "The speaker is a married man.";
  return null;
}
function treeSVG(steps) {
  const NS = "http://www.w3.org/2000/svg";
  const s = (tag, attrs, text) => { const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); if (text) el.textContent = text; return el; };
  const nodes = [{ label: "you", gen: 0, sex: null }];
  let gen = 0;
  for (const st of steps) {
    gen += "FM".includes(st.rel) ? 1 : "SD".includes(st.rel) ? -1 : 0;
    nodes.push({ label: (AGE[st.age] || "") + WORD[st.rel], gen, sex: "FBSH".includes(st.rel) ? "m" : "f", rel: st.rel });
  }
  const maxG = Math.max(...nodes.map(n => n.gen)), minG = Math.min(...nodes.map(n => n.gen));
  const avail = Math.min(620, (document.querySelector("main")?.clientWidth || 620) - 40);
  const W = Math.max(70, Math.min(128, Math.floor(avail / nodes.length))), Hh = 64, pad = 24;
  const stagger = W < 100;
  const width = nodes.length * W, height = (maxG - minG) * Hh + 2 * pad + 26 + (stagger ? 20 : 0);
  const svg = s("svg", { viewBox: `0 0 ${width} ${height}`, class: "tree", role: "img",
                         "aria-label": "you, then " + nodes.slice(1).map(n => n.label).join(", then "),
                         style: `max-width:${width}px` });
  const pos = nodes.map((n, i) => ({ x: i * W + W / 2, y: pad + (stagger ? 20 : 0) + (maxG - n.gen) * Hh }));
  for (let i = 1; i < nodes.length; i++) {
    const a = pos[i - 1], b = pos[i];
    svg.append(s("path", { d: `M${a.x},${a.y} L${b.x},${b.y}`, class: "edge" + ("HW".includes(nodes[i].rel) ? " spouse" : "") }));
  }
  nodes.forEach((n, i) => {
    const { x, y } = pos[i], last = i === nodes.length - 1;
    const cls = i === 0 ? "node ego" : "node" + (last ? " target" : "");
    if (n.sex === "m") svg.append(s("rect", { x: x - 12, y: y - 12, width: 24, height: 24, rx: 4, class: cls }));
    else if (n.sex === "f") svg.append(s("circle", { cx: x, cy: y, r: 13, class: cls }));
    else svg.append(s("polygon", { points: `${x},${y - 13} ${x + 13},${y} ${x},${y + 13} ${x - 13},${y}`, class: cls }));
    const below = !stagger || i % 2 === 0;
    svg.append(s("text", { x, y: below ? y + 30 : y - 20, "text-anchor": "middle", "font-weight": last ? "700" : "500" }, n.label));
  });
  return svg;
}

function renderR1List() {
  if (!r0Done()) return go("#/r0");
  const rows = loadRound("r1").rows;
  const list = groups().map((g, i) => {
    const n = g.items.filter(r => r1Done(rows[r.id], r)).length;
    const first = Math.max(0, g.items.findIndex(r => !r1Done(rows[r.id], r)));
    return h("a", { class: "list-row" + (n === g.items.length ? " done" : ""), href: `#/r1/${encodeURIComponent(g.group)}/${n === g.items.length ? 0 : first}` },
      h("div", {}, h("div", { class: "title" }, `${i + 1}. ${g.group}`), g.tier === "far" ? h("div", { class: "sub" }, "distant relatives") : null),
      h("div", { class: "bar", style: "width:120px" }, h("i", { style: `width:${(100 * n / g.items.length).toFixed(0)}%` })),
      h("span", { class: "tag" + (n === g.items.length ? " good" : "") }, `${n}/${g.items.length}`));
  });
  const total = progressOf("r1", D.relations, r1Done);
  setMain(h("h1", {}, "Kinship words"),
    h("p", { class: "lead" }, `${total} of ${D.relations.length} relatives done. Go in order; you can stop and come back any time.`),
    h("div", { class: "card" }, h("div", { class: "rows" }, ...list)),
    h("div", { class: "alt" }, h("a", { class: "btn ghost", href: "#/home" }, "← Home"), h("button", { onclick: exportAll }, "Export my work")));
}

function focusChrome({ back, name, pos, total, done }) {
  setFocusbar(
    h("div", { class: "left" }, h("a", { class: "btn ghost", href: back, title: "Back" }, "←"), h("span", { class: "name" }, name),
      h("span", { class: "sep" }, "·"), h("span", { class: "muted" }, `${pos} of ${total}`)),
    h("div", { class: "right" }, h("div", { class: "bar", style: "width:160px" }, h("i", { style: `width:${(100 * done / total).toFixed(0)}%` })),
      h("button", { class: "primary small", onclick: exportAll }, "Export")));
}
function footer(prevHref, nextHref, nextLabel) {
  return h("div", { class: "focusfoot" },
    prevHref ? h("a", { class: "btn ghost", href: prevHref }, "← Previous") : h("span"),
    h("span", { class: "kbd-hint" }, h("kbd", {}, "Ctrl"), " + ", h("kbd", {}, "Enter"), " next"),
    h("a", { class: "btn primary", href: nextHref, id: "next" }, nextLabel || "Next →"));
}
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { const n = $("#next"); if (n) { e.preventDefault(); n.click(); } }
});
function startTimer(round, data, key) {
  const t0 = Date.now();
  leaving = () => { const row = data.rows[key]; if (!row || !row.last_edit) return;
    row.active_ms = (row.active_ms || 0) + Math.min(Date.now() - t0, 600000); saveRow(round, key, row); };
}

function renderR1Item(group, i) {
  if (!r0Done()) return go("#/r0");
  const all = groups(), gi = all.findIndex(g => g.group === group);
  if (gi < 0) return go("#/r1");
  const g = all[gi]; i = Math.min(Math.max(i, 0), g.items.length - 1);
  const r = g.items[i], data = loadRound("r1");
  const row = data.rows[r.id] || (data.rows[r.id] = {});
  startTimer("r1", data, r.id);
  const href = (gg, ii) => `#/r1/${encodeURIComponent(gg.group)}/${ii}`;
  const prev = i > 0 ? href(g, i - 1) : gi > 0 ? href(all[gi - 1], all[gi - 1].items.length - 1) : null;
  const next = i < g.items.length - 1 ? href(g, i + 1) : gi < all.length - 1 ? href(all[gi + 1], 0) : "#/r1";
  const doneInGroup = () => g.items.filter(x => r1Done(data.rows[x.id], x)).length;
  const chrome = () => focusChrome({ back: "#/r1", name: g.group, pos: i + 1, total: g.items.length, done: doneInGroup() });
  const touch = () => {
    const now = new Date().toISOString(); row.first_edit = row.first_edit || now; row.last_edit = now;
    saveRow("r1", r.id, row); data.rows = loadRound("r1").rows; data.rows[r.id] = row; dots.replaceChildren(...dotLinks()); chrome();
  };
  chrome();

  function box(key, kind, placeholder) {
    const el = h(kind === "area" ? "textarea" : "input", { type: "text", placeholder: placeholder || "",
      class: kind === "native" ? "native" : "", dir: kind === "native" ? "rtl" : "ltr", lang: kind === "native" ? S.language : null });
    el.value = row[key] || "";
    const warn = h("div", { class: "warn" });
    const check = () => {
      warn.textContent = kind === "native" && LATIN.test(el.value) ? "Use your language's own script here; Roman spelling goes in the Roman box."
        : kind === "roman" && ARABIC.test(el.value) ? "Roman letters only in this box." : "";
    };
    el.addEventListener("input", () => { row[key] = el.value; check(); touch(); });
    if (kind === "native") {
      el.addEventListener("focus", () => showPalette(el));
      el.addEventListener("blur", () => setTimeout(() => {
        if (!document.activeElement || !document.activeElement.classList.contains("native")) $("#palette").classList.add("hidden");
      }, 150));
    }
    check();
    return h("div", {}, el, warn);
  }
  const pair = (nk, rk) => h("div", { class: "grid2" },
    h("div", {}, h("label", { class: "lbl" }, "In your script"), box(nk, "native")),
    h("div", {}, h("label", { class: "lbl" }, "In Roman letters"), box(rk, "roman", "as you would type it on WhatsApp")));

  const far = r.tier === "far";
  const body = h("div");
  function draw() {
    const m = row.mode || (row.same_word_as ? "same" : row.no_single_word ? "phrase" : "word");
    const parts = [h("div", { class: "alt" },
      ...[["word", "It has its own word"], ["same", "Same word as another relative"], ["phrase", "No single word"]].map(([v, label]) =>
        h("button", { type: "button", class: "small" + (m === v ? " on" : ""), onclick: () => {
          row.mode = v; if (v !== "same") row.same_word_as = ""; row.no_single_word = v === "phrase"; touch(); draw();
        } }, label)))];
    if (m === "word") {
      parts.push(h("div", { class: "q" }, h("h3", {}, "What do you call this relative when talking ABOUT them?"), pair("reference_native", "reference_roman")));
      if (!far) parts.push(h("div", { class: "q" }, h("h3", {}, "Do you use the same word when talking TO them?"),
        seg([["yes", "Yes"], ["no", "No, a different word"]], row.address_same, v => { row.address_same = v; touch(); draw(); }),
        row.address_same === "no" ? h("div", { style: "margin-top:12px" }, pair("address_native", "address_roman")) : null));
    } else if (m === "same") {
      const sel = h("select", {}, h("option", { value: "" }, "choose the relative with the same word"),
        ...D.relations.filter(x => x.id !== r.id).map(x => h("option", { value: x.id }, x.path_en)));
      sel.value = row.same_word_as || "";
      sel.addEventListener("change", () => { row.same_word_as = sel.value; touch(); });
      parts.push(h("div", { class: "q" }, h("h3", {}, "Which relative has the same word?"),
        h("p", { class: "hint" }, "Pick a relative you have already given the word for."), sel));
    } else {
      parts.push(h("div", { class: "q" }, h("h3", {}, "What phrase do people use instead?"), pair("phrase_native", "phrase_roman")));
    }
    parts.push(h("div", { class: "q" }, h("h3", {}, "How sure are you?"),
      seg([["sure", "Sure"], ["not sure", "Not sure", "warnish"]], row.confidence, v => { row.confidence = v; touch(); draw(); })));
    const female = h("input", { type: "checkbox" }); female.checked = !!row.female_differs;
    const femBox = h("div", { class: row.female_differs ? "" : "hidden" }, pair("female_native", "female_roman"));
    female.addEventListener("change", () => { row.female_differs = female.checked; femBox.classList.toggle("hidden", !female.checked); touch(); });
    parts.push(h("details", { class: "more", open: !!(row.roman_variants || row.female_differs || row.notes) },
      h("summary", {}, "More (optional)"),
      h("label", { class: "lbl" }, "Other common Roman spellings, separated by commas"), box("roman_variants", "roman"),
      r.ego_sex === "m/f" ? h("label", { class: "check" }, female, "A woman would use a different word") : null, femBox,
      h("label", { class: "lbl", style: "margin-top:10px" }, "Notes: other regions, formal words, anything unclear"), box("notes", "area")));
    body.replaceChildren(...parts.filter(Boolean));
  }
  draw();
  const dotLinks = () => g.items.map((x, j) => h("a", { href: href(g, j), title: x.path_en,
    class: (r1Done(data.rows[x.id], x) ? "done" : "") + (j === i ? " cur" : "") }));
  const dots = h("div", { class: "dots" }, ...dotLinks());
  const note = speakerNote(r);
  const card = h("div", { class: "card item" },
    h("div", { class: "item-top" }, h("span", { class: "tag accent" }, g.group), far ? h("span", { class: "tag" }, "distant relative") : null),
    h("div", { class: "item-title" }, r.path_en), note ? h("div", { class: "speaker" }, note) : null,
    treeSVG(r.steps), body);
  card.addEventListener("paste", () => { row.pastes = (row.pastes || 0) + 1; touch(); });
  setMain(card, footer(prev, next, next === "#/r1" ? "Finish ✓" : "Next →"), dots);
}

// ---------- R1b and R2: batch rounds ----------
const BATCH_DONE = {
  r1b: (d) => !!(d && d.choice && (d.choice === "both" || (d.choice === "neither" ? d.native : d.other))),
  r2: (d) => !!(d && d.natural && d.correct && (d.natural === "yes" || d.fixed) && (d.correct === "yes" || d.right_answer)),
};
async function renderBatchRound(round, i) {
  if (!r0Done()) return go("#/r0");
  const items = await loadBatch(round);
  if (!items || !items.length) { toast("This round is not ready yet."); return go("#/home"); }
  i = Math.min(Math.max(i, 0), items.length - 1);
  const it = items[i], data = loadRound(round), title = D.rounds.find(r => r.id === round).title;
  const row = data.rows[it.id] || (data.rows[it.id] = {});
  startTimer(round, data, it.id);
  const done = () => items.filter(x => BATCH_DONE[round](data.rows[x.id])).length;
  const chrome = () => focusChrome({ back: "#/home", name: title, pos: i + 1, total: items.length, done: done() });
  const dotLinks = () => items.map((x, j) => h("a", { href: `#/${round}/${j}`,
    class: (BATCH_DONE[round](data.rows[x.id]) ? "done" : "") + (j === i ? " cur" : "") }));
  const dots = h("div", { class: "dots" }, ...dotLinks());
  const touch = () => { const now = new Date().toISOString(); row.first_edit = row.first_edit || now; row.last_edit = now;
                        saveRow(round, it.id, row); data.rows = loadRound(round).rows; data.rows[it.id] = row;
                        chrome(); dots.replaceChildren(...dotLinks()); };
  chrome();
  const body = h("div");
  const draw = () => body.replaceChildren(...(round === "r1b" ? adjudicateParts(it, row, touch, draw) : reviewParts(it, row, touch, draw)).filter(Boolean));
  draw();
  const card = h("div", { class: "card item" }, body);
  card.addEventListener("paste", () => { row.pastes = (row.pastes || 0) + 1; touch(); });
  const prev = i > 0 ? `#/${round}/${i - 1}` : null, next = i < items.length - 1 ? `#/${round}/${i + 1}` : "#/home";
  setMain(card, footer(prev, next, next === "#/home" ? "Finish ✓" : "Next →"), dots);
}
function textBox(row, key, kind, touch) {
  const el = h(kind === "area" ? "textarea" : "input", { type: "text", class: kind === "native" ? "native" : "", dir: kind === "native" ? "rtl" : "ltr" });
  el.value = row[key] || "";
  el.addEventListener("input", () => { row[key] = el.value; touch(); });
  if (kind === "native") {
    el.addEventListener("focus", () => showPalette(el));
    el.addEventListener("blur", () => setTimeout(() => {
      if (!document.activeElement || !document.activeElement.classList.contains("native")) $("#palette").classList.add("hidden");
    }, 150));
  }
  return el;
}
function answerBox(label, a) {
  const word = a.no_single_word ? a.phrase_native : a.reference_native;
  const roman = a.no_single_word ? a.phrase_roman : a.reference_roman;
  return h("div", { class: "answer" }, h("div", { class: "who" }, label),
    h("div", { class: "big" }, word || "—"), h("div", { class: "muted" }, roman || ""),
    a.address_same === "no" ? h("div", { style: "margin-top:6px" }, "To their face: ", h("b", {}, a.address_native || "—"), ` ${a.address_roman || ""}`) : null,
    a.no_single_word ? h("div", { class: "muted" }, "(no single word; this is a phrase)") : null,
    a.confidence === "not sure" ? h("span", { class: "tag warn" }, "not sure") : null,
    a.notes ? h("div", { class: "muted", style: "margin-top:6px" }, `Note: ${a.notes}`) : null);
}
function adjudicateParts(it, row, touch, draw) {
  const rel = D.relations.find(x => x.id === it.id);
  const parts = [h("div", { class: "item-top" }, h("span", { class: "tag accent" }, rel ? rel.group : ""),
                   h("span", { class: "tag warn" }, it.on.includes("word") ? "different words" : "different word to their face")),
    h("div", { class: "item-title" }, it.path_en), rel && speakerNote(rel) ? h("div", { class: "speaker" }, speakerNote(rel)) : null,
    rel ? treeSVG(rel.steps) : null,
    h("div", { class: "answers" }, answerBox("Answer A", it.a_resolved || it.a), answerBox("Answer B", it.b_resolved || it.b)),
    h("div", { class: "q" }, h("h3", {}, "Which is right in your language?"),
      seg([["A", "A"], ["B", "B"], ["both", "Both are fine"], ["neither", "Neither"]], row.choice, v => { row.choice = v; touch(); draw(); }))];
  if (row.choice === "A" || row.choice === "B")
    parts.push(h("div", { class: "q" }, h("h3", {}, `And answer ${row.choice === "A" ? "B" : "A"} is…`),
      seg([["wrong", "Wrong"], ["region", "Used in another region or community"]], row.other, v => { row.other = v; touch(); draw(); })));
  if (row.choice === "neither")
    parts.push(h("div", { class: "q" }, h("h3", {}, "What is the right word?"), h("div", { class: "grid2" },
      h("div", {}, h("label", { class: "lbl" }, "In your script"), textBox(row, "native", "native", touch)),
      h("div", {}, h("label", { class: "lbl" }, "In Roman letters"), textBox(row, "roman", "roman", touch)))));
  parts.push(h("div", { class: "q" }, h("label", { class: "lbl" }, "Notes (optional)"), textBox(row, "notes", "area", touch)));
  return parts;
}
function reviewParts(it, row, touch, draw) {
  const native = it.script !== "roman";
  return [h("div", { class: "item-top" }, h("span", { class: "tag accent" }, it.kind || "question"), h("span", { class: "tag" }, native ? "own script" : "Roman")),
    h("div", { class: `question${native ? "" : " ltr"}` }, it.question),
    it.options ? h("div", { class: "muted" }, "Options: ", it.options.join(" · ")) : null,
    h("div", { style: "margin-top:6px" }, "Answer given: ", h("b", {}, it.answer)),
    h("div", { class: "q" }, h("h3", {}, "Does the question read naturally?"),
      seg([["yes", "Yes"], ["no", "No, it needs fixing", "warnish"]], row.natural, v => { row.natural = v; touch(); draw(); }),
      row.natural === "no" ? h("div", { style: "margin-top:10px" }, h("label", { class: "lbl" }, "Write it the way a speaker would"), textBox(row, "fixed", native ? "native" : "area", touch)) : null),
    h("div", { class: "q" }, h("h3", {}, "Is the answer right?"),
      seg([["yes", "Yes"], ["no", "No", "warnish"]], row.correct, v => { row.correct = v; touch(); draw(); }),
      row.correct === "no" ? h("div", { style: "margin-top:10px" }, h("label", { class: "lbl" }, "The right answer"), textBox(row, "right_answer", native ? "native" : "roman", touch)) : null),
    h("div", { class: "q" }, h("label", { class: "lbl" }, "Notes (optional)"), textBox(row, "notes", "area", touch))];
}

// ---------- letter palette ----------
let paletteTarget = null;
function showPalette(target) {
  paletteTarget = target;
  const pal = $("#palette");
  pal.replaceChildren(h("div", { class: "lbl" }, "Letters your keyboard may lack"),
    ...lang().palette.split(" ").map(ch => h("button", { type: "button", onmousedown: e => e.preventDefault(),
      onclick: () => {
        const el = paletteTarget; if (!el) return;
        const a = el.selectionStart ?? el.value.length, b = el.selectionEnd ?? el.value.length;
        el.setRangeText(ch, a, b, "end"); el.dispatchEvent(new Event("input")); el.focus();
      } }, ch)));
  pal.classList.remove("hidden");
  const r = target.getBoundingClientRect(), top = pal.getBoundingClientRect().top;
  if (r.bottom > top - 12) window.scrollBy({ top: r.bottom - top + 40, behavior: "smooth" });
}

// ---------- start ----------
(async function start() {
  try {
    const [assignments, languages, rounds, quiz, relations] = await Promise.all(
      ["data/assignments.json", "data/languages.json", "data/rounds.json", "data/r0/quiz.json", "data/r1/relations.json"].map(p => getJSON(p)));
    Object.assign(D, { assignments, languages, rounds, quiz, relations });
    route();
  } catch (e) {
    setMain(h("p", { class: "bad" }, "The page could not load. Refresh, and tell the team if it keeps happening."), h("pre", {}, String(e)));
  }
})();
