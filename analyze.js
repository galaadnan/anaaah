/* ============================================================
   ANALYZE.JS — Unified + Journal Secondary Emotion Linked
   ✅ Uses journal finalMood + secondaryMood
   ✅ Uses emoji + journal together
   ✅ Recommendations use the latest journal secondary emotion too
   ✅ Chart + top moods include weighted secondary emotion
============================================================ */

console.log("✅ analyze.js loaded (Unified + Secondary Emotion Linked)");

let chartInstance = null;

const MOOD_ORDER = ["سعيد", "لا بأس", "حزين", "قلق", "غاضب", "متعب", "غير محدد"];

const MOOD_IMAGES = {
  "سعيد": "images/Habby.png",
  "لا بأس": "images/Ok.png",
  "غاضب": "images/Angry.png",
  "حزين": "images/Sad.png",
  "قلق": "images/worried.png",
  "متعب": "images/Tired.png",
  "غير محدد":
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><text x='50%' y='50%' font-size='40' text-anchor='middle' dominant-baseline='middle'>❔</text></svg>"
};

const MOOD_COLORS = {
  "سعيد": "#1dd1a1",
  "لا بأس": "#a29bfe",
  "حزين": "#54a0ff",
  "قلق": "#ff9f43",
  "غاضب": "#ff6b6b",
  "متعب": "#feca57",
  "غير محدد": "#ccabd8"
};

