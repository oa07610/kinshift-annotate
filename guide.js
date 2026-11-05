"use strict";
// The annotation guidelines, in English and Urdu, as one source for both the
// guidelines page and the onboarding round. Each part has short questions about real
// situations; onboarding shows a part, then its questions, and moves on only when they
// are answered right. Bump `version` whenever a rule changes: everyone then goes
// through onboarding again (logic.js ONBOARDING_VERSION must match).
//
// Body blocks: a string is a paragraph (simple inline HTML allowed), {ul: [...]} a list,
// {example: true} the worked example, {ref: true} the "what to do when" table.
// `needs: "ask_address"` on a part, a block or a question shows it only when the
// face-to-face question is on. `onboarding: false` keeps a part on the guidelines page only.

const GUIDE = {
version: 2,
date: { en: "November 2026", ur: "نومبر 2026" },
parts: [

{ id: "task",
  title: { en: "The task, and reading a relative", ur: "کام، اور رشتہ دار کو سمجھنا" },
  body: {
    en: [
      "KINSHIFT checks whether AI models know the family words of Pakistani languages. <b>You are the expert:</b> the words you give become the correct answers the AI is tested against. For 150 relatives, give the word people use at home where you grew up. The examples here use Urdu words; <b>always answer with your own language's words.</b>",
      "Each relative is written as a path that starts from <b>you</b>, with a small chart of the same path: the diamond is you, squares are men, circles are women, the blue shape is the relative you are asked about, and a dashed line is a marriage.",
      { ul: [
        "<b>Elder and younger compare with the person just before.</b> \"father's elder brother\" is older than <i>your father</i>. \"elder sister\" on its own is older than <i>you</i>.",
        "\"mother's sister's husband\" <b>married into the family</b>; he is not your mother's blood relative.",
        "<b>Who is speaking.</b> A path that starts with \"husband\" is about a married woman's relatives; one that starts with \"wife\" is about a married man's. Give the word such a person uses, even if you are not married or not that sex.",
        "Assume <b>ordinary families</b>: no step-relatives, no adoption and no marriages between relatives.",
      ] },
    ],
    ur: [
      "KINSHIFT یہ جانچتا ہے کہ کیا AI ماڈل پاکستانی زبانوں کے خاندانی الفاظ جانتے ہیں۔ <b>اس کام کے ماہر آپ ہیں:</b> آپ کے دیے ہوئے الفاظ وہ درست جواب بنیں گے جن پر AI کو پرکھا جائے گا۔ 150 رشتہ داروں کے لیے وہ لفظ لکھیں جو آپ کے علاقے میں لوگ گھر میں بولتے ہیں۔ یہاں مثالیں اردو الفاظ میں ہیں؛ <b>جواب ہمیشہ اپنی زبان کے الفاظ میں دیں۔</b>",
      "ہر رشتہ دار ایک راستے کی صورت میں لکھا ہوتا ہے جو <b>آپ</b> سے شروع ہوتا ہے، اور ساتھ اسی راستے کا ایک چھوٹا خاکہ ہوتا ہے: ہیرے کی شکل آپ ہیں، چوکور خانے مرد، دائرے عورتیں، نیلی شکل وہ رشتہ دار ہے جس کے بارے میں پوچھا جا رہا ہے، اور ٹوٹی ہوئی لکیر شادی کو ظاہر کرتی ہے۔",
      { ul: [
        "<b>بڑا اور چھوٹا ہمیشہ راستے میں بالکل پہلے والے شخص کے مقابلے میں ہے۔</b> ’والد کا بڑا بھائی‘ <i>آپ کے والد</i> سے بڑا ہے۔ جب صرف ’بڑی بہن‘ لکھا ہو تو وہ <i>آپ</i> سے بڑی ہے۔",
        "’والدہ کی بہن کا شوہر‘ <b>شادی سے خاندان میں آیا ہے</b>؛ وہ آپ کی والدہ کا خونی رشتہ دار نہیں۔",
        "<b>کون بول رہا ہے۔</b> جو راستہ ’شوہر‘ سے شروع ہو وہ ایک شادی شدہ عورت کے رشتہ داروں کے بارے میں ہے؛ جو ’بیوی‘ سے شروع ہو وہ شادی شدہ مرد کے رشتہ داروں کے بارے میں۔ وہ لفظ لکھیں جو ایسا شخص بولتا ہے، چاہے آپ شادی شدہ نہ ہوں یا اُس جنس کے نہ ہوں۔",
        "فرض کریں کہ <b>عام خاندان</b> ہے: کوئی سوتیلا رشتہ، لے پالک یا رشتہ داروں میں آپس کی شادی نہیں۔",
      ] },
    ],
  },
  checks: [
    { id: "elder-compare",
      q: { en: "\"mother's younger brother\": he is younger than whom?", ur: "’والدہ کا چھوٹا بھائی‘: وہ کس سے چھوٹا ہے؟" },
      options: [
        { en: "Your mother", ur: "آپ کی والدہ سے" },
        { en: "You", ur: "آپ سے" },
        { en: "Your father", ur: "آپ کے والد سے" },
      ], answer: 0,
      why: { en: "Elder and younger compare with the person just before in the path, here your mother.",
             ur: "بڑا اور چھوٹا راستے میں پہلے والے شخص کے مقابلے میں ہوتا ہے، یہاں آپ کی والدہ۔" } },
    { id: "speaker",
      q: { en: "You are a man. The screen asks about \"husband's younger sister\". What do you do?",
           ur: "آپ مرد ہیں۔ سکرین پر ’شوہر کی چھوٹی بہن‘ کے بارے میں پوچھا گیا ہے۔ آپ کو کیا کرنا چاہیے؟" },
      options: [
        { en: "Give the word a married woman in your community uses for her husband's younger sister", ur: "وہ لفظ لکھیں جو آپ کے علاقے میں شادی شدہ عورت اپنے شوہر کی چھوٹی بہن کے لیے بولتی ہے" },
        { en: "Skip it, because it does not apply to you", ur: "اسے چھوڑ دیں، کیونکہ یہ آپ پر لاگو نہیں ہوتا" },
        { en: "Give the word for your own younger sister", ur: "اپنی چھوٹی بہن والا لفظ لکھیں" },
      ], answer: 0,
      why: { en: "A path starting with husband is about a married woman's relatives. Give the word you know such a woman uses; choose Not sure if you are unsure.",
             ur: "’شوہر‘ سے شروع ہونے والا راستہ شادی شدہ عورت کے رشتہ داروں کے بارے میں ہے۔ وہ لفظ لکھیں جو آپ جانتے ہیں کہ ایسی عورت بولتی ہے؛ یقین نہ ہو تو ’یقین نہیں‘ چنیں۔" } },
  ] },

{ id: "write",
  title: { en: "What to write", ur: "کیا لکھیں" },
  body: {
    en: [
      "Give the word <b>you hear at home</b>, in your family and among people where you grew up, not a book word.",
      { ul: [
        "<b>Most common word first.</b> Add other words people around you use with <b>+ another word</b>.",
        "Each word <b>in your script and in Roman</b>, typed as on WhatsApp. Different spellings of one word go in one Roman box, with commas: abbu, abbo.",
        "<b>Notes</b> are for formal or textbook words, words from other cities or communities (say where), and anything unclear.",
        "Leave out <b>ji</b> and <b>jaan</b>. No single word? Write the words people use, like \"mamu ka beta\". Borrowed words like \"aunty\" are fine if people really say them.",
        "If women and men say it differently, list both words and write in Notes who says which.",
        "<b>Talking about them, not to them.</b> Write the word you use when talking <i>about</i> the relative, even if you call them by name: you may call your nandoi or sala by his name, but you still write nandoi or sala. Do not leave out a real kinship word because it can also be used as an insult, like sala.",
      ] },
      { ul: [
        "<b>Elders, to their face:</b> if you call them by a different word when you speak to them (you talk about your \"susar\" but call him \"abbu\"), choose <b>Yes, a different word</b> and write it. Adding ji or jaan does not make a different word.",
      ], needs: "ask_address" },
    ],
    ur: [
      "وہ لفظ لکھیں جو <b>آپ گھر میں سنتے ہیں</b>، اپنے خاندان میں اور اُن لوگوں میں جہاں آپ پلے بڑھے، کتابی لفظ نہیں۔",
      { ul: [
        "<b>سب سے عام لفظ پہلے۔</b> آپ کے اردگرد بولے جانے والے دوسرے الفاظ <b>+ ایک اور لفظ</b> سے شامل کریں۔",
        "ہر لفظ <b>اپنی زبان کے حروف میں اور رومن میں</b>، جیسے واٹس ایپ پر لکھتے ہیں۔ ایک لفظ کے مختلف ہجے ایک ہی رومن خانے میں، کامے لگا کر: <bdi>abbu, abbo</bdi>۔",
        "<b>نوٹ</b> اِن کے لیے ہے: رسمی یا نصابی الفاظ، دوسرے شہروں یا برادریوں کے الفاظ (جگہ کا نام بھی لکھیں)، اور کوئی بھی الجھن۔",
        "<b>جی</b> اور <b>جان</b> نہ لکھیں۔ کوئی ایک لفظ نہیں؟ وہ الفاظ لکھیں جو لوگ بولتے ہیں، جیسے ’ماموں کا بیٹا‘۔ <bdi>aunty</bdi> جیسے دوسری زبان کے الفاظ ٹھیک ہیں اگر لوگ واقعی بولتے ہیں۔",
        "اگر عورتیں اور مرد الگ لفظ بولتے ہیں تو دونوں الفاظ لکھیں اور نوٹ میں بتائیں کہ کون کیا بولتا ہے۔",
        "<b>ذکر کرتے وقت کا لفظ، بلانے کا نہیں۔</b> وہ لفظ لکھیں جو آپ اس رشتہ دار کا <i>ذکر</i> کرتے وقت بولتے ہیں، چاہے آپ انہیں نام سے بلاتے ہوں: آپ اپنے نندوئی یا سالے کو نام سے بلا سکتے ہیں، مگر لکھیں گے ’نندوئی‘ یا ’سالا‘۔ کسی اصل رشتے کے لفظ کو صرف اس لیے نہ چھوڑیں کہ وہ گالی کے طور پر بھی بولا جاتا ہے، جیسے ’سالا‘۔",
      ] },
      { ul: [
        "<b>بزرگ، سامنے:</b> اگر آپ ان سے بات کرتے وقت انہیں کسی اور لفظ سے بلاتے ہیں (ذکر ’سسر‘ کہہ کر کرتے ہیں مگر سامنے ’ابو‘ کہتے ہیں) تو <b>ہاں، کوئی اور لفظ</b> چنیں اور وہ لفظ لکھیں۔ جی یا جان لگانے سے لفظ نہیں بدلتا۔",
      ], needs: "ask_address" },
    ],
  },
  checks: [
    { id: "home-word",
      q: { en: "At home you say \"abbu\". The textbook word is \"walid\". What do you write?",
           ur: "آپ گھر میں ’ابو‘ کہتے ہیں۔ نصابی لفظ ’والد‘ ہے۔ آپ کیا لکھیں گے؟" },
      options: [
        { en: "abbu as the word; walid in Notes if you like", ur: "لفظ: ابو؛ چاہیں تو والد نوٹ میں" },
        { en: "walid, because it is the proper word", ur: "والد، کیونکہ یہ درست لفظ ہے" },
        { en: "walid first, then abbu", ur: "پہلے والد، پھر ابو" },
      ], answer: 0,
      why: { en: "We want the home word. Formal words help too, but they go in Notes.",
             ur: "ہمیں گھر والا لفظ چاہیے۔ رسمی الفاظ بھی مفید ہیں، مگر وہ نوٹ میں جاتے ہیں۔" } },
    { id: "spellings",
      q: { en: "People spell the same word \"bhabhi\" and \"bhabi\". What do you write?",
           ur: "لوگ ایک ہی لفظ کو <bdi>\"bhabhi\"</bdi> اور <bdi>\"bhabi\"</bdi> دونوں طرح لکھتے ہیں۔ آپ کیا لکھیں گے؟" },
      options: [
        { en: "One word, with \"bhabhi, bhabi\" in the Roman box", ur: "ایک لفظ، اور رومن خانے میں <bdi>\"bhabhi, bhabi\"</bdi>" },
        { en: "Two separate words", ur: "دو الگ الفاظ" },
        { en: "Only one of the spellings", ur: "صرف ایک ہجے" },
      ], answer: 0,
      why: { en: "Spellings of one word go in one Roman box, separated by commas.", ur: "ایک لفظ کے ہجے ایک ہی رومن خانے میں، کامے لگا کر۔" } },
    { id: "face-yes", needs: "ask_address",
      q: { en: "You talk about your father-in-law as \"susar\", but call him \"abbu\" to his face. What do you enter?",
           ur: "آپ اپنے سسر کا ذکر ’سسر‘ کہہ کر کرتے ہیں، مگر سامنے انہیں ’ابو‘ کہتے ہیں۔ آپ کیا لکھیں گے؟" },
      options: [
        { en: "Word: susar. To their face: Yes, abbu", ur: "لفظ: سسر۔ سامنے: ہاں، ابو" },
        { en: "Word: abbu. To their face: No", ur: "لفظ: ابو۔ سامنے: نہیں" },
        { en: "Word: susar. To their face: No", ur: "لفظ: سسر۔ سامنے: نہیں" },
      ], answer: 0,
      why: { en: "The main word is how you talk about him; abbu is what you call him.",
             ur: "اصل لفظ وہ ہے جس سے آپ ان کا ذکر کرتے ہیں؛ ابو وہ ہے جس سے آپ انہیں بلاتے ہیں۔" } },
  ] },

{ id: "honest",
  title: { en: "Working honestly, and saving", ur: "ایمانداری سے کام، اور محفوظ کرنا" },
  body: {
    en: [
      { ul: [
        "For every relative choose <b>Sure</b> or <b>Not sure</b>. Not sure is a good answer: write your best answer and say why in Notes.",
        "Use only your own knowledge: <b>no ChatGPT, Google, translators or dictionaries</b>, and do not ask others while you answer. The page records time spent and pasted text.",
        "<b>Work on your own.</b> Do not discuss answers with other volunteers; differences between you are useful, not mistakes.",
        "Answers save as you type and are sent to the team automatically. If the page cannot reach the server, keep working. To switch phone or computer, press <b>Submit now</b>, then sign in there with the same name.",
      ] },
    ],
    ur: [
      { ul: [
        "ہر رشتہ دار کے لیے <b>یقین ہے</b> یا <b>یقین نہیں</b> چنیں۔ ’یقین نہیں‘ اچھا جواب ہے: اپنا بہترین جواب لکھیں اور نوٹ میں وجہ بتائیں۔",
        "صرف اپنی معلومات استعمال کریں: <b>ChatGPT، گوگل، ترجمے کی ایپ یا لغت نہیں</b>، اور جواب دیتے وقت دوسروں سے نہ پوچھیں۔ صفحہ لگنے والا وقت اور پیسٹ کیا گیا متن ریکارڈ کرتا ہے۔",
        "<b>اکیلے کام کریں۔</b> دوسرے رضاکاروں سے جوابات پر بات نہ کریں؛ رضاکاروں کے جوابات میں فرق مفید ہے، غلطی نہیں۔",
        "جوابات لکھتے ہی محفوظ ہو جاتے ہیں اور خودبخود ٹیم کو بھیج دیے جاتے ہیں۔ اگر صفحہ سرور سے رابطہ نہ کر سکے تو کام جاری رکھیں۔ فون یا کمپیوٹر بدلنے کے لیے <b>ابھی بھیجیں</b> دبائیں، پھر وہاں اسی نام سے سائن ان کریں۔",
      ] },
    ],
  },
  checks: [
    { id: "not-sure",
      q: { en: "You think people say a certain word for a distant relative, but you are not certain. What do you do?",
           ur: "آپ کا خیال ہے کہ ایک دور کے رشتہ دار کے لیے لوگ ایک خاص لفظ بولتے ہیں، مگر آپ کو پکا یقین نہیں۔ آپ کو کیا کرنا چاہیے؟" },
      options: [
        { en: "Write the word, choose Not sure, and say why in Notes", ur: "لفظ لکھیں، ’یقین نہیں‘ چنیں، اور نوٹ میں وجہ لکھیں" },
        { en: "Choose Sure, so the answer looks complete", ur: "’یقین ہے‘ چنیں تاکہ جواب مکمل لگے" },
        { en: "Ask ChatGPT to check", ur: "ChatGPT سے پوچھ لیں" },
      ], answer: 0,
      why: { en: "An honest Not sure, with a note, is exactly what we need.", ur: "نوٹ کے ساتھ ایمانداری سے ’یقین نہیں‘ بالکل وہی ہے جو ہمیں چاہیے۔" } },
    { id: "alone",
      q: { en: "Another volunteer for your language messages you: \"What did you write for mother's sister's husband?\" What do you do?",
           ur: "آپ کی زبان کا ایک اور رضاکار آپ کو پیغام بھیجتا ہے: ’آپ نے والدہ کی بہن کے شوہر کے لیے کیا لکھا؟‘ آپ کو کیا کرنا چاہیے؟" },
      options: [
        { en: "Don't share it; each person answers alone", ur: "نہ بتائیں؛ ہر شخص اکیلے جواب دیتا ہے" },
        { en: "Share it, so your answers match", ur: "بتا دیں تاکہ آپ دونوں کے جواب ایک جیسے ہوں" },
        { en: "Agree on one word together", ur: "مل کر ایک لفظ طے کر لیں" },
      ], answer: 0,
      why: { en: "We compare two volunteers' answers; answers given alone show the real variation.",
             ur: "ہم دو رضاکاروں کے جوابات کا موازنہ کرتے ہیں؛ اکیلے دیے گئے جوابات سے اصل فرق سامنے آتا ہے۔" } },
  ] },

{ id: "example", onboarding: false,
  title: { en: "A full example, and what to do when", ur: "ایک مکمل مثال، اور کس صورت میں کیا کریں" },
  body: {
    en: [
      "Ayesha grew up in Lahore and speaks Urdu at home. For <b>father's elder brother</b> her family mostly says \"taya\", sometimes spelled \"tayya\", and some relatives say \"bare abbu\". She calls him \"taya ji\" to his face. This is her screen:",
      { example: true },
      { ref: true },
    ],
    ur: [
      "عائشہ لاہور میں پلی بڑھی ہیں اور گھر میں اردو بولتی ہیں۔ <b>والد کے بڑے بھائی</b> کے لیے ان کے گھر میں زیادہ تر ’تایا‘ کہا جاتا ہے، جسے کبھی <bdi>\"tayya\"</bdi> بھی لکھتے ہیں، اور کچھ رشتہ دار ’بڑے ابو‘ کہتے ہیں۔ وہ انہیں سامنے ’تایا جی‘ کہتی ہیں۔ یہ ان کی سکرین ہے:",
      { example: true },
      { ref: true },
    ],
  },
  checks: [] },
],

// The worked example (Ayesha, father's elder brother), drawn like the real screen.
example: {
  path: "father's elder brother", steps: [{ rel: "F", age: null }, { rel: "B", age: "e" }],
  words: [{ native: "تایا", roman: "taya, tayya" }, { native: "بڑے ابو", roman: "bare abbu" }],
  face: "no", sure: "sure", notes: "",
},

// "What to do when…": the rules in one table.
ref: {
  en: [
    ["A formal or textbook word also exists", "Put it in Notes"],
    ["People where you grew up use two or more words", "Write all of them, most common first"],
    ["The same word is spelled several ways", "One word; spellings in the Roman box with commas"],
    ["A word is used in another city or community", "Notes, with where it is used"],
    ["Women and men say it differently", "Both words in the list; who says which in Notes"],
    ["There is no single word", "Write the phrase people use"],
    ["People add ji or jaan", "Leave them out"],
    ["The speaker is a married woman or man, and you are not", "Give the word such a person uses"],
    ["You call them by name, not by a kinship word", "Still write the word you use when talking about them"],
    ["You are not sure", "Best answer, Not sure, and why in Notes"],
    ["You call an elder something else to their face", "Yes, and write that word"],
    ["The page cannot reach the server", "Keep working; it sends later"],
    ["You want to switch phone or computer", "Submit now, then sign in there with the same name"],
  ],
  ur: [
    ["کوئی رسمی یا نصابی لفظ بھی ہے", "اسے نوٹ میں لکھیں"],
    ["آپ کے علاقے میں دو یا زیادہ الفاظ بولے جاتے ہیں", "سب لکھیں، سب سے عام پہلے"],
    ["ایک ہی لفظ کئی طرح لکھا جاتا ہے", "ایک لفظ؛ ہجے رومن خانے میں کامے لگا کر"],
    ["کوئی لفظ کسی اور شہر یا برادری میں بولا جاتا ہے", "نوٹ میں، جگہ کے نام کے ساتھ"],
    ["عورتیں اور مرد الگ لفظ بولتے ہیں", "دونوں الفاظ فہرست میں؛ کون کیا بولتا ہے، نوٹ میں"],
    ["کوئی ایک لفظ نہیں ہے", "وہ الفاظ لکھیں جو لوگ بولتے ہیں"],
    ["لوگ جی یا جان لگاتے ہیں", "انہیں نہ لکھیں"],
    ["بولنے والا شادی شدہ عورت یا مرد ہے، اور آپ نہیں", "وہ لفظ لکھیں جو ایسا شخص بولتا ہے"],
    ["آپ انہیں نام سے بلاتے ہیں، رشتے کے لفظ سے نہیں", "پھر بھی وہ لفظ لکھیں جو ذکر کرتے وقت بولتے ہیں"],
    ["آپ کو یقین نہیں", "بہترین جواب، ’یقین نہیں‘، اور نوٹ میں وجہ"],
    ["آپ کسی بزرگ کو سامنے کسی اور لفظ سے بلاتے ہیں", "’ہاں، کوئی اور لفظ‘ چنیں اور وہ لفظ لکھیں"],
    ["صفحہ سرور سے رابطہ نہیں کر پا رہا", "کام جاری رکھیں؛ بعد میں بھیج دیا جائے گا"],
    ["آپ فون یا کمپیوٹر بدلنا چاہتے ہیں", "’ابھی بھیجیں‘ دبائیں، پھر وہاں اسی نام سے سائن ان کریں"],
  ],
},
};

