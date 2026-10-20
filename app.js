"use strict";
// KINSHIFT annotator dashboard. Static page; everything stays in this browser
// until the annotator exports a file and sends it to the team.

const APP_VERSION = "0.1.0";
const SCHEMA = "kinshift-annotation/1";
const D = {};          // loaded data files
let S = null;          // session: {handle, language, role, demo, code}
let focusedNative = null;

// ---------- small helpers ----------
const $ = (sel, el = document) => el.querySelector(sel);
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "html") el.innerHTML = v;  // only for our own static strings
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false)
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  return el;
}
async function getJSON(path) {
  const r = await fetch(`${path}?v=${APP_VERSION}`);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
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

// ---------- storage (localStorage, every access guarded) ----------
const K = (round) => `kinshift:${S.handle}:${round}`;
function readKey(k, fallback) {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function writeKey(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; }
  catch { showBanner("Could not save in this browser. Export your work now and tell the team.", true); return false; }
}
function loadRound(round) { return readKey(K(round), { rows: {}, updated: null }); }
function saveRound(round, data) {
  data.updated = new Date().toISOString();
  writeKey(K(round), data);
  updateBanner();
}

// ---------- session ----------
function loadSession() { return readKey("kinshift:session", null); }
function saveSession(s) { writeKey("kinshift:session", s); }
function signOut() { try { localStorage.removeItem("kinshift:session"); } catch {} S = null; go("#/login"); }

// ---------- export / import ----------
function allRounds() { return D.rounds.map(r => r.id); }
function exportAll() {
  const rounds = {};
  for (const id of allRounds()) { const r = readKey(K(id), null); if (r) rounds[id] = r; }
  const payload = { schema: SCHEMA, app_version: APP_VERSION, handle: S.handle, language: S.language,
                    role: S.role, demo: !!S.demo, exported_at: new Date().toISOString(), rounds };
  const stamp = payload.exported_at.slice(0, 16).replace(/[-:T]/g, "");
  const blob = new Blob([JSON.stringify(payload, null, 1)], { type: "application/json" });
  const a = h("a", { href: URL.createObjectURL(blob), download: `kinshift_${S.handle}_${stamp}.json` });
  document.body.append(a); a.click(); a.remove();
  writeKey(`kinshift:${S.handle}:lastExport`, payload.exported_at);
  updateBanner();
}
async function importFile(file) {
  let p;
  try { p = JSON.parse(await file.text()); } catch { return alert("That file is not a KINSHIFT export."); }
  if (p.schema !== SCHEMA) return alert("That file is not a KINSHIFT export.");
  if (p.handle !== S.handle) return alert(`That file belongs to ${p.handle}, not ${S.handle}.`);
  let restored = 0;
  for (const [id, incoming] of Object.entries(p.rounds || {})) {
    const cur = loadRound(id);
    for (const [key, row] of Object.entries(incoming.rows || {})) {
      const mine = cur.rows[key];
      if (!mine || (row.last_edit || "") > (mine.last_edit || "")) { cur.rows[key] = row; restored++; }
    }
    for (const [k, v] of Object.entries(incoming)) if (k !== "rows" && cur[k] == null) cur[k] = v;
    saveRound(id, cur);
  }
  alert(`Restored ${restored} answers.`);
  route();
}

// ---------- banner ----------
function showBanner(msg, urgent) {
  const b = $("#banner"); b.hidden = false; b.replaceChildren(h("span", { class: urgent ? "bad" : "" }, msg));
}
function updateBanner() {
  if (!S) { $("#banner").hidden = true; return; }
  const last = readKey(`kinshift:${S.handle}:lastExport`, "");
  const newest = allRounds().map(id => loadRound(id).updated || "").sort().pop() || "";
  if (newest && newest > last) {
    const b = $("#banner"); b.hidden = false;
    b.replaceChildren("You have work that is not exported yet. Export after each batch and send the file to the team.",
                      h("button", { onclick: exportAll }, "Export now"));
  } else $("#banner").hidden = true;
}

// ---------- routing ----------
function go(hash) { if (location.hash !== hash) location.hash = hash; else route(); }
window.addEventListener("hashchange", route);
function setMain(...kids) { const m = $("#app"); m.replaceChildren(...kids); window.scrollTo(0, 0); }
function lang() { return D.languages[S.language]; }

function route() {
  $("#palette").hidden = true;
  if (!S) S = loadSession();
  const parts = (location.hash || "#/home").slice(2).split("/");
  renderWho();
  if (!S) return renderLogin();
  document.body.className = `font-${lang().font}`;
  updateBanner();
  const [page, arg] = parts;
  if (page === "r0") return renderR0();
  if (page === "r1") return arg ? renderR1Batch(decodeURIComponent(arg)) : renderR1();
  return renderHome();
}
function renderWho() {
  const w = $("#who");
  if (!S) { w.replaceChildren(); return; }
  w.replaceChildren(`${S.handle} · ${D.languages[S.language].name} · ${S.role}${S.demo ? " · demo" : ""}`,
                    h("button", { onclick: signOut }, "Sign out"));
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
    const a = D.assignments.find(x => x.handle === hd);
    if (!a || a.check !== await sha256hex(`kinshift:${hd}:${cd}`)) {
      msg.textContent = "Handle or access code not recognised. Check both and try again."; return;
    }
    S = { handle: a.handle, language: a.language, role: a.role, demo: a.demo, code: cd };
    saveSession(S); go("#/home");
  }
  setMain(h("h1", {}, "Sign in"),
    h("p", { class: "muted" }, "Use the handle and access code the KINSHIFT team sent you."),
    h("form", { class: "card", onsubmit: submit },
      h("label", { for: "handle" }, "Handle"), handle,
      h("label", { for: "code", style: "margin-top:10px" }, "Access code"), code,
      h("div", { class: "row", style: "margin-top:12px" }, h("button", { class: "primary", type: "submit" }, "Sign in"),
        h("a", { href: "guidelines.html", target: "_blank" }, "Read the guidelines")),
      msg),
    h("p", { class: "muted" }, "Your answers are saved in this browser only. Use the same browser on the same device, and export your work after every batch."));
}

