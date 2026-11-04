"use strict";
// Interface text in English and Urdu, the language switch, and Urdu descriptions of
// relatives. Shared by the dashboard (index.html) and the guidelines page.
// To add an interface language: add a dictionary to UI with the same keys and a
// button label to UI_LANGS; t() falls back to English for any missing key.

const UI_LANGS = { en: "English", ur: "اردو" };

// Small DOM helper shared by every page: h("div", {class: "x", onclick: f}, ...children).
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false)
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  return el;
}
const RTL = new Set(["ur"]);

const UI = {
en: {
  "brand.sub": "Annotation", "nav.guidelines": "Guidelines", "nav.signout": "Sign out",
  "load.error": "The page could not load. Refresh, and tell the team if it keeps happening.",
  "save.local_fail": "Could not save in this browser. Press Download a copy now and tell the team.",
  "net.timeout": "The server is taking too long to answer. Check your internet and try again.",
  "net.bad": "The server sent an unexpected reply. Try again in a minute.",
  "net.offline": "Could not reach the server. Check your internet and try again.",
  "submit.ok": "Submitted. Your work is saved with the KINSHIFT team.",
  "submit.fail": "Could not reach the server. Your work is safe in this browser; it will be sent later.",
  "file.bad": "That file is not a KINSHIFT file.",
  "file.other": "That file belongs to {h}, not you.",
  "file.restored": "Restored {n} answers from your file.",
  "banner.fail": "Could not reach the server yet. Your work is safe in this browser.",
  "banner.fail_short": "Not saved to the server yet.",
  "banner.pending": "You have answers that are not submitted yet. They are sent automatically every few minutes.",
  "banner.pending_short": "Not submitted yet.",
  "btn.submit_now": "Submit now", "btn.submit": "Submit",
  "login.title": "Sign in", "login.name": "Your name", "login.placeholder": "your full name",
  "login.btn": "Sign in", "login.busy": "Signing in…", "login.slow": "Still connecting to the server, a moment more…",
  "login.notfound": "We could not find that name. Type it exactly as the team sent it to you.",
  "login.help": "Type your name exactly as the KINSHIFT team sent it to you. Your answers are saved in this browser and sent to the team automatically.",
  "login.lang": "Choose the language of this page. You can change it at any time at the top.",
  "login.admin": "Team admin", "login.welcome_back": "Welcome back. Restored {n} saved answers.",
  "role.annotator": "volunteer", "role.adjudicator": "reviewer",
  "home.welcome": "Welcome, {name}",
  "home.lead": "{lang} · {role}. Work through the rounds in order; your answers save automatically.",
  "home.rounds": "Your rounds", "home.saving": "Saving",
  "home.saving_text": "Your answers are sent to the team automatically after each group and every few minutes. You can also submit now. Signing in on another device brings your saved work back.",
  "home.download": "Download a copy", "home.restore": "Restore from a file",
  "tag.done": "done", "tag.start": "start here", "tag.after_r0": "after onboarding", "tag.checking": "checking…", "tag.not_ready": "not ready yet",
  "round.r0.title": "Onboarding", "round.r1.title": "Kinship words", "round.r1b.title": "Resolve disagreements", "round.r2.title": "Review questions",
  "round.r0.about": "Consent, a few questions about you, and the guidelines step by step, each part with a short question. About 25 minutes.",
  "round.r1.about": "Give your language's words for 150 relatives. About 3 hours, in as many sittings as you like.",
  "round.r1b.about": "Where the two volunteers gave different words, choose the right one.",
  "round.r2.about": "Check that sample questions read naturally and have the right answer.",
  "r0.title": "Onboarding", "r0.lead": "About 25 minutes. You do this once.",
  "r0.step": "Step {i} of {n}",
  "r0.consent": "Consent",
  "r0.consent_text": "KINSHIFT is a research benchmark of family words in Pakistani languages. Your answers will be published as part of the dataset under a code, never your name. Your background answers are reported only in summary. The page records time spent and pasted text, to check quality. You can stop at any time.",
  "r0.agree": "I agree to take part on these terms.",
  "r0.about_you": "About you",
  "r0.region": "City or district where you grew up", "r0.dialect": "What do you call the dialect you speak?",
  "r0.age": "Age", "r0.sex": "Sex", "r0.choose": "choose",
  "r0.sex.woman": "woman", "r0.sex.man": "man", "r0.sex.none": "prefer not to say",
  "r0.need_consent": "Please tick the consent box to take part.",
  "r0.need_bg": "Please answer all four questions about you.",
  "r0.continue": "Continue", "r0.back": "Back",
  "r0.guide_intro": "Now the guidelines, one part at a time. After each part there are short questions about real situations you will meet. They are not a test of you; they check that the guidelines are clear. A wrong answer only asks you to read the part again.",
  "r0.check": "Check yourself", "r0.answer_all": "Answer the questions above to continue.",
  "r0.wrong": "Not quite. Read this part again and choose once more.",
  "r0.right": "Right.",
  "r0.done_title": "Onboarding complete",
  "r0.done_text": "Thank you. You can now start the kinship words. The guidelines stay available at the top of every page.",
  "r0.done_btn": "Go to Kinship words", "r0.complete": "Onboarding complete.",
  "r0.redo": "The guidelines were updated. Please go through the parts again; your answers about you are kept.",
  "r1.title": "Kinship words",
  "r1.lead": "{done} of {total} relatives done. Go in order; you can stop and come back any time.",
  "r1.distant": "distant relatives", "r1.distant_one": "distant relative", "nav.home": "← Home",
  "r1.q_word": "What do you call this relative?",
  "r1.q_word_hint": "Give the most common word first. If people also use other words, add them.",
  "r1.q_face": "Do you call them by a different word to their face?",
  "r1.no": "No", "r1.yes_diff": "Yes, a different word",
  "r1.q_sure": "How sure are you?", "r1.sure": "Sure", "r1.not_sure": "Not sure",
  "r1.notes": "Notes (optional)",
  "r1.notes_ph": "Optional: words used in other places, a formal word, if women say it differently, anything unclear",
  "w.most": "most common", "w.also": "also", "w.face": "to their face",
  "w.native": "in your script", "w.native_opt": "in your script (optional)",
  "w.roman": "in Roman, as on WhatsApp", "w.roman_short": "in Roman",
  "w.add": "+ another word", "w.up": "↑ most common", "w.up_title": "Make this the most common word", "w.remove": "Remove",
  "w.warn_native": "Use your language's own script here; Roman spelling goes in the other box.",
  "w.warn_roman": "Roman letters only in this box.",
  "speaker.f": "The speaker is a married woman.", "speaker.m": "The speaker is a married man.",
  "nav.prev": "← Previous", "nav.next": "Next →", "nav.finish": "Finish ✓", "nav.next_group": "Next group →", "nav.kbd": "next",
  "pos": "{pos} of {total}",
  "palette": "Letters your keyboard may lack",
  "batch.not_ready": "This round is not ready yet.",
  "rv.used": "Used here", "rv.region": "Other region", "rv.wrong": "Wrong",
  "rv.both": "both volunteers", "rv.one": "one volunteer", "rv.main": "most common",
  "rv.missed": "They both missed the right word", "rv.extra_main": "this is the most common word",
  "rv.diff_words": "different words", "rv.diff_call": "different words for calling them",
  "rv.notes_from": "Volunteers' notes: ", "rv.agreed": "Both volunteers gave this word",
  "rv.only_call": "They differ only on what you call this relative to their face.",
  "rv.words": "Words for this relative", "rv.call_words": "Words used to their face",
  "rv.notes": "Notes (optional)",
  "r2.question": "question", "r2.own": "own script", "r2.roman": "Roman", "r2.options": "Options: ", "r2.answer": "Answer given: ",
  "r2.natural": "Does the question read naturally?", "r2.yes": "Yes", "r2.needs_fix": "No, it needs fixing",
  "r2.rewrite": "Write it the way a speaker would", "r2.correct": "Is the answer right?", "r2.no": "No", "r2.right": "The right answer",
  "g.title": "Annotation guidelines", "g.lead": "Version {v}. About 15 minutes to read. Please read all of it before you start.",
  "g.back": "← Back to the dashboard", "g.toc": "Contents", "g.ref": "What to do when…",
  "g.situation": "Situation", "g.action": "What to do",
},
ur: {
  "brand.sub": "اینوٹیشن", "nav.guidelines": "ہدایات", "nav.signout": "سائن آؤٹ",
  "load.error": "صفحہ نہیں کھل سکا۔ صفحہ دوبارہ لوڈ کریں، اور اگر بار بار ایسا ہو تو ٹیم کو بتائیں۔",
  "save.local_fail": "اس براؤزر میں محفوظ نہیں ہو سکا۔ ابھی ’کاپی ڈاؤن لوڈ کریں‘ دبائیں اور ٹیم کو بتائیں۔",
  "net.timeout": "سرور جواب دینے میں بہت دیر لگا رہا ہے۔ اپنا انٹرنیٹ دیکھیں اور دوبارہ کوشش کریں۔",
  "net.bad": "سرور سے غیر متوقع جواب آیا۔ ایک منٹ بعد دوبارہ کوشش کریں۔",
  "net.offline": "سرور سے رابطہ نہیں ہو سکا۔ اپنا انٹرنیٹ دیکھیں اور دوبارہ کوشش کریں۔",
  "submit.ok": "بھیج دیا گیا۔ آپ کا کام KINSHIFT ٹیم کے پاس محفوظ ہے۔",
  "submit.fail": "سرور سے رابطہ نہیں ہو سکا۔ آپ کا کام اس براؤزر میں محفوظ ہے؛ بعد میں بھیج دیا جائے گا۔",
  "file.bad": "یہ KINSHIFT کی فائل نہیں ہے۔",
  "file.other": "یہ فائل {h} کی ہے، آپ کی نہیں۔",
  "file.restored": "آپ کی فائل سے {n} جوابات واپس آ گئے۔",
  "banner.fail": "ابھی سرور سے رابطہ نہیں ہو سکا۔ آپ کا کام اس براؤزر میں محفوظ ہے۔",
  "banner.fail_short": "ابھی سرور پر محفوظ نہیں ہوا۔",
  "banner.pending": "آپ کے کچھ جوابات ابھی بھیجے نہیں گئے۔ یہ ہر چند منٹ بعد خودبخود بھیج دیے جاتے ہیں۔",
  "banner.pending_short": "ابھی بھیجے نہیں گئے۔",
  "btn.submit_now": "ابھی بھیجیں", "btn.submit": "بھیجیں",
  "login.title": "سائن ان", "login.name": "آپ کا نام", "login.placeholder": "اپنا پورا نام",
  "login.btn": "سائن ان کریں", "login.busy": "سائن ان ہو رہا ہے…", "login.slow": "سرور سے رابطہ ہو رہا ہے، تھوڑا انتظار کریں…",
  "login.notfound": "یہ نام نہیں ملا۔ اپنا نام بالکل ویسے ہی لکھیں جیسے ٹیم نے آپ کو بھیجا ہے۔",
  "login.help": "اپنا نام بالکل ویسے ہی لکھیں جیسے KINSHIFT ٹیم نے آپ کو بھیجا ہے۔ آپ کے جوابات اسی براؤزر میں محفوظ ہوتے ہیں اور خودبخود ٹیم کو بھیج دیے جاتے ہیں۔",
  "login.lang": "اس صفحے کی زبان چنیں۔ آپ اسے کسی بھی وقت اوپر سے بدل سکتے ہیں۔",
  "login.admin": "ٹیم ایڈمن", "login.welcome_back": "دوبارہ خوش آمدید۔ آپ کے {n} محفوظ جوابات واپس آ گئے۔",
  "role.annotator": "رضاکار", "role.adjudicator": "جائزہ کار",
  "home.welcome": "خوش آمدید، {name}",
  "home.lead": "{lang} · {role}۔ مرحلے ترتیب سے مکمل کریں؛ آپ کے جوابات خودبخود محفوظ ہوتے ہیں۔",
  "home.rounds": "آپ کے مرحلے", "home.saving": "محفوظ کرنا",
  "home.saving_text": "آپ کے جوابات ہر گروپ کے بعد اور ہر چند منٹ بعد خودبخود ٹیم کو بھیجے جاتے ہیں۔ آپ خود بھی ابھی بھیج سکتے ہیں۔ کسی دوسرے فون یا کمپیوٹر پر سائن ان کرنے سے آپ کا محفوظ کام واپس آ جاتا ہے۔",
  "home.download": "کاپی ڈاؤن لوڈ کریں", "home.restore": "فائل سے واپس لائیں",
  "tag.done": "مکمل", "tag.start": "یہاں سے شروع کریں", "tag.after_r0": "تعارف کے بعد", "tag.checking": "دیکھا جا رہا ہے…", "tag.not_ready": "ابھی تیار نہیں",
  "round.r0.title": "تعارف", "round.r1.title": "رشتوں کے الفاظ", "round.r1b.title": "اختلافات کا فیصلہ", "round.r2.title": "سوالات کی جانچ",
  "round.r0.about": "رضامندی، آپ کے بارے میں چند سوال، اور ہدایات قدم بہ قدم، ہر حصے کے بعد ایک مختصر سوال کے ساتھ۔ تقریباً 25 منٹ۔",
  "round.r1.about": "150 رشتہ داروں کے لیے اپنی زبان کے الفاظ لکھیں۔ کُل تقریباً 3 گھنٹے، جتنی نشستوں میں چاہیں۔",
  "round.r1b.about": "جہاں دونوں رضاکاروں نے مختلف الفاظ دیے، وہاں درست لفظ چنیں۔",
  "round.r2.about": "دیکھیں کہ نمونے کے سوال فطری لگتے ہیں اور ان کا جواب درست ہے۔",
  "r0.title": "تعارف", "r0.lead": "تقریباً 25 منٹ۔ یہ صرف ایک بار کرنا ہے۔",
  "r0.step": "{n} میں سے حصہ {i}",
  "r0.consent": "رضامندی",
  "r0.consent_text": "KINSHIFT پاکستانی زبانوں کے خاندانی الفاظ پر ایک تحقیقی بینچ مارک ہے۔ آپ کے جوابات ڈیٹاسیٹ کے حصے کے طور پر ایک کوڈ کے تحت شائع ہوں گے، آپ کے نام سے کبھی نہیں۔ آپ کے بارے میں معلومات صرف مجموعی طور پر بتائی جائیں گی۔ معیار جانچنے کے لیے یہ صفحہ لگنے والا وقت اور پیسٹ کیا گیا متن ریکارڈ کرتا ہے۔ آپ کسی بھی وقت رک سکتے ہیں۔",
  "r0.agree": "میں ان شرائط کے تحت حصہ لینے پر راضی ہوں۔",
  "r0.about_you": "آپ کے بارے میں",
  "r0.region": "وہ شہر یا ضلع جہاں آپ پلے بڑھے", "r0.dialect": "آپ جو لہجہ بولتے ہیں، اسے کیا کہتے ہیں؟",
  "r0.age": "عمر", "r0.sex": "جنس", "r0.choose": "چنیں",
  "r0.sex.woman": "عورت", "r0.sex.man": "مرد", "r0.sex.none": "نہیں بتانا چاہتے",
  "r0.need_consent": "حصہ لینے کے لیے رضامندی والے خانے پر نشان لگائیں۔",
  "r0.need_bg": "اپنے بارے میں چاروں سوالوں کے جواب دیں۔",
  "r0.continue": "آگے چلیں", "r0.back": "واپس",
  "r0.guide_intro": "اب ہدایات، ایک ایک حصہ کر کے۔ ہر حصے کے بعد اُن اصل صورتوں کے بارے میں مختصر سوال ہیں جو کام کے دوران آئیں گی۔ یہ آپ کا امتحان نہیں؛ ان سے پتا چلتا ہے کہ ہدایات واضح ہیں۔ غلط جواب پر آپ سے صرف وہ حصہ دوبارہ پڑھنے کو کہا جائے گا۔",
  "r0.check": "خود کو جانچیں", "r0.answer_all": "آگے بڑھنے کے لیے اوپر کے سوالوں کے جواب دیں۔",
  "r0.wrong": "یہ درست نہیں۔ یہ حصہ دوبارہ پڑھیں اور پھر سے چنیں۔",
  "r0.right": "درست۔",
  "r0.done_title": "تعارف مکمل",
  "r0.done_text": "شکریہ۔ اب آپ رشتوں کے الفاظ شروع کر سکتے ہیں۔ ہدایات کا لنک ہر صفحے کے اوپر رہے گا۔",
  "r0.done_btn": "رشتوں کے الفاظ پر جائیں", "r0.complete": "تعارف مکمل ہو گیا۔",
  "r0.redo": "ہدایات میں تبدیلی ہوئی ہے۔ براہِ کرم حصے دوبارہ دیکھ لیں؛ آپ کے بارے میں جوابات محفوظ ہیں۔",
  "r1.title": "رشتوں کے الفاظ",
  "r1.lead": "{total} میں سے {done} رشتہ دار مکمل۔ ترتیب سے چلیں؛ آپ کسی بھی وقت رک کر واپس آ سکتے ہیں۔",
  "r1.distant": "دور کے رشتہ دار", "r1.distant_one": "دور کا رشتہ دار", "nav.home": "→ ہوم",
  "r1.q_word": "آپ اس رشتہ دار کو کیا کہتے ہیں؟",
  "r1.q_word_hint": "سب سے عام لفظ پہلے لکھیں۔ اگر لوگ دوسرے الفاظ بھی بولتے ہیں تو وہ بھی شامل کریں۔",
  "r1.q_face": "کیا آپ انہیں سامنے کسی اور لفظ سے بلاتے ہیں؟",
  "r1.no": "نہیں", "r1.yes_diff": "ہاں، کوئی اور لفظ",
  "r1.q_sure": "آپ کو کتنا یقین ہے؟", "r1.sure": "یقین ہے", "r1.not_sure": "یقین نہیں",
  "r1.notes": "نوٹ (اختیاری)",
  "r1.notes_ph": "اختیاری: دوسری جگہوں کے الفاظ، کتابی لفظ، اگر عورتیں مختلف کہتی ہیں، یا کوئی الجھن",
  "w.most": "سب سے عام", "w.also": "یہ بھی", "w.face": "سامنے",
  "w.native": "اپنی زبان کے حروف میں", "w.native_opt": "اپنی زبان کے حروف میں (اختیاری)",
  "w.roman": "رومن میں، جیسے واٹس ایپ پر", "w.roman_short": "رومن میں",
  "w.add": "+ ایک اور لفظ", "w.up": "↑ سب سے عام", "w.up_title": "اسے سب سے عام لفظ بنائیں", "w.remove": "ہٹائیں",
  "w.warn_native": "یہاں اپنی زبان کے حروف استعمال کریں؛ رومن ہجے دوسرے خانے میں لکھیں۔",
  "w.warn_roman": "اس خانے میں صرف رومن حروف۔",
  "speaker.f": "بولنے والی ایک شادی شدہ عورت ہے۔", "speaker.m": "بولنے والا ایک شادی شدہ مرد ہے۔",
  "nav.prev": "→ پچھلا", "nav.next": "اگلا ←", "nav.finish": "ختم ✓", "nav.next_group": "اگلا گروپ ←", "nav.kbd": "اگلا",
  "pos": "{total} میں سے {pos}",
  "palette": "وہ حروف جو شاید آپ کے کی بورڈ پر نہ ہوں",
  "batch.not_ready": "یہ مرحلہ ابھی تیار نہیں۔",
  "rv.used": "یہاں بولا جاتا ہے", "rv.region": "کسی اور علاقے کا", "rv.wrong": "غلط",
  "rv.both": "دونوں رضاکار", "rv.one": "ایک رضاکار", "rv.main": "سب سے عام",
  "rv.missed": "دونوں سے درست لفظ رہ گیا", "rv.extra_main": "یہی سب سے عام لفظ ہے",
  "rv.diff_words": "مختلف الفاظ", "rv.diff_call": "مخاطب کرنے کے مختلف الفاظ",
  "rv.notes_from": "رضاکاروں کے نوٹ: ", "rv.agreed": "دونوں رضاکاروں نے یہ لفظ دیا",
  "rv.only_call": "فرق صرف اس میں ہے کہ اس رشتہ دار کو سامنے کیا کہہ کر بلاتے ہیں۔",
  "rv.words": "اس رشتہ دار کے الفاظ", "rv.call_words": "سامنے مخاطب کرنے کے الفاظ",
  "rv.notes": "نوٹ (اختیاری)",
  "r2.question": "سوال", "r2.own": "اپنے حروف", "r2.roman": "رومن", "r2.options": "اختیارات: ", "r2.answer": "دیا گیا جواب: ",
  "r2.natural": "کیا سوال فطری لگتا ہے؟", "r2.yes": "ہاں", "r2.needs_fix": "نہیں، اسے ٹھیک کرنا ہے",
  "r2.rewrite": "اسے ویسے لکھیں جیسے اس زبان کا بولنے والا کہے گا", "r2.correct": "کیا جواب درست ہے؟", "r2.no": "نہیں", "r2.right": "درست جواب",
  "g.title": "اینوٹیشن کی ہدایات", "g.lead": "ورژن {v}۔ پڑھنے میں تقریباً 15 منٹ۔ کام شروع کرنے سے پہلے پوری ہدایات پڑھیں۔",
  "g.back": "→ واپس ڈیش بورڈ پر", "g.toc": "فہرست", "g.ref": "کس صورت میں کیا کریں",
  "g.situation": "صورت", "g.action": "کیا کریں",
},
};

