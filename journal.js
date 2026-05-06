/**
 * ============================================================================
 * JOURNAL.JS - Professional Edition (Anah)
 * Features: Rich Editor, Dual Emotion, Achievements, Daily Prompts.
 * ============================================================================
 */

function showJournalStatus(message, type = "info") {
  const modal = document.getElementById("journalStatusModal");
  const msgEl = document.getElementById("journalStatusMessage");
  const titleEl = document.getElementById("journalStatusTitle");
  const iconEl = document.getElementById("journalStatusIcon");
  const closeBtn = document.getElementById("closeJournalStatusModal");

  if (!modal || !msgEl || !titleEl || !iconEl || !closeBtn) return;

  msgEl.textContent = message;
  titleEl.textContent = type === "success" ? "تم بنجاح" : (type === "error" ? "تنبيه" : "معلومة");
  iconEl.textContent = type === "success" ? "🎉" : (type === "error" ? "⚠️" : "ℹ️");

  modal.hidden = false;
  closeBtn.onclick = () => (modal.hidden = true);
}

function wordCount(t = "") { return t.trim() ? (t.trim().match(/\S+/g) || []).length : 0; }
function isoToday() { return new Date().toISOString().split("T")[0]; }
function escapeHtml(s = "") {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

let savedRange = null;

function saveSelection() {
  const sel = window.getSelection();
  if (sel.rangeCount > 0) savedRange = sel.getRangeAt(0);
}

function restoreSelection() {
  const noteEl = document.getElementById("note");
  noteEl.focus();
  if (savedRange) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }
}

window.formatDoc = (cmd, val = null) => { 
  restoreSelection(); 
  document.execCommand(cmd, false, val); 
  saveSelection(); 
};

window.insertEmoji = (emoji) => {
  restoreSelection();
  document.execCommand('insertHTML', false, emoji);
  const p = document.getElementById("emojiPalette");
  if(p) p.hidden = true;
  saveSelection();
};

/**
 * أسئلة الإلهام اليومية (Daily Prompts)
 */
const dailyPrompts = [
  "ما هو أكثر شيء تشعر بالامتنان له اليوم؟",
  "لو كان ليومك عنوان، ماذا سيكون؟",
  "موقف بسيط أسعدك أو أضحكك اليوم؟",
  "تحدي واجهته اليوم وكيف تعاملت معه؟",
  "فكرة أو خاطرة لم تفارق ذهنك اليوم؟",
  "ما هو الشعور الغالب عليك الآن ولماذا؟",
  "شيء واحد تتمنى إنجازه غداً؟"
];

function initDailyPrompt() {
  const textEl = document.getElementById("dailyPromptText");
  const btnEl = document.getElementById("newPromptBtn");
  if (!textEl || !btnEl) return;

  const setRandomPrompt = () => {
    const random = dailyPrompts[Math.floor(Math.random() * dailyPrompts.length)];
    textEl.textContent = random;
  };

  setRandomPrompt();
  btnEl.addEventListener("click", setRandomPrompt);
}

