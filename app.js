"use strict";
// KINSHIFT annotator dashboard. Static page; answers are kept in this browser and sent
// to the team's backend automatically. Interface text comes from i18n.js (English and
// Urdu), the guidelines and onboarding questions from guide.js.

const APP_VERSION = "0.6.0";
const SCHEMA = "kinshift-annotation/1";
const D = {};            // loaded data files
const BATCH = {};        // review batches per round, or null when not ready
let S = null;            // session: {handle, name, language, role} or {admin: true}
let leaving = null;      // called before leaving a screen, to bank time spent

// ---------- helpers ----------
const $ = (sel, el = document) => el.querySelector(sel);
async function getJSON(path) {
  const r = await fetch(`${path}?v=${APP_VERSION}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}
// The backend (Google Apps Script, or the local mock). GET for reads, POST as text/plain
// for writes, so the browser sends no CORS preflight. Every attempt has a deadline, and a
// timeout, a dropped connection or a non-JSON reply is retried: in testing about one call
// in seven to Apps Script hung for up to two minutes and then failed, while a repeat
// answered in a few seconds. Errors the server reports (like "name not found") are not retried.
async function api(action, params = {}, write = false) {
  if (!D.config.endpoint) throw new Error("The dashboard is not connected to a server yet.");
  const attempts = write ? 2 : 3, deadline = write ? 45000 : 15000;
  let last;
  for (let k = 0; k < attempts; k++) {
    try { return await apiOnce(action, params, write, deadline); }
    catch (err) { last = err; if (!err.retry) throw err; }
  }
  throw last;
}
async function apiOnce(action, params, write, deadline) {
  const url = new URL(D.config.endpoint);
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), deadline);
  const fail = (key) => Object.assign(new Error(t(key)), { retry: true });
  let j;
  try {
    let r;
    try {
      if (write) r = await fetch(url, { method: "POST", body: JSON.stringify({ action, ...params }), signal: ctl.signal });
      else { url.search = new URLSearchParams({ action, ...params }); r = await fetch(url, { signal: ctl.signal }); }
    } catch (e) { throw fail(e.name === "AbortError" ? "net.timeout" : "net.offline"); }
    try { j = await r.json(); } catch (e) { throw fail(e.name === "AbortError" ? "net.timeout" : "net.bad"); }
  } finally { clearTimeout(timer); }
  if (!j.ok) throw new Error(j.error || "server error");
  return j;
}
let toastTimer = null;
function toast(msg, bad) {
  const el = $("#toast"); el.textContent = msg; el.className = bad ? "bad" : "";
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.add("hidden"), 4500);
}
const seg = (options, value, onPick) => h("div", { class: "seg" }, ...options.map(([v, label, cls]) =>
  h("button", { type: "button", class: (value === v ? "on " : "") + (cls || ""), onclick: () => onPick(v) }, label)));
const r1Done = (r, rel) => Logic.r1Done(r, rel, D.config.ask_address);
const langName = (code) => { const l = D.languages[code]; return l ? (uiLang() === "ur" ? l.native : l.name) : code; };
const roundTitle = (id) => t(`round.${id}.title`);
const smooth = () => matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

// ---------- storage ----------
const K = (round) => `kinshift:${S.handle}:${round}`;
function readKey(k, fallback) {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function writeKey(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; }
  catch { toast(t("save.local_fail"), true); return false; }
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
  if (leaving) { leaving(); leaving = null; }   // bank time on the open screen while we still know who is signed in
  try { localStorage.removeItem("kinshift:session"); localStorage.removeItem("kinshift:adminKey"); } catch {}
  S = null; for (const k of Object.keys(BATCH)) delete BATCH[k]; go("#/login");
}

// ---------- submit / export / import ----------
function roundIds() { return D.rounds.map(r => r.id); }
function buildPayload() {
  const rounds = {};
  for (const id of roundIds()) { const r = readKey(K(id), null); if (r) rounds[id] = r; }
  return { schema: SCHEMA, app_version: APP_VERSION, handle: S.handle, language: S.language,
           role: S.role, ui_lang: uiLang(), exported_at: new Date().toISOString(), rounds };
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
    if (!quiet) toast(t("submit.ok"));
  }).catch(err => {
    if (!S) return;
    writeKey(`kinshift:${S.handle}:submitError`, String(err.message || err));
    if (!quiet) toast(t("submit.fail"), true);
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
// Returns how many rows came in, and whether this browser holds anything the copy lacks.
function mergeIn(p) {
  let restored = 0, ahead = false;
  for (const id of roundIds()) {
    const incoming = (p.rounds || {})[id], cur = loadRound(id);
    const hasLocal = Object.keys(cur.rows || {}).length || Object.keys(cur).some(k => k !== "rows" && k !== "updated");
    if (!incoming) { if (hasLocal) ahead = true; continue; }
    let changed = false;
    const inRows = incoming.rows || {};
    for (const [key, row] of Object.entries(inRows)) {
      const mine = cur.rows[key];
      if (!mine || (row.last_edit || "") > (mine.last_edit || "")) { cur.rows[key] = row; restored++; changed = true; }
    }
    for (const [key, mine] of Object.entries(cur.rows))
      if (!inRows[key] || (mine.last_edit || "") > (inRows[key].last_edit || "")) ahead = true;
    for (const [k, v] of Object.entries(incoming)) if (k !== "rows" && k !== "updated" && cur[k] == null) { cur[k] = v; changed = true; }
    for (const [k, v] of Object.entries(cur))
      if (k !== "rows" && k !== "updated" && JSON.stringify(v) !== JSON.stringify(incoming[k])) ahead = true;
    if (changed) saveRound(id, cur);
  }
  return { restored, ahead };
}
async function importFile(file) {
  let p;
  try { p = JSON.parse(await file.text()); } catch { return toast(t("file.bad"), true); }
  if (p.schema !== SCHEMA) return toast(t("file.bad"), true);
  if (p.handle !== S.handle) return toast(t("file.other", { h: p.handle }), true);
  toast(t("file.restored", { n: mergeIn(p).restored }));
  route();
}
setInterval(() => { if (S && !S.admin && unsubmitted()) submitAll(true); }, 180000);
// Phones often close a tab without warning: send what is new when the page is hidden.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && S && !S.admin && unsubmitted()) submitAll(true);
});

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
    const msg = failed ? t(narrow ? "banner.fail_short" : "banner.fail") : t(narrow ? "banner.pending_short" : "banner.pending");
    b.replaceChildren(h("span", {}, msg), h("button", { class: "small primary", onclick: () => submitAll(false) }, t("btn.submit_now")));
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
  renderTop();
  const [page, a, b] = (location.hash || "#/home").slice(2).split("/").map(decodeURIComponent);
  if (page === "admin") return renderAdmin(a || "accounts");
  if (S && S.admin) return go("#/admin");
  if (!S) return renderLogin();
  document.body.className = `font-${lang().font}`;
  updateBanner();
  if (page === "r0") return renderR0(a === undefined ? null : +a);
  if (page === "r1") return a ? renderR1Item(a, +(b || 0)) : renderR1List();
  if (page === "r1b" || page === "r2") return renderBatchRound(page, +(a || 0));
  return renderHome();
}
// Header: language switch, guidelines link, who is signed in.
function renderTop() {
  $(".brand small").textContent = "· " + t("brand.sub");
  $("#guide-link").textContent = t("nav.guidelines");
  $("#langsw").replaceChildren(langSwitch(() => { updateBanner(); route(); }));
  const w = $("#who");
  if (!S) return w.replaceChildren();
  w.replaceChildren(h("span", {}, S.admin ? "Admin" : h("bdi", {}, `${S.name} · ${langName(S.language)}`)),
                    h("button", { class: "ghost small", onclick: signOut }, t("nav.signout")));
}

// ---------- login ----------
function renderLogin() {
  document.body.className = "";
  const name = h("input", { type: "text", id: "name", autocomplete: "name", placeholder: t("login.placeholder"), dir: "auto" });
  const msg = h("p", { class: "bad" });
  const btn = h("button", { class: "primary", type: "submit" }, t("login.btn"));
  async function submit(e) {
    e.preventDefault();
    if (!name.value.trim() || btn.disabled) return;
    btn.disabled = true; btn.textContent = t("login.busy"); msg.textContent = ""; msg.className = "muted";
    const slow = setTimeout(() => { if (btn.disabled) msg.textContent = t("login.slow"); }, 2500);
    try {
      const reply = await api("login", { name: name.value });
      S = reply.account; writeKey("kinshift:session", S);
      if (reply.batches) for (const [r, items] of Object.entries(reply.batches)) rememberBatch(r, items || null);
      try {   // bring back work saved on the server (new device or cleared browser)
        const payload = "payload" in reply ? reply.payload : (await api("latest", { handle: S.handle })).payload;
        if (payload) {
          const { restored, ahead } = mergeIn(payload);
          // What came from the server is saved there already; only work this browser holds beyond it still needs sending.
          if (!ahead) writeKey(`kinshift:${S.handle}:lastSubmit`, new Date().toISOString());
          if (restored) toast(t("login.welcome_back", { n: restored }));
        }
      } catch {}
      clearTimeout(slow);
      go("#/home");
    } catch (err) {
      clearTimeout(slow);
      msg.className = "bad";
      msg.textContent = /not found/.test(err.message) ? t("login.notfound") : err.message;
      btn.disabled = false; btn.textContent = t("login.btn");
    }
  }
  setMain(h("div", { class: "login" },
    h("div", { class: "card lang-card" }, h("p", { style: "margin:0 0 10px" }, t("login.lang")), langSwitch(() => route())),
    h("div", { class: "card" }, h("h2", {}, t("login.title")),
      h("form", { onsubmit: submit },
        h("label", { class: "lbl", for: "name" }, t("login.name")), name,
        h("div", { style: "margin-top:16px" }, btn), msg)),
    h("p", { class: "muted", style: "font-size:13px" }, t("login.help")),
    h("p", { style: "font-size:13px" }, h("a", { href: "#/admin" }, t("login.admin")))));
}

// ---------- home ----------
function r0Done() {
  const r = loadRound("r0");
  return !!(r.consent && r.background && r.quiz && r.quiz.passed && r.quiz.version === GUIDE.version);
}
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
      refreshing = false;
      if (!S) return;
      let changed = false;
      for (const x of res.filter(Boolean)) {
        const before = knownBatch(x[0]);
        if (before === undefined || JSON.stringify(before) !== JSON.stringify(x[1])) changed = true;
        rememberBatch(x[0], x[1]);
      }
      if (changed && (location.hash || "#/home").startsWith("#/home")) renderHome();
    });
}
function progressOf(round, items, isDone) {
  const rows = loadRound(round).rows;
  return items.filter(it => isDone(rows[it.id], it)).length;
}
const count = (n, total) => h("span", { class: "tag", dir: "ltr" }, `${n} / ${total}`);
async function renderHome() {
  const mine = D.rounds.filter(r => r.who.includes(S.role));
  const rowsEl = h("div", { class: "rows" });
  for (const r of mine) {
    let right = null, href = null, done = false, locked = false;
    if (r.id === "r0") { done = r0Done(); right = h("span", { class: "tag " + (done ? "good" : "accent") }, t(done ? "tag.done" : "tag.start")); href = "#/r0"; }
    else if (!r0Done()) { locked = true; right = h("span", { class: "tag" }, t("tag.after_r0")); }
    else if (r.id === "r1") {
      const n = progressOf("r1", D.relations, r1Done); done = n === D.relations.length;
      right = count(n, D.relations.length); if (done) right.classList.add("good"); href = "#/r1";
    } else {
      const items = knownBatch(r.id);
      if (items === undefined) { locked = true; right = h("span", { class: "tag" }, t("tag.checking")); }
      else if (!items) { locked = true; right = h("span", { class: "tag" }, t("tag.not_ready")); }
      else { const n = progressOf(r.id, items, BATCH_DONE[r.id]); done = n === items.length;
             right = count(n, items.length); if (done) right.classList.add("good"); href = `#/${r.id}/0`; }
    }
    rowsEl.append(h(href && !locked ? "a" : "div", { class: `list-row${done ? " done" : ""}${locked ? " locked" : ""}`, href: locked ? null : href },
      h("div", {}, h("div", { class: "title" }, roundTitle(r.id)), h("div", { class: "sub" }, t(`round.${r.id}.about`))), right, h("span")));
  }
  const fileIn = h("input", { type: "file", accept: "application/json", class: "hidden",
                              onchange: e => e.target.files[0] && importFile(e.target.files[0]) });
  const batchRounds = mine.filter(r => r.batch).map(r => r.id).filter(id => !(id in BATCH));
  if (batchRounds.length && r0Done()) refreshBatches(batchRounds);
  setMain(h("h1", {}, h("bdi", {}, t("home.welcome", { name: S.name }))),
    h("p", { class: "lead" }, t("home.lead", { lang: langName(S.language), role: t(`role.${S.role}`) })),
    h("div", { class: "card" }, h("h2", {}, t("home.rounds")), rowsEl),
    h("div", { class: "card" }, h("h2", {}, t("home.saving")),
      h("p", { class: "muted", style: "margin-top:0" }, t("home.saving_text")),
      h("div", { class: "alt" }, h("button", { class: "primary", onclick: () => submitAll(false) }, t("btn.submit_now")),
        h("button", { class: "ghost", onclick: downloadCopy }, t("home.download")),
        h("button", { class: "ghost", onclick: () => fileIn.click() }, t("home.restore")), fileIn)));
}

