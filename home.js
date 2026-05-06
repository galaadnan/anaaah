/* ============================================================
   HOME.JS – النسخة الاحترافية الكاملة لمشروع (أناه)
   ✅ تحديث: عداد المهام، شريط التقدم الدائري، ونظام الرسائل
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    setGreeting();
    initTodayUI();
    initChatbot();

    firebase.auth().onAuthStateChanged(async user => {
        if (user) {
            await initQuotes();
        }
    });

    initMoodButtons();
    initTaskSystem(); 
    
    // --- نظام الرسائل المستقبلية ---
    const openBtn = $("openMessageModal");
    const modal = $("messageModal");
    const closeBtn = $("closeMessageModal");
    const saveMessageBtn = $("saveMessageBtn");

    if (openBtn) openBtn.onclick = () => modal.hidden = false;
    if (closeBtn) closeBtn.onclick = () => modal.hidden = true;

    if (saveMessageBtn) {
        saveMessageBtn.onclick = () => {
            const text = $("futureMessageInput").value;
            const days = parseInt($("messageDelay").value);

            if (!text.trim()) {
                alert("اكتب رسالة أولاً 🤍");
                return;
            }

            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + days);

            const data = {
                message: text,
                showAt: futureDate.toISOString()
            };

            localStorage.setItem("futureMessage", JSON.stringify(data));
            modal.hidden = true;
            $("successModal").hidden = false;
        };
    }

    if ($("closeSuccessModal")) {
        $("closeSuccessModal").onclick = () => $("successModal").hidden = true;
    }

    checkFutureMessage();

    if ($("closeFutureMessageModal")) {
        $("closeFutureMessageModal").onclick = () => $("futureMessageModal").hidden = true;
    }
});

/* ------------------------------------------------------------
   Helpers
------------------------------------------------------------ */
function isoToday() { return new Date().toISOString().split("T")[0]; }
function safeId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function $(id) { return document.getElementById(id); }
function escapeHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

