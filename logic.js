"use strict";
// Pure functions shared by the dashboard and the tests. No DOM here.
// Mirrors kinshift/annotation/normalize.py and merge.py; tests/test_annotation.py
// checks that both give the same results.
//
// An R1 answer row looks like:
//   { words: [{native, roman}, ...],   // first = main word; Roman box may hold "abbu, abbo"
//     call:  [{native, roman}, ...],   // only for elders, only if they are called something else
//     unsure: bool, notes, active_ms, pastes, first_edit, last_edit }

(function (root) {
  const HARAKAT = /[ً-ْٰـ]/g;
  const URDU_LIKE = new Set(["ur", "pnb", "skr"]);
  const URDU_MAP = { "ك": "ک", "ي": "ی", "ى": "ی", "ه": "ہ" };

  function nativeNorm(text, lang) {
    let t = (text || "").normalize("NFC").trim().replace(HARAKAT, "");
    if (URDU_LIKE.has(lang)) t = t.replace(/[‌‍‎‏]/g, "").replace(/[كيىه]/g, c => URDU_MAP[c]);
    return t.replace(/\s+/g, " ");
  }
  function romanNorm(text) {
    return (text || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
      .replace(/[^a-z0-9' -]/g, "").replace(/\s+/g, " ");
  }
  function variants(field) {
    return (field || "").split(/[,|،]/).map(romanNorm).filter(Boolean);
  }

  // Answers saved before the word-list form used reference_native / address_native fields.
  function upgrade(row) {
    if (!row || row.words) return row;
    const words = [];
    if (row.reference_native || row.reference_roman)
      words.push({ native: row.reference_native || "", roman: [row.reference_roman, row.roman_variants].filter(Boolean).join(", ") });
    else if (row.no_single_word && (row.phrase_native || row.phrase_roman))
      words.push({ native: row.phrase_native || "", roman: row.phrase_roman || "" });
    const call = row.address_same === "no" && (row.address_native || row.address_roman)
      ? [{ native: row.address_native || "", roman: row.address_roman || "" }] : [];
    const call_differs = row.address_same === "no" ? "yes" : row.address_same === "yes" ? "no" : undefined;
    return { ...row, words, call, call_differs, unsure: row.unsure ?? row.confidence === "not sure" };
  }

  const filled = (w) => !!(w && ((w.native || "").trim() || (w.roman || "").trim()));
  const full = (w) => !!(w && (w.native || "").trim() && (w.roman || "").trim());
  // Has a main word in both scripts: enough to compare two annotators.
  function answered(row) { const r = upgrade(row); return full(r && r.words && r.words[0]); }
  // Finished on screen: main word, sure / not sure, and (when asked, for elders) the face-to-face answer.
  function r1Done(row, rel, askAddress) {
    const r = upgrade(row);
    if (!answered(r) || !r.confidence) return false;
    if (!askAddress || !(rel && rel.elder)) return true;
    return r.call_differs === "no" || (r.call_differs === "yes" && full((r.call || [])[0]));
  }

  // Comparable form of one word: normalised native text and its set of Roman spellings.
  function key(w, lang) { return { n: nativeNorm(w.native, lang), r: new Set(variants(w.roman)) }; }
  function same(x, y) { return (x.n && x.n === y.n) || (!x.n || !y.n ? [...x.r].some(v => y.r.has(v)) : false); }
  function words(row, lang) { const r = upgrade(row) || {}; return (r.words || []).filter(filled).map(w => key(w, lang)); }
  const explicitCalls = (row) => { const r = upgrade(row) || {}; return r.call_differs === "no" ? [] : (r.call || []).filter(filled); };
  // Words someone may call this elder: the calling words written, else any of their words.
  function callSet(row) { const c = explicitCalls(row); return c.length ? c : ((upgrade(row) || {}).words || []).filter(filled); }

  // agree: same main word. order: they share a word, but not the main one. differ: nothing shared.
  // call_differs: for elders, the words used to call them share nothing.
  function compare(rowA, rowB, rel, lang) {
    if (!answered(rowA) || !answered(rowB)) return { status: "missing" };
    const a = words(rowA, lang), b = words(rowB, lang);
    const shared = a.some(x => b.some(y => same(x, y)));
    const status = same(a[0], b[0]) ? "agree" : shared ? "order" : "differ";
    // Calling only differs when someone wrote calling words; otherwise it follows the word decision.
    const ca = callSet(rowA).map(w => key(w, lang)), cb = callSet(rowB).map(w => key(w, lang));
    const call_differs = !!(rel && rel.elder) && !!(explicitCalls(rowA).length || explicitCalls(rowB).length)
      && !ca.some(x => cb.some(y => same(x, y)));
    return { status, call_differs, review: status === "differ" || call_differs };
  }

  function agreement(relations, rowsA, rowsB, lang) {
    let compared = 0, main = 0, shared = 0, coreCompared = 0, coreMain = 0;
    const disagreements = [];
    for (const rel of relations) {
      const res = compare(rowsA[rel.id], rowsB[rel.id], rel, lang);
      if (res.status === "missing") continue;
      compared++;
      if (res.status === "agree") main++;
      if (res.status !== "differ") shared++;
      if (rel.tier === "core") { coreCompared++; if (res.status === "agree") coreMain++; }
      if (res.review) disagreements.push({ id: rel.id, path_en: rel.path_en,
        on: [res.status === "differ" ? "word" : null, res.call_differs ? "call" : null].filter(Boolean),
        a: upgrade(rowsA[rel.id]), b: upgrade(rowsB[rel.id]) });
    }
    const pct = (x, n) => n ? x / n : null;
    return { compared, main_agreement: pct(main, compared), shared_agreement: pct(shared, compared),
             core_main_agreement: pct(coreMain, coreCompared), disagreements };
  }

  // Distinct words across both annotators, for the reviewer to rate.
  function union(listA, listB, lang) {
    const out = [];
    const ka = (listA || []).filter(filled).map(w => key(w, lang)), kb = (listB || []).filter(filled).map(w => key(w, lang));
    for (const w of [...(listA || []), ...(listB || [])].filter(filled)) {
      const k = key(w, lang);
      if (!out.some(o => same(o.k, k))) out.push({ native: w.native || "", roman: w.roman || "", k, id: k.n || [...k.r][0] || "" });
    }
    return out.map(({ native, roman, k, id }) => ({ native, roman, id,
      count: (ka.some(x => same(x, k)) ? 1 : 0) + (kb.some(x => same(x, k)) ? 1 : 0) }));
  }
  // What the reviewer compares for calling an elder: the call words, or the main word if none.
  const callList = callSet;

  function progress(payload, relations, askAddress) {
    const rounds = (payload && payload.rounds) || {}, r0 = rounds.r0 || {}, rows = (rounds.r1 || {}).rows || {};
    const rel = Object.fromEntries(relations.map(r => [r.id, r]));
    const done = Object.keys(rows).filter(k => r1Done(rows[k], rel[k], askAddress));
    const secs = done.map(k => (rows[k].active_ms || 0) / 1000).filter(s => s > 0).sort((x, y) => x - y);
    const vals = Object.values(rows).map(upgrade);
    return {
      onboarded: !!(r0.consent && r0.quiz && r0.quiz.passed), background: r0.background || null,
      r1_done: done.length, r1_total: relations.length,
      words: vals.reduce((n, v) => n + ((v && v.words) || []).filter(filled).length, 0),
      not_sure: vals.filter(v => v && v.unsure).length,
      pastes: vals.reduce((n, v) => n + ((v && v.pastes) || 0), 0),
      median_seconds: secs.length ? Math.round(secs[Math.floor((secs.length - 1) / 2)]) : null,
      fast_rows: secs.filter(s => s < 5).length,
      r1b_done: Object.values((rounds.r1b || {}).rows || {}).filter(v => v.main || v.call_main).length,
      r2_done: Object.values((rounds.r2 || {}).rows || {}).filter(v => v.natural).length,
    };
  }

  const api = { nativeNorm, romanNorm, variants, upgrade, filled, answered, r1Done, compare, agreement, union, callList, progress };
  if (typeof module !== "undefined") module.exports = api; else root.Logic = api;
})(typeof window !== "undefined" ? window : globalThis);
