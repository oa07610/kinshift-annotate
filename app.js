"use strict";
// KINSHIFT annotator dashboard. Static page; everything stays in this browser
// until the annotator exports a file and sends it to the team.

const APP_VERSION = "0.5.1";
const SCHEMA = "kinshift-annotation/1";
const D = {};            // loaded data files
const BATCH = {};        // decrypted batches per round, or null when not ready
let S = null;            // session: {handle, name, language, role} or {admin: true}
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
async function getJSON(path) {
  const r = await fetch(`${path}?v=${APP_VERSION}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}
// The backend (Google Apps Script, or the local mock). GET for reads, POST as text/plain
// for writes, so the browser sends no CORS preflight.
async function api(action, params = {}, write = false) {
  if (!D.config.endpoint) throw new Error("The dashboard is not connected to a server yet.");
  const url = new URL(D.config.endpoint);
  let r;
  if (write) r = await fetch(url, { method: "POST", body: JSON.stringify({ action, ...params }) });
  else { url.search = new URLSearchParams({ action, ...params }); r = await fetch(url); }
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || "server error");
  return j;
}
let toastTimer = null;
function toast(msg, bad) {
  const t = $("#toast"); t.textContent = msg; t.className = bad ? "bad" : "";
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add("hidden"), 4000);
}
const seg = (options, value, onPick) => h("div", { class: "seg" }, ...options.map(([v, label, cls]) =>
  h("button", { type: "button", class: (value === v ? "on " : "") + (cls || ""), onclick: () => onPick(v) }, label)));
const r1Done = (r, rel) => Logic.r1Done(r, rel, D.config.ask_address);

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
function saveRow(round, id, row, timeOnly) {
  const cur = loadRound(round); cur.rows[id] = row;
  if (timeOnly) writeKey(K(round), cur);   // time spent alone does not count as unsubmitted work
  else saveRound(round, cur);
}

// ---------- session ----------
function loadSession() { return readKey("kinshift:session", null); }
function signOut() {
  if (leaving) { leaving(); leaving = null; }   // bank time on the open item while we still know who is signed in
  try { localStorage.removeItem("kinshift:session"); localStorage.removeItem("kinshift:adminKey"); } catch {}
  S = null; for (const k of Object.keys(BATCH)) delete BATCH[k]; go("#/login");
}

// ---------- export / import ----------
function roundIds() { return D.rounds.map(r => r.id); }
function buildPayload() {
  const rounds = {};
  for (const id of roundIds()) { const r = readKey(K(id), null); if (r) rounds[id] = r; }
  return { schema: SCHEMA, app_version: APP_VERSION, handle: S.handle, language: S.language,
           role: S.role, exported_at: new Date().toISOString(), rounds };
}
let submitting = null;
// Send everything to the team's server. Quiet = automatic, no toast on success.
async function submitAll(quiet) {
  if (!S || S.admin) return;
  if (submitting) return submitting;
  const payload = buildPayload();
  submitting = api("submit", { handle: S.handle, payload }, true).then(() => {
    writeKey(`kinshift:${S.handle}:lastSubmit`, payload.exported_at);
    writeKey(`kinshift:${S.handle}:submitError`, "");
    if (!quiet) toast("Submitted. Your work is saved with the KINSHIFT team.");
  }).catch(err => {
    writeKey(`kinshift:${S.handle}:submitError`, String(err.message || err));
    if (!quiet) toast("Could not reach the server. Your work is safe in this browser; try again later.", true);
  }).finally(() => { submitting = null; updateBanner(); });
  return submitting;
}
function downloadCopy() {
  const payload = buildPayload();
  const blob = new Blob([JSON.stringify(payload, null, 1)], { type: "application/json" });
  const a = h("a", { href: URL.createObjectURL(blob), download: `kinshift_${S.handle}_${payload.exported_at.slice(0, 16).replace(/[-:T]/g, "")}.json` });
  document.body.append(a); a.click(); a.remove();
}
// Merge another copy of this person's work into the browser: newest row wins.
function mergeIn(p) {
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
  return restored;
}
async function importFile(file) {
  let p;
  try { p = JSON.parse(await file.text()); } catch { return toast("That file is not a KINSHIFT file.", true); }
  if (p.schema !== SCHEMA) return toast("That file is not a KINSHIFT file.", true);
  if (p.handle !== S.handle) return toast(`That file belongs to ${p.handle}, not you.`, true);
  toast(`Restored ${mergeIn(p)} answers from your file.`);
  route();
}
setInterval(() => { if (S && !S.admin && unsubmitted()) submitAll(true); }, 180000);

// ---------- banner ----------
function unsubmitted() {
  const last = readKey(`kinshift:${S.handle}:lastSubmit`, "");
  const newest = roundIds().map(id => loadRound(id).updated || "").sort().pop() || "";
  return newest && newest > last;
}
function updateBanner() {
  const b = $("#banner");
  if (!S || S.admin) return b.classList.add("hidden");
  if (unsubmitted()) {
    const failed = readKey(`kinshift:${S.handle}:submitError`, "");
    const narrow = innerWidth < 680;
    const msg = failed ? (narrow ? "Not saved to the server yet." : "Could not reach the server yet. Your work is safe in this browser.")
                       : (narrow ? "Not submitted yet." : "You have answers that are not submitted yet. They are sent automatically every few minutes.");
    b.replaceChildren(h("span", {}, msg), h("button", { class: "small primary", onclick: () => submitAll(false) }, "Submit now"));
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
  const [page, a, b] = (location.hash || "#/home").slice(2).split("/").map(decodeURIComponent);
  if (page === "admin") return renderAdmin(a || "accounts");
  if (S && S.admin) return go("#/admin");
  if (!S) return renderLogin();
  document.body.className = `font-${lang().font}`;
  updateBanner();
  if (page === "r0") return renderR0();
  if (page === "r1") return a ? renderR1Item(a, +(b || 0)) : renderR1List();
  if (page === "r1b" || page === "r2") return renderBatchRound(page, +(a || 0));
  return renderHome();
}
function renderWho() {
  const w = $("#who");
  if (!S) return w.replaceChildren();
  w.replaceChildren(h("span", {}, S.admin ? "Admin" : `${S.name} · ${D.languages[S.language].name}`),
                    h("button", { class: "ghost small", onclick: signOut }, "Sign out"));
}

// ---------- login ----------
function renderLogin() {
  document.body.className = "";
  const name = h("input", { type: "text", id: "name", autocomplete: "name", placeholder: "your full name" });
  const msg = h("p", { class: "bad" });
  const btn = h("button", { class: "primary", type: "submit" }, "Sign in");
  async function submit(e) {
    e.preventDefault();
    if (!name.value.trim()) return;
    btn.disabled = true; btn.textContent = "Signing in…"; msg.textContent = "";
    const slow = setTimeout(() => { if (btn.disabled) msg.textContent = "Still connecting to the server, a moment more…"; msg.className = "muted"; }, 2500);
    try {
      const reply = await api("login", { name: name.value });
      S = reply.account; writeKey("kinshift:session", S);
      if (reply.batches) for (const [r, items] of Object.entries(reply.batches)) rememberBatch(r, items || null);
      try {   // bring back work saved on the server (new device or cleared browser)
        const payload = "payload" in reply ? reply.payload : (await api("latest", { handle: S.handle })).payload;
        if (payload) {
          const n = mergeIn(payload);
          writeKey(`kinshift:${S.handle}:lastSubmit`, new Date().toISOString());   // what came from the server is already saved there
          if (n) toast(`Welcome back. Restored ${n} saved answers.`);
        }
      } catch {}
      go("#/home");
    } catch (err) {
      msg.textContent = /not found/.test(err.message) ? "We could not find that name. Type it exactly as the team sent it to you." : err.message;
    } finally { clearTimeout(slow); msg.className = msg.textContent.startsWith("Still") ? "muted" : "bad";
                if (msg.textContent.startsWith("Still")) msg.textContent = ""; btn.disabled = false; btn.textContent = "Sign in"; }
  }
  setMain(h("div", { class: "login" },
    h("div", { class: "card" }, h("h2", {}, "Sign in"),
      h("form", { onsubmit: submit },
        h("label", { class: "lbl", for: "name" }, "Your name"), name,
        h("div", { style: "margin-top:16px" }, btn), msg)),
    h("p", { class: "muted", style: "font-size:13px" },
      "Type your name exactly as the KINSHIFT team sent it to you. Your answers are saved in this browser and sent to the team automatically."),
    h("p", { style: "font-size:13px" }, h("a", { href: "#/admin" }, "Team admin"))));
}

// ---------- home ----------
function r0Done() { const r = loadRound("r0"); return !!(r.consent && r.background && r.quiz && r.quiz.passed); }
// Review batches change rarely: show the last known copy at once, refresh in the background.
function rememberBatch(round, items) { BATCH[round] = items; writeKey(`kinshift:${S.handle}:batch:${round}`, items); }
function knownBatch(round) { return round in BATCH ? BATCH[round] : readKey(`kinshift:${S.handle}:batch:${round}`, undefined); }
async function loadBatch(round) {
  if (round in BATCH) return BATCH[round];
  try { rememberBatch(round, (await api("batch", { handle: S.handle, round })).items || null); }
  catch { return knownBatch(round) ?? null; }   // offline: use what we had
  return BATCH[round];
}
let refreshing = false;
function refreshBatches(rounds) {
  if (refreshing) return;
  refreshing = true;
  Promise.all(rounds.map(r => api("batch", { handle: S.handle, round: r }).then(j => [r, j.items || null]).catch(() => null)))
    .then(res => {
      let changed = false;
      for (const x of res.filter(Boolean)) {
        const before = knownBatch(x[0]);
        if (before === undefined || JSON.stringify(before) !== JSON.stringify(x[1])) changed = true;
        rememberBatch(x[0], x[1]);
      }
      refreshing = false;
      if (changed && (location.hash || "#/home").startsWith("#/home")) renderHome();
    });
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
      const items = knownBatch(r.id);
      if (items === undefined) { locked = true; right = h("span", { class: "tag" }, "checking…"); }
      else if (!items) { locked = true; right = h("span", { class: "tag" }, "not ready yet"); }
      else { const n = progressOf(r.id, items, BATCH_DONE[r.id]); done = n === items.length;
             right = h("span", { class: "tag " + (done ? "good" : "") }, `${n} / ${items.length}`); href = `#/${r.id}/0`; }
    }
    rowsEl.append(h(href && !locked ? "a" : "div", { class: `list-row${done ? " done" : ""}${locked ? " locked" : ""}`, href: locked ? null : href },
      h("div", {}, h("div", { class: "title" }, r.title), h("div", { class: "sub" }, r.about)), right, h("span")));
  }
  const fileIn = h("input", { type: "file", accept: "application/json", class: "hidden",
                              onchange: e => e.target.files[0] && importFile(e.target.files[0]) });
  const batchRounds = mine.filter(r => r.batch).map(r => r.id).filter(id => !(id in BATCH));
  if (batchRounds.length && r0Done()) refreshBatches(batchRounds);
  setMain(h("h1", {}, `Welcome, ${S.name}`),
    h("p", { class: "lead" }, `${lang().name} · ${S.role === "adjudicator" ? "reviewer" : "annotator"}. Work through the rounds in order; your answers save automatically.`),
    h("div", { class: "card" }, h("h2", {}, "Your rounds"), rowsEl),
    h("div", { class: "card" }, h("h2", {}, "Saving"),
      h("p", { class: "muted", style: "margin-top:0" }, "Your answers are sent to the team automatically after each batch and every few minutes. You can also submit now. Signing in on another device brings your saved work back."),
      h("div", { class: "alt" }, h("button", { class: "primary", onclick: () => submitAll(false) }, "Submit now"),
        h("button", { class: "ghost", onclick: downloadCopy }, "Download a copy"),
        h("button", { class: "ghost", onclick: () => fileIn.click() }, "Restore from a file"), fileIn)));
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
    h("div", { class: "alt" }, h("a", { class: "btn ghost", href: "#/home" }, "← Home"), h("button", { onclick: () => submitAll(false) }, "Submit now")));
}

