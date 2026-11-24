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
  // Balochi: only the Arabic-keyboard forms of keheh and yeh, and ۏ, which some write for w.
  const BAL_MAP = { "ك": "ک", "ي": "ی", "ى": "ی", "ۏ": "و" };

  function nativeNorm(text, lang) {
    let t = (text || "").normalize("NFC").trim().replace(HARAKAT, "");
    if (URDU_LIKE.has(lang)) t = t.replace(/[‌‍‎‏]/g, "").replace(/[كيىه]/g, c => URDU_MAP[c]);
    if (lang === "bal") t = t.replace(/[‌‍‎‏]/g, "").replace(/[كيىۏ]/g, c => BAL_MAP[c]);
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

  // Comparable form of one word: normalised native text, the same without spaces (c), and its set
  // of Roman spellings. Two words are the same when they differ only in spaces (پڙڏاڏو, پڙ ڏاڏو)
  // or diacritics. n, with its spaces, stays the id the reviewer's ratings are saved under.
  // Comparison form: also ignores hamza written on a letter (سؤٽ, سوٽ) and a hamza ending a word
  // (ڀاڻيجيءَ, ڀاڻيجي). Mirrors compact() in merge.py.
  function compact(n, lang) {
    let t = n.split(" ").map(x => x.replace(/\u0621+$/, "")).join(" ");
    t = t.normalize("NFD").replace(/[\u0654\u0655]/g, "").normalize("NFC");
    // ݨ typed as ن (most keyboards lack ݨ); a word ending in ئ with its final ی left off (تائ, تائی).
    if (URDU_LIKE.has(lang)) t = t.replace(/[كيىه]/g, c => URDU_MAP[c]).replace(/ݨ/g, "ن").split(" ").map(x => x.replace(/ئ$/, "ئی")).join(" ");
    return t.replace(/[\s\u200c\u200d]/g, "");
  }
  // چاچا جی is چاچا: an honorific after the word is not part of it (Urdu, Punjabi, Saraiki).
  const HON_NATIVE = / (?:جی|جان)$/, HON_ROMAN = / (?:jee|ji|jaan|jan)$/;
  function key(w, lang) {
    const n = nativeNorm(w.native, lang);
    if (!URDU_LIKE.has(lang)) return { n, c: compact(n, lang), r: new Set(variants(w.roman)), f: false };
    const c = compact(n.replace(HON_NATIVE, ""), lang), r = variants(w.roman).map(v => v.replace(HON_ROMAN, ""));
    if (lang !== "pnb") return { n, c, r: new Set(r), f: false };
    // Spoken Punjabi says پ where written Punjabi has بھ (pain, bhain: sister); both are the same word.
    // f: the fold changed something, which lets one more letter differ (پڑا, بھرا). Mirrors merge.py.
    const fc = c.replace(/بھ/g, "پ");
    return { n, c: fc, r: new Set(r.map(v => v.replace(/bh/g, "p"))), f: fc !== c };
  }
  function edits(a, b) {
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) cur.push(Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0)));
      prev = cur;
    }
    return prev[b.length];
  }
  // Same word: equal comparison forms; or, when one side has no native text, a shared Roman spelling;
  // or a shared Roman spelling and native spellings one letter apart inside the word, same first and
  // last letter (سورا, سوہرا: sohra). The last letter often marks gender (ماسات, ماساتي).
  function same(x, y) {
    if (x.c && x.c === y.c) return true;
    const romanShared = [...x.r].some(v => y.r.has(v));
    if (x.c && y.c) {
      const close = x.c[0] === y.c[0] && x.c.at(-1) === y.c.at(-1) && edits(x.c, y.c) <= 1;
      return close && (romanShared || x.f || y.f);   // Punjabi پ/بھ fold: no shared Roman spelling needed
    }
    return romanShared;
  }
  // One box holding several words (ابا، پیو) is split into its words. Mirrors split_box() in merge.py.
  const QUOTES = "\"'\u201c\u201d\u2018\u2019\u00ab\u00bb";
  const stripQ = (t) => { let s = t.trim(); while (s && QUOTES.includes(s[0])) s = s.slice(1); while (s && QUOTES.includes(s[s.length - 1])) s = s.slice(0, -1); return s.trim(); };
  const stripQS = (t) => { let s = t; while (s && (QUOTES + " ").includes(s[0])) s = s.slice(1); while (s && (QUOTES + " ").includes(s[s.length - 1])) s = s.slice(0, -1); return s; };
  function splitBox(w) {
    const native = stripQ(w.native || ""), roman = stripQ(w.roman || "");
    const parts = native.split(/\s*[\u060c,]\s*/).map(stripQS).filter(Boolean);
    if (parts.length <= 1) return (native || roman) ? [{ native, roman }] : [];
    const romans = roman.split(",").map(stripQS);
    if (romans.length === parts.length) return parts.map((n, i) => ({ native: n, roman: romans[i] }));
    return [{ native: parts[0], roman }, ...parts.slice(1).map(n => ({ native: n, roman: "" }))];
  }
  const keys = (ws, lang) => (ws || []).filter(filled).flatMap(splitBox).map(w => key(w, lang));
  function words(row, lang) { return keys((upgrade(row) || {}).words, lang); }
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
    const ca = keys(callSet(rowA), lang), cb = keys(callSet(rowB), lang);
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

  // guideVersion: the current guidelines version; onboarding passed on an older one does not count.
  function progress(payload, relations, askAddress, guideVersion) {
    const rounds = (payload && payload.rounds) || {}, r0 = rounds.r0 || {}, rows = (rounds.r1 || {}).rows || {};
    const quiz = r0.quiz || {}, guide = r0.guide || {};
    const rel = Object.fromEntries(relations.map(r => [r.id, r]));
    const done = Object.keys(rows).filter(k => r1Done(rows[k], rel[k], askAddress));
    const secs = done.map(k => (rows[k].active_ms || 0) / 1000).filter(s => s > 0).sort((x, y) => x - y);
    const vals = Object.values(rows).map(upgrade);
    return {
      onboarded: !!(r0.consent && quiz.passed && (guideVersion == null || quiz.version === guideVersion)),
      guide_wrong: quiz.wrong ?? null,
      guide_minutes: Math.round(Object.values(guide.parts || {}).reduce((n, p) => n + (p.ms || 0), 0) / 60000),
      background: r0.background || null, ui_lang: (payload && payload.ui_lang) || null,
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

  // The two annotators to compare: most relatives answered first, ties by handle (mirrors merge.py).
  function pickAnnotators(list) {
    const n = (x) => Object.values(x.rows || {}).filter(answered).length;
    return list.map(x => [x, n(x)]).sort((a, b) => b[1] - a[1] || a[0].handle.localeCompare(b[0].handle)).map(x => x[0]);
  }

  const api = { pickAnnotators, nativeNorm, romanNorm, variants, upgrade, filled, answered, r1Done, compare, agreement, union, callList, progress };
  if (typeof module !== "undefined") module.exports = api; else root.Logic = api;
})(typeof window !== "undefined" ? window : globalThis);