/* ============================================================
   Dataset التوصيات
============================================================ */
const RECOMMENDATION_DATASET = [
  {
    id: 1,
    mood: "سعيد",
    volatility: "منخفض",
    secondary_moods: ["لا بأس", "متعب", "قلق"],
    title: "تعزيز الحالة الإيجابية",
    type: "تعزيز",
    reason: "تم اختيار هذه التوصية لأن شعورك الحالي إيجابي والنمط العام مستقر نسبيًا، لذلك الأولوية هي الحفاظ على هذا التوازن وتعزيزه.",
    quick_steps: [
      "دوّن سبب هذا الشعور الجميل في سطر واحد",
      "شارك لحظة إيجابية مع شخص قريب",
      "استثمر هذه الطاقة في إنجاز صغير"
    ],
    daily_suggestions: [
      "كرر النشاط الذي دعم مزاجك اليوم",
      "ضع هدفًا بسيطًا لليوم التالي",
      "حافظ على نوم جيد حتى لا ينخفض المزاج"
    ]
  },
  {
    id: 2,
    mood: "سعيد",
    volatility: "متوسط",
    secondary_moods: ["لا بأس", "متعب", "قلق"],
    title: "حفظ التوازن الجميل",
    type: "تعزيز",
    reason: "تم اختيار هذه التوصية لأن لديك شعورًا إيجابيًا حاليًا مع بعض التغير في النمط، لذا المطلوب هو تثبيت العوامل التي تساعدك.",
    quick_steps: [
      "التقط لحظة امتنان قبل نهاية اليوم",
      "ابدأ مهمة صغيرة وأنت في هذه الطاقة",
      "خفف التشتيت حتى لا يتغير مزاجك بسرعة"
    ],
    daily_suggestions: [
      "حافظ على روتين بسيط وواضح",
      "استثمر طاقتك في شيء مفيد واحد",
      "راجع ما الذي ساعدك نفسيًا اليوم"
    ]
  },
  {
    id: 3,
    mood: "سعيد",
    volatility: "مرتفع",
    secondary_moods: ["لا بأس", "قلق", "متعب"],
    title: "تثبيت المشاعر الجيدة",
    type: "تعزيز",
    reason: "تم اختيار هذه التوصية لأن لديك لحظات إيجابية لكن مع تذبذب ملحوظ، لذلك الأفضل تثبيت العادات الداعمة بدل الاعتماد على المزاج فقط.",
    quick_steps: [
      "دوّن ما الذي حسّن مزاجك اليوم",
      "خذ استراحة قصيرة لحفظ هذا التوازن",
      "أنجز شيئًا صغيرًا قبل أن ينخفض الحماس"
    ],
    daily_suggestions: [
      "اجعل يومك أقل ازدحامًا",
      "حافظ على روتين نوم وراحة واضح",
      "كرر النشاط الذي رفع مزاجك سابقًا"
    ]
  },

  {
    id: 4,
    mood: "لا بأس",
    volatility: "منخفض",
    secondary_moods: ["سعيد", "متعب", "حزين"],
    title: "دعم يومي متوازن",
    type: "تنظيم",
    reason: "تم اختيار هذه التوصية لأن النمط الحالي متوازن نسبيًا، لذا الأنسب هو الحفاظ على روتين لطيف يمنع تراكم الضغط.",
    quick_steps: [
      "خذ نفسًا بطيئًا لمدة دقيقتين",
      "اشرب ماء وغيّر مكانك قليلًا",
      "اكتب شيئًا واحدًا سار بشكل جيد اليوم"
    ],
    daily_suggestions: [
      "حافظ على روتين هادئ وبسيط",
      "لا تملأ يومك فوق طاقتك",
      "أضف نشاطًا صغيرًا تحبه"
    ]
  },
  {
    id: 5,
    mood: "لا بأس",
    volatility: "متوسط",
    secondary_moods: ["سعيد", "متعب", "حزين"],
    title: "تنظيم لطيف لليوم",
    type: "تنظيم",
    reason: "تم اختيار هذه التوصية لأن حالتك العامة محايدة مع بعض التقلب، لذا الأفضل خطوات خفيفة تمنع الضغط من التراكم.",
    quick_steps: [
      "رتب أول مهمة فقط دون التفكير في الباقي",
      "خذ استراحة قصيرة بعيدًا عن الشاشة",
      "خفف الإشعارات 10 دقائق"
    ],
    daily_suggestions: [
      "ابدأ الغد بخطوة واضحة واحدة",
      "راجع أولوياتك فقط لا كل شيء",
      "حافظ على وقت بسيط للراحة"
    ]
  },
  {
    id: 6,
    mood: "لا بأس",
    volatility: "مرتفع",
    secondary_moods: ["حزين", "قلق", "متعب"],
    title: "استقرار وسط التذبذب",
    type: "تنظيم",
    reason: "تم اختيار هذه التوصية لأن الشعور الحالي محايد لكن النمط متذبذب، لذلك الأولوية الآن للتهدئة والتنظيم لا للضغط والإنجاز الكبير.",
    quick_steps: [
      "تنفس ببطء: شهيق 4 ثوانٍ وزفير 6 ثوانٍ",
      "اختر خطوة واحدة فقط الآن",
      "ابتعد قليلًا عن أي مصدر ضغط"
    ],
    daily_suggestions: [
      "خفف توقعاتك من نفسك اليوم",
      "رتب يومك على شكل مهام صغيرة جدًا",
      "اكتب يومية قصيرة قبل النوم"
    ]
  },

  {
    id: 7,
    mood: "حزين",
    volatility: "منخفض",
    secondary_moods: ["متعب", "قلق", "لا بأس"],
    title: "احتواء المشاعر بهدوء",
    type: "دعم عاطفي",
    reason: "تم اختيار هذه التوصية لأن الحزن ظاهر لكن النمط ليس شديد التذبذب، لذا الأنسب هو الاحتواء اللطيف والدعم التدريجي.",
    quick_steps: [
      "اكتب ما تشعر به لمدة 3 دقائق دون توقف",
      "اسمح لنفسك باستراحة قصيرة بدون تأنيب",
      "استمع لشيء مريح الآن"
    ],
    daily_suggestions: [
      "خفف أهداف اليوم إلى هدف واحد فقط",
      "اكتب يومية قصيرة قبل النوم",
      "اختر شيئًا لطيفًا تفعله لنفسك"
    ]
  },
  {
    id: 8,
    mood: "حزين",
    volatility: "متوسط",
    secondary_moods: ["متعب", "قلق", "لا بأس"],
    title: "دعم عاطفي تدريجي",
    type: "دعم عاطفي",
    reason: "تم اختيار هذه التوصية لأن الحزن متكرر مع تقلب متوسط، لذلك الأفضل تقديم دعم بسيط ومنتظم بدل الضغط على نفسك.",
    quick_steps: [
      "تواصل مع شخص تثق به برسالة قصيرة",
      "تحرك أو امشِ 5 دقائق",
      "اكتب ما تحتاجه الآن بصراحة"
    ],
    daily_suggestions: [
      "خفف الحمل النفسي في بقية اليوم",
      "اطلب دعمًا إذا احتجت",
      "استبدل المثالية بخطوة صغيرة قابلة للتنفيذ"
    ]
  },
  {
    id: 9,
    mood: "حزين",
    volatility: "مرتفع",
    secondary_moods: ["قلق", "متعب", "غاضب"],
    title: "تقليل الضغط العاطفي",
    type: "دعم عاطفي",
    reason: "تم اختيار هذه التوصية لأن الحزن حاضر مع تذبذب مرتفع، لذلك الأولوية الآن ليست الإنجاز بل تخفيف الحمل العاطفي والتهدئة.",
    quick_steps: [
      "تنفس ببطء لدقيقتين",
      "ابتعد عن أي مثير للضغط لفترة قصيرة",
      "اكتب شعورك بدل كتمه"
    ],
    daily_suggestions: [
      "اجعل يومك أخف قدر الإمكان",
      "اختر نشاطًا مريحًا بدل إجبار نفسك",
      "تحدث مع شخص داعم إن أمكن"
    ]
  },

  {
    id: 10,
    mood: "قلق",
    volatility: "منخفض",
    secondary_moods: ["متعب", "غاضب", "حزين"],
    title: "تهدئة ذهنية خفيفة",
    type: "تهدئة",
    reason: "تم اختيار هذه التوصية لأن القلق ظاهر بشكل محدود، لذلك الأفضل تهدئته مبكرًا قبل أن يتصاعد.",
    quick_steps: [
      "طبّق تمرين 5-4-3-2-1",
      "اكتب ما يقلقك ثم حدد أصغر خطوة ممكنة",
      "تنفس ببطء لدقيقتين"
    ],
    daily_suggestions: [
      "قسّم المهام إلى خطوات صغيرة جدًا",
      "خفف المنبهات إن أمكن",
      "رتب أولوياتك فقط لا كل شيء"
    ]
  },
  {
    id: 11,
    mood: "قلق",
    volatility: "متوسط",
    secondary_moods: ["متعب", "غاضب", "حزين"],
    title: "تنظيم القلق بخطوات صغيرة",
    type: "تهدئة",
    reason: "تم اختيار هذه التوصية لأن القلق يتكرر مع نمط متوسط، لذا الأفضل تنظيم اليوم وتقليل التشتيت والمحفزات.",
    quick_steps: [
      "أغلق الإشعارات 15 دقيقة",
      "خذ نفسًا بطيئًا ثم عد لمهمة واحدة فقط",
      "ابتعد قليلًا عن مصدر التوتر"
    ],
    daily_suggestions: [
      "لا تحاول حل كل شيء دفعة واحدة",
      "خصص وقتًا قصيرًا للراحة بين المهام",
      "رتب الغد من الليلة بشكل بسيط"
    ]
  },
  {
    id: 12,
    mood: "قلق",
    volatility: "مرتفع",
    secondary_moods: ["غاضب", "متعب", "حزين"],
    title: "تهدئة عاجلة ولطيفة",
    type: "تهدئة",
    reason: "تم اختيار هذه التوصية لأن القلق حاضر مع تذبذب مرتفع، لذلك الأولوية هي خفض التحفيز وتهدئة الجسد قبل أي شيء آخر.",
    quick_steps: [
      "اجلس في مكان أهدأ لدقيقتين",
      "طبّق 5-4-3-2-1 الآن",
      "اكتب جملة واحدة: ما الذي يضغطني الآن؟"
    ],
    daily_suggestions: [
      "خفف ضغط اليوم إلى الحد الأدنى",
      "أجل ما يمكن تأجيله",
      "اختر روتينًا مسائيًا هادئًا الليلة"
    ]
  },

  {
    id: 13,
    mood: "غاضب",
    volatility: "منخفض",
    secondary_moods: ["قلق", "متعب", "حزين"],
    title: "تفريغ التوتر بهدوء",
    type: "إدارة انفعال",
    reason: "تم اختيار هذه التوصية لأن الانفعال موجود لكنه ما زال قابلًا للاحتواء، لذلك الأفضل تفريغه بطريقة آمنة وهادئة.",
    quick_steps: [
      "اشرب ماء قبل أي رد",
      "ابتعد 5 دقائق عن الموقف المزعج",
      "حرك جسمك لتفريغ التوتر"
    ],
    daily_suggestions: [
      "أجل أي نقاش حساس حتى تهدأ",
      "استخدم المشي أو الرياضة الخفيفة",
      "اختر ردًا أهدأ من رد الفعل الأول"
    ]
  },
  {
    id: 14,
    mood: "غاضب",
    volatility: "متوسط",
    secondary_moods: ["قلق", "متعب", "حزين"],
    title: "إدارة الانفعال",
    type: "إدارة انفعال",
    reason: "تم اختيار هذه التوصية لأن الغضب يتكرر مع نمط غير ثابت تمامًا، لذا الأفضل تهدئة الجسد وتقليل المحفزات.",
    quick_steps: [
      "اكتب سبب انزعاجك دون إرساله لأحد",
      "خفف سرعة كلامك وخذ نفسًا عميقًا",
      "ابتعد عن أي جدال الآن"
    ],
    daily_suggestions: [
      "ضع حدودك بهدوء بدل الانفجار",
      "خفف المثيرات والتوتر اليوم",
      "اختر وقتًا أهدأ للنقاش لاحقًا"
    ]
  },
  {
    id: 15,
    mood: "غاضب",
    volatility: "مرتفع",
    secondary_moods: ["قلق", "متعب", "حزين"],
    title: "خفض شدة الانفعال",
    type: "إدارة انفعال",
    reason: "تم اختيار هذه التوصية لأن شدة الانفعال مرتفعة مع تذبذب واضح، لذا الأولوية الآن لخفض التصعيد واستعادة الهدوء.",
    quick_steps: [
      "غادر الموقف المزعج مؤقتًا",
      "تنفس ببطء واشرب ماء",
      "أوقف أي رد فوري الآن"
    ],
    daily_suggestions: [
      "لا تدخل في نقاشات إضافية اليوم",
      "خفف الضغط الجسدي والنفسي",
      "استخدم المشي أو التمدد لتفريغ التوتر"
    ]
  },

  {
    id: 16,
    mood: "متعب",
    volatility: "منخفض",
    secondary_moods: ["لا بأس", "حزين", "قلق"],
    title: "استعادة الطاقة",
    type: "استعادة طاقة",
    reason: "تم اختيار هذه التوصية لأن التعب ظاهر بشكل خفيف إلى متوسط، لذلك الأفضل إعطاء الجسد والعقل راحة قصيرة فعالة.",
    quick_steps: [
      "اشرب ماء أو تناول شيئًا خفيفًا",
      "أرح عينيك من الشاشة 10 دقائق",
      "خفف عدد مهام اليوم"
    ],
    daily_suggestions: [
      "نم أبكر من المعتاد الليلة",
      "اكتفِ بثلاث مهام أساسية فقط",
      "اسمح بالراحة كجزء من الإنجاز"
    ]
  },
  {
    id: 17,
    mood: "متعب",
    volatility: "متوسط",
    secondary_moods: ["لا بأس", "حزين", "قلق"],
    title: "راحة واسترجاع تركيز",
    type: "استعادة طاقة",
    reason: "تم اختيار هذه التوصية لأن الإرهاق يتكرر مع نمط متوسط، لذا المطلوب تخفيف المتطلبات واسترجاع التركيز تدريجيًا.",
    quick_steps: [
      "تمدد لدقيقة ثم اجلس بهدوء",
      "اسمح لنفسك بفاصل قصير بلا ذنب",
      "اختر مهمة واحدة فقط الآن"
    ],
    daily_suggestions: [
      "خفف وقت الشاشة مساءً",
      "رتب الغد بحيث يكون أخف",
      "أجّل ما لا يلزم اليوم"
    ]
  },
  {
    id: 18,
    mood: "متعب",
    volatility: "مرتفع",
    secondary_moods: ["حزين", "قلق", "لا بأس"],
    title: "تقليل الإرهاق فورًا",
    type: "استعادة طاقة",
    reason: "تم اختيار هذه التوصية لأن التعب قوي مع تذبذب مرتفع، لذا الأفضل خفض الحمل فورًا والاهتمام بالراحة قبل أي شيء.",
    quick_steps: [
      "أوقف التشتت وخذ راحة قصيرة الآن",
      "اشرب ماء وتنفس ببطء",
      "خفف أي مهمة غير ضرورية اليوم"
    ],
    daily_suggestions: [
      "اجعل بقية اليوم أخف قدر الإمكان",
      "نم بشكل أبكر الليلة",
      "لا تضغط نفسك على إنجاز كبير الآن"
    ]
  }
];