// ---------- home ----------
function r0Done() { const r = loadRound("r0"); return !!(r.consent && r.background && r.quiz && r.quiz.passed); }
function r1Progress() {
  const rel = D.relations, rows = loadRound("r1").rows;
  const done = rel.filter(r => rowComplete(rows[r.id])).length;
  return { done, total: rel.length };
}
function renderHome() {
  const cards = D.rounds.filter(r => r.who.includes(S.role)).map(r => {
    let status, action = null;
    if (r.id === "r0") {
      status = r0Done() ? h("span", { class: "pill ok" }, "done") : h("span", { class: "pill" }, "start here");
      action = h("a", { href: "#/r0" }, r0Done() ? "Review" : "Start");
    } else if (r.id === "r1" && r.open) {
      const p = r1Progress();
      status = h("span", { class: p.done === p.total ? "pill ok" : "pill" }, `${p.done} / ${p.total}`);
      action = r0Done() ? h("a", { href: "#/r1" }, p.done ? "Continue" : "Start") : h("span", { class: "muted" }, "finish onboarding first");
    } else {
      status = h("span", { class: "pill later" }, "opens later");
    }
    return h("div", { class: "card" }, h("div", { class: "rel-head" }, h("strong", {}, r.title), status),
             h("p", { class: "muted", style: "margin:4px 0 8px" }, r.about), action);
  });
  const fileIn = h("input", { type: "file", accept: "application/json", hidden: true,
                              onchange: e => e.target.files[0] && importFile(e.target.files[0]) });
  setMain(h("h1", {}, `Welcome, ${S.handle}`),
    h("p", { class: "muted" }, "Work through the rounds in order. Your answers save automatically in this browser."),
    ...cards,
    h("h2", {}, "Your files"),
    h("div", { class: "row" },
      h("button", { class: "primary", onclick: exportAll }, "Export my work"),
      h("button", { onclick: () => fileIn.click() }, "Restore from a file"), fileIn,
      h("a", { href: "guidelines.html", target: "_blank" }, "Guidelines")),
    h("p", { class: "muted" }, "Send each exported file to the team. If you change browser or device, restore your last file there first."));
}

