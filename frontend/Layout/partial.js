//  HTML includes
async function include(selector, url) {
  const host = document.querySelector(selector);
  if (!host) return;
  try {
    const res = await fetch(url, { cache: 'reload' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    host.innerHTML = await res.text();
  } catch (e) {
    console.error('Include failed:', url, e);
  }
}
function getAuthToken() {
  try { return localStorage.getItem('authToken') || ''; } catch { return ''; }
}
async function apiFetch(url, options = {}) {
  const opts = { ...options };
  opts.headers = { Accept: 'application/json', ...(opts.headers || {}) };
  if (opts.body && !(opts.body instanceof FormData) && !opts.headers['Content-Type']) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(url, opts);
  let data = null;
  try { data = await res.json(); } catch { }
  return { ok: res.ok, status: res.status, data };
}
function bindHeader() {
  const current = location.pathname.split('/').pop() || 'homePage.html';
  document.querySelectorAll('#menuItem a').forEach(a => {
    if (a.getAttribute('href') === current) a.classList.add('active');
  });
  const nav = document.getElementById('navbar');
  const onScroll = () => nav?.classList.toggle('shrink', window.scrollY > 50);
  window.addEventListener('scroll', onScroll);
  onScroll();
  const addBtn = document.getElementById('addRecipeBtn');
  addBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    const authPopup = document.getElementById('authPopup');
    if (authPopup) {
      authPopup.classList.remove('d-none');
      document.getElementById('loginContainer')?.classList.remove('sign-up-mode');
    } else {
      location.href = 'login.html';
    }
  });
  const authPopup = document.getElementById("authPopup");
  const closeAuthPopup = document.getElementById("closeAuthPopup");
  const loginContainer = document.getElementById("loginContainer");
  const signInBtn = document.getElementById("sign-in-btn");
  const signUpBtn = document.getElementById("sign-up-btn");

  const signInForm = document.getElementById("signInForm");
  const signUpForm = document.getElementById("signUpForm");

  const forgotPasswordPopup = document.getElementById("forgotPasswordPopup");
  const closeForgotPasswordPopup = document.getElementById("closeForgotPasswordPopup");
  const forgotPasswordForm = document.getElementById("forgotPasswordForm");

  const resetPasswordPopup = document.getElementById("resetPasswordPopup");
  const rpClose = document.getElementById("rp-close");
  const rpCancel = document.getElementById("rp-cancel");
  const rpForm = document.getElementById("rp-form");

  const REGEX = {
    username: /^[A-Za-z\s]{3,20}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/
  };

  function showToast(msg, type = "success", duration = 3000) {
    const wrap = document.getElementById("toast-container");
    if (!wrap) { alert(msg); return; }

    wrap.querySelectorAll(".toast").forEach(t => {
      t.classList.remove("show");
      t.remove();
    });

    const color = type === "error" ? "text-bg-danger" : "text-bg-success";
    const toast = document.createElement("div");
    toast.className = `toast align-items-center ${color}`;
    toast.setAttribute("role", "alert");
    toast.setAttribute("aria-live", "assertive");
    toast.setAttribute("aria-atomic", "true");
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${msg}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Close"></button>
      </div>
    `;
    wrap.appendChild(toast);
    const close = () => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 200); };
    toast.querySelector(".btn-close").addEventListener("click", close);

    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(close, duration);
  }
  closeAuthPopup?.addEventListener("click", () => authPopup?.classList.add("d-none"));
  closeForgotPasswordPopup?.addEventListener("click", () => forgotPasswordPopup?.classList.add("d-none"));

  signUpBtn?.addEventListener("click", () => loginContainer?.classList.add("sign-up-mode"));
  signInBtn?.addEventListener("click", () => loginContainer?.classList.remove("sign-up-mode"));

  function bindEye(iconId, inputId) {
    const icon = document.getElementById(iconId);
    const input = document.getElementById(inputId);
    icon?.addEventListener("click", () => {
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
      icon.classList.toggle("fa-eye");
      icon.classList.toggle("fa-eye-slash");
    });
  }
  bindEye("toggle-password", "sign-in-password");
  bindEye("toggle-password-signup", "sign-up-password");

  function ensureErrorBelow(input) {
    if (!input) return document.createElement('small');
    let nxt = input.nextElementSibling;
    if (!nxt || !nxt.classList || !nxt.classList.contains("error-message")) {
      const small = document.createElement("small");
      small.className = "error-message";
      input.after(small);
      nxt = small;
    }
    return nxt;
  }
  function clearErrors(form) {
    form?.querySelectorAll(".error-message").forEach(el => el.textContent = "");
  }

  signUpForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("sign-up-username");
    const email = document.getElementById("sign-up-email");
    const password = document.getElementById("sign-up-password");

    clearErrors(signUpForm);
    let ok = true;
    if (!REGEX.username.test(username?.value || "")) { ensureErrorBelow(username).textContent = "Username must be letters/spaces, 3–20 chars."; ok = false; }
    if (!REGEX.email.test(email?.value || "")) { ensureErrorBelow(email).textContent = "Invalid email format."; ok = false; }
    if (!REGEX.password.test(password?.value || "")) { ensureErrorBelow(password).textContent = "Password: 8+ with uppercase, lowercase, digit, special."; ok = false; }
    if (!ok) return;

    try {
      const { ok: okRes, data } = await apiFetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: {
          name: (username.value || "").trim(),
          email: (email.value || "").trim().toLowerCase(),
          password: (password.value || "").trim()
        }
      });
      if (!okRes) {
        showToast(data?.message || "Register failed", "error", 3500);
        return;
      }
      showToast("Successfully Registered! Please sign in.", "success");
      signUpForm.reset();
      loginContainer?.classList.remove("sign-up-mode");
    } catch (err) {
      console.error("Register error:", err);
      showToast("Network error while registering", "error", 3500);
    }
  });

  async function loadCategoriesInto(selectEl) {
    if (!selectEl) return;
    try {
      const { data } = await apiFetch("http://localhost:3000/api/categories");
      const categories = data?.categories || [];
      selectEl.innerHTML = `<option value="">Select category</option>` +
        categories.map(c => `<option value="${c._id}">${c.name}</option>`).join('');
    } catch {
      selectEl.innerHTML = `<option value="">Select category</option>`;
    }
  }
  function openRecipeDetailPopup(recipeName = "Selected Recipe") {
    const nameEl = document.getElementById("rd-title");
    if (nameEl && recipeName) nameEl.value = recipeName;

    const catSel = document.getElementById("rd-category");
    if (catSel && !catSel.dataset.loaded) {
      loadCategoriesInto(catSel).then(() => { catSel.dataset.loaded = "1"; });
    }

    try {
      const au = JSON.parse(localStorage.getItem('authUser') || 'null');
      const emailEl = document.getElementById('rd-email');
      if (emailEl) emailEl.value = au?.email || '';
    } catch { }

    document.getElementById("recipeDetailPopup")?.classList.remove("d-none");
  }

  function closeRecipeDetailPopup() {
    document.getElementById("recipeDetailPopup")?.classList.add("d-none");
  }
  window.openRecipeDetailPopup = openRecipeDetailPopup;
  window.closeRecipeDetailPopup = closeRecipeDetailPopup;

  signInForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const emailEl = document.getElementById("sign-in-email");
    const passEl = document.getElementById("sign-in-password");

    clearErrors(signInForm);
    const emailVal = (emailEl?.value || "").trim().toLowerCase();
    const passVal = (passEl?.value || "").trim();

    let ok = true;
    if (!REGEX.email.test(emailVal)) { ensureErrorBelow(emailEl).textContent = "Invalid email format."; ok = false; }
    if (!passVal) { ensureErrorBelow(passEl).textContent = "Password is required."; ok = false; }
    if (!ok) return;

    try {
      const { ok: okRes, data } = await apiFetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: { email: emailVal, password: passVal }
      });
      if (!okRes) {
        showToast(data?.message || "Invalid credentials", "error", 3500);
        return;
      }

      localStorage.setItem("authToken", data?.token || "");

      if (data?.user) {
        localStorage.setItem("authUser", JSON.stringify(data.user));
      }
      showToast("Login Successful!", "success");
      authPopup?.classList.add("d-none");
      signInForm.reset();
      window.openRecipeDetailPopup?.("Your Recipe");

    } catch (err) {
      console.error("Login error:", err);
      showToast("Network error while login", "error", 3500);
    }
  });

  document.querySelectorAll(".forgot-password-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      authPopup?.classList.add("d-none");
      forgotPasswordPopup?.classList.remove("d-none");
    });
  });

  document.getElementById('back-to-signin')?.addEventListener('click', (e) => {
    e.preventDefault();
    forgotPasswordPopup?.classList.add('d-none');
    authPopup?.classList.remove('d-none');
    loginContainer?.classList.remove('sign-up-mode');
  });

  forgotPasswordForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("reset-email");
    clearErrors(forgotPasswordForm);
    if (!REGEX.email.test(email?.value || "")) {
      ensureErrorBelow(email).textContent = "Invalid email format.";
      return;
    }
    try {
      await apiFetch("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        body: { email: (email.value || "").trim() }
      });
    } catch (_) { }
    showToast("If the email exists, a reset link was sent.", "success", 3400);
    forgotPasswordPopup?.classList.add("d-none");
    forgotPasswordForm.reset();
  });

  rpClose?.addEventListener("click", () => resetPasswordPopup?.classList.add("d-none"));
  rpCancel?.addEventListener("click", () => resetPasswordPopup?.classList.add("d-none"));
  rpForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    showToast("Password updated.", "success");
    resetPasswordPopup?.classList.add("d-none");
    rpForm.reset();
  });

  (() => {
    const rdForm = document.getElementById("rd-form");
    const rdSubmit = document.getElementById("rd-submit");

    const ensureErr = (input) => {
      if (!input) return document.createElement('small');
      let nxt = input.nextElementSibling;
      if (!nxt || !nxt.classList?.contains("error-message")) {
        const s = document.createElement("small");
        s.className = "error-message";
        input.after(s); nxt = s;
      }
      return nxt;
    };
    const setErr = (input, msg) => ensureErr(input).textContent = msg || "";
    const clearErrs = (form) => form?.querySelectorAll(".error-message").forEach(s => s.textContent = "");

    function closeRecipeDetailPopupSafe() {
      document.getElementById("recipeDetailPopup")?.classList.add("d-none");
    }
    document.getElementById("rd-close-icon")?.addEventListener("click", closeRecipeDetailPopupSafe);
    document.getElementById("rd-close")?.addEventListener("click", closeRecipeDetailPopupSafe);

    rdSubmit?.addEventListener("click", (e) => {
      e.preventDefault();
      if (!rdForm) return;
      if (typeof rdForm.requestSubmit === 'function') {
        rdForm.requestSubmit();
      } else {
        rdForm.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
      }
    });

    rdForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearErrs(rdForm);

      const nameEl = document.getElementById("rd-title");
      const catEl = document.getElementById("rd-category");
      const timeEl = document.getElementById("rd-time");
      const banEl = document.getElementById("rd-banner");
      const cardEl = document.getElementById("rd-card");
      const reqEl = document.getElementById("rd-req");
      const ingEl = document.getElementById("rd-ing");
      const stepEl = document.getElementById("rd-steps");
      const notesEl = document.getElementById("rd-notes");
      const roleEl = document.getElementById("rd-role");

      const name = (nameEl?.value || "").trim();
      const category = (catEl?.value || "").trim();
      const time = (timeEl?.value || "").trim();
      const banner = (banEl?.value || "").trim();
      const cardImg = (cardEl?.value || "").trim();
      const requirement = (reqEl?.value || "").split("\n").map(s => s.trim()).filter(Boolean);
      const ingredients = (ingEl?.value || "").split("\n").map(s => s.trim()).filter(Boolean);
      const steps = (stepEl?.value || "").split("\n").map(s => s.trim()).filter(Boolean);
      const notes = (notesEl?.value || "").trim();
      const role = roleEl?.value || "user";
      const emailEl = document.getElementById("rd-email");
      if (emailEl && !emailEl.value) {
      }
      const submitterEmail = (emailEl?.value || "").trim();

      let ok = true;
      if (!name) { setErr(nameEl, "Title is required."); ok = false; }
      if (!category) { setErr(catEl, "Category is required."); ok = false; }
      if (!time) { setErr(timeEl, "Cooking time is required."); ok = false; }
      if (!banner) { setErr(banEl, "Banner image URL is required."); ok = false; }
      if (!cardImg) { setErr(cardEl, "Card image URL is required."); ok = false; }
      if (!ingredients.length) { setErr(ingEl, "Ingredients are required."); ok = false; }
      if (!steps.length) { setErr(stepEl, "Steps are required."); ok = false; }
      if (!ok) { showToast("Please fill all required fields.", "error", 3400); return; }

      const payload = { name, category, time, banner, cardImg, requirement, ingredients, steps, notes, status: "pending", role, submitterEmail };

      try {
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const { ok: okRes, status, data } = await apiFetch("http://localhost:3000/api/recipes", {
          method: "POST",
          headers,
          body: payload
        });

        if (!okRes) {
          if (status === 401) {
            showToast("Please login to submit recipes.", "error", 3500);
            document.getElementById('authPopup')?.classList.remove('d-none');
            return;
          }
          if (status === 403) {
            showToast("Only admins can add recipes.", "error", 3500);
            return;
          }
          const msg = data?.message || (Array.isArray(data?.errors) && data.errors[0]) || `Submit failed (${status})`;
          showToast(msg, "error", 3500);
          return;
        }

        showToast("Recipe submitted");
        closeRecipeDetailPopupSafe();
        rdForm.reset();
        const catSel = document.getElementById("rd-category");
        if (catSel) delete catSel.dataset.loaded;
      } catch (err) {
        showToast("Network error", "error", 3500);
      }
    });
  })();
}

function bindFooter() { }
document.addEventListener('DOMContentLoaded', async () => {
  await include('#include-header', 'Layout/header.html');
  bindHeader();
  document.dispatchEvent(new CustomEvent('header:ready'));
  await include('#include-footer', 'Layout/footer.html');
  bindFooter();
});