/* ============================================================
   Helpers
============================================================ */
function normalizeMood(raw) {
  if (!raw) return "غير محدد";

  let m = String(raw).trim().replace(/\s+/g, " ");

  if (m.includes("لا بأس") || m === "لا") return "لا بأس";
  if (m.includes("سعيد")) return "سعيد";
  if (m.includes("حزين")) return "حزين";
  if (m.includes("غاضب")) return "غاضب";
  if (m.includes("قلق") || m.includes("متوتر")) return "قلق";
  if (m.includes("متعب") || m.includes("تعبان")) return "متعب";

  return "غير محدد";
}

function moodColor(mood) {
  return MOOD_COLORS[mood] || "#ccabd8";
}

function isoDate(date) {
  return date.toISOString().split("T")[0];
}

function computeVolatility(historyList) {
  const sorted = historyList.slice().sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length <= 1) return 0;

  let changes = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].dominant !== sorted[i - 1].dominant) changes++;
  }

  return Math.round((changes / (sorted.length - 1)) * 100);
}

function getVolatilityLabel(value) {
  if (value >= 60) return "مرتفع";
  if (value >= 30) return "متوسط";
  return "منخفض";
}

function getTopTwoMoods(counts) {
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return {
    first: sorted[0]?.[0] || "غير محدد",
    second: sorted[1]?.[0] || null
  };
}

