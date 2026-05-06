/* ============================================================
   UTILS.JS – النسخة النهائية المعتمدة لمشروع "أناه"
   (التاريخ، الثيم، إدارة المستخدم، تسجيل الخروج)
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  initDateDisplay();
  initThemeToggle();
  initUserAuth();
  initFooterYear();
  // ملاحظة: تم حذف initMobileMenu لتجنب خطأ ReferenceError
});

/* 1) عرض التاريخ بالتنسيق العربي السعودي */
function initDateDisplay() {
  const elements = [
    document.getElementById("today-date"),    
    document.getElementById("homeToday"),     
    document.getElementById("journal-today")  
  ];

  const now = new Date();
  const formatter = new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const dateString = formatter.format(now);

  elements.forEach(el => {
    if (el) el.textContent = dateString;
  });
}

function initFooterYear() {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

/* 2) إدارة الثيم (الوضع الليلي والنهاري) */
function initThemeToggle() {
  const themeToggle = document.getElementById("theme-toggle");
  
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("is-dark");
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("is-dark");
      const isDark = document.body.classList.contains("is-dark");
      localStorage.setItem("theme", isDark ? "dark" : "light");
    });
  }
}

/* 3) إدارة المستخدم وتسجيل الخروج */
function initUserAuth() {
  const authBtn = document.getElementById("authButton");
  if (!authBtn) return;

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("currentUser") || "null");
  } catch { user = null; }

  if (!user || !user.name) {
    authBtn.textContent = "تسجيل / دخول";
    authBtn.href = "SignOrLogin.html";
    authBtn.classList.remove("auth-chip");
    return;
  }

  authBtn.textContent = `مرحبًا، ${user.name}`;
  authBtn.href = "#"; 
  authBtn.classList.add("auth-chip");
  
  injectLogoutModal();

  authBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const modal = document.getElementById("globalLogoutModal");
    if (modal) modal.hidden = false;
  });
}

function injectLogoutModal() {
  if (document.getElementById("globalLogoutModal")) return;

  const modalHTML = `
    <div id="globalLogoutModal" class="journal-modal" hidden>
      <div class="journal-modal-dialog" style="text-align: center; max-width: 400px;">
        <h3 style="color: var(--text-color);">تسجيل الخروج</h3>
        <p style="margin: 15px 0; color: var(--text-color);">هل أنتِ متأكدة أنك تريدين تسجيل الخروج؟</p>
        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
          <button id="utilsConfirmLogout" class="pill-button" style="background: #ff6b6b; color: white; border:none; padding:10px 20px; border-radius:20px; cursor:pointer;">نعم، خروج</button>
          <button id="utilsCancelLogout" class="pill-button" style="background: transparent; border: 1px solid #ccc; padding:10px 20px; border-radius:20px; cursor:pointer; color: var(--text-color);">تراجع</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  document.getElementById("utilsConfirmLogout").addEventListener("click", () => {
    localStorage.removeItem("currentUser");
    // تنبيه: هنا يمكنك إضافة firebase.auth().signOut() إذا كنتِ تستخدمين نظام توثيق فايربيس
    window.location.href = "SignOrLogin.html";
  });

  document.getElementById("utilsCancelLogout").addEventListener("click", () => {
    document.getElementById("globalLogoutModal").hidden = true;
  });
}

/* 4) دوال مساعدة عامة */
window.getTodayISO = function() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};