// ---------- R0: onboarding ----------
// Step 0: consent and about you. Then one step per guidelines part: read it, answer its
// questions about real situations, continue once every answer is right. A wrong answer
// never shows the right one; it sends the reader back to the part. Then a done step.
const BG_KEYS = ["region", "dialect", "age_band", "sex"];
const optionOrder = {};   // shuffled option order per question, kept while the page is open
function shuffled(n) { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function guideState(data) {
  if (!data.guide || data.guide.version !== GUIDE.version) data.guide = { version: GUIDE.version, parts: {}, checks: {} };
  return data.guide;
}
function renderR0(step) {
  const data = loadRound("r0"), parts = guideParts(D.config), g = guideState(data);
  const total = parts.length + 2;
  const bgOk = data.consent && data.background && BG_KEYS.every(k => data.background[k]);
  const firstOpen = parts.findIndex(p => !(g.parts[p.id] && g.parts[p.id].passed));
  const furthest = !bgOk ? 0 : firstOpen < 0 ? total - 1 : firstOpen + 1;
  if (step == null || step > furthest) step = r0Done() ? total - 1 : furthest;
  step = Math.max(0, Math.min(step, total - 1));
  const head = [h("h1", {}, t("r0.title")),
    h("div", { class: "steps" }, h("span", { class: "muted" }, t("r0.step", { i: step + 1, n: total })),
      h("div", { class: "bar" }, h("i", { style: `width:${(100 * (step + 1) / total).toFixed(0)}%` })))];
  if (step === 0) return renderR0About(data, head);
  if (step === total - 1) return setMain(...head, h("div", { class: "card" }, h("h2", {}, t("r0.done_title")),
    h("p", { style: "margin-top:0" }, t("r0.done_text")),
    h("div", { class: "alt" }, h("a", { class: "btn ghost", href: `#/r0/${step - 1}` }, t("r0.back")),
      h("a", { class: "btn primary", href: "#/r1" }, t("r0.done_btn")))));
  renderR0Part(data, parts, step, head);
}
function renderR0About(data, head) {
  const bg = data.background || {};
  const field = (key, text, el) => { el.id = `bg-${key}`; el.value = bg[key] || ""; return h("div", {}, h("label", { class: "lbl", for: el.id }, text), el); };
  const sel = (opts) => h("select", {}, h("option", { value: "" }, t("r0.choose")), ...opts.map(([v, label]) => h("option", { value: v }, label)));
  const consent = h("input", { type: "checkbox", id: "consent" }); consent.checked = !!data.consent;
  const fields = [
    field("region", t("r0.region"), h("input", { type: "text", dir: "auto" })),
    field("dialect", t("r0.dialect"), h("input", { type: "text", dir: "auto" })),
    field("age_band", t("r0.age"), sel(["18-24", "25-34", "35-44", "45-54", "55+"].map(x => [x, x]))),
    field("sex", t("r0.sex"), sel([["woman", t("r0.sex.woman")], ["man", t("r0.sex.man")], ["prefer not to say", t("r0.sex.none")]])),
  ];
  const status = h("p", { class: "bad" });
  function next() {
    const b = {};
    for (const f of fields) { const el = $("input,select", f); b[el.id.slice(3)] = el.value.trim(); }
    Object.assign(data, { background: b, consent: consent.checked });
    saveRound("r0", data);
    if (!consent.checked) status.textContent = t("r0.need_consent");
    else if (Object.values(b).some(v => !v)) status.textContent = t("r0.need_bg");
    else go("#/r0/1");
  }
  const oldPass = data.quiz && data.quiz.passed && data.quiz.version !== GUIDE.version;
  setMain(...head, oldPass ? h("div", { class: "note" }, t("r0.redo")) : null,
    h("div", { class: "card" }, h("h2", {}, t("r0.consent")),
      h("p", { style: "margin-top:0" }, t("r0.consent_text")),
      h("label", { class: "check" }, consent, t("r0.agree"))),
    h("div", { class: "card" }, h("h2", {}, t("r0.about_you")), h("div", { class: "grid2" }, ...fields)),
    h("div", { class: "alt" }, h("button", { class: "primary", onclick: next }, t("r0.continue"))), status);
}
function renderR0Part(data, parts, step, head) {
  const part = parts[step - 1], g = data.guide;
  const ps = g.parts[part.id] = g.parts[part.id] || { ms: 0 };
  const t0 = Date.now();
  leaving = () => {   // bank reading time, without counting it as unsubmitted work
    if (!S) return;
    const cur = loadRound("r0"); const cg = guideState(cur);
    const p = cg.parts[part.id] = cg.parts[part.id] || { ms: 0 };
    p.ms = (p.ms || 0) + Math.min(Date.now() - t0, 1800000);
    writeKey(K("r0"), cur);
  };
  const reading = h("div", { class: "card guide-part", id: "part-text" }, h("h2", {}, `${step}. ${L(part.title)}`),
    step === 1 ? h("p", { class: "note" }, t("r0.guide_intro")) : null, ...guideBlocks(L(part.body)));
  const checksBox = h("div");
  const nextBtn = h("button", { class: "primary" }, t("r0.continue"));
  const hint = h("p", { class: "muted", style: "font-size:13px" });
  const allOk = () => part.checks.every(c => g.checks[c.id] && g.checks[c.id].ok);
  function drawChecks() {
    checksBox.replaceChildren(...part.checks.map((c, qi) => {
      const st = g.checks[c.id] || {};
      const order = optionOrder[c.id] = optionOrder[c.id] || shuffled(c.options.length);
      const opts = h("div", { class: "choices" }, ...order.map(j => {
        const picked = st.last === j;
        return h("button", { type: "button", disabled: !!st.ok, class: "choice" + (picked ? (j === c.answer ? " right" : " wrong") : ""),
          onclick: () => pick(c, j), html: L(c.options[j]) });
      }));
      return h("div", { class: "q check-q" }, h("h3", {}, `${qi + 1}. `, h("span", { html: L(c.q) })), opts,
        st.ok ? h("div", { class: "good-note" }, h("b", {}, t("r0.right") + " "), h("span", { html: L(c.why) }))
          : st.last != null ? h("div", { class: "warn" }, t("r0.wrong")) : null);
    }));
    nextBtn.disabled = !allOk();
    hint.textContent = allOk() ? "" : t("r0.answer_all");
  }
  function pick(c, j) {
    const st = g.checks[c.id] = g.checks[c.id] || { tries: 0, wrong: 0 };
    st.tries++; st.last = j;
    if (j === c.answer) { st.ok = true; st.ok_at = new Date().toISOString(); }
    else { st.wrong++; optionOrder[c.id] = shuffled(c.options.length); }
    saveRound("r0", data); drawChecks();
    if (j !== c.answer) $("#part-text").scrollIntoView({ behavior: smooth(), block: "start" });
  }
  nextBtn.addEventListener("click", () => {
    if (!allOk()) return;
    ps.passed = true; ps.passed_at = ps.passed_at || new Date().toISOString();
    const last = step === parts.length;
    if (last) {
      const wrong = Object.values(g.checks).reduce((n, c) => n + (c.wrong || 0), 0);
      data.read_guidelines = true;
      data.quiz = { version: GUIDE.version, passed: true, wrong, checks: Object.keys(g.checks).length,
                    passed_at: new Date().toISOString() };
    }
    saveRound("r0", data);
    if (last) { toast(t("r0.complete")); submitAll(true); }
    go(`#/r0/${step + 1}`);
  });
  drawChecks();
  setMain(...head, reading,
    h("div", { class: "card" }, h("h2", {}, t("r0.check")), checksBox),
    h("div", { class: "alt" }, h("a", { class: "btn ghost", href: `#/r0/${step - 1}` }, t("r0.back")), nextBtn), hint);
}

// ---------- R1: kinship words ----------
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
  if (r.ego_sex === "f") return t("speaker.f");
  if (r.ego_sex === "m") return t("speaker.m");
  return null;
}