/* ============================================================
   Firestore Loader
   - dominantCounts: للحالة الأساسية
   - blendedCounts: يدخل secondaryMood بوزن 0.5
============================================================ */
async function loadUnifiedData(days) {
  const dominantCounts = {};
  const blendedCounts = {};
  const historyMap = new Map();

  const user = firebase.auth().currentUser;
  if (!user) {
    return { dominantCounts, blendedCounts, historyList: [] };
  }

  const db = firebase.firestore();
  const userRef = db.collection("users").doc(user.uid);

  const start = new Date();
  start.setDate(start.getDate() - days + 1);
  const startISO = isoDate(start);

  try {
    const [emojiSnap, journalSnap] = await Promise.all([
      userRef
        .collection("emoji_moods")
        .where(firebase.firestore.FieldPath.documentId(), ">=", startISO)
        .get()
        .catch(() => ({ forEach: () => {}, size: 0 })),
      userRef
        .collection("entries")
        .where(firebase.firestore.FieldPath.documentId(), ">=", startISO)
        .get()
    ]);

    console.log(`📊 Loaded: ${emojiSnap.size || 0} emoji moods, ${journalSnap.size || 0} journal entries`);

    /* ---- Emoji moods ---- */
    if (emojiSnap && typeof emojiSnap.forEach === "function") {
      emojiSnap.forEach((doc) => {
        const data = doc.data() || {};
        const dominantMood = normalizeMood(data.mood || data.selectedMood || data.finalMood);

        historyMap.set(doc.id, {
          date: doc.id,
          dominant: dominantMood,
          secondaryMood: null,
          type: "إيموجي ✨"
        });
      });
    }

    /* ---- Journal moods (override same-day emoji if exists) ---- */
    journalSnap.forEach((doc) => {
      const data = doc.data() || {};
      const dominantMood = normalizeMood(data.finalMood || data.mood);
      const secondaryMoodRaw = normalizeMood(data.secondaryMood);

      const secondaryMood =
        secondaryMoodRaw !== "غير محدد" && secondaryMoodRaw !== dominantMood
          ? secondaryMoodRaw
          : null;

      historyMap.set(doc.id, {
        date: doc.id,
        dominant: dominantMood,
        secondaryMood,
        type: "يومية 📝",
        moodCounts: data.moodCounts || {},
        sentencesDetails: data.sentencesDetails || []
      });
    });

    const historyList = Array.from(historyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    historyList.forEach((item) => {
      /* dominant count */
      dominantCounts[item.dominant] = (dominantCounts[item.dominant] || 0) + 1;

      /* blended count: primary=1, secondary=0.5 */
      blendedCounts[item.dominant] = (blendedCounts[item.dominant] || 0) + 1;

      if (item.secondaryMood) {
        blendedCounts[item.secondaryMood] = (blendedCounts[item.secondaryMood] || 0) + 0.5;
      }
    });

    return { dominantCounts, blendedCounts, historyList };
  } catch (error) {
    console.error("❌ Failed to load unified data:", error);
    return { dominantCounts: {}, blendedCounts: {}, historyList: [] };
  }
}

/* ============================================================
   Chart
============================================================ */
function renderChart(labels, values) {
  const canvas = document.getElementById("moodChart");
  if (!canvas || typeof Chart === "undefined") return;

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: labels.map(moodColor),
          borderRadius: 10,
          borderSkipped: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700, easing: "easeOutQuart" },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `${context.parsed.y}%`
          }
        }
      },
      scales: {
        x: {
          ticks: { font: { size: 12 } }
        },
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: (value) => `${value}%`
          }
        }
      }
    }
  });
}