// ---------- R0: onboarding ----------
function renderR0() {
  const data = loadRound("r0");
  const bg = data.background || {};
  const field = (key, labelText, el) => { el.id = `bg-${key}`; el.value = bg[key] || ""; return h("div", {}, h("label", { for: el.id }, labelText), el); };
  const sel = (opts) => h("select", {}, h("option", { value: "" }, "choose"), ...opts.map(o => h("option", { value: o }, o)));
  const consent = h("input", { type: "checkbox", id: "consent" }); consent.checked = !!data.consent;
  const read = h("input", { type: "checkbox", id: "read" }); read.checked = !!data.read_guidelines;
  const fields = [
    field("region", "City or district where you grew up", h("input", { type: "text" })),
    field("dialect", "What do you call the dialect you speak?", h("input", { type: "text" })),
    field("home_languages", "Languages spoken in your home", h("input", { type: "text" })),
    field("age_band", "Age", sel(["18-24", "25-34", "35-44", "45-54", "55+"])),
    field("sex", "Sex", sel(["woman", "man", "prefer not to say"])),
    field("typing", "How do you usually type your language in its own script?", sel(["phone keyboard", "computer keyboard", "both", "I rarely type it"])),
    field("roman_use", "Do you also write your language in Roman letters (e.g. on WhatsApp)?", sel(["often", "sometimes", "never"])),
  ];
  const quizBox = h("div");
  function drawQuiz() {
    const q = data.quiz || {};
    quizBox.replaceChildren(...D.quiz.map((item, i) => h("fieldset", {},
      h("legend", {}, `${i + 1}. ${item.q}`),
      h("div", { class: "choices" }, ...item.options.map((o, j) => {
        const r = h("input", { type: "radio", name: `q${i}`, value: j });
        if (q.answers && q.answers[i] === j) r.checked = true;
        return h("label", {}, r, o);
      })),
      q.checked && q.answers[i] !== item.answer ? h("div", { class: "warn" }, `Not quite. The answer is: ${item.options[item.answer]}`) : null)));
  }
  drawQuiz();
  const status = h("p");
  function save() {
    const b = {};
    for (const f of fields) { const el = $("input,select", f); b[el.id.slice(3)] = el.value.trim(); }
    data.background = b; data.consent = consent.checked; data.read_guidelines = read.checked;
    const answers = D.quiz.map((_, i) => { const r = $(`input[name=q${i}]:checked`); return r ? +r.value : null; });
    const score = answers.filter((a, i) => a === D.quiz[i].answer).length;
    data.quiz = { answers, score, passed: score === D.quiz.length, checked: true,
                  attempts: ((data.quiz && data.quiz.attempts) || 0) + 1 };
    const missing = Object.entries(b).filter(([, v]) => !v).length;
    saveRound("r0", data); drawQuiz();
    if (!consent.checked) status.textContent = "Please tick the consent box to take part.";
    else if (missing) status.textContent = "Please fill every background field.";
    else if (!data.quiz.passed) status.textContent = `${score} of ${D.quiz.length} correct. Read the notes above and try again.`;
    else { status.textContent = "Onboarding complete."; setTimeout(() => go("#/home"), 600); return; }
    status.className = "bad";
  }
  setMain(h("h1", {}, "Onboarding"),
    h("div", { class: "card" }, h("h2", { style: "margin-top:0" }, "Consent"),
      h("p", {}, "You are helping build KINSHIFT, a research benchmark of kinship words in Pakistani languages. " +
        "Your answers will be published as part of the dataset under your handle, never your name. " +
        "Your background answers are reported only in summary (for example, how many annotators came from each region). " +
        "The page records how long you spend on each row and when you paste text, to check data quality. " +
        "You can stop at any time."),
      h("div", { class: "choices" }, h("label", {}, consent, "I agree to take part on these terms."))),
    h("div", { class: "card" }, h("h2", { style: "margin-top:0" }, "About you"), h("div", { class: "grid" }, ...fields)),
    h("div", { class: "card" }, h("h2", { style: "margin-top:0" }, "Guidelines"),
      h("p", {}, h("a", { href: "guidelines.html", target: "_blank" }, "Open the guidelines"), " and read them fully before starting."),
      h("div", { class: "choices" }, h("label", {}, read, "I have read the guidelines."))),
    h("div", { class: "card" }, h("h2", { style: "margin-top:0" }, "Quick check"),
      h("p", { class: "muted" }, "Five questions to make sure the task is clear. You can retry."), quizBox),
    h("div", { class: "nav" }, h("a", { href: "#/home" }, "Back"), h("button", { class: "primary", onclick: save }, "Save and check")),
    status);
}