function focusChrome({ back, name, pos, total, done }) {
  setFocusbar(
    h("div", { class: "left" }, h("a", { class: "btn ghost", href: back, title: "Back" }, "←"), h("span", { class: "name" }, name),
      h("span", { class: "sep" }, "·"), h("span", { class: "muted" }, `${pos} of ${total}`)),
    h("div", { class: "right" }, h("div", { class: "bar", style: "width:160px" }, h("i", { style: `width:${(100 * done / total).toFixed(0)}%` })),
      h("button", { class: "primary small", onclick: () => submitAll(false) }, "Submit")));
}
function footer(prevHref, nextHref, nextLabel, submitOnNext) {
  return h("div", { class: "focusfoot" },
    prevHref ? h("a", { class: "btn ghost", href: prevHref }, "← Previous") : h("span"),
    h("span", { class: "kbd-hint" }, h("kbd", {}, "Ctrl"), " + ", h("kbd", {}, "Enter"), " next"),
    h("a", { class: "btn primary", href: nextHref, id: "next", onclick: () => { if (submitOnNext) submitAll(true); } }, nextLabel || "Next →"));
}
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { const n = $("#next"); if (n) { e.preventDefault(); n.click(); } }
});
function startTimer(round, data, key) {
  const t0 = Date.now();
  leaving = () => { const row = data.rows[key]; if (!S || !row || !row.last_edit) return;
    row.active_ms = (row.active_ms || 0) + Math.min(Date.now() - t0, 600000); saveRow(round, key, row, true); };
}