/* ============================================================
   Recommendation Loader
============================================================ */
async function loadRecommendationDataset() {
  try {
    const res = await fetch("anah_recommendations_ar_dataset.json");
    if (!res.ok) throw new Error("dataset fetch failed");

    const data = await res.json();
    if (Array.isArray(data) && data.length) {
      console.log("✅ External recommendation dataset loaded");
      return data;
    }

    throw new Error("dataset empty");
  } catch (error) {
    console.warn("⚠️ Using embedded dataset instead:", error.message);
    return RECOMMENDATION_DATASET;
  }
}

function itemMatchesSecondary(item, secondMood) {
  if (!secondMood) return false;

  if (Array.isArray(item.secondary_moods)) {
    return item.secondary_moods.includes(secondMood);
  }

  if (typeof item.secondary_mood === "string") {
    return item.secondary_mood === secondMood;
  }

  return false;
}

function scoreRecommendation(item, todayMood, secondMood, volatilityLabel) {
  let score = 0;

  if (item.mood === todayMood) score += 5;
  if (item.volatility === volatilityLabel) score += 3;
  if (itemMatchesSecondary(item, secondMood)) score += 2;

  return score;
}

function findBestRecommendation(dataset, todayMood, secondMood, volatilityLabel) {
  let best = null;
  let bestScore = -1;

  dataset.forEach((item) => {
    const score = scoreRecommendation(item, todayMood, secondMood, volatilityLabel);
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  });

  return best;
}

