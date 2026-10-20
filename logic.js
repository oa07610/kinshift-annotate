"use strict";
// Pure functions shared by the dashboard and the tests. No DOM here.
// Normalisation and agreement mirror kinshift/annotation/normalize.py and merge.py;
// tests/test_annotation.py checks that both give the same results.

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

  function r1Done(r, rel) {
    if (!r || !r.confidence) return false;
    if (r.same_word_as) return true;
    if (r.no_single_word) return !!r.phrase_native;
    if (!(r.reference_native && r.reference_roman)) return false;
    if (rel && rel.tier === "far") return true;
    return r.address_same === "yes" || (r.address_same === "no" && !!r.address_native);
  }

  function resolved(rows, id) {
    let cur = rows[id] || {}, n = 0;
    while (cur.same_word_as && n < 6) { cur = rows[cur.same_word_as] || {}; n++; }
    return cur;
  }
  function word(rows, id, lang) {
    const row = resolved(rows, id);
    if (row.no_single_word) {
      return { native: nativeNorm(row.phrase_native, lang), roman: new Set([romanNorm(row.phrase_roman)].filter(Boolean)), address: null, phrase: true };
    }
    const roman = new Set([romanNorm(row.reference_roman), ...variants(row.roman_variants)].filter(Boolean));
    const address = row.address_same === "no" ? nativeNorm(row.address_native, lang) : null;
    return { native: nativeNorm(row.reference_native, lang), roman, address, phrase: false };
  }
  function compare(rowsA, rowsB, id, lang) {
    const a = rowsA[id], b = rowsB[id];
    if (!a || !a.confidence || !b || !b.confidence) return { status: "missing" };
    const wa = word(rowsA, id, lang), wb = word(rowsB, id, lang), on = [];
    if (wa.native !== wb.native || wa.phrase !== wb.phrase) on.push("word");
    if ((wa.address || wa.native) !== (wb.address || wb.native) && !on.includes("word")) on.push("address");
    return { status: on.length ? "differ" : "agree", on, roman_overlap: [...wa.roman].some(x => wb.roman.has(x)) };
  }

  // Agreement and disagreement items for one language, from the two annotators' R1 rows.
  function agreement(relations, rowsA, rowsB, lang) {
    let compared = 0, agree = 0, coreCompared = 0, coreAgree = 0;
    const disagreements = [];
    for (const rel of relations) {
      const res = compare(rowsA, rowsB, rel.id, lang);
      if (res.status === "missing") continue;
      compared++; if (res.status === "agree") agree++;
      if (rel.tier === "core") { coreCompared++; if (res.status === "agree") coreAgree++; }
      if (res.status === "differ") disagreements.push({ id: rel.id, path_en: rel.path_en, on: res.on,
        a: rowsA[rel.id], b: rowsB[rel.id], a_resolved: resolved(rowsA, rel.id), b_resolved: resolved(rowsB, rel.id) });
    }
    return { compared, agree, agreement: compared ? agree / compared : null,
             core_agreement: coreCompared ? coreAgree / coreCompared : null, disagreements };
  }

  // Per-person progress numbers for the admin view.
  function progress(payload, relations) {
    const rounds = (payload && payload.rounds) || {}, r0 = rounds.r0 || {}, rows = (rounds.r1 || {}).rows || {};
    const tier = Object.fromEntries(relations.map(r => [r.id, r]));
    const done = Object.keys(rows).filter(k => r1Done(rows[k], tier[k]));
    const secs = done.map(k => (rows[k].active_ms || 0) / 1000).filter(s => s > 0).sort((x, y) => x - y);
    const median = secs.length ? secs[Math.floor((secs.length - 1) / 2)] : null;
    const vals = Object.values(rows);
    return {
      onboarded: !!(r0.consent && r0.quiz && r0.quiz.passed), background: r0.background || null,
      r1_done: done.length, r1_total: relations.length,
      not_sure: vals.filter(v => v.confidence === "not sure").length,
      pastes: vals.reduce((n, v) => n + (v.pastes || 0), 0),
      median_seconds: median == null ? null : Math.round(median),
      fast_rows: secs.filter(s => s < 5).length,
      r1b_done: Object.values((rounds.r1b || {}).rows || {}).filter(v => v.choice).length,
      r2_done: Object.values((rounds.r2 || {}).rows || {}).filter(v => v.natural).length,
    };
  }

  const api = { nativeNorm, romanNorm, variants, r1Done, resolved, word, compare, agreement, progress };
  if (typeof module !== "undefined") module.exports = api; else root.Logic = api;
})(typeof window !== "undefined" ? window : globalThis);