// ---------- R1: kinship words ----------
const WORD = { F: "father", M: "mother", B: "brother", Z: "sister", S: "son", D: "daughter", H: "husband", W: "wife" };
const AGE = { e: "elder ", y: "younger " };
const LATIN = /[A-Za-z]/, ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

function rowComplete(r) {
  if (!r || !r.confidence) return false;
  return !!((r.reference_native && r.reference_roman) || r.same_word_as || (r.no_single_word && r.phrase_native));
}
function batches() {
  const out = [];
  for (const r of D.relations) {
    let b = out.find(x => x.group === r.group);
    if (!b) out.push(b = { group: r.group, tier: r.tier, items: [] });
    b.items.push(r);
  }
  return out;
}
function speakerNote(r) {
  if (r.ego_sex === "f") return "The speaker is a married woman.";
  if (r.ego_sex === "m") return "The speaker is a married man.";
  return null;
}
function treeSVG(r) {
  const NS = "http://www.w3.org/2000/svg";
  const s = (tag, attrs, text) => { const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); if (text) el.textContent = text; return el; };
  const nodes = [{ label: "you", gen: 0, sex: null }];
  let gen = 0;
  for (const st of r.steps) {
    gen += "FM".includes(st.rel) ? 1 : "SD".includes(st.rel) ? -1 : 0;
    nodes.push({ label: (AGE[st.age] || "") + WORD[st.rel], gen, sex: "FBSH".includes(st.rel) ? "m" : "f", rel: st.rel });
  }
  const maxG = Math.max(...nodes.map(n => n.gen)), minG = Math.min(...nodes.map(n => n.gen));
  const W = 120, Hh = 62, padY = 22;
  const width = nodes.length * W, height = (maxG - minG) * Hh + 2 * padY + 26;
  const svg = s("svg", { viewBox: `0 0 ${width} ${height}`, class: "tree", role: "img",
                         "aria-label": "you, then " + nodes.slice(1).map(n => n.label).join(", then ") });
  const pos = nodes.map((n, i) => ({ x: i * W + W / 2, y: padY + (maxG - n.gen) * Hh }));
  for (let i = 1; i < nodes.length; i++) {
    const a = pos[i - 1], b = pos[i];
    svg.append(s("path", { d: `M${a.x},${a.y} L${b.x},${b.y}`, class: "edge" + ("HW".includes(nodes[i].rel) ? " spouse" : "") }));
  }
  nodes.forEach((n, i) => {
    const { x, y } = pos[i], last = i === nodes.length - 1;
    const cls = i === 0 ? "node ego" : "node" + (last ? " target" : "");
    if (n.sex === "m") svg.append(s("rect", { x: x - 11, y: y - 11, width: 22, height: 22, rx: 3, class: cls }));
    else if (n.sex === "f") svg.append(s("circle", { cx: x, cy: y, r: 12, class: cls }));
    else svg.append(s("polygon", { points: `${x},${y - 12} ${x + 12},${y} ${x},${y + 12} ${x - 12},${y}`, class: cls }));
    svg.append(s("text", { x, y: y + 28, "text-anchor": "middle", "font-weight": last ? "700" : "400" }, n.label));
  });
  return svg;
}