// One editable box bound to obj[field]; native boxes get the letter palette and a script check.
function boundBox(obj, field, kind, placeholder, touch) {
  const el = h("input", { type: "text", placeholder: placeholder || "", class: kind === "native" ? "native" : "",
                          dir: kind === "native" ? "rtl" : "ltr", lang: kind === "native" ? S.language : null });
  el.value = obj[field] || "";
  const warn = h("div", { class: "warn" });
  const check = () => {
    warn.textContent = kind === "native" && LATIN.test(el.value) ? "Use your language's own script here; Roman spelling goes in the next box."
      : kind === "roman" && ARABIC.test(el.value) ? "Roman letters only in this box." : "";
  };
  el.addEventListener("input", () => { obj[field] = el.value; check(); touch(); });
  if (kind === "native") {
    el.addEventListener("focus", () => showPalette(el));
    el.addEventListener("blur", () => setTimeout(() => {
      if (!document.activeElement || !document.activeElement.classList.contains("native")) $("#palette").classList.add("hidden");
    }, 150));
  }
  check();
  if (obj._focus) { delete obj._focus; setTimeout(() => el.focus(), 0); }
  return h("div", {}, el, warn);
}
// A list of words, most common first: [native][Roman] per row, add, remove, make main.
function wordList(list, { first, optional }, touch, redraw) {
  if (!list.length) list.push({ native: "", roman: "" });
  const rows = list.map((w, i) => h("div", { class: "word-row" + (i === 0 ? " main" : "") },
    h("div", { class: "word-tag" }, i === 0 ? first : "also"),
    boundBox(w, "native", "native", i === 0 && !optional ? "in your script" : "in your script (optional)", touch),
    boundBox(w, "roman", "roman", i === 0 && !optional ? "in Roman, as on WhatsApp" : "in Roman", touch),
    h("div", { class: "word-actions" },
      i > 0 ? h("button", { type: "button", class: "ghost small", title: "Make this the most common word",
        onclick: () => { list.unshift(...list.splice(i, 1)); touch(); redraw(); } }, "↑ most common") : null,
      list.length > 1 ? h("button", { type: "button", class: "ghost small", title: "Remove",
        onclick: () => { list.splice(i, 1); touch(); redraw(); } }, "✕") : null)));
  return h("div", { class: "words" }, ...rows,
    h("button", { type: "button", class: "ghost small add-word", onclick: () => { const w = { native: "", roman: "" }; list.push(w); touch(); w._focus = true; redraw(); } }, "+ another word"));
}