function renderR1List() {
  if (!r0Done()) return go("#/r0");
  const rows = loadRound("r1").rows;
  const list = groups().map((g, i) => {
    const n = g.items.filter(r => r1Done(rows[r.id], r)).length;
    const first = Math.max(0, g.items.findIndex(r => !r1Done(rows[r.id], r)));
    return h("a", { class: "list-row" + (n === g.items.length ? " done" : ""), href: `#/r1/${encodeURIComponent(g.group)}/${n === g.items.length ? 0 : first}` },
      h("div", {}, h("div", { class: "title" }, `${i + 1}. ${groupName(g.group)}`), g.tier === "far" ? h("div", { class: "sub" }, t("r1.distant")) : null),
      h("div", { class: "bar", style: "width:120px" }, h("i", { style: `width:${(100 * n / g.items.length).toFixed(0)}%` })),
      h("span", { class: "tag" + (n === g.items.length ? " good" : ""), dir: "ltr" }, `${n}/${g.items.length}`));
  });
  const total = progressOf("r1", D.relations, r1Done);
  setMain(h("h1", {}, t("r1.title")),
    h("p", { class: "lead" }, t("r1.lead", { done: total, total: D.relations.length })),
    h("div", { class: "card" }, h("div", { class: "rows" }, ...list)),
    h("div", { class: "alt" }, h("a", { class: "btn ghost", href: "#/home" }, t("nav.home")), h("button", { onclick: () => submitAll(false) }, t("btn.submit_now"))));
}