function renderR1() {
  if (!r0Done()) return go("#/r0");
  const rows = loadRound("r1").rows;
  const list = batches().map((b, i) => {
    const done = b.items.filter(r => rowComplete(rows[r.id])).length;
    return h("tr", {}, h("td", {}, h("a", { href: `#/r1/${encodeURIComponent(b.group)}` }, `${i + 1}. ${b.group}`)),
      h("td", { class: "muted" }, b.tier === "far" ? "distant relatives" : ""),
      h("td", { style: "width:30%" }, h("div", { class: "bar" }, h("i", { style: `width:${(100 * done / b.items.length).toFixed(0)}%` }))),
      h("td", { style: "text-align:right" }, `${done}/${b.items.length}`));
  });
  const p = r1Progress();
  setMain(h("h1", {}, "Kinship words"),
    h("p", { class: "muted" }, `${p.done} of ${p.total} relatives done. Work in order; export after each batch.`),
    h("div", { class: "card" }, h("table", { class: "prog" }, ...list)),
    h("div", { class: "nav" }, h("a", { href: "#/home" }, "Back"), h("button", { onclick: exportAll }, "Export my work")));
}

function renderR1Batch(group) {
  if (!r0Done()) return go("#/r0");
  const all = batches(), idx = all.findIndex(b => b.group === group);
  if (idx < 0) return go("#/r1");
  const b = all[idx], data = loadRound("r1");
  const cards = b.items.map((r, i) => relationCard(r, data, `${i + 1}/${b.items.length}`));
  const prev = all[idx - 1], next = all[idx + 1];
  setMain(h("p", { class: "muted" }, h("a", { href: "#/r1" }, "Kinship words"), ` › batch ${idx + 1} of ${all.length}`),
    h("h1", {}, b.group), ...cards,
    h("div", { class: "nav" },
      prev ? h("a", { href: `#/r1/${encodeURIComponent(prev.group)}` }, `‹ ${prev.group}`) : h("span"),
      h("button", { onclick: exportAll }, "Export my work"),
      next ? h("a", { href: `#/r1/${encodeURIComponent(next.group)}` }, `${next.group} ›`) : h("a", { href: "#/r1" }, "All batches")));
}

