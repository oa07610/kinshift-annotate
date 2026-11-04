"use strict";
// The annotation guidelines, in English and Urdu, as one source for both the
// guidelines page and the onboarding round. Each part has short questions about real
// situations; onboarding shows a part, then its questions, and moves on only when they
// are answered right. Bump `version` whenever a rule changes: everyone then goes
// through onboarding again (logic.js ONBOARDING_VERSION must match).
//
// Body blocks: a string is a paragraph (simple inline HTML allowed), {ul: [...]} a list,
// {example: true} the worked example, {ref: true} the "what to do when" table.
// `needs: "ask_address"` shows a part only when the face-to-face question is on.

const GUIDE = {
version: 2,
date: { en: "November 2026", ur: "نومبر 2026" },
parts: [

{ id: "about",
  title: { en: "What this is", ur: "یہ کیا ہے" },
  body: {
    en: [
      "KINSHIFT checks whether AI models know the family words of Pakistani languages: what you call your father's elder brother, your mother's sister's husband, your husband's younger brother, and so on.",
      "<b>You are the expert.</b> The words you give become the correct answers the AI is tested against. So we need the words people really use at home where you grew up, not the words in books.",
      { ul: [
        "<b>Onboarding</b> (this part, about 25 minutes, once).",
        "<b>Kinship words</b>: 150 relatives, one per screen, in 23 small groups. About 3 hours in total; stop and continue whenever you like.",
        "<b>Later</b>, only if we need you: checking disagreements or sample questions. The team will tell you.",
      ] },
      "The examples here use Urdu words because many people know them. <b>Always answer with your own language's words.</b>",
    ],
    ur: [
      "KINSHIFT یہ جانچتا ہے کہ کیا AI ماڈل پاکستانی زبانوں کے خاندانی الفاظ جانتے ہیں: آپ اپنے والد کے بڑے بھائی کو کیا کہتے ہیں، والدہ کی بہن کے شوہر کو، اپنے شوہر کے چھوٹے بھائی کو، وغیرہ۔",
      "<b>اس کام کے ماہر آپ ہیں۔</b> آپ کے دیے ہوئے الفاظ وہ درست جواب بنیں گے جن پر AI کو پرکھا جائے گا۔ اس لیے ہمیں وہ الفاظ چاہییں جو لوگ واقعی گھر میں بولتے ہیں، وہاں جہاں آپ پلے بڑھے، کتابوں والے الفاظ نہیں۔",
      { ul: [
        "<b>تعارف</b> (یہی حصہ، تقریباً 25 منٹ، صرف ایک بار)۔",
        "<b>رشتوں کے الفاظ</b>: 150 رشتہ دار، ہر سکرین پر ایک، 23 چھوٹے گروپوں میں۔ کُل تقریباً 3 گھنٹے؛ جب چاہیں رکیں اور پھر جاری رکھیں۔",
        "<b>بعد میں</b>، صرف اگر ضرورت ہو: اختلافات یا نمونے کے سوالات کی جانچ۔ ٹیم آپ کو بتا دے گی۔",
      ] },
      "یہاں مثالیں اردو الفاظ میں ہیں کیونکہ بہت سے لوگ انہیں جانتے ہیں۔ <b>جواب ہمیشہ اپنی زبان کے الفاظ میں دیں۔</b>",
    ],
  },
  checks: [
    { id: "right-answer",
      q: { en: "What is the right answer for a relative?", ur: "کسی رشتہ دار کے لیے درست جواب کیا ہے؟" },
      options: [
        { en: "The word people really use at home where you grew up", ur: "وہ لفظ جو آپ کے علاقے میں لوگ واقعی گھر میں بولتے ہیں" },
        { en: "The word you would find in a dictionary", ur: "وہ لفظ جو لغت میں ملے گا" },
        { en: "The word most people in Pakistan would understand", ur: "وہ لفظ جو پاکستان میں زیادہ تر لوگ سمجھ لیں" },
      ], answer: 0,
      why: { en: "The AI is checked against how people really speak, so your everyday word is the right answer.",
             ur: "AI کو اس پر پرکھا جاتا ہے کہ لوگ واقعی کیسے بولتے ہیں، اس لیے آپ کا روزمرہ کا لفظ ہی درست جواب ہے۔" } },
  ] },

{ id: "paths",
  title: { en: "Reading the relative", ur: "رشتہ دار کو سمجھنا" },
  body: {
    en: [
      "Each relative is written as a path that starts from <b>you</b>. \"father's elder brother\" means: your father, then his elder brother.",
      "Under the words is a small chart of the same path. The diamond is you, squares are men, circles are women, the blue shape is the relative you are asked about, and a dashed line is a marriage.",
      { ul: [
        "<b>Elder and younger compare with the person just before.</b> \"father's elder brother\" is older than <i>your father</i>. \"elder sister\" on its own is older than <i>you</i>.",
        "<b>Married into the family.</b> \"mother's sister's husband\" is not your mother's blood relative; he married her sister.",
        "<b>Who is speaking.</b> A path that starts with \"husband\" is about a married woman's relatives; one that starts with \"wife\" is about a married man's. The screen also says so in orange. Answer with the word such a person uses, even if you are not married or not that sex.",
        "<b>Ordinary families.</b> Assume no step-relatives, no adoption and no marriages between relatives.",
      ] },
    ],
    ur: [
      "ہر رشتہ دار ایک راستے کی صورت میں لکھا ہوتا ہے جو <b>آپ</b> سے شروع ہوتا ہے۔ ’والد کا بڑا بھائی‘ (<bdi>father's elder brother</bdi>) کا مطلب ہے: آپ کے والد، پھر اُن کے بڑے بھائی۔",
      "الفاظ کے نیچے اسی راستے کا ایک چھوٹا خاکہ ہوتا ہے۔ ہیرے کی شکل آپ ہیں، چوکور خانے مرد، دائرے عورتیں، نیلی شکل وہ رشتہ دار ہے جس کے بارے میں پوچھا جا رہا ہے، اور ٹوٹی ہوئی لکیر شادی کو ظاہر کرتی ہے۔",
      { ul: [
        "<b>بڑا اور چھوٹا ہمیشہ راستے میں بالکل پہلے والے شخص کے مقابلے میں ہے۔</b> ’والد کا بڑا بھائی‘ <i>آپ کے والد</i> سے بڑا ہے۔ جب صرف ’بڑی بہن‘ لکھا ہو تو وہ <i>آپ</i> سے بڑی ہے۔",
        "<b>شادی سے خاندان میں آنے والے۔</b> ’والدہ کی بہن کا شوہر‘ آپ کی والدہ کا خونی رشتہ دار نہیں؛ انہوں نے اُن کی بہن سے شادی کی ہے۔",
        "<b>کون بول رہا ہے۔</b> جو راستہ ’شوہر‘ سے شروع ہو وہ ایک شادی شدہ عورت کے رشتہ داروں کے بارے میں ہے؛ جو ’بیوی‘ سے شروع ہو وہ شادی شدہ مرد کے رشتہ داروں کے بارے میں۔ سکرین پر یہ نارنجی رنگ میں بھی لکھا ہوتا ہے۔ وہ لفظ لکھیں جو ایسا شخص استعمال کرتا ہے، چاہے آپ شادی شدہ نہ ہوں یا اُس جنس کے نہ ہوں۔",
        "<b>عام خاندان۔</b> فرض کریں کہ کوئی سوتیلا رشتہ، لے پالک یا رشتہ داروں میں آپس کی شادی نہیں ہے۔",
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
    { id: "married-in",
      q: { en: "\"father's sister's husband\": who is he?", ur: "’والد کی بہن کا شوہر‘: یہ کون ہے؟" },
      options: [
        { en: "The man your father's sister married", ur: "وہ مرد جس سے آپ کے والد کی بہن کی شادی ہوئی" },
        { en: "Your father's brother", ur: "آپ کے والد کا بھائی" },
        { en: "Your father's cousin", ur: "آپ کے والد کا کزن" },
      ], answer: 0,
      why: { en: "He married into the family; he is not your father's blood relative.",
             ur: "وہ شادی سے خاندان میں آیا ہے؛ وہ آپ کے والد کا خونی رشتہ دار نہیں۔" } },
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

{ id: "word",
  title: { en: "Which word to give", ur: "کون سا لفظ لکھیں" },
  body: {
    en: [
      "Give the word <b>you hear at home</b>: in your family and among people where you grew up.",
      { ul: [
        "<b>Not a book word.</b> If a formal or textbook word also exists, put it in Notes. At home you say \"abbu\" and the formal word is \"walid\": write abbu; walid can go in Notes.",
        "<b>Borrowed words are fine.</b> If people really say an Urdu or English word in your language (like \"aunty\" or \"cousin\"), write it. Do not swap it for an older word nobody uses any more.",
        "<b>Leave out ji and jaan</b>, which are added to almost any word for respect: \"chacha ji\" is written \"chacha\". Keep them only if people never say the word without them.",
        "<b>No single word?</b> If people describe this relative with a few words, write that phrase as the word, for example \"mamu ka beta\".",
      ] },
    ],
    ur: [
      "وہ لفظ لکھیں جو <b>آپ گھر میں سنتے ہیں</b>: اپنے خاندان میں اور اُن لوگوں میں جہاں آپ پلے بڑھے۔",
      { ul: [
        "<b>کتابی لفظ نہیں۔</b> اگر کوئی رسمی یا نصابی لفظ بھی ہو تو اسے نوٹ میں لکھیں۔ مثلاً آپ گھر میں ’ابو‘ کہتے ہیں اور رسمی لفظ ’والد‘ ہے: ابو لکھیں؛ والد نوٹ میں لکھ سکتے ہیں۔",
        "<b>دوسری زبانوں سے آئے الفاظ ٹھیک ہیں۔</b> اگر آپ کی زبان میں لوگ واقعی کوئی اردو یا انگریزی لفظ بولتے ہیں (جیسے <bdi>aunty</bdi> یا <bdi>cousin</bdi>) تو وہی لکھیں۔ اس کی جگہ کوئی پرانا لفظ نہ لکھیں جو اب کوئی نہیں بولتا۔",
        "<b>جی اور جان نہ لکھیں</b>، کیونکہ یہ احترام کے لیے تقریباً ہر لفظ کے ساتھ لگ جاتے ہیں: ’چاچا جی‘ کو ’چاچا‘ لکھیں۔ انہیں صرف تب رکھیں جب لوگ یہ لفظ ان کے بغیر کبھی نہ بولتے ہوں۔",
        "<b>ایک لفظ نہیں ہے؟</b> اگر لوگ اس رشتہ دار کو چند الفاظ میں بیان کرتے ہیں تو لفظ کی جگہ وہی الفاظ لکھیں، مثلاً ’ماموں کا بیٹا‘۔",
      ] },
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
    { id: "borrowed",
      q: { en: "For one relative, people around you now mostly say \"aunty\". A few older people still use an older word. What do you write?",
           ur: "ایک رشتہ دار کے لیے آپ کے اردگرد لوگ اب زیادہ تر <bdi>aunty</bdi> کہتے ہیں۔ کچھ بزرگ اب بھی ایک پرانا لفظ بولتے ہیں۔ آپ کیا لکھیں گے؟" },
      options: [
        { en: "aunty first, then the older word with + another word", ur: "پہلے <bdi>aunty</bdi>، پھر ’+ ایک اور لفظ‘ سے پرانا لفظ" },
        { en: "Only the older word, because it is more correct", ur: "صرف پرانا لفظ، کیونکہ وہ زیادہ درست ہے" },
        { en: "Nothing, because aunty is English", ur: "کچھ نہیں، کیونکہ <bdi>aunty</bdi> انگریزی ہے" },
      ], answer: 0,
      why: { en: "Borrowed words count if people really say them. Both are used around you, so list both, most common first.",
             ur: "دوسری زبان کا لفظ بھی چلے گا اگر لوگ واقعی بولتے ہیں۔ دونوں آپ کے اردگرد بولے جاتے ہیں، اس لیے دونوں لکھیں، سب سے عام پہلے۔" } },
    { id: "ji",
      q: { en: "Your family calls your father's younger brother \"chacha ji\". What do you write?",
           ur: "آپ کے گھر میں والد کے چھوٹے بھائی کو ’چاچا جی‘ کہتے ہیں۔ آپ کیا لکھیں گے؟" },
      options: [
        { en: "chacha", ur: "چاچا" },
        { en: "chacha ji", ur: "چاچا جی" },
        { en: "ji", ur: "جی" },
      ], answer: 0,
      why: { en: "ji and jaan are added to almost any word for respect, so leave them out.",
             ur: "جی اور جان احترام کے لیے تقریباً ہر لفظ کے ساتھ لگتے ہیں، اس لیے انہیں نہ لکھیں۔" } },
    { id: "phrase",
      q: { en: "There is no single word for a distant relative; people say \"mamu ka beta\". What do you write?",
           ur: "ایک دور کے رشتہ دار کے لیے کوئی ایک لفظ نہیں؛ لوگ ’ماموں کا بیٹا‘ کہتے ہیں۔ آپ کیا لکھیں گے؟" },
      options: [
        { en: "The phrase \"mamu ka beta\" as the word", ur: "لفظ کی جگہ ’ماموں کا بیٹا‘ لکھیں" },
        { en: "Leave the box empty", ur: "خانہ خالی چھوڑ دیں" },
        { en: "Make up a single word", ur: "اپنی طرف سے کوئی ایک لفظ بنا لیں" },
      ], answer: 0,
      why: { en: "A phrase that people really use is a good answer.",
             ur: "جو الفاظ لوگ واقعی بولتے ہیں وہ اچھا جواب ہیں۔" } },
  ] },

{ id: "words",
  title: { en: "More than one word, and spelling", ur: "ایک سے زیادہ الفاظ، اور ہجے" },
  body: {
    en: [
      "People often use more than one word for the same relative. Write <b>all the words used where you grew up</b>, the most common one first.",
      { ul: [
        "Type the first word, then press <b>+ another word</b> for each extra word. Press <b>↑ most common</b> to move a word to the top.",
        "<b>Two boxes for each word:</b> your language's script, and Roman letters typed the way you would on WhatsApp. The script box is required for the first word only.",
        "<b>Different spellings of one word are not different words.</b> Write them in one Roman box, separated by commas: abbu, abbo.",
        "<b>Words from other places</b> (another city, district or community) go in Notes, with where they are used. Do not add them to the list.",
        "<b>If women and men say it differently</b>, list both words and write in Notes who says which.",
      ] },
    ],
    ur: [
      "اکثر لوگ ایک ہی رشتہ دار کے لیے ایک سے زیادہ الفاظ بولتے ہیں۔ <b>وہ تمام الفاظ لکھیں جو آپ کے علاقے میں بولے جاتے ہیں</b>، سب سے عام لفظ پہلے۔",
      { ul: [
        "پہلا لفظ لکھیں، پھر ہر اضافی لفظ کے لیے <b>+ ایک اور لفظ</b> دبائیں۔ کسی لفظ کو سب سے اوپر لانے کے لیے <b>↑ سب سے عام</b> دبائیں۔",
        "<b>ہر لفظ کے دو خانے ہیں:</b> ایک آپ کی زبان کے حروف میں، اور ایک رومن حروف میں، جیسے آپ واٹس ایپ پر لکھتے ہیں۔ اپنی زبان کے حروف والا خانہ صرف پہلے لفظ کے لیے ضروری ہے۔",
        "<b>ایک لفظ کے مختلف ہجے الگ الفاظ نہیں ہیں۔</b> انہیں ایک ہی رومن خانے میں کامے لگا کر لکھیں: <bdi>abbu, abbo</bdi>۔",
        "<b>دوسری جگہوں کے الفاظ</b> (کوئی اور شہر، ضلع یا برادری) نوٹ میں لکھیں، اور یہ بھی کہ وہ کہاں بولے جاتے ہیں۔ انہیں فہرست میں شامل نہ کریں۔",
        "<b>اگر عورتیں اور مرد الگ لفظ بولتے ہیں</b> تو دونوں الفاظ فہرست میں لکھیں اور نوٹ میں بتائیں کہ کون کیا بولتا ہے۔",
      ] },
    ],
  },
  checks: [
    { id: "two-words",
      q: { en: "Your family says both \"abbu\" and \"baba\" for father; abbu is more common. What do you write?",
           ur: "آپ کے گھر میں والد کو ’ابو‘ بھی کہتے ہیں اور ’بابا‘ بھی؛ ابو زیادہ عام ہے۔ آپ کیا لکھیں گے؟" },
      options: [
        { en: "abbu first, then baba with + another word", ur: "پہلے ابو، پھر ’+ ایک اور لفظ‘ سے بابا" },
        { en: "Only abbu", ur: "صرف ابو" },
        { en: "baba first, because it is older", ur: "پہلے بابا، کیونکہ یہ پرانا لفظ ہے" },
      ], answer: 0,
      why: { en: "All words used where you grew up, most common first.", ur: "آپ کے علاقے میں بولے جانے والے تمام الفاظ، سب سے عام پہلے۔" } },
    { id: "spellings",
      q: { en: "People spell the same word \"bhabhi\" and \"bhabi\". What do you write?",
           ur: "لوگ ایک ہی لفظ کو <bdi>\"bhabhi\"</bdi> اور <bdi>\"bhabi\"</bdi> دونوں طرح لکھتے ہیں۔ آپ کیا لکھیں گے؟" },
      options: [
        { en: "One word, with \"bhabhi, bhabi\" in the Roman box", ur: "ایک لفظ، اور رومن خانے میں <bdi>\"bhabhi, bhabi\"</bdi>" },
        { en: "Two separate words", ur: "دو الگ الفاظ" },
        { en: "Only one of the spellings", ur: "صرف ایک ہجے" },
      ], answer: 0,
      why: { en: "Spellings of one word go in one Roman box, separated by commas.", ur: "ایک لفظ کے ہجے ایک ہی رومن خانے میں، کامے لگا کر۔" } },
    { id: "other-place",
      q: { en: "You know that people in another city use a different word, but nobody where you grew up says it. Where does it go?",
           ur: "آپ جانتے ہیں کہ کسی اور شہر میں لوگ ایک مختلف لفظ بولتے ہیں، مگر آپ کے علاقے میں کوئی نہیں بولتا۔ یہ لفظ کہاں جائے گا؟" },
      options: [
        { en: "In Notes, with the city where it is used", ur: "نوٹ میں، اُس شہر کے نام کے ساتھ جہاں یہ بولا جاتا ہے" },
        { en: "As another word in the list", ur: "فہرست میں ایک اور لفظ کے طور پر" },
        { en: "Nowhere; leave it out", ur: "کہیں نہیں؛ چھوڑ دیں" },
      ], answer: 0,
      why: { en: "The list is for words used where you grew up; Notes is for words from other places. Both are useful.",
             ur: "فہرست آپ کے علاقے کے الفاظ کے لیے ہے؛ دوسری جگہوں کے الفاظ نوٹ میں۔ دونوں مفید ہیں۔" } },
    { id: "women-men",
      q: { en: "Where you grew up, women say one word for this relative and men say another. What do you do?",
           ur: "آپ کے علاقے میں اس رشتہ دار کے لیے عورتیں ایک لفظ بولتی ہیں اور مرد دوسرا۔ آپ کو کیا کرنا چاہیے؟" },
      options: [
        { en: "List both words, and write in Notes who says which", ur: "دونوں الفاظ فہرست میں لکھیں، اور نوٹ میں بتائیں کہ کون کیا بولتا ہے" },
        { en: "Write only the men's word", ur: "صرف مردوں والا لفظ لکھیں" },
        { en: "Write only the word of your own sex", ur: "صرف اپنی جنس والا لفظ لکھیں" },
      ], answer: 0,
      why: { en: "Both are used where you grew up, so both go in the list; Notes tells us who uses which.",
             ur: "دونوں آپ کے علاقے میں بولے جاتے ہیں، اس لیے دونوں فہرست میں؛ نوٹ سے پتا چلتا ہے کہ کون کیا بولتا ہے۔" } },
  ] },

{ id: "face", needs: "ask_address",
  title: { en: "Calling elders to their face", ur: "بزرگوں کو سامنے کیا کہہ کر بلاتے ہیں" },
  body: {
    en: [
      "For elders you are also asked: <b>do you call them by a different word when you speak to them?</b>",
      "Many relatives are talked about with one word but called by another. In English you may talk about \"my father-in-law\" but call him \"Dad\". In Urdu many people talk about their \"susar\" but call him \"abbu\".",
      { ul: [
        "<b>No</b>: you call them by the same word, or the same word with ji, jaan or similar added (taya, taya ji).",
        "<b>Yes, a different word</b>: then write that word, or several, most common first.",
      ] },
    ],
    ur: [
      "بزرگوں کے لیے یہ بھی پوچھا جاتا ہے: <b>کیا آپ انہیں سامنے کسی اور لفظ سے بلاتے ہیں؟</b>",
      "بہت سے رشتہ داروں کا ذکر ایک لفظ سے ہوتا ہے مگر انہیں بلایا کسی اور لفظ سے جاتا ہے۔ مثلاً بہت سے لوگ ذکر کرتے وقت ’سسر‘ کہتے ہیں مگر سامنے ’ابو‘ کہہ کر بلاتے ہیں۔",
      { ul: [
        "<b>نہیں</b>: آپ انہیں اسی لفظ سے بلاتے ہیں، یا اسی لفظ کے ساتھ جی، جان وغیرہ لگا کر (تایا، تایا جی)۔",
        "<b>ہاں، کوئی اور لفظ</b>: تو وہ لفظ لکھیں، یا کئی ہوں تو سب سے عام پہلے۔",
      ] },
    ],
  },
  checks: [
    { id: "face-yes",
      q: { en: "You talk about your father-in-law as \"susar\", but call him \"abbu\" to his face. What do you enter?",
           ur: "آپ اپنے سسر کا ذکر ’سسر‘ کہہ کر کرتے ہیں، مگر سامنے انہیں ’ابو‘ کہتے ہیں۔ آپ کیا لکھیں گے؟" },
      options: [
        { en: "Word: susar. To their face: Yes, abbu", ur: "لفظ: سسر۔ سامنے: ہاں، ابو" },
        { en: "Word: abbu. To their face: No", ur: "لفظ: ابو۔ سامنے: نہیں" },
        { en: "Word: susar. To their face: No", ur: "لفظ: سسر۔ سامنے: نہیں" },
      ], answer: 0,
      why: { en: "The main word is how you talk about him; abbu is what you call him.",
             ur: "اصل لفظ وہ ہے جس سے آپ ان کا ذکر کرتے ہیں؛ ابو وہ ہے جس سے آپ انہیں بلاتے ہیں۔" } },
    { id: "face-ji",
      q: { en: "You talk about your father's elder brother as \"taya\" and call him \"taya ji\". To their face?",
           ur: "آپ والد کے بڑے بھائی کا ذکر ’تایا‘ کہہ کر کرتے ہیں اور انہیں ’تایا جی‘ کہہ کر بلاتے ہیں۔ ’سامنے کسی اور لفظ سے؟‘ کا کیا جواب دیں گے؟" },
      options: [
        { en: "No: it is the same word", ur: "نہیں: یہ وہی لفظ ہے" },
        { en: "Yes: taya ji", ur: "ہاں: تایا جی" },
        { en: "Yes: ji", ur: "ہاں: جی" },
      ], answer: 0,
      why: { en: "Adding ji or jaan does not make a different word.", ur: "جی یا جان لگانے سے لفظ نہیں بدلتا۔" } },
  ] },

{ id: "honest",
  title: { en: "Sure, not sure, and working on your own", ur: "’یقین ہے‘، ’یقین نہیں‘، اور اکیلے کام کرنا" },
  body: {
    en: [
      "For every relative, choose <b>Sure</b> or <b>Not sure</b>. If you are not sure, write your best answer and say why in Notes. An honest Not sure is far more useful than a confident guess.",
      { ul: [
        "<b>Use only your own knowledge.</b> No ChatGPT, Google, translators or dictionaries. The page records time spent and pasted text.",
        "<b>Do not ask others while you answer</b>, family included. We want what <i>you</i> know; if you are unsure, say so.",
        "<b>Work on your own.</b> Do not discuss answers with other volunteers. Differences between you are useful, not mistakes.",
        "<b>If you really have no idea</b>, write how people would describe the person (like \"mamu ka beta\") and choose Not sure.",
      ] },
    ],
    ur: [
      "ہر رشتہ دار کے لیے <b>یقین ہے</b> یا <b>یقین نہیں</b> چنیں۔ اگر یقین نہ ہو تو اپنا بہترین جواب لکھیں اور نوٹ میں وجہ بتائیں۔ ایمانداری سے ’یقین نہیں‘ کہنا اعتماد سے لگائے گئے اندازے سے کہیں زیادہ مفید ہے۔",
      { ul: [
        "<b>صرف اپنی معلومات استعمال کریں۔</b> ChatGPT، گوگل، ترجمے کی ایپ یا لغت استعمال نہ کریں۔ صفحہ لگنے والا وقت اور پیسٹ کیا گیا متن ریکارڈ کرتا ہے۔",
        "<b>جواب دیتے وقت دوسروں سے نہ پوچھیں</b>، گھر والوں سے بھی نہیں۔ ہمیں وہ چاہیے جو <i>آپ</i> جانتے ہیں؛ یقین نہ ہو تو بتا دیں۔",
        "<b>اکیلے کام کریں۔</b> دوسرے رضاکاروں سے جوابات پر بات نہ کریں۔ رضاکاروں کے جوابات میں فرق مفید ہے، غلطی نہیں۔",
        "<b>اگر آپ کو بالکل اندازہ نہ ہو</b> تو لکھیں کہ لوگ اس شخص کو کیسے بیان کریں گے (جیسے ’ماموں کا بیٹا‘) اور ’یقین نہیں‘ چنیں۔",
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
    { id: "ask-family",
      q: { en: "You can't remember a word. Your mother is in the next room. What do you do?",
           ur: "آپ کو ایک لفظ یاد نہیں آ رہا۔ آپ کی والدہ ساتھ والے کمرے میں ہیں۔ آپ کو کیا کرنا چاہیے؟" },
      options: [
        { en: "Write what you know, choose Not sure, and explain in Notes", ur: "جو آپ جانتے ہیں وہ لکھیں، ’یقین نہیں‘ چنیں، اور نوٹ میں بتائیں" },
        { en: "Ask her and write her word", ur: "ان سے پوچھ کر ان کا لفظ لکھ دیں" },
        { en: "Search on Google", ur: "گوگل پر ڈھونڈ لیں" },
      ], answer: 0,
      why: { en: "We record what you know yourself. Not sure, with a note, is a good answer.", ur: "ہم وہ ریکارڈ کرتے ہیں جو آپ خود جانتے ہیں۔ نوٹ کے ساتھ ’یقین نہیں‘ اچھا جواب ہے۔" } },
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

{ id: "saving",
  title: { en: "Saving, and getting help", ur: "محفوظ کرنا، اور مدد" },
  body: {
    en: [
      { ul: [
        "Your answers save in this browser as you type. They are sent to the team automatically after each group and every few minutes. You can also press <b>Submit now</b> at any time.",
        "If the page says it <b>could not reach the server</b>, keep working. Nothing is lost; it sends later. Do not clear your browser's data.",
        "To continue on another phone or computer, press <b>Submit now</b> first, then sign in there with the same name. Your work comes back.",
        "Questions or problems: contact the KINSHIFT team, not the other volunteers.",
      ] },
    ],
    ur: [
      { ul: [
        "آپ کے جوابات لکھتے ہی اس براؤزر میں محفوظ ہو جاتے ہیں۔ ہر گروپ کے بعد اور ہر چند منٹ بعد یہ خودبخود ٹیم کو بھیج دیے جاتے ہیں۔ آپ کسی بھی وقت <b>ابھی بھیجیں</b> بھی دبا سکتے ہیں۔",
        "اگر صفحہ کہے کہ <b>سرور سے رابطہ نہیں ہو سکا</b> تو کام جاری رکھیں۔ کچھ ضائع نہیں ہوتا؛ بعد میں بھیج دیا جاتا ہے۔ اپنے براؤزر کا ڈیٹا صاف نہ کریں۔",
        "کسی دوسرے فون یا کمپیوٹر پر کام جاری رکھنے کے لیے پہلے <b>ابھی بھیجیں</b> دبائیں، پھر وہاں اسی نام سے سائن ان کریں۔ آپ کا کام واپس آ جائے گا۔",
        "سوال یا مسئلہ ہو تو KINSHIFT ٹیم سے رابطہ کریں، دوسرے رضاکاروں سے نہیں۔",
      ] },
    ],
  },
  checks: [
    { id: "offline",
      q: { en: "A message says the page could not reach the server. What do you do?", ur: "پیغام آتا ہے کہ صفحہ سرور سے رابطہ نہیں کر سکا۔ آپ کو کیا کرنا چاہیے؟" },
      options: [
        { en: "Keep working; it will send later", ur: "کام جاری رکھیں؛ بعد میں بھیج دیا جائے گا" },
        { en: "Stop and start again from the beginning tomorrow", ur: "رک جائیں اور کل شروع سے دوبارہ کریں" },
        { en: "Clear the browser and sign in again", ur: "براؤزر کا ڈیٹا صاف کر کے دوبارہ سائن ان کریں" },
      ], answer: 0,
      why: { en: "Your work is safe in this browser and is sent when the connection is back.", ur: "آپ کا کام اس براؤزر میں محفوظ ہے اور رابطہ بحال ہونے پر بھیج دیا جاتا ہے۔" } },
    { id: "new-device",
      q: { en: "You worked on your laptop and want to continue on your phone. What do you do?", ur: "آپ نے لیپ ٹاپ پر کام کیا اور اب فون پر جاری رکھنا چاہتے ہیں۔ آپ کو کیا کرنا چاہیے؟" },
      options: [
        { en: "Press Submit now on the laptop, then sign in on the phone with the same name", ur: "لیپ ٹاپ پر ’ابھی بھیجیں‘ دبائیں، پھر فون پر اسی نام سے سائن ان کریں" },
        { en: "Start again on the phone", ur: "فون پر دوبارہ شروع سے کریں" },
        { en: "Send screenshots to the team", ur: "ٹیم کو سکرین شاٹ بھیجیں" },
      ], answer: 0,
      why: { en: "Submitted work comes back wherever you sign in.", ur: "بھیجا ہوا کام جہاں بھی سائن ان کریں، واپس آ جاتا ہے۔" } },
  ] },

{ id: "example",
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
  checks: [
    { id: "together",
      q: { en: "For father's mother you mostly hear \"dadi\", sometimes spelled \"daadi\", and some people around you say \"dado\". What do you enter?",
           ur: "والد کی والدہ کے لیے آپ زیادہ تر ’دادی‘ سنتے ہیں، جسے کبھی <bdi>\"daadi\"</bdi> بھی لکھتے ہیں، اور آپ کے اردگرد کچھ لوگ ’دادو‘ کہتے ہیں۔ آپ کیا لکھیں گے؟" },
      options: [
        { en: "First word dadi, with \"dadi, daadi\" in Roman; second word dado", ur: "پہلا لفظ دادی، رومن میں <bdi>\"dadi, daadi\"</bdi>؛ دوسرا لفظ دادو" },
        { en: "Three separate words: dadi, daadi, dado", ur: "تین الگ الفاظ: <bdi>dadi</bdi>، <bdi>daadi</bdi>، <bdi>dado</bdi>" },
        { en: "Only dadi", ur: "صرف دادی" },
      ], answer: 0,
      why: { en: "Spellings share one Roman box; a different word gets its own row, most common first.",
             ur: "ہجے ایک ہی رومن خانے میں؛ الگ لفظ کی اپنی قطار، سب سے عام پہلے۔" } },
  ] },
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

function guideBlocks(blocks) {
  return blocks.map(b => typeof b === "string" ? h("p", { html: b })
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
function guideParts(config) { return GUIDE.parts.filter(p => !p.needs || (config && config[p.needs])); }

if (typeof module !== "undefined") module.exports = GUIDE;