function focusChrome({ back, name, pos, total, done }) {
  setFocusbar(
    h("div", { class: "left" }, h("a", { class: "btn ghost back", href: back, title: "Back" }, document.documentElement.dir === "rtl" ? "→" : "←"),
      h("span", { class: "name" }, name), h("span", { class: "sep" }, "·"), h("span", { class: "muted" }, t("pos", { pos, total }))),
    h("div", { class: "right" }, h("div", { class: "bar", style: "width:160px" }, h("i", { style: `width:${(100 * done / total).toFixed(0)}%` })),
      h("button", { class: "primary small", onclick: () => submitAll(false) }, t("btn.submit"))));
}
function footer(prevHref, nextHref, nextLabel, submitOnNext) {
  return h("div", { class: "focusfoot" },
    prevHref ? h("a", { class: "btn ghost", href: prevHref }, t("nav.prev")) : h("span"),
    h("span", { class: "kbd-hint" }, h("bdi", {}, h("kbd", {}, "Ctrl"), " + ", h("kbd", {}, "Enter")), " ", t("nav.kbd")),
    h("a", { class: "btn primary", href: nextHref, id: "next", onclick: () => { if (submitOnNext) submitAll(true); } }, nextLabel || t("nav.next")));
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
  const el = h("input", { type: "text", placeholder: placeholder || "", class: kind === "native" ? "native" : "roman",
                          dir: kind === "native" ? "rtl" : "ltr", lang: kind === "native" ? S.language : "en",
                          autocapitalize: "off", autocomplete: "off", spellcheck: "false" });
  el.value = obj[field] || "";
  const warn = h("div", { class: "warn" });
  const check = () => {
    warn.textContent = kind === "native" && LATIN.test(el.value) ? t("w.warn_native")
      : kind === "roman" && ARABIC.test(el.value) ? t("w.warn_roman") : "";
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
    h("div", { class: "word-tag" }, i === 0 ? first : t("w.also")),
    boundBox(w, "native", "native", i === 0 && !optional ? t("w.native") : t("w.native_opt"), touch),
    boundBox(w, "roman", "roman", i === 0 && !optional ? t("w.roman") : t("w.roman_short"), touch),
    h("div", { class: "word-actions" },
      i > 0 ? h("button", { type: "button", class: "ghost small", title: t("w.up_title"),
        onclick: () => { list.unshift(...list.splice(i, 1)); touch(); redraw(); } }, t("w.up")) : null,
      list.length > 1 ? h("button", { type: "button", class: "ghost small", title: t("w.remove"), "aria-label": t("w.remove"),
        onclick: () => { list.splice(i, 1); touch(); redraw(); } }, "✕") : null)));
  return h("div", { class: "words" }, ...rows,
    h("button", { type: "button", class: "ghost small add-word", onclick: () => { const w = { native: "", roman: "" }; list.push(w); touch(); w._focus = true; redraw(); } }, t("w.add")));
}

