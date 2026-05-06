/* ============================================================
   chicklist.js – NEW TODO LIST (Full Working)
   Works with your existing home.html IDs/classes (NO CSS changes)
   - Open/close form via #startChallengeBtn
   - Add / Edit / Toggle Done / Delete
   - Counters: #tasksTotalCount / #tasksDoneCount
   - Progress ring: .progress-ring-fill + #progressText
   - LocalStorage per-day
   - Arabic digits support
============================================================ */

(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ chicklist.js (NEW TODO) loaded");

    /* =========================
       0) Helpers
    ========================= */

    function isoTodayLocal() {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`; // YYYY-MM-DD
    }

    const TODAY = isoTodayLocal();
    const STORAGE_KEY = `anah_tasks_${TODAY}`;
    const MAX_MINUTES = 600;

    function trimStr(v) {
      return String(v ?? "").trim();
    }

    // Arabic/Persian digits -> English digits
    function normalizeDigits(str = "") {
      const mapA = { "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9" };
      const mapP = { "۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9" };
      return String(str)
        .replace(/[٠-٩]/g, (d) => mapA[d] || d)
        .replace(/[۰-۹]/g, (d) => mapP[d] || d);
    }

    function arabicMinutesLabel(num) {
      num = Number(num);
      if (num === 1) return "دقيقة واحدة";
      if (num === 2) return "دقيقتان";
      if (num >= 3 && num <= 10) return `${num} دقائق`;
      return `${num} دقيقة`;
    }

    function safeId() {
      return Math.random().toString(36).slice(2) + Date.now().toString(36);
    }

    function escapeHtml(s) {
      return String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    /* =========================
       1) Elements (your same IDs)
    ========================= */

    const startChallengeBtn = document.getElementById("startChallengeBtn");
    const newTaskContainer  = document.getElementById("newTaskContainer");
    const saveTaskBtn       = document.getElementById("saveTaskBtn");
    const taskList          = document.getElementById("taskList");

    const descInput = document.getElementById("taskDescription");
    const timeInput = document.getElementById("taskTime");

    const emojiButtons = document.querySelectorAll("#emojiSelector .emoji");

    const totalCountEl = document.getElementById("tasksTotalCount");
    const doneCountEl  = document.getElementById("tasksDoneCount");

    // Modals
    const emptyModal    = document.getElementById("emptyTaskModal");
    const closeEmptyBtn = document.getElementById("closeEmptyTaskModal");

    const timeModal     = document.getElementById("timeAlertModal");
    const closeTimeBtn  = document.getElementById("closeTimeAlertModal");

    // Progress ring
    const ringFill       = document.querySelector(".progress-ring-fill");
    const progressTextEl = document.getElementById("progressText");

    if (!startChallengeBtn || !newTaskContainer || !saveTaskBtn || !taskList || !descInput || !timeInput) {
      console.error("❌ Missing required DOM elements for todo list.");
      return;
    }

    /* =========================
       2) State
    ========================= */

    let selectedEmoji = "☀️";
    let editingTaskId = null;

    /* =========================
       3) Storage
    ========================= */

    function loadTasks() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    }

    function saveTasks(tasks) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks || []));
      } catch {}
    }

    /* =========================
       4) UI: Modals
    ========================= */

    function openModal(modalEl) {
      if (!modalEl) return;
      modalEl.hidden = false;
    }

    function closeModal(modalEl) {
      if (!modalEl) return;
      modalEl.hidden = true;
    }

    if (closeEmptyBtn && emptyModal) closeEmptyBtn.addEventListener("click", () => closeModal(emptyModal));
    if (closeTimeBtn && timeModal) closeTimeBtn.addEventListener("click", () => closeModal(timeModal));

    /* =========================
       5) UI: Form open/close (FIXED)
    ========================= */

    function isFormVisible() {
      return getComputedStyle(newTaskContainer).display !== "none";
    }

    function showForm(show) {
      newTaskContainer.style.display = show ? "block" : "none";
      if (show) {
        setTimeout(() => descInput.focus(), 80);
      } else {
        editingTaskId = null;
        saveTaskBtn.textContent = "حفظ المهمة";
      }
    }

    // Start hidden by default (so button actually "opens")
    showForm(false);

    // VERY IMPORTANT: Capturing + stopPropagation so nothing blocks it
    startChallengeBtn.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        showForm(!isFormVisible());

        // smooth scroll to tasks card
        const tasksCard = document.querySelector(".tasks-card");
        tasksCard?.scrollIntoView({ behavior: "smooth", block: "start" });

        // reset when opening fresh
        if (isFormVisible()) {
          editingTaskId = null;
          saveTaskBtn.textContent = "حفظ المهمة";
          descInput.value = "";
          timeInput.value = "";
          setActiveEmoji("☀️");
        }
      },
      true
    );

    /* =========================
       6) Emoji picker
    ========================= */

    function setActiveEmoji(char) {
      selectedEmoji = (char || "☀️").trim() || "☀️";
      emojiButtons.forEach((btn) => {
        btn.classList.toggle("is-active", btn.textContent.trim() === selectedEmoji);
      });
    }

    if (emojiButtons?.length) {
      emojiButtons.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          setActiveEmoji(btn.textContent.trim());
        });
      });
    }
    setActiveEmoji("☀️");

    /* =========================
       7) Progress ring + counters
    ========================= */

    let ringCircumference = 0;
    if (ringFill?.r?.baseVal?.value) {
      const r = ringFill.r.baseVal.value || 58;
      ringCircumference = 2 * Math.PI * r;
      ringFill.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;
      ringFill.style.strokeDashoffset = String(ringCircumference);
      ringFill.style.transition = "stroke-dashoffset 450ms ease";
    }

    function setRingProgress(percent) {
      if (!ringFill || !progressTextEl || !ringCircumference) return;
      const safe = Math.max(0, Math.min(100, Number(percent) || 0));
      const offset = ringCircumference * (1 - safe / 100);
      ringFill.style.strokeDashoffset = String(offset);
      progressTextEl.textContent = `${Math.round(safe)}%`;
    }

    function updateCountersAndRing(tasks) {
      const total = tasks.length;
      const done = tasks.filter((t) => t?.done).length;

      if (totalCountEl) totalCountEl.textContent = String(total);
      if (doneCountEl) doneCountEl.textContent = String(done);

      if (!total) setRingProgress(0);
      else setRingProgress((done / total) * 100);
    }

    /* =========================
       8) Render (same look: task-card / task-actions)
    ========================= */

    function render() {
      const tasks = loadTasks();

      if (!tasks.length) {
        taskList.innerHTML =
          `<p style="font-size:0.86rem; opacity:0.75;">لا توجد مهام بعد. اضغط "ابدأ تحدّي المهام" لإضافة أول مهمة.</p>`;
        updateCountersAndRing(tasks);
        return;
      }

      taskList.innerHTML = tasks
        .map((t) => {
          const doneClass = t.done ? " is-done" : "";
          const minutesLabel = arabicMinutesLabel(t.minutes || 0);

          return `
            <div class="task-card${doneClass}" data-id="${t.id}">
              <div class="task-details">
                <span class="emoji">${escapeHtml(t.emoji || "☀️")}</span>
                <div>
                  <div class="description">${escapeHtml(t.description || "")}</div>
                  <div class="time">المدة: ${escapeHtml(minutesLabel)}</div>
                </div>
              </div>
              <div class="task-actions">
                <button type="button" class="task-toggle">${t.done ? "إلغاء" : "تم"}</button>
                <button type="button" class="task-edit">تعديل</button>
                <button type="button" class="task-delete" aria-label="حذف">✕</button>
              </div>
            </div>
          `;
        })
        .join("");

      updateCountersAndRing(tasks);
    }

    /* =========================
       9) Actions (delegation)
    ========================= */

    taskList.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;

      const card = e.target.closest(".task-card");
      if (!card) return;

      const id = card.getAttribute("data-id");
      if (!id) return;

      const tasks = loadTasks();
      const idx = tasks.findIndex((t) => t.id === id);
      if (idx === -1) return;

      // Toggle done
      if (btn.classList.contains("task-toggle")) {
        tasks[idx].done = !tasks[idx].done;
        saveTasks(tasks);
        render();
        return;
      }

      // Delete
      if (btn.classList.contains("task-delete")) {
        const wasEditing = editingTaskId === id;
        tasks.splice(idx, 1);
        saveTasks(tasks);
        render();
        if (wasEditing) {
          editingTaskId = null;
          saveTaskBtn.textContent = "حفظ المهمة";
          descInput.value = "";
          timeInput.value = "";
          setActiveEmoji("☀️");
          showForm(false);
        }
        return;
      }

      // Edit
      if (btn.classList.contains("task-edit")) {
        const t = tasks[idx];
        editingTaskId = t.id;

        descInput.value = t.description || "";
        timeInput.value = String(t.minutes || "");
        setActiveEmoji(t.emoji || "☀️");

        saveTaskBtn.textContent = "تحديث المهمة";
        showForm(true);

        newTaskContainer.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => descInput.focus(), 120);
      }
    });

    /* =========================
       10) Save (add/update)
    ========================= */

    saveTaskBtn.addEventListener("click", (e) => {
      e.preventDefault();

      const desc = trimStr(descInput.value);
      const minutesRaw = trimStr(timeInput.value);
      const normalized = normalizeDigits(minutesRaw);
      const minutes = parseInt(normalized, 10);

      if (!desc) {
        openModal(emptyModal);
        return;
      }

      if (!normalized || Number.isNaN(minutes) || minutes <= 0) {
        openModal(timeModal);
        return;
      }

      if (minutes > MAX_MINUTES) {
        // reuse time modal body if exists
        if (timeModal) {
          const body = timeModal.querySelector(".time-body");
          if (body) {
            body.innerHTML =
              `المدة القصوى للمهمة الواحدة هي ${MAX_MINUTES} دقيقة.<br>قسّميها لمهام أصغر.`;
          }
        }
        openModal(timeModal);
        return;
      }

      const tasks = loadTasks();

      if (editingTaskId) {
        const idx = tasks.findIndex((t) => t.id === editingTaskId);
        if (idx !== -1) {
          tasks[idx] = {
            ...tasks[idx],
            description: desc,
            minutes,
            emoji: selectedEmoji || "☀️"
          };
        }
      } else {
        tasks.push({
          id: safeId(),
          emoji: selectedEmoji || "☀️",
          description: desc,
          minutes,
          done: false,
          createdAt: Date.now()
        });
      }

      saveTasks(tasks);
      render();

      // reset
      editingTaskId = null;
      saveTaskBtn.textContent = "حفظ المهمة";
      descInput.value = "";
      timeInput.value = "";
      setActiveEmoji("☀️");
      showForm(false);
    });

    /* =========================
       11) Prevent form submit refresh
    ========================= */

    const form = document.getElementById("newTaskForm");
    if (form) form.addEventListener("submit", (e) => e.preventDefault());

    /* =========================
       12) Init render
    ========================= */

    render();
  });
})();