/* ------------------------------------------------------------
   UI Initialization
------------------------------------------------------------ */
function initTodayUI() {
    const el = $("homeToday");
    if (el) el.textContent = new Date().toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function setGreeting() {
    const el = $("greeting");
    if (!el) return;
    const h = new Date().getHours();
    if (h >= 6 && h < 12) el.textContent = "صباح الخير";
    else if (h >= 12 && h < 18) el.textContent = "مساء الهدوء";
    else el.textContent = "مساء الخير";
}

/* ------------------------------------------------------------
   Quotes System
------------------------------------------------------------ */
let quotes = [];

function normalizeMood(raw) {
    if (!raw) return "لا بأس";
    const m = String(raw).toLowerCase().trim();
    if (m.includes("happy") || m.includes("سعيد") || m.includes("فرح")) return "سعيد";
    if (m.includes("sad") || m.includes("حزين") || m.includes("حزن")) return "حزين";
    if (m.includes("angry") || m.includes("غاضب")) return "غاضب";
    if (m.includes("anx") || m.includes("قلق") || m.includes("توتر")) return "قلق";
    if (m.includes("tired") || m.includes("متعب")) return "متعب";
    return "لا بأس";
}

async function loadQuotes() {
    try {
        const res = await fetch("anah_quotes_dataset.json");
        const data = await res.json();
        quotes = data.map(q => ({ quote: q.quote, mood: q.mood }));
    } catch (e) { console.error("Error loading quotes:", e); }
}

function pickMoodQuote(mood) {
    const filtered = quotes.filter(q => q.mood === mood);
    if (!filtered.length) return quotes[Math.floor(Math.random() * quotes.length)]?.quote || "🤍";
    return filtered[Math.floor(Math.random() * filtered.length)].quote;
}

async function getLatestMoodFromFirebase() {
    const user = firebase.auth().currentUser;
    if (!user) return "لا بأس";
    try {
        const snap = await firebase.firestore().collection("users").doc(user.uid)
            .collection("entries").orderBy("createdAt", "desc").limit(1).get();
        if (snap.empty) return "لا بأس";
        return normalizeMood(snap.docs[0].data().mood);
    } catch (e) { return "لا بأس"; }
}

async function initQuotes() {
    const textEl = $("quoteText");
    const btn = $("newQuoteBtn");
    if (!textEl || !btn) return;
    await loadQuotes();
    const mood = await getLatestMoodFromFirebase();
    textEl.textContent = `"${pickMoodQuote(mood)}"`;
    btn.onclick = async () => {
        const m = await getLatestMoodFromFirebase();
        textEl.textContent = `"${pickMoodQuote(m)}"`;
    };
}

/* ------------------------------------------------------------
   Mood & Emoji Overwrite Logic
------------------------------------------------------------ */
function showEmojiChoiceModal() {
    return new Promise((resolve) => {
        const modal = $("emojiChoiceModal");
        if (!modal) return resolve(true);
        modal.hidden = false;
        $("confirmEmojiChoiceBtn").onclick = () => { modal.hidden = true; resolve(true); };
        $("cancelEmojiChoiceBtn").onclick = () => { modal.hidden = true; resolve(false); };
    });
}

function initMoodButtons() {
    const buttons = document.querySelectorAll(".mood-buttons .mood");
    if (!buttons.length) return;

    buttons.forEach(btn => {
        btn.addEventListener("click", async () => {
            const moodName = btn.dataset.mood || "غير محدد";
            const user = firebase.auth().currentUser;
            if (!user) return;

            const db = firebase.firestore();
            const today = isoToday();
            const userRef = db.collection("users").doc(user.uid);

            const journalDoc = await userRef.collection("entries").doc(today).get();
            if (journalDoc.exists) {
                const proceed = await showEmojiChoiceModal();
                if (!proceed) return;
                await userRef.collection("entries").doc(today).delete();
            }

            await userRef.collection("emoji_moods").doc(today).set({
                mood: moodName, source: "emoji", updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            buttons.forEach(b => b.classList.remove("is-active"));
            btn.classList.add("is-active");
            
            const latestMood = normalizeMood(moodName);
            if ($("quoteText")) $("quoteText").textContent = `"${pickMoodQuote(latestMood)}"`;
        });
    });
}

/* ------------------------------------------------------------
   Task System (The Core Engine)
------------------------------------------------------------ */
function initTaskSystem() {
    const saveBtn = $("saveTaskBtn");
    const descEl = $("taskDescription");
    const timeEl = $("taskTime");
    const listEl = $("taskList");
    if (!saveBtn || !descEl || !timeEl || !listEl) return;

    const emojiWrap = $("emojiSelector");
    let selectedEmoji = "☀️";
    if (emojiWrap) {
        emojiWrap.onclick = (e) => {
            const btn = e.target.closest(".emoji");
            if (!btn) return;
            emojiWrap.querySelectorAll(".emoji").forEach(b => b.classList.remove("is-active"));
            btn.classList.add("is-active");
            selectedEmoji = btn.textContent.trim();
        };
    }

    const key = `anah_tasks_${isoToday()}`;
    const loadTasks = () => JSON.parse(localStorage.getItem(key) || "[]");
    const saveTasks = (tasks) => localStorage.setItem(key, JSON.stringify(tasks));

    function render() {
        const tasks = loadTasks();
        const doneTasks = tasks.filter(t => t.done).length;

        // 1. تحديث العدادات في الهيدر
        if ($("tasksTotalCount")) $("tasksTotalCount").textContent = tasks.length;
        if ($("tasksDoneCount")) $("tasksDoneCount").textContent = doneTasks;

        // 2. تحديث الدائرة (Progress Ring)
        const percentage = tasks.length === 0 ? 0 : Math.round((doneTasks / tasks.length) * 100);
        if ($("progressText")) $("progressText").textContent = percentage + "%";
        
        const ringFill = document.querySelector(".progress-ring-fill");
        if (ringFill) {
            const circumference = 364.4; 
            const offset = circumference - (percentage / 100) * circumference;
            ringFill.style.strokeDashoffset = offset;
        }

        // 3. رسم القائمة
        listEl.innerHTML = tasks.length ? "" : `<p style="color:#777; margin:15px 0; text-align:center;">لا توجد مهام بعد. أضف مهمتك الأولى! ✨</p>`;
        
        tasks.forEach(t => {
            const row = document.createElement("div");
            row.className = `task-item ${t.done ? "is-done" : ""}`;
            row.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:12px; border:1px solid #eee; border-radius:16px; background:#fff; margin-bottom:10px;";
            
            row.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;">
                    <button class="task-check" style="cursor:pointer; border:1px solid #ddd; background:${t.done ? 'var(--mint)' : '#fff'}; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-size:12px;">${t.done ? "✔" : ""}</button>
                    <div style="${t.done ? "text-decoration:line-through; color:#999" : ""}">
                        <strong>${t.emoji} ${escapeHtml(t.text)}</strong>
                        <div style="font-size:0.75rem; color:#888;">⏱ ${t.minutes} دقيقة</div>
                    </div>
                </div>
                <button class="task-del" style="border:none; background:none; color:#ff5a5f; cursor:pointer; font-size:1.2rem;">✕</button>`;
            
            row.querySelector(".task-check").onclick = () => {
                const updated = loadTasks().map(x => x.id === t.id ? { ...x, done: !x.done } : x);
                saveTasks(updated); render();
            };
            row.querySelector(".task-del").onclick = () => {
                const updated = loadTasks().filter(x => x.id !== t.id);
                saveTasks(updated); render();
            };
            listEl.appendChild(row);
        });
    }

    saveBtn.onclick = () => {
        const text = descEl.value.trim(), minutes = Number(timeEl.value);
        if (!text) { $("emptyTaskModal").hidden = false; return; }
        if (!minutes || minutes < 1) { $("timeAlertModal").hidden = false; return; }

        const tasks = loadTasks();
        tasks.unshift({ id: safeId(), text, minutes, emoji: selectedEmoji, done: false });
        saveTasks(tasks);
        descEl.value = ""; timeEl.value = ""; render();
    };
    
    // ربط أزرار إغلاق المودالات
    if ($("closeEmptyTaskModal")) $("closeEmptyTaskModal").onclick = () => $("emptyTaskModal").hidden = true;
    if ($("closeTimeAlertModal")) $("closeTimeAlertModal").onclick = () => $("timeAlertModal").hidden = true;

    render();
}

/* ------------------------------------------------------------
   Chatbot & Future Messages
------------------------------------------------------------ */
function initChatbot() {
    const chatbotBtn = $("chatbotBtn"), chatWindow = $("chatWindow"), inputEl = $("userMsgInput"), sendBtn = $("sendMsgBtn"), messagesEl = $("chatMessages");
    if (!chatbotBtn || !chatWindow || !sendBtn) return;
    
    chatbotBtn.onclick = () => chatWindow.classList.toggle("is-open");
    $("closeChat").onclick = () => chatWindow.classList.remove("is-open");
    
    async function handleSend() {
        const text = inputEl.value.trim();
        if (!text) return;
        const append = (msg, sender) => {
            const d = document.createElement("div"); d.className = `message ${sender}-msg`; d.textContent = msg;
            messagesEl.appendChild(d); messagesEl.scrollTop = messagesEl.scrollHeight;
        };
        append(text, "user"); inputEl.value = "";
        try {
            const res = await fetch("[https://anaaah-1.onrender.com/predict](https://anaaah-1.onrender.com/predict)", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text }) });
            const data = await res.json();
            append(data.reply || "🤍", "bot");
        } catch { append("عذراً، حدث خطأ في الاتصال 💔", "bot"); }
    }
    sendBtn.onclick = handleSend;
    inputEl.onkeydown = (e) => { if (e.key === "Enter") handleSend(); };
}

function checkFutureMessage() {
    const data = JSON.parse(localStorage.getItem("futureMessage"));
    if (!data) return;
    const now = new Date();
    const showDate = new Date(data.showAt);
    if (now >= showDate) {
        const modal = $("futureMessageModal");
        const textEl = $("futureMessageText");
        if (modal && textEl) {
            textEl.textContent = data.message;
            modal.hidden = false;
        }
        localStorage.removeItem("futureMessage");
    }
}