function renderR1Item(group, i) {
  if (!r0Done()) return go("#/r0");
  const all = groups(), gi = all.findIndex(g => g.group === group);
  if (gi < 0) return go("#/r1");
  const g = all[gi]; i = Math.min(Math.max(i || 0, 0), g.items.length - 1);
  const r = g.items[i], data = loadRound("r1");
  const row = data.rows[r.id] = Logic.upgrade(data.rows[r.id]) || { words: [], call: [] };
  row.words = row.words || []; row.call = row.call || [];
  startTimer("r1", data, r.id);
  const href = (gg, ii) => `#/r1/${encodeURIComponent(gg.group)}/${ii}`;
  const prev = i > 0 ? href(g, i - 1) : gi > 0 ? href(all[gi - 1], all[gi - 1].items.length - 1) : null;
  const next = i < g.items.length - 1 ? href(g, i + 1) : gi < all.length - 1 ? href(all[gi + 1], 0) : "#/r1";
  const doneInGroup = () => g.items.filter(x => r1Done(data.rows[x.id], x)).length;
  const chrome = () => focusChrome({ back: "#/r1", name: groupName(g.group), pos: i + 1, total: g.items.length, done: doneInGroup() });
  const touch = () => {
    const now = new Date().toISOString(); row.first_edit = row.first_edit || now; row.last_edit = now; row.ui = uiLang();
    saveRow("r1", r.id, row); data.rows = loadRound("r1").rows; data.rows[r.id] = row; dots.replaceChildren(...dotLinks()); chrome();
  };
  chrome();
  const body = h("div");
  const askCall = D.config.ask_address && r.elder;
  function draw() {
    const notes = h("textarea", { rows: 2, dir: "auto", placeholder: t("r1.notes_ph") });
    notes.value = row.notes || "";
    notes.addEventListener("input", () => { row.notes = notes.value; touch(); });
    body.replaceChildren(...[
      h("div", { class: "q" }, h("h3", {}, t("r1.q_word")),
        h("p", { class: "hint" }, t("r1.q_word_hint")),
        wordList(row.words, { first: t("w.most") }, touch, draw)),
      askCall ? h("div", { class: "q" }, h("h3", {}, t("r1.q_face")),
        seg([["no", t("r1.no")], ["yes", t("r1.yes_diff")]], row.call_differs, v => { row.call_differs = v; if (v === "no") row.call = []; touch(); draw(); }),
        row.call_differs === "yes" ? h("div", { style: "margin-top:12px" }, wordList(row.call, { first: t("w.face") }, touch, draw)) : null) : null,
      h("div", { class: "q" }, h("h3", {}, t("r1.q_sure")),
        seg([["sure", t("r1.sure")], ["not sure", t("r1.not_sure"), "warnish"]], row.confidence, v => { row.confidence = v; row.unsure = v === "not sure"; touch(); draw(); })),
      h("details", { class: "more", open: !!row.notes }, h("summary", {}, t("r1.notes")), notes),
    ].filter(Boolean));
  }
  draw();
  const dotLinks = () => g.items.map((x, j) => h("a", { href: href(g, j), title: x.path_en,
    class: (r1Done(data.rows[x.id], x) ? "done" : "") + (j === i ? " cur" : "") }));
  const dots = h("div", { class: "dots" }, ...dotLinks());
  const note = speakerNote(r);
  const card = h("div", { class: "card item" },
    h("div", { class: "item-top" }, h("span", { class: "tag accent" }, groupName(g.group)), r.tier === "far" ? h("span", { class: "tag" }, t("r1.distant_one")) : null),
    ...relHeading(r.steps, r.path_en), note ? h("div", { class: "speaker" }, note) : null,
    treeSVG(r.steps), body);
  card.addEventListener("paste", () => { row.pastes = (row.pastes || 0) + 1; touch(); });
  const lastInGroup = i === g.items.length - 1;
  setMain(card, footer(prev, next, next === "#/r1" ? t("nav.finish") : lastInGroup ? t("nav.next_group") : t("nav.next"), lastInGroup), dots);
}