function relationCard(r, data, counter) {
  const row = data.rows[r.id] || (data.rows[r.id] = {});
  const card = h("div", { class: "card" + (rowComplete(row) ? " done" : ""), id: `rel-${r.id}` });
  let focusStart = null;
  function touch() {
    const now = new Date().toISOString();
    row.first_edit = row.first_edit || now; row.last_edit = now;
    card.classList.toggle("done", rowComplete(row));
    saveRound("r1", data);
  }
  card.addEventListener("focusin", () => { focusStart = focusStart || Date.now(); });
  card.addEventListener("focusout", (e) => {
    if (card.contains(e.relatedTarget)) return;
    if (focusStart) { row.active_ms = (row.active_ms || 0) + Math.min(Date.now() - focusStart, 600000); focusStart = null; saveRound("r1", data); }
  });
  card.addEventListener("paste", () => { row.pastes = (row.pastes || 0) + 1; touch(); });

  function input(key, kind, placeholder) {
    const el = h(kind === "area" ? "textarea" : "input", { type: "text", placeholder: placeholder || "",
      class: kind === "native" ? "native" : "", dir: kind === "native" ? "rtl" : "auto",
      lang: kind === "native" ? S.language : (kind === "roman" ? "en" : null) });
    el.value = row[key] || "";
    const warn = h("div", { class: "warn" });
    const check = () => {
      const v = el.value;
      warn.textContent = kind === "native" && LATIN.test(v) ? "This box is for your language's own script. Put Roman spelling in the Roman box."
        : kind === "roman" && ARABIC.test(v) ? "This box is for Roman letters only." : "";
    };
    el.addEventListener("input", () => { row[key] = el.value; check(); touch(); });
    if (kind === "native") {
      el.addEventListener("focus", () => showPalette(el));
      el.addEventListener("blur", () => setTimeout(() => {
        if (!document.activeElement || !document.activeElement.classList.contains("native")) $("#palette").hidden = true;
      }, 150));
    }
    check();
    return [el, warn];
  }
  const pair = (title, nk, rk, hint) => h("fieldset", {}, h("legend", {}, title), hint ? h("p", { class: "muted", style: "margin:0 0 6px" }, hint) : null,
    h("div", { class: "grid" },
      h("div", {}, h("label", {}, "In your script"), ...input(nk, "native")),
      h("div", {}, h("label", {}, "In Roman letters"), ...input(rk, "roman", "as you would type it"))));

  const same = h("select", {}, h("option", { value: "" }, "no, it has its own word"),
    ...D.relations.filter(x => x.id !== r.id).map(x => h("option", { value: x.id }, x.path_en)));
  same.value = row.same_word_as || "";
  same.addEventListener("change", () => { row.same_word_as = same.value; touch(); });

  const noWord = h("input", { type: "checkbox" }); noWord.checked = !!row.no_single_word;
  const phraseBox = h("div", { hidden: !row.no_single_word }, h("div", { class: "grid" },
    h("div", {}, h("label", {}, "Phrase people use, in your script"), ...input("phrase_native", "native")),
    h("div", {}, h("label", {}, "Phrase in Roman letters"), ...input("phrase_roman", "roman"))));
  noWord.addEventListener("change", () => { row.no_single_word = noWord.checked; phraseBox.hidden = !noWord.checked; touch(); });

  const conf = h("div", { class: "row" }, ...["sure", "not sure"].map(v => {
    const rb = h("input", { type: "radio", name: `conf-${r.id}`, value: v }); rb.checked = row.confidence === v;
    rb.addEventListener("change", () => { row.confidence = v; touch(); });
    return h("div", { class: "choices" }, h("label", {}, rb, v));
  }));

  const variants = input("roman_variants", "roman", "other spellings, separated by commas");
  const female = r.ego_sex === "m/f" ? pair("If a woman says it, is the word different?", "female_native", "female_roman", "Leave empty if men and women use the same word.") : null;
  const note = speakerNote(r);
  card.append(...[
    h("div", { class: "rel-head" }, h("span", { class: "rel-path" }, r.path_en), h("span", { class: "rel-id" }, `${counter} · ${r.id}`)),
    note ? h("div", { class: "speaker" }, note) : null,
    treeSVG(r),
    pair("Word used when talking ABOUT this relative", "reference_native", "reference_roman"),
    h("div", { style: "margin-top:6px" }, h("label", {}, "Other Roman spellings people use"), ...variants),
    pair("Word used when talking TO this relative, if different", "address_native", "address_roman", "Leave empty if it is the same word."),
    female,
    h("fieldset", {}, h("legend", {}, "Only if needed"),
      h("label", {}, "Is it the same word as another relative?"), same,
      h("div", { class: "choices", style: "margin-top:8px" }, h("label", {}, noWord, "There is no single word for this relative")), phraseBox,
      h("div", { class: "grid", style: "margin-top:8px" },
        h("div", {}, h("label", {}, "Words added for elder / younger (e.g. big / small), if any"), ...input("age_modifier", "text")),
        h("div", {}, h("label", {}, "Different words in other regions or communities"), ...input("regional_note", "text")))),
    h("div", { style: "margin-top:8px" }, h("label", {}, "Notes"), ...input("notes", "area")),
    h("fieldset", {}, h("legend", {}, "How sure are you?"), conf)].filter(Boolean));
  return card;
}

function showPalette(target) {
  focusedNative = target;
  const pal = $("#palette");
  pal.replaceChildren(...lang().palette.split(" ").map(ch => h("button", { type: "button",
    onmousedown: e => e.preventDefault(),
    onclick: () => {
      const el = focusedNative; if (!el) return;
      const [a, b] = [el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length];
      el.setRangeText(ch, a, b, "end"); el.dispatchEvent(new Event("input")); el.focus();
    } }, ch)),
    h("button", { type: "button", onclick: () => { pal.hidden = true; } }, "×"));
  pal.hidden = false;
}

// ---------- start ----------
(async function start() {
  try {
    const [assignments, languages, rounds, quiz, relations] = await Promise.all(
      ["data/assignments.json", "data/languages.json", "data/rounds.json", "data/r0/quiz.json", "data/r1/relations.json"].map(getJSON));
    Object.assign(D, { assignments, languages, rounds, quiz, relations });
    route();
  } catch (e) {
    setMain(h("p", { class: "bad" }, "The page could not load its data. Refresh, and tell the team if it keeps happening."), h("pre", {}, String(e)));
  }
})();