const UI_KEY = "kinshift:ui";
function uiLang() {
  let v = null;
  try { v = localStorage.getItem(UI_KEY); } catch {}
  if (v && UI[v]) return v;
  return /^ur\b/i.test(navigator.language || "") ? "ur" : "en";
}
function t(key, vars) {
  const l = uiLang();
  let s = (UI[l] && UI[l][key]) ?? UI.en[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return s;
}
// Pick the current language from a {en, ur} object (guide content, round text).
function L(obj) { if (obj == null || typeof obj === "string") return obj; return obj[uiLang()] ?? obj.en; }
function applyUiLang() {
  const l = uiLang(), root = document.documentElement;
  root.lang = l; root.dir = RTL.has(l) ? "rtl" : "ltr";
  root.classList.toggle("ui-rtl", RTL.has(l));
  for (const k of Object.keys(UI_LANGS)) root.classList.toggle(`ui-${k}`, k === l);
}
function setUiLang(l) {
  try { localStorage.setItem(UI_KEY, l); } catch {}
  applyUiLang();
}
// The English | اردو switch. onChange re-renders the page.
function langSwitch(onChange) {
  const box = document.createElement("div");
  box.className = "lang-switch"; box.setAttribute("role", "group"); box.setAttribute("aria-label", "Language / زبان");
  for (const [k, label] of Object.entries(UI_LANGS)) {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = label; b.lang = k; b.dataset.lang = k;
    if (k === uiLang()) b.className = "on";
    b.addEventListener("click", () => {
      if (k === uiLang()) return;
      setUiLang(k);
      for (const x of box.children) x.classList.toggle("on", x.dataset.lang === k);
      onChange && onChange(k);
    });
    box.append(b);
  }
  return box;
}

// ---------- relatives in Urdu ----------
// Descriptive words only (والد, والدہ ...), so the description reads as a path, not as
// the kinship term being asked for. Genitive agreement: کا / کے / کی follows the
// possessed noun; every noun phrase except the last is in the oblique case.
const UR_NOUN = { F: ["والد", "m"], M: ["والدہ", "f"], B: ["بھائی", "m"], Z: ["بہن", "f"],
                  S: ["بیٹا", "m", "بیٹے"], D: ["بیٹی", "f"], H: ["شوہر", "m"], W: ["بیوی", "f"] };
const UR_AGE = { e: { m: ["بڑا", "بڑے"], f: ["بڑی", "بڑی"] }, y: { m: ["چھوٹا", "چھوٹے"], f: ["چھوٹی", "چھوٹی"] } };
function urPhrase(step, oblique) {
  const [noun, g, obl] = UR_NOUN[step.rel];
  const adj = step.age ? UR_AGE[step.age][g][oblique ? 1 : 0] + " " : "";
  return adj + (oblique && obl ? obl : noun);
}
function urPath(steps) {
  let out = "";
  steps.forEach((st, i) => {
    const last = i === steps.length - 1;
    // A father is named with the respectful plural: شوہر کے والد, not شوہر کا والد.
    if (i > 0) out += " " + (UR_NOUN[st.rel][1] === "f" ? "کی" : last && st.rel !== "F" ? "کا" : "کے") + " ";
    out += urPhrase(st, !last);
  });
  return out;
}
const EN_WORD = { F: "father", M: "mother", B: "brother", Z: "sister", S: "son", D: "daughter", H: "husband", W: "wife" };
const EN_AGE = { e: "elder ", y: "younger " };
function stepLabel(step) { return uiLang() === "ur" ? urPhrase(step, false) : (EN_AGE[step.age] || "") + EN_WORD[step.rel]; }
const YOU = { en: "you", ur: "آپ" };

const UR_GROUP = {
  "parents": "والدین", "grandparents": "والدین کے والدین", "parents' siblings": "والدین کے بہن بھائی",
  "parents' siblings' spouses": "والدین کے بہن بھائیوں کے شریکِ حیات", "siblings": "بہن بھائی",
  "siblings' spouses": "بہن بھائیوں کے شریکِ حیات", "cousins": "کزن", "spouse": "شریکِ حیات",
  "spouse's parents": "شریکِ حیات کے والدین", "spouse's siblings": "شریکِ حیات کے بہن بھائی",
  "spouse's siblings' spouses": "شریکِ حیات کے بہن بھائیوں کے شریکِ حیات", "children": "اولاد",
  "children's spouses": "اولاد کے شریکِ حیات", "children's spouses' parents": "اولاد کے شریکِ حیات کے والدین",
  "siblings' children": "بہن بھائیوں کی اولاد", "grandchildren": "اولاد کی اولاد",
  "spouse's siblings' children": "شریکِ حیات کے بہن بھائیوں کی اولاد",
  "great-grandparents": "والدین کے والدین کے والدین", "grandparents' siblings": "والدین کے والدین کے بہن بھائی",
  "parents' cousins": "والدین کے کزن", "cousins' children": "کزن کی اولاد",
  "siblings' grandchildren": "بہن بھائیوں کی اولاد کی اولاد", "great-grandchildren": "اولاد کی اولاد کی اولاد",
};
function groupName(g) { return uiLang() === "ur" ? (UR_GROUP[g] || g) : g; }

if (typeof module !== "undefined") module.exports = { UI, urPath, UR_GROUP };