// ---------- drawing (shared by the guidelines page and the dashboard) ----------
// Needs h(), uiLang(), stepLabel() and YOU from i18n.js.

// The path as a small chart: diamond = you, square = man, circle = woman, blue = the
// relative asked about, dashed line = marriage. Right to left when the page is.
function treeSVG(steps, width) {
  const NS = "http://www.w3.org/2000/svg";
  const s = (tag, attrs, text) => { const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); if (text) el.textContent = text; return el; };
  const ur = uiLang() === "ur", rtl = document.documentElement.dir === "rtl";
  const nodes = [{ label: YOU[ur ? "ur" : "en"], gen: 0, sex: null }];
  let gen = 0;
  for (const st of steps) {
    gen += "FM".includes(st.rel) ? 1 : "SD".includes(st.rel) ? -1 : 0;
    nodes.push({ label: stepLabel(st), gen, sex: "FBSH".includes(st.rel) ? "m" : "f", rel: st.rel });
  }
  const maxG = Math.max(...nodes.map(n => n.gen)), minG = Math.min(...nodes.map(n => n.gen));
  const avail = Math.min(620, (width || document.querySelector("main")?.clientWidth || 620) - 40);
  const W = Math.max(70, Math.min(128, Math.floor(avail / nodes.length))), Hh = ur ? 72 : 64, pad = ur ? 30 : 24;
  const stagger = W < 100;
  const width_ = nodes.length * W, height = (maxG - minG) * Hh + 2 * pad + (ur ? 38 : 26) + (stagger ? 24 : 0);
  const svg = s("svg", { viewBox: `0 0 ${width_} ${height}`, class: "tree" + (ur ? " ur" : ""), role: "img",
                         "aria-label": nodes.map(n => n.label).join(" → "), style: `max-width:${width_}px` });
  const col = (i) => rtl ? nodes.length - 1 - i : i;
  const pos = nodes.map((n, i) => ({ x: col(i) * W + W / 2, y: pad + (stagger ? 24 : 0) + (maxG - n.gen) * Hh }));
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
    svg.append(s("text", { x, y: below ? y + (ur ? 36 : 30) : y - (ur ? 22 : 20), "text-anchor": "middle", "font-weight": last ? "700" : "500" }, n.label));
  });
  return svg;
}