function renderR1Item(group, i) {
  if (!r0Done()) return go("#/r0");
  const all = groups(), gi = all.findIndex(g => g.group === group);
  if (gi < 0) return go("#/r1");
  const g = all[gi]; i = Math.min(Math.max(i, 0), g.items.length - 1);
  const r = g.items[i], data = loadRound("r1");
  const row = data.rows[r.id] = Logic.upgrade(data.rows[r.id]) || { words: [], call: [] };
  row.words = row.words || []; row.call = row.call || [];
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
  const body = h("div");
  const askCall = D.config.ask_address && r.elder;
  function draw() {
    const notes = h("textarea", { rows: 2, placeholder: "Optional: words used in other places, a formal word, if women say it differently, anything unclear" });
    notes.value = row.notes || "";
    notes.addEventListener("input", () => { row.notes = notes.value; touch(); });
    body.replaceChildren(...[
      h("div", { class: "q" }, h("h3", {}, "What do you call this relative?"),
        h("p", { class: "hint" }, "Give the most common word first. If people also use other words, add them."),
        wordList(row.words, { first: "most common" }, touch, draw)),
      askCall ? h("div", { class: "q" }, h("h3", {}, "Do you call them by a different word to their face?"),
        seg([["no", "No"], ["yes", "Yes, a different word"]], row.call_differs, v => { row.call_differs = v; if (v === "no") row.call = []; touch(); draw(); }),
        row.call_differs === "yes" ? h("div", { style: "margin-top:12px" }, wordList(row.call, { first: "to their face" }, touch, draw)) : null) : null,
      h("div", { class: "q" }, h("h3", {}, "How sure are you?"),
        seg([["sure", "Sure"], ["not sure", "Not sure", "warnish"]], row.confidence, v => { row.confidence = v; row.unsure = v === "not sure"; touch(); draw(); })),
      h("details", { class: "more", open: !!row.notes }, h("summary", {}, "Notes (optional)"), notes),
    ].filter(Boolean));
  }
  draw();
  const dotLinks = () => g.items.map((x, j) => h("a", { href: href(g, j), title: x.path_en,
    class: (r1Done(data.rows[x.id], x) ? "done" : "") + (j === i ? " cur" : "") }));
  const dots = h("div", { class: "dots" }, ...dotLinks());
  const note = speakerNote(r);
  const card = h("div", { class: "card item" },
    h("div", { class: "item-top" }, h("span", { class: "tag accent" }, g.group), r.tier === "far" ? h("span", { class: "tag" }, "distant relative") : null),
    h("div", { class: "item-title" }, r.path_en), note ? h("div", { class: "speaker" }, note) : null,
    treeSVG(r.steps), body);
  card.addEventListener("paste", () => { row.pastes = (row.pastes || 0) + 1; touch(); });
  const lastInGroup = i === g.items.length - 1;
  setMain(card, footer(prev, next, next === "#/r1" ? "Finish ✓" : lastInGroup ? "Next batch →" : "Next →", lastInGroup), dots);
}