function renderRecommendation(rec, context) {
  const weekEl = document.getElementById("recWeekNote");
  const quoteEl = document.getElementById("recQuote");
  const quickEl = document.getElementById("recQuick");
  const dailyEl = document.getElementById("recDaily");

  if (!weekEl || !quoteEl || !quickEl || !dailyEl) return;

  if (!rec) {
    weekEl.innerHTML = `<span class="rec-chip">لا توجد توصية متاحة</span>`;
    quoteEl.textContent = "اكتبي المزيد من اليوميات أو سجلي مشاعرك لنتمكن من تخصيص توصيات أفضل.";
    quickEl.innerHTML = "<li>اكتبي يومية قصيرة اليوم</li>";
    dailyEl.innerHTML = "<li>ارجعي لاحقًا بعد توفر بيانات أكثر</li>";
    return;
  }

  weekEl.innerHTML = `
    <span style="display:inline-flex;gap:8px;flex-wrap:wrap;align-items:center">
      <span class="rec-chip">الشعور الحالي: ${context.todayMood}</span>
      ${context.secondMood ? `<span class="rec-chip">الشعور الثانوي: ${context.secondMood}</span>` : ""}
      <span class="rec-chip">التذبذب: ${context.volatilityLabel}</span>
      <span class="rec-chip">نوع التوصية: ${rec.type}</span>
    </span>
  `;

  quoteEl.textContent = `${rec.title} — ${rec.reason}`;
  quickEl.innerHTML = (rec.quick_steps || []).map((step) => `<li>${step}</li>`).join("");
  dailyEl.innerHTML = (rec.daily_suggestions || []).map((step) => `<li>${step}</li>`).join("");
}