async function runLocalAnalysis(text) {
  try {
    const response = await fetch("http://127.0.0.1:8000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error(`AI server error`);
    const data = await response.json();
    return {
      finalMood: data.finalMood || "غير محدد",
      secondaryMood: data.secondaryMood || null,
      moodCounts: data.moodCounts || {},
      sentencesDetails: data.sentencesDetails || []
    };
  } catch (error) {
    console.error("AI Server Error:", error);
    return { finalMood: "⚠️ فشل الاتصال", secondaryMood: null, moodCounts: {}, sentencesDetails: [] };
  }
}

async function saveTodayEntry() {
  const saveBtn = document.getElementById("save");
  const noteEl = document.getElementById("note");
  const textContent = noteEl.innerText.trim();
  const htmlContent = noteEl.innerHTML.trim();

  if (!textContent) return showJournalStatus("يرجى كتابة نص أولاً", "error");

  const user = firebase.auth().currentUser;
  if (!user) return showJournalStatus("يرجى تسجيل الدخول", "error");

  const today = isoToday();
  const userRef = firebase.firestore().collection("users").doc(user.uid);

  try {
    const emojiDoc = await userRef.collection("emoji_moods").doc(today).get();
    if (emojiDoc.exists) {
      if (!(await showJournalChoiceModal())) return; 
      await userRef.collection("emoji_moods").doc(today).delete(); 
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "جاري التحليل المفصل...";

    const analysis = await runLocalAnalysis(textContent);

    await userRef.collection("entries").doc(today).set({
      text: textContent,
      html: htmlContent,
      words: wordCount(textContent),
      finalMood: analysis.finalMood,
      secondaryMood: analysis.secondaryMood,
      moodCounts: analysis.moodCounts,         
      sentencesDetails: analysis.sentencesDetails, 
      savedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    let msg = `تم الحفظ! الشعور الغالب: ${analysis.finalMood}`;
    if (analysis.secondaryMood) msg += `، ممزوجاً بشعور: ${analysis.secondaryMood}`;
    showJournalStatus(msg, "success");
    
    noteEl.innerHTML = ""; 
    if(typeof initAchievementsUI === "function") initAchievementsUI(); // تحديث الإنجازات بعد الحفظ

  } catch (err) {
    console.error("Firestore Save Error:", err);
    showJournalStatus("حدث خطأ أثناء الحفظ.", "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "حفظ المذكرة";
  }
}

async function openAllEntriesModal() {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const viewContent = document.getElementById("viewContent");
  document.getElementById("viewModal").hidden = false;
  viewContent.innerHTML = "<p style='padding:20px'>جاري جلب مذكراتك المحللة...</p>";

  try {
    const userRef = firebase.firestore().collection("users").doc(user.uid);
    const [eSnap, jSnap] = await Promise.all([
      userRef.collection("emoji_moods").get(), 
      userRef.collection("entries").get()
    ]);

    const history = new Map();
    
    eSnap.forEach(d => {
        history.set(d.id, { mood: d.data().mood, type: 'إيموجي ✨', date: d.id });
    });
    
    jSnap.forEach(d => {
      const data = d.data();
      history.set(d.id, { 
        ...data, 
        mood: data.finalMood || "غير محدد", 
        secondaryMood: data.secondaryMood || null, 
        type: 'يومية 📝', 
        date: d.id 
      });
    });

    const sorted = Array.from(history.values()).sort((a, b) => b.date.localeCompare(a.date));

    viewContent.innerHTML = sorted.map(item => {
      let moodBadges = "";
      if (item.type === 'إيموجي ✨') {
          moodBadges = `<span class="mood-badge" style="background:rgba(162,155,254,0.15); color:var(--purple); padding:4px 12px; border-radius:20px; font-weight:bold; font-size:0.85rem;">${item.mood}</span>`;
      } else {
          moodBadges = `<span class="mood-badge" style="background:rgba(162,155,254,0.15); color:var(--purple); padding:4px 12px; border-radius:20px; font-weight:bold; font-size:0.85rem;">أساسي: ${item.mood}</span>`;
          if (item.secondaryMood) {
            moodBadges += ` <span class="mood-badge" style="background:rgba(200,200,200,0.15); color:#666; padding:4px 12px; border-radius:20px; font-weight:bold; font-size:0.8rem; margin-right:5px;">ثانوي: ${item.secondaryMood}</span>`;
          }
      }

      let sentencesHtml = "";
      if (item.sentencesDetails && item.sentencesDetails.length > 0) {
        sentencesHtml = `<div class="sentence-breakdown" style="margin-top:10px; border-top:1px dashed #eee; padding-top:10px;">
          <small style="color:#888; display:block; margin-bottom:5px;">تحليل الجمل الذكي:</small>
          ${item.sentencesDetails.map(s => `
            <div style="font-size:0.85rem; margin-bottom:4px; display:flex; justify-content:space-between; background:#f9f9f9; padding:4px 8px; border-radius:8px;">
              <span style="color:#555;">"${s.sentence}"</span>
              <strong style="color:var(--purple); min-width:60px; text-align:left;">${s.mood}</strong>
            </div>
          `).join("")}
        </div>`;
      }

      return `
        <div class="entry-card" style="border:1px solid #eee; border-radius:18px; padding:16px; margin-bottom:15px; background:#fff;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <strong style="color:var(--purple);">${item.date}</strong>
            <div style="display:flex; align-items:center;">${moodBadges}</div>
          </div>
          <div style="color:#999; font-size:0.75rem; margin:5px 0;">المصدر: ${item.type}</div>
          <div style="margin:10px 0; line-height:1.6;">${item.html || escapeHtml(item.text)}</div>
          ${sentencesHtml}
        </div>
      `;
    }).join("");
  } catch (err) { 
    viewContent.innerHTML = "خطأ في التحميل."; 
  }
}

/**
 * نظام الإنجازات المستعاد (Achievements)
 */
function parseISODate(id) {
  const [y, m, d] = String(id).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function daysBetween(a, b) {
  const ms = 24 * 60 * 60 * 1000;
  return Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate()) - new Date(a.getFullYear(), a.getMonth(), a.getDate())) / ms);
}

async function initAchievementsUI() {
  const box = document.getElementById("achievements");
  const list = document.getElementById("achvList");
  
  const user = firebase.auth().currentUser;
  if (!user || !box || !list) return;

  try {
    const db = firebase.firestore();
    const userRef = db.collection("users").doc(user.uid);

    const [eSnap, jSnap] = await Promise.all([userRef.collection("emoji_moods").get(), userRef.collection("entries").get()]);
    
    const allDates = [...new Set([...eSnap.docs.map(d => d.id), ...jSnap.docs.map(d => d.id)])].sort();
    
    let best = 0, current = 0;
    if (allDates.length > 0) {
      let run = 1; best = 1;
      for (let i = 1; i < allDates.length; i++) {
        if (daysBetween(parseISODate(allDates[i-1]), parseISODate(allDates[i])) === 1) run++;
        else run = 1;
        if (run > best) best = run;
      }
      current = (daysBetween(parseISODate(allDates[allDates.length-1]), new Date()) <= 1) ? run : 0;
    }

    const curEl = document.getElementById("curStreak");
    const bestEl = document.getElementById("bestStreak");
    if(curEl) curEl.textContent = current;
    if(bestEl) bestEl.textContent = best;

    const totalWords = jSnap.docs.reduce((sum, d) => sum + (Number(d.data()?.words) || 0), 0);
    
    // إنجاز جديد بدل الـ 5 نجوم: يفتح إذا كتب المستخدم يومية بمشاعر مختلطة
    const hasMixedEmotions = jSnap.docs.some(d => d.data()?.secondaryMood != null);

    const achvs = [
      { title: "أول تدوينة", desc: "سجلت أول شعور لك.", unlocked: allDates.length >= 1, icon: "✍️" },
      { title: "سلسلة ٣ أيام", desc: "تابعت مشاعرك لـ ٣ أيام.", unlocked: best >= 3, icon: "🔥" },
      { title: "٣٠٠ كلمة", desc: "كتبت أكثر من ٣٠٠ كلمة.", unlocked: totalWords >= 300, icon: "📝" },
      { title: "مشاعر عميقة", desc: "كتبت يومية تحتوي على مشاعر مركبة.", unlocked: hasMixedEmotions, icon: "🌌" }
    ];

    list.innerHTML = achvs.map(a => `
      <div class="achv-card ${a.unlocked ? "is-unlocked" : ""}">
        <div class="achv-content"><div class="achv-icon">${a.icon}</div><div class="achv-text"><strong>${a.title}</strong><small>${a.desc}</small></div></div>
        <div class="achv-badge">${a.unlocked ? "مفتوح" : "مغلق"}</div>
      </div>
    `).join("");
  } catch (e) { console.error(e); }
}

function showJournalChoiceModal() {
  const modal = document.getElementById("journalChoiceModal");
  return new Promise(resolve => {
    modal.hidden = false;
    document.getElementById("confirmChoiceBtn").onclick = () => { 
      modal.hidden = true; 
      resolve(true); 
    };
    document.getElementById("cancelChoiceBtn").onclick = () => { 
      modal.hidden = true; 
      resolve(false); 
    };
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initDailyPrompt();
  
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      setTimeout(() => initAchievementsUI(), 1000); // تأخير بسيط لضمان تحميل البيانات
    }
  });

  const showAchvBtn = document.getElementById("showAchv");
  if(showAchvBtn) {
    showAchvBtn.addEventListener("click", () => {
      const box = document.getElementById("achievements");
      if(box) box.hidden = !box.hidden;
      initAchievementsUI();
    });
  }
  
  document.getElementById("save")?.addEventListener("click", saveTodayEntry);
  document.getElementById("showAll")?.addEventListener("click", openAllEntriesModal);
  document.getElementById("closeModal")?.addEventListener("click", () => document.getElementById("viewModal").hidden = true);
  
  document.getElementById("emojiBtn")?.addEventListener("click", () => {
    const p = document.getElementById("emojiPalette"); 
    if (p) p.hidden = !p.hidden;
  });

  document.getElementById("imageUpload")?.addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => { 
        restoreSelection(); 
        document.execCommand('insertImage', false, ev.target.result); 
        saveSelection(); 
      };
      reader.readAsDataURL(file);
    }
  });

  const note = document.getElementById("note");
  if(note) {
    ["keyup", "mouseup", "focusout"].forEach(ev => note.addEventListener(ev, saveSelection));
  }
});