// ---------- R1b and R2: batch rounds ----------
const BATCH_DONE = {
  r1b: (d, it) => reviewDone(it, d),
  r2: (d) => !!(d && d.natural && d.correct && (d.natural === "yes" || d.fixed) && (d.correct === "yes" || d.right_answer)),
};
async function renderBatchRound(round, i) {
  if (!r0Done()) return go("#/r0");
  const items = knownBatch(round) || await loadBatch(round);
  if (!items || !items.length) { toast(t("batch.not_ready")); return go("#/home"); }
  i = Math.min(Math.max(i || 0, 0), items.length - 1);
  const it = items[i], data = loadRound(round), title = roundTitle(round);
  const row = data.rows[it.id] || (data.rows[it.id] = {});
  startTimer(round, data, it.id);
  const done = () => items.filter(x => BATCH_DONE[round](data.rows[x.id], x)).length;
  const chrome = () => focusChrome({ back: "#/home", name: title, pos: i + 1, total: items.length, done: done() });
  const dotLinks = () => items.map((x, j) => h("a", { href: `#/${round}/${j}`,
    class: (BATCH_DONE[round](data.rows[x.id], x) ? "done" : "") + (j === i ? " cur" : "") }));
  const dots = h("div", { class: "dots" }, ...dotLinks());
  const touch = () => { const now = new Date().toISOString(); row.first_edit = row.first_edit || now; row.last_edit = now; row.ui = uiLang();
                        saveRow(round, it.id, row); data.rows = loadRound(round).rows; data.rows[it.id] = row;
                        chrome(); dots.replaceChildren(...dotLinks()); };
  chrome();
  const body = h("div");
  const draw = () => body.replaceChildren(...(round === "r1b" ? adjudicateParts(it, row, touch, draw) : reviewParts(it, row, touch, draw)).filter(Boolean));
  draw();
  const card = h("div", { class: "card item" }, body);
  card.addEventListener("paste", () => { row.pastes = (row.pastes || 0) + 1; touch(); });
  const prev = i > 0 ? `#/${round}/${i - 1}` : null, next = i < items.length - 1 ? `#/${round}/${i + 1}` : "#/home";
  setMain(card, footer(prev, next, next === "#/home" ? t("nav.finish") : t("nav.next"), next === "#/home"), dots);
}
function textBox(row, key, kind, touch) {
  const el = h(kind === "area" ? "textarea" : "input", { type: "text", class: kind === "native" ? "native" : "",
    dir: kind === "native" ? "rtl" : kind === "area" ? "auto" : "ltr" });
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
// Reviewer: rate every word the two volunteers gave, and pick the most common one.
function reviewSection(title, frame, words, ratings, mainKey, row, touch, draw) {
  const rated = row[ratings] = row[ratings] || {};
  const extra = row[mainKey + "_extra"] = row[mainKey + "_extra"] || { native: "", roman: "" };
  const rows = words.map(w => h("div", { class: "rate-row" },
    h("div", { class: "rate-word" }, h("div", { class: "big" }, w.native || "—"), h("div", { class: "muted", dir: "ltr" }, w.roman || ""),
      h("div", { class: "who" }, w.count === 2 ? t("rv.both") : t("rv.one"))),
    seg([["yes", t("rv.used")], ["region", t("rv.region")], ["no", t("rv.wrong"), "warnish"]], rated[w.id], v => {
      rated[w.id] = v; if (v !== "yes" && row[mainKey] === w.id) row[mainKey] = ""; touch(); draw(); }),
    h("label", { class: "check main-pick" + (rated[w.id] === "yes" ? "" : " off") },
      h("input", { type: "radio", name: mainKey, checked: row[mainKey] === w.id, disabled: rated[w.id] !== "yes",
        onchange: () => { row[mainKey] = w.id; touch(); draw(); } }), t("rv.main"))));
  return h("div", { class: "q" }, h("h3", {}, title), ...rows,
    h("details", { class: "more", open: !!(extra.native || extra.roman) }, h("summary", {}, t("rv.missed")),
      h("div", { class: "grid2" }, boundBox(extra, "native", "native", t("w.native"), touch), boundBox(extra, "roman", "roman", t("w.roman_short"), touch)),
      h("label", { class: "check" }, h("input", { type: "radio", name: mainKey, checked: row[mainKey] === "extra",
        onchange: () => { row[mainKey] = "extra"; touch(); draw(); } }), t("rv.extra_main"))));
}
function adjudicateParts(it, row, touch, draw) {
  const rel = D.relations.find(x => x.id === it.id) || { steps: [], referent_sex: "m", elder: false };
  const parts = [h("div", { class: "item-top" }, h("span", { class: "tag accent" }, groupName(rel.group || "")),
                   h("span", { class: "tag warn" }, it.on.includes("word") ? t("rv.diff_words") : t("rv.diff_call"))),
    ...relHeading(rel.steps, it.path_en), speakerNote(rel) ? h("div", { class: "speaker" }, speakerNote(rel)) : null,
    treeSVG(rel.steps)];
  const notes = [it.a && it.a.notes, it.b && it.b.notes].filter(Boolean);
  if (notes.length) parts.push(h("div", { class: "muted", style: "margin-top:8px" }, t("rv.notes_from"), h("bdi", {}, notes.join(" · "))));
  if (!it.on.includes("word")) {
    const agreed = (Logic.upgrade(it.a).words || []).filter(Logic.filled)[0] || {};
    parts.push(h("div", { class: "q" }, h("h3", {}, t("rv.agreed")),
      h("div", { class: "rate-word" }, h("div", { class: "big" }, agreed.native || "—"), h("div", { class: "muted", dir: "ltr" }, agreed.roman || "")),
      h("p", { class: "hint", style: "margin-top:8px" }, t("rv.only_call"))));
  }
  if (it.on.includes("word"))
    parts.push(reviewSection(t("rv.words"), null, Logic.union(it.a.words, it.b.words, S.language), "ratings", "main", row, touch, draw));
  if (it.on.includes("call"))
    parts.push(reviewSection(t("rv.call_words"), null, Logic.union(Logic.callList(it.a), Logic.callList(it.b), S.language), "call_ratings", "call_main", row, touch, draw));
  const n = h("textarea", { rows: 2, dir: "auto", placeholder: t("rv.notes") }); n.value = row.notes || "";
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
  return [h("div", { class: "item-top" }, h("span", { class: "tag accent" }, it.kind || t("r2.question")), h("span", { class: "tag" }, native ? t("r2.own") : t("r2.roman"))),
    h("div", { class: `question${native ? "" : " ltr"}` }, it.question),
    it.options ? h("div", { class: "muted" }, t("r2.options"), h("bdi", {}, it.options.join(" · "))) : null,
    h("div", { style: "margin-top:6px" }, t("r2.answer"), h("b", {}, h("bdi", {}, it.answer))),
    h("div", { class: "q" }, h("h3", {}, t("r2.natural")),
      seg([["yes", t("r2.yes")], ["no", t("r2.needs_fix"), "warnish"]], row.natural, v => { row.natural = v; touch(); draw(); }),
      row.natural === "no" ? h("div", { style: "margin-top:10px" }, h("label", { class: "lbl" }, t("r2.rewrite")), textBox(row, "fixed", native ? "native" : "area", touch)) : null),
    h("div", { class: "q" }, h("h3", {}, t("r2.correct")),
      seg([["yes", t("r2.yes")], ["no", t("r2.no"), "warnish"]], row.correct, v => { row.correct = v; touch(); draw(); }),
      row.correct === "no" ? h("div", { style: "margin-top:10px" }, h("label", { class: "lbl" }, t("r2.right")), textBox(row, "right_answer", native ? "native" : "roman", touch)) : null),
    h("div", { class: "q" }, h("label", { class: "lbl" }, t("rv.notes")), textBox(row, "notes", "area", touch))];
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
  const url = location.origin + location.pathname, l = D.languages[a.language];
  return `Assalam o alaikum ${a.name}! Thank you for joining KINSHIFT as a ${l.name} ${roleName(a.role)}.\n\n` +
    `Open: ${url}\nSign in with your name exactly as: ${a.name}\n\n` +
    "Start with Onboarding: it walks you through the guidelines. The page works in English and Urdu (switch at the top). " +
    "Your answers are saved and sent to us automatically.\n\n" +
    `السلام علیکم! KINSHIFT میں ${l.native} کے لیے شامل ہونے کا شکریہ۔ اوپر دیا گیا لنک کھولیں اور اپنا نام بالکل اسی طرح لکھ کر سائن ان کریں: ${a.name}\n` +
    "سب سے پہلے ’تعارف‘ مکمل کریں؛ اس میں ہدایات قدم بہ قدم ہیں۔ صفحہ اردو میں دیکھنے کے لیے اوپر ’اردو‘ دبائیں۔";
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
    const l = latest[a.handle], p = l ? Logic.progress(l.payload, D.relations, D.config.ask_address, GUIDE.version) : null;
    const work = !p ? "—" : a.role === "adjudicator" ? `resolved ${p.r1b_done}` :
      h("div", { style: "display:flex;gap:8px;align-items:center" }, h("div", { class: "bar", style: "width:90px;min-width:90px" },
        h("i", { style: `width:${(100 * p.r1_done / p.r1_total).toFixed(0)}%` })), `${p.r1_done}/${p.r1_total}`);
    return h("tr", { class: a.active === "no" ? "inactive" : "" }, h("td", {}, h("b", {}, a.name)), h("td", {}, a.language),
      h("td", {}, ago(l && l.saved_at)), h("td", {}, !p ? "—" : p.onboarded ? `✓ (${p.guide_wrong} wrong, ${p.guide_minutes} min)` : h("span", { class: "flag" }, "not yet")), h("td", {}, work),
      h("td", {}, p && p.r1_done ? (p.words / p.r1_done).toFixed(1) : "—"),
      h("td", {}, p && p.median_seconds != null ? `${p.median_seconds} s` : "—"), h("td", {}, p ? p.not_sure : "—"),
      h("td", {}, p ? flag(p.pastes) : "—"), h("td", {}, p ? flag(p.fast_rows) : "—"),
      h("td", { class: "muted" }, p && p.background ? [p.background.region, p.background.dialect, p.background.sex].filter(Boolean).join(" · ") : ""),
      h("td", { class: "muted" }, p && p.ui_lang ? p.ui_lang : "—"));
  });
  return [h("div", { class: "card" }, h("h2", {}, "Progress"),
    table(["Name", "Lang", "Last submitted", "Onboarded (wrong tries, reading)", "Work", "Words / relative", "Median time", "Not sure", "Pastes", "Under 5 s", "Background", "Page in"], rows),
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
  pal.replaceChildren(h("div", { class: "lbl" }, t("palette")),
    ...lang().palette.split(" ").map(ch => h("button", { type: "button", onmousedown: e => e.preventDefault(),
      onclick: () => {
        const el = paletteTarget; if (!el) return;
        const a = el.selectionStart ?? el.value.length, b = el.selectionEnd ?? el.value.length;
        el.setRangeText(ch, a, b, "end"); el.dispatchEvent(new Event("input")); el.focus();
      } }, ch)));
  pal.classList.remove("hidden");
  const r = target.getBoundingClientRect(), top = pal.getBoundingClientRect().top;
  if (r.bottom > top - 12) window.scrollBy({ top: r.bottom - top + 40, behavior: smooth() });
}

// ---------- start ----------
new ResizeObserver(() => document.documentElement.style.setProperty("--top-h", $(".top").offsetHeight + "px")).observe($(".top"));
(async function start() {
  applyUiLang();
  try {
    const [languages, rounds, relations, config] = await Promise.all(
      ["data/languages.json", "data/rounds.json", "data/r1/relations.json", "data/config.json"].map(p => getJSON(p)));
    Object.assign(D, { languages, rounds, relations, config });
    route();
  } catch (e) {
    setMain(h("p", { class: "bad" }, t("load.error")), h("pre", {}, String(e)));
  }
})();