/* ============================================================
   Main Render
============================================================ */
async function renderDashboard(days) {
  const rangeLabelEl = document.getElementById("analysisRange");
  if (rangeLabelEl) {
    rangeLabelEl.textContent =
      days === 7 ? "آخر ٧ أيام" :
      days === 30 ? "آخر ٣٠ يوم" :
      days === 90 ? "آخر ٩٠ يوم" : `آخر ${days} يوم`;
  }

  const { dominantCounts, blendedCounts, historyList } = await loadUnifiedData(days);
  const totalEntries = historyList.length;

  const listEl = document.getElementById("moodList");
  const topEl = document.getElementById("topMoods");

  if (!totalEntries) {
    if (listEl) {
      listEl.innerHTML = `<p class="an-subtext" style="padding:10px">لا توجد بيانات مسجلة لهذه الفترة.</p>`;
    }

    if (topEl) {
      topEl.innerHTML = `<p class="an-subtext">لا توجد بيانات.</p>`;
    }

    renderChart([], []);
    renderRecommendation(null, {});
    return;
  }

  /* ---- Chart uses blended counts (primary + secondary) ---- */
  const totalWeight = Object.values(blendedCounts).reduce((sum, value) => sum + value, 0) || 1;

  const labels = MOOD_ORDER.filter((m) => (blendedCounts[m] || 0) > 0);
  const values = labels.map((m) => Math.round(((blendedCounts[m] || 0) / totalWeight) * 100));

  renderChart(labels, values);

  /* ---- Top moods use blended counts too ---- */
  if (topEl) {
    const topMoods = Object.entries(blendedCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    topEl.innerHTML = topMoods.map(([mood, count]) => {
      const pct = Math.round((count / totalWeight) * 100);
      return `
        <div class="an-metric">
          <div class="an-metric-label" style="display:flex;align-items:center;gap:10px">
            <img src="${MOOD_IMAGES[mood]}" style="width:28px" alt="${mood}">
            <span>${mood}</span>
          </div>
          <span class="an-metric-value">${pct}%</span>
        </div>
      `;
    }).join("");
  }

  /* ---- Mood history shows secondaryMood for journal entries ---- */
  if (listEl) {
    listEl.innerHTML = historyList
      .slice()
      .reverse()
      .map((item) => {
        return `
          <div class="an-mood-row">
            <div style="display:flex;align-items:center;gap:10px">
              <img src="${MOOD_IMAGES[item.dominant]}" style="width:36px" alt="${item.dominant}">
              <div>
                <strong>${item.dominant}</strong>
                ${item.secondaryMood ? `<small style="display:block;color:#666;font-size:.72rem">ثانوي: ${item.secondaryMood}</small>` : ""}
                <small style="display:block;color:#888;font-size:.72rem">المصدر: ${item.type}</small>
              </div>
            </div>
            <span class="an-tag">${item.date}</span>
          </div>
        `;
      })
      .join("");
  }

  /* ---- Recommendation ---- */
  const sortedHistory = historyList.slice().sort((a, b) => a.date.localeCompare(b.date));
  const latestEntry = sortedHistory[sortedHistory.length - 1];

  const todayMood = latestEntry?.dominant || "غير محدد";

  /* Important:
     Prefer the real journal secondaryMood from the latest entry.
     If none exists, fallback to the overall second weighted mood.
  */
  const topTwoBlended = getTopTwoMoods(blendedCounts);
  const secondMood = latestEntry?.secondaryMood || topTwoBlended.second || null;

  const volatilityValue = computeVolatility(historyList);
  const volatilityLabel = getVolatilityLabel(volatilityValue);

  const dataset = await loadRecommendationDataset();
  const bestRecommendation = findBestRecommendation(
    dataset,
    todayMood,
    secondMood,
    volatilityLabel
  );

  renderRecommendation(bestRecommendation, {
    todayMood,
    secondMood,
    volatilityLabel,
    volatilityValue
  });
}

/* ============================================================
   Init
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".an-chip[data-range]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".an-chip[data-range]").forEach((b) => {
        b.classList.remove("is-active");
      });

      btn.classList.add("is-active");

      const days = parseInt(btn.dataset.range, 10) || 7;
      renderDashboard(days);
    });
  });

  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      renderDashboard(7);
    } else {
      const listEl = document.getElementById("moodList");
      const topEl = document.getElementById("topMoods");

      if (listEl) {
        listEl.innerHTML = `<p class="an-subtext" style="padding:10px">سجلي الدخول أولًا لعرض بيانات التحليل.</p>`;
      }

      if (topEl) {
        topEl.innerHTML = `<p class="an-subtext">سجلي الدخول أولًا.</p>`;
      }

      renderRecommendation(null, {});
    }
  });
});
// كود الجافاسكريبت لتغيير الزر النشط (Active)
const filterBtns = document.querySelectorAll('.an-chip');

filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        // 1. شيل كلاس 'is-active' من كل الأزرار
        filterBtns.forEach(b => b.classList.remove('is-active'));
        
        // 2. حط كلاس 'is-active' للزر اللي انضغط الحين
        this.classList.add('is-active');

        // هنا عاد تحطين الكود حق تحديث البيانات بناءً على التاريخ
        const range = this.getAttribute('data-range');
        // updateAnalysisData(range); // مثال على دالة تحديث البيانات
    });
});