// The relative's heading: English path, and in Urdu an Urdu description as well.
function relHeading(steps, pathEn) {
  if (uiLang() !== "ur") return [h("div", { class: "item-title" }, pathEn)];
  return [h("div", { class: "item-title ur-gloss" }, urPath(steps)),
          h("div", { class: "item-path-en", dir: "ltr", lang: "en" }, pathEn)];
}

function guideBlocks(blocks, config) {
  return blocks.filter(b => !b.needs || (config && config[b.needs])).map(b => typeof b === "string" ? h("p", { html: b })
    : b.ul ? h("ul", {}, ...b.ul.map(x => h("li", { html: x })))
    : b.example ? exampleCard()
    : b.ref ? refTable() : null);
}
// The worked example, drawn like a filled-in screen (read only).
function exampleCard() {
  const ex = GUIDE.example, ur = uiLang() === "ur";
  const row = (tag, w, main) => h("div", { class: "word-row" + (main ? " main" : "") }, h("div", { class: "word-tag" }, tag),
    h("div", { class: "fake-input native font-nastaliq-text" }, w.native), h("div", { class: "fake-input", dir: "ltr" }, w.roman), h("div"));
  const seg = (opts, on) => h("div", { class: "seg" }, ...opts.map(([v, label]) => h("span", { class: "segbtn" + (v === on ? " on" : "") }, label)));
  return h("div", { class: "example" },
    h("div", { class: "example-label" }, ur ? "مثال" : "Example"),
    ...relHeading(ex.steps, ex.path), treeSVG(ex.steps, 560),
    h("div", { class: "q" }, h("h3", {}, t("r1.q_word")),
      h("div", { class: "words" }, ...ex.words.map((w, i) => row(i ? t("w.also") : t("w.most"), w, i === 0)))),
    h("div", { class: "q" }, h("h3", {}, t("r1.q_face")), seg([["no", t("r1.no")], ["yes", t("r1.yes_diff")]], ex.face),
      h("p", { class: "hint", style: "margin-top:8px" }, ur ? "’تایا جی‘ وہی لفظ ہے، صرف ’جی‘ لگا ہے، اس لیے: نہیں۔" : "\"taya ji\" is the same word with ji added, so: No.")),
    h("div", { class: "q" }, h("h3", {}, t("r1.q_sure")), seg([["sure", t("r1.sure")], ["not sure", t("r1.not_sure")]], ex.sure)));
}
function refTable() {
  return h("div", { class: "ref" }, h("h3", {}, t("g.ref")),
    h("table", { class: "grid-table" }, h("tr", {}, h("th", {}, t("g.situation")), h("th", {}, t("g.action"))),
      ...L(GUIDE.ref).map(([a, b]) => h("tr", {}, h("td", {}, a), h("td", {}, h("b", {}, b))))));
}
function guideParts(config, onboarding) {
  return GUIDE.parts.filter(p => (!p.needs || (config && config[p.needs])) && !(onboarding && p.onboarding === false));
}
function partChecks(part, config) { return part.checks.filter(c => !c.needs || (config && config[c.needs])); }

if (typeof module !== "undefined") module.exports = GUIDE;