// ---------- R1b and R2: batch rounds ----------
const BATCH_DONE = {
  r1b: (d, it) => reviewDone(it, d),
  r2: (d) => !!(d && d.natural && d.correct && (d.natural === "yes" || d.fixed) && (d.correct === "yes" || d.right_answer)),
};
async function renderBatchRound(round, i) {
  if (!r0Done()) return go("#/r0");
  const items = knownBatch(round) || await loadBatch(round);
  if (!items || !items.length) { toast("This round is not ready yet."); return go("#/home"); }
  i = Math.min(Math.max(i, 0), items.length - 1);
  const it = items[i], data = loadRound(round), title = D.rounds.find(r => r.id === round).title;
  const row = data.rows[it.id] || (data.rows[it.id] = {});
  startTimer(round, data, it.id);
  const done = () => items.filter(x => BATCH_DONE[round](data.rows[x.id], x)).length;
  const chrome = () => focusChrome({ back: "#/home", name: title, pos: i + 1, total: items.length, done: done() });
  const dotLinks = () => items.map((x, j) => h("a", { href: `#/${round}/${j}`,
    class: (BATCH_DONE[round](data.rows[x.id], x) ? "done" : "") + (j === i ? " cur" : "") }));
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
  setMain(card, footer(prev, next, next === "#/home" ? "Finish ✓" : "Next →", next === "#/home"), dots);
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
// Reviewer: rate every word the two annotators gave, and pick the most common one.
function reviewSection(title, frame, words, ratings, mainKey, row, touch, draw) {
  const rated = row[ratings] = row[ratings] || {};
  const extra = row[mainKey + "_extra"] = row[mainKey + "_extra"] || { native: "", roman: "" };
  const rows = words.map(w => h("div", { class: "rate-row" },
    h("div", { class: "rate-word" }, h("div", { class: "big" }, w.native || "—"), h("div", { class: "muted" }, w.roman || ""),
      h("div", { class: "who" }, w.count === 2 ? "both annotators" : "one annotator")),
    seg([["yes", "Used here"], ["region", "Other region"], ["no", "Wrong", "warnish"]], rated[w.id], v => {
      rated[w.id] = v; if (v !== "yes" && row[mainKey] === w.id) row[mainKey] = ""; touch(); draw(); }),
    h("label", { class: "check main-pick" + (rated[w.id] === "yes" ? "" : " off") },
      h("input", { type: "radio", name: mainKey, checked: row[mainKey] === w.id, disabled: rated[w.id] !== "yes",
        onchange: () => { row[mainKey] = w.id; touch(); draw(); } }), "most common")));
  return h("div", { class: "q" }, h("h3", {}, title), ...rows,
    h("details", { class: "more", open: !!(extra.native || extra.roman) }, h("summary", {}, "They both missed the right word"),
      h("div", { class: "grid2" }, boundBox(extra, "native", "native", "in your script", touch), boundBox(extra, "roman", "roman", "in Roman", touch)),
      h("label", { class: "check" }, h("input", { type: "radio", name: mainKey, checked: row[mainKey] === "extra",
        onchange: () => { row[mainKey] = "extra"; touch(); draw(); } }), "this is the most common word")));
}
function adjudicateParts(it, row, touch, draw) {
  const rel = D.relations.find(x => x.id === it.id) || { steps: [], referent_sex: "m", elder: false };
  const parts = [h("div", { class: "item-top" }, h("span", { class: "tag accent" }, rel.group || ""),
                   h("span", { class: "tag warn" }, it.on.includes("word") ? "different words" : "different words for calling them")),
    h("div", { class: "item-title" }, it.path_en), speakerNote(rel) ? h("div", { class: "speaker" }, speakerNote(rel)) : null,
    treeSVG(rel.steps)];
  const notes = [it.a && it.a.notes, it.b && it.b.notes].filter(Boolean);
  if (notes.length) parts.push(h("div", { class: "muted", style: "margin-top:8px" }, "Annotators' notes: ", notes.join(" · ")));
  if (!it.on.includes("word")) {
    const agreed = (Logic.upgrade(it.a).words || []).filter(Logic.filled)[0] || {};
    parts.push(h("div", { class: "q" }, h("h3", {}, "Both annotators gave this word"),
      h("div", { class: "rate-word" }, h("div", { class: "big" }, agreed.native || "—"), h("div", { class: "muted" }, agreed.roman || "")),
      h("p", { class: "hint", style: "margin-top:8px" }, "They differ only on what you call this relative to their face.")));
  }
  if (it.on.includes("word"))
    parts.push(reviewSection("Words for this relative", null, Logic.union(it.a.words, it.b.words, S.language), "ratings", "main", row, touch, draw));
  if (it.on.includes("call"))
    parts.push(reviewSection("Words used to their face", null, Logic.union(Logic.callList(it.a), Logic.callList(it.b), S.language), "call_ratings", "call_main", row, touch, draw));
  const n = h("textarea", { rows: 2, placeholder: "Notes (optional)" }); n.value = row.notes || "";
  n.addEventListener("input", () => { row.notes = n.value; touch(); });
  parts.push(h("div", { class: "q" }, n));
  return parts;
}
function reviewDone(it, d) {
  if (!it || !d) return false;
  const sectionDone = (words, ratings, mainKey) => {
    const rated = d[ratings] || {}, main = d[mainKey], extra = d[mainKey + "_extra"] || {};
    if (!words.every(w => rated[w.id])) return false;
    return main === "extra" ? !!(extra.native && extra.roman) : !!main && rated[main] === "yes";
  };
  const lang = S.language;
  return (!it.on.includes("word") || sectionDone(Logic.union(it.a.words, it.b.words, lang), "ratings", "main")) &&
    (!it.on.includes("call") || sectionDone(Logic.union(Logic.callList(it.a), Logic.callList(it.b), lang), "call_ratings", "call_main"));
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

// ---------- admin ----------
// The team's view, inside the same page: accounts, progress, agreement. Needs the
// admin key set in the backend's script properties; annotators never see it.
const adminKey = () => readKey("kinshift:adminKey", "");
const adminCall = (action, params = {}) => api(action, { key: adminKey(), ...params }, true);
const roleName = (r) => r === "adjudicator" ? "reviewer" : "annotator";
function renderAdminLogin() {
  const key = h("input", { type: "password", id: "key", autocomplete: "current-password", placeholder: "admin key" });
  const msg = h("p", { class: "bad" });
  async function submit(e) {
    e.preventDefault(); msg.textContent = "Checking…";
    try {
      await api("check_key", { key: key.value.trim() }, true);
      writeKey("kinshift:adminKey", key.value.trim()); S = { admin: true }; writeKey("kinshift:session", S);
      go("#/admin/accounts");
    } catch (err) { msg.textContent = /admin key/.test(err.message) ? "That key is not right." : err.message; }
  }
  setMain(h("div", { class: "login" }, h("div", { class: "card" }, h("h2", {}, "Team admin"),
    h("form", { onsubmit: submit }, h("label", { class: "lbl", for: "key" }, "Admin key"), key,
      h("div", { style: "margin-top:16px" }, h("button", { class: "primary", type: "submit" }, "Open admin")), msg)),
    h("p", { style: "font-size:13px" }, h("a", { href: "#/login" }, "← Annotator sign in"))));
}
async function renderAdmin(tab) {
  document.body.className = "admin";
  if (!S || !S.admin || !adminKey()) return renderAdminLogin();
  const tabs = h("div", { class: "alt", style: "margin-bottom:18px" }, ...[["accounts", "Accounts"], ["progress", "Progress"], ["agreement", "Agreement"]]
    .map(([id, label]) => h("a", { class: "btn" + (tab === id ? " primary" : ""), href: `#/admin/${id}` }, label)));
  const body = h("div", {}, h("p", { class: "muted" }, "Loading…"));
  setMain(h("h1", {}, "Team admin"), h("p", { class: "lead" }, "Accounts, progress and agreement for every language."), tabs, body);
  try {
    let accounts, latest;
    try { ({ accounts, latest } = await adminCall("overview")); }
    catch (err) {   // older backend without "overview"
      if (!/unknown action/.test(err.message)) throw err;
      [{ accounts }, { latest }] = await Promise.all([adminCall("accounts"), adminCall("all_latest")]);
    }
    const parts = tab === "progress" ? adminProgress(accounts, latest) : tab === "agreement" ? adminAgreement(accounts, latest) : adminAccounts(accounts, latest);
    body.replaceChildren(...parts.filter(Boolean));
  } catch (err) {
    body.replaceChildren(h("p", { class: "bad" }, err.message));
    if (/admin key/.test(err.message)) { writeKey("kinshift:adminKey", ""); }
  }
}
const ago = (iso) => { if (!iso) return "never"; const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 60 ? `${m} min ago` : m < 2880 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`; };
function table(head, rows) {
  return h("div", { style: "overflow-x:auto" }, h("table", { class: "grid-table" },
    h("tr", {}, ...head.map(x => h("th", {}, x))), ...rows));
}
function welcomeText(a) {
  const url = location.origin + location.pathname;
  return `Assalam o alaikum ${a.name}! Thank you for joining KINSHIFT as a ${D.languages[a.language].name} ${roleName(a.role)}.\n\n` +
    `Open: ${url}\nSign in with your name exactly as: ${a.name}\n\n` +
    "Please read the guidelines on the page first. Your answers are saved and sent to us automatically; use Submit now before closing if you like.";
}
function adminAccounts(accounts, latest) {
  const name = h("input", { type: "text", placeholder: "full name, unique" });
  const langSel = h("select", {}, ...Object.entries(D.languages).map(([k, v]) => h("option", { value: k }, v.name)));
  const roleSel = h("select", {}, h("option", { value: "annotator" }, "annotator (A1, A2)"), h("option", { value: "adjudicator" }, "reviewer (A3)"));
  const out = h("pre", { class: "out hidden" });
  async function create(e) {
    e.preventDefault();
    try {
      const { account } = await adminCall("create", { name: name.value, language: langSel.value, role: roleSel.value });
      toast(`Created ${account.name} (${account.handle}).`); renderAdmin("accounts");
    } catch (err) { toast(err.message, true); }
  }
  const rows = accounts.map(a => h("tr", { class: a.active === "no" ? "inactive" : "" },
    h("td", {}, h("b", {}, a.name)), h("td", { class: "muted" }, a.handle), h("td", {}, D.languages[a.language] ? D.languages[a.language].name : a.language),
    h("td", {}, roleName(a.role)), h("td", {}, ago(latest[a.handle] && latest[a.handle].saved_at)),
    h("td", {}, h("button", { class: "small", onclick: async () => {
      const t = welcomeText(a);
      try { await navigator.clipboard.writeText(t); toast("Welcome message copied."); } catch { out.textContent = t; out.classList.remove("hidden"); }
    } }, "Copy welcome message")),
    h("td", {}, h("button", { class: "ghost small", onclick: async () => {
      try { await adminCall("set_active", { handle: a.handle, active: a.active === "no" }); renderAdmin("accounts"); } catch (err) { toast(err.message, true); }
    } }, a.active === "no" ? "Reactivate" : "Deactivate"))));
  return [
    h("div", { class: "card" }, h("h2", {}, "Add a person"),
      h("form", { onsubmit: create, class: "grid3" }, h("div", {}, h("label", { class: "lbl" }, "Name"), name),
        h("div", {}, h("label", { class: "lbl" }, "Language"), langSel), h("div", {}, h("label", { class: "lbl" }, "Role"), roleSel),
        h("div", { style: "align-self:end" }, h("button", { class: "primary", type: "submit" }, "Add"))),
      h("p", { class: "muted", style: "margin-bottom:0;font-size:13px" }, "Names must be unique; people sign in by typing their name. Each language needs two annotators and one reviewer.")),
    h("div", { class: "card" }, h("h2", {}, `People (${accounts.length})`),
      accounts.length ? table(["Name", "Handle", "Language", "Role", "Last submitted", "", ""], rows) : h("p", { class: "muted" }, "Nobody yet."), out)];
}
function adminProgress(accounts, latest) {
  const flag = (n) => n ? h("span", { class: "flag" }, n) : (n ?? "—");
  const rows = accounts.map(a => {
    const l = latest[a.handle], p = l ? Logic.progress(l.payload, D.relations, D.config.ask_address) : null;
    const work = !p ? "—" : a.role === "adjudicator" ? `resolved ${p.r1b_done}` :
      h("div", { style: "display:flex;gap:8px;align-items:center" }, h("div", { class: "bar", style: "width:90px;min-width:90px" },
        h("i", { style: `width:${(100 * p.r1_done / p.r1_total).toFixed(0)}%` })), `${p.r1_done}/${p.r1_total}`);
    return h("tr", { class: a.active === "no" ? "inactive" : "" }, h("td", {}, h("b", {}, a.name)), h("td", {}, a.language),
      h("td", {}, ago(l && l.saved_at)), h("td", {}, !p ? "—" : p.onboarded ? "✓" : h("span", { class: "flag" }, "not yet")), h("td", {}, work),
      h("td", {}, p && p.r1_done ? (p.words / p.r1_done).toFixed(1) : "—"),
      h("td", {}, p && p.median_seconds != null ? `${p.median_seconds} s` : "—"), h("td", {}, p ? p.not_sure : "—"),
      h("td", {}, p ? flag(p.pastes) : "—"), h("td", {}, p ? flag(p.fast_rows) : "—"),
      h("td", { class: "muted" }, p && p.background ? [p.background.region, p.background.dialect, p.background.sex].filter(Boolean).join(" · ") : ""));
  });
  return [h("div", { class: "card" }, h("h2", {}, "Progress"),
    table(["Name", "Lang", "Last submitted", "Onboarded", "Work", "Words / relative", "Median time", "Not sure", "Pastes", "Under 5 s", "Background"], rows),
    h("p", { class: "muted", style: "margin-bottom:0;font-size:13px" }, "Orange numbers need a look: pasted text may come from a translator or ChatGPT, and very fast answers may be guesses."))];
}
function adminAgreement(accounts, latest) {
  const langs = [...new Set(accounts.map(a => a.language))];
  const rows = [];
  for (const lang of langs) {
    const ann = accounts.filter(a => a.language === lang && a.role === "annotator" && a.active !== "no" && latest[a.handle]).sort((x, y) => x.handle.localeCompare(y.handle));
    const reviewers = accounts.filter(a => a.language === lang && a.role === "adjudicator" && a.active !== "no");
    if (ann.length < 2) { rows.push(h("tr", {}, h("td", {}, h("b", {}, D.languages[lang].name)), h("td", { colspan: 7, class: "muted" }, "Waiting for two annotators to submit."))); continue; }
    const rowsOf = (a) => ((latest[a.handle].payload.rounds || {}).r1 || {}).rows || {};
    const res = Logic.agreement(D.relations, rowsOf(ann[0]), rowsOf(ann[1]), lang);
    const pct = (x) => x == null ? "—" : `${Math.round(100 * x)}%`;
    const send = h("button", { class: "small primary", disabled: !reviewers.length || !res.disagreements.length, onclick: async () => {
      try {
        for (const r of reviewers) await adminCall("set_batch", { handle: r.handle, round: "r1b", items: res.disagreements });
        toast(`Sent ${res.disagreements.length} disagreements to ${reviewers.map(r => r.name).join(", ")}.`);
      } catch (err) { toast(err.message, true); }
    } }, `Send ${res.disagreements.length} to reviewer`);
    rows.push(h("tr", {}, h("td", {}, h("b", {}, D.languages[lang].name)), h("td", {}, ann.slice(0, 2).map(a => a.name).join(", ")),
      h("td", {}, res.compared), h("td", {}, pct(res.main_agreement)), h("td", {}, pct(res.shared_agreement)), h("td", {}, pct(res.core_main_agreement)), h("td", {}, res.disagreements.length),
      h("td", {}, reviewers.length ? send : h("span", { class: "muted" }, "add a reviewer"))));
  }
  const download = () => {
    const blob = new Blob([JSON.stringify({ schema: "kinshift-bundle/1", saved_at: new Date().toISOString(), latest })], { type: "application/json" });
    const a = h("a", { href: URL.createObjectURL(blob), download: `kinshift_all_${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a); a.click(); a.remove();
  };
  return [h("div", { class: "card" }, h("h2", {}, "Agreement on kinship words"),
    h("p", { class: "muted", style: "margin-top:0" }, "Compares the two annotators of each language. Only relatives where they share no word, or call an elder differently, go to the reviewer; when they share a word but list it in a different order, the word list settles it automatically."),
    langs.length ? table(["Language", "Annotators", "Compared", "Same main word", "Share a word", "Same main (core)", "For reviewer", ""], rows) : h("p", { class: "muted" }, "No accounts yet."),
    h("div", { class: "alt", style: "margin-top:14px" }, h("button", { onclick: download }, "Download all submissions"),
      h("span", { class: "muted", style: "font-size:13px;align-self:center" }, "For the final word list: python -m kinshift.annotation.merge FILE")))];
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
    const [languages, rounds, quiz, relations, config] = await Promise.all(
      ["data/languages.json", "data/rounds.json", "data/r0/quiz.json", "data/r1/relations.json", "data/config.json"].map(p => getJSON(p)));
    Object.assign(D, { languages, rounds, quiz, relations, config });
    route();
  } catch (e) {
    setMain(h("p", { class: "bad" }, "The page could not load. Refresh, and tell the team if it keeps happening."), h("pre", {}, String(e)));
  }
})();
