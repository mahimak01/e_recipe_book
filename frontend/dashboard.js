const API = "http://localhost:3000";
const token = localStorage.getItem("authToken");
const authUser = JSON.parse(localStorage.getItem("authUser") || "null");
if (!token) location.href = "homePage.html";

function adminToast(msg, type = "success", duration = 2500) {
  let wrap = document.getElementById("toast-container");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "toast-container";
    wrap.className = "position-fixed top-0 end-0 p-3";
    wrap.setAttribute("role","status");
    wrap.setAttribute("aria-live","polite");
    document.body.appendChild(wrap);
  }
  wrap.querySelectorAll(".toast").forEach(t => t.remove());
  const color = type === "error" ? "text-bg-danger" : "text-bg-success";
  const el = document.createElement("div");
  el.className = `toast align-items-center ${color} show`;
  el.setAttribute("role", "alert");
  el.innerHTML = `<div class="d-flex">
    <div class="toast-body">${escapeHtml(String(msg || ""))}</div>
    <button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Close"></button>
  </div>`;
  wrap.appendChild(el);
  const close = () => { el.classList.remove("show"); setTimeout(() => el.remove(), 150); };
  el.querySelector(".btn-close").onclick = close;
  setTimeout(close, duration);
}

safeSetText("adminName", authUser?.name || "Admin");
(function setSidebarIdentity() {
  const name = authUser?.name || "Admin";
  const email = authUser?.email || "";
  const photo = authUser?.photo || authUser?.avatar || "";
  const avatar = document.getElementById("sidebarAvatar");
  safeSetText("sidebarName", name);
  safeSetText("sidebarEmail", email);
  if (avatar) {
    avatar.innerHTML = "";
    if (photo) {
      const img = document.createElement("img");
      img.alt = "avatar";
      img.src = photo;
      avatar.appendChild(img);
    }
  }
})();
byId("logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("authUser");
  location.href = "homePage.html";
});

function byId(id) { return document.getElementById(id); }
function safeSetText(id, val) { const el = byId(id); if (el) el.textContent = val; }
function escapeHtml(s = "") {
  return String(s).replace(/[&<>"'`=\/]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;' }[ch]));
}

async function apiFetch(url, options = {}) {
  const token = localStorage.getItem("authToken");
  const baseHeaders = { Accept: "application/json" };
  if (options.body && !((options.headers || {})["Content-Type"])) {
    baseHeaders["Content-Type"] = "application/json";
  }
  const headers = Object.assign(
    baseHeaders,
    options.headers || {},
    token ? { Authorization: `Bearer ${token}` } : {}
  );
  let res;
  try {
    res = await fetch(url, Object.assign({}, options, { headers }));
  } catch (_) {
    throw new Error("Network error");
  }
  if (res.status === 401) {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    location.href = "homePage.html";
    throw new Error("Unauthorized");
  }
  return res;
}
async function safeJson(res) { try { return await res.json(); } catch { return {}; } }
function pickArray(data) {
  if (Array.isArray(data?.recipes)) return data.recipes;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
}

function showSection(id) {
  ["mainDashboard", "mainRecipes", "mainUserRecipes", "mainUsers", "mainSuggestions", "mainCategories"].forEach((sec) => {
    const el = byId(sec); if (el) el.style.display = "none";
  });
  const tgt = byId(id); if (tgt) tgt.style.display = "";
}
document.querySelectorAll(".sidebar .nav-link").forEach((link) => {
  link.addEventListener("click", function () {
    document.querySelectorAll(".sidebar .nav-link").forEach((l) => l.classList.remove("active"));
    this.classList.add("active");
  });
});

async function loadDashboardKPIs() {
  try {
    const res = await apiFetch(`${API}/api/admin/stats`);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const stats = await safeJson(res);
    safeSetText("dashboardTotalRecipes", stats.recipes ?? 0);
    safeSetText("dashboardTotalUserRecipes", stats.recipes_pending ?? 0);
    safeSetText("dashboardTotalCategories", stats.categories ?? 0);
    safeSetText("dashboardTotalUsers", stats.users ?? 0);
  } catch (e) { console.error('Stats error:', e); }
}
loadDashboardKPIs();

byId("dashboardLink")?.addEventListener("click", () => showSection("mainDashboard"));
byId("recipesLink")?.addEventListener("click", () => { loadRecipes(); showSection("mainRecipes"); });
byId("categoriesLink")?.addEventListener("click", () => { loadCategoriesView(); showSection("mainCategories"); });
byId("usersLink")?.addEventListener("click", () => {  loadUsers(); showSection("mainUsers"); });
byId("suggestionsLink")?.addEventListener("click", () => { loadSuggestions(); showSection("mainSuggestions"); });

byId("recipesStatus")?.addEventListener("change", loadRecipes);
async function loadRecipes() {
  const tbody = document.querySelector("#recipesTable tbody");
  const statusSel = byId("recipesStatus");
  const hint = byId("recipesStatusHint");
  if (tbody) tbody.innerHTML = "<tr><td colspan='7' class='text-center py-3'>Loading...</td></tr>";

  const status = (statusSel?.value || '').trim();
  const q = status ? `?status=${encodeURIComponent(status)}` : '';

  try {
    const res = await apiFetch(`${API}/api/recipes${q}`);
    if (!res.ok) {
      const body = await safeJson(res);
      throw new Error(`${res.status} ${res.statusText} ${body?.message || ''}`.trim());
    }
    const data = await safeJson(res);
    const arr = pickArray(data);

    const rows = (arr || []).map(r => {
      const name = r.name || "";
      const cat = (r.category?.name || r.category?.slug || (typeof r.category === 'string' ? r.category : "")) || "";
      const time = r.time || "";
      const roleRaw = String(r.role || r.submitter?.role || r.createdBy?.role || "").toLowerCase();
      const roleText = roleRaw === "admin" ? "admin" : (roleRaw === "user" ? "user" : (r.status === "pending" ? "user" : "-"));
      const st = (r.status || "-").toLowerCase();
      const likes = Number(r.likes || 0);

      // Reply button only for user-submitted recipes, with safe data- attributes
      const replyBtn = (roleText === 'user')
        ? `<button type="button" class="icon-btn btn-recipe-reply"
            title="Reply"
            data-id="${r._id}"
            data-email="${escapeHtml(r.submitter?.email || r.submitterEmail || '')}"
            data-title="${escapeHtml(r.name || '')}"
            data-type="recipe">
            <i class="bi bi-reply-fill"></i>
          </button>`
        : '';

      const common = `
        <button class="icon-btn" title="View" onclick="openViewEditModal('${r._id}', true)"><i class="bi bi-eye-fill icon-info"></i></button>
        <button class="icon-btn" title="Edit" onclick="openViewEditModal('${r._id}', false)"><i class="bi bi-pencil-square icon-warning"></i></button>
        ${replyBtn}
        <button class="icon-btn" title="Delete" onclick="deleteRecipe('${r._id}')"><i class="bi bi-trash3-fill icon-danger"></i></button>
      `;

      const actions = (roleText === 'user' && st === 'pending')
        ? `
            <button class="icon-btn" title="Approve" onclick="approveRecipe('${r._id}')"><i class="bi bi-check-circle-fill icon-success"></i></button>
            <button class="icon-btn" title="Reject" onclick="denyRecipe('${r._id}')"><i class="bi bi-x-circle-fill icon-danger"></i></button>
            ${common}
          ` : common;

      return `
        <tr>
          <td>${escapeHtml(name)}</td>
          <td>${escapeHtml(cat)}</td>
          <td>${escapeHtml(time)}</td>
          <td>${escapeHtml(roleText)}</td>
          <td>${escapeHtml(st)}</td>
          <td>${likes}</td>
          <td class="text-center">${actions}</td>
        </tr>`;
    }).join("");

    tbody.innerHTML = rows || `<tr><td colspan="7" class="text-center py-3 text-muted">No recipes found</td></tr>`;
    if (hint) hint.textContent = status ? `Showing ${status} recipes` : 'Showing all recipes';

    function filterTable(inputId, tableId) {
      const input = byId(inputId);
      if (!input) return;
      input.oninput = null;
      input.addEventListener("input", () => {
        const q = input.value.toLowerCase();
        const rows = document.querySelectorAll(`#${tableId} tbody tr`);
        rows.forEach(row => { row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none"; });
      });
      input.dispatchEvent(new Event("input"));
    }
    filterTable("recipesSearch", "recipesTable");

    await fillRecipeFormCategories();

  } catch (e) {
    console.error('Recipes load error:', e);
    const tbody = document.querySelector("#recipesTable tbody");
    if (tbody) tbody.innerHTML = `<tr><td colspan='7' class='text-center py-3 text-danger'>Error: ${escapeHtml(e.message)}</td></tr>`;
  }
}

async function fillRecipeFormCategories() {
  try {
    const res = await apiFetch(`${API}/api/categories`);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const body = await safeJson(res);
    const { categories = [] } = body;
    const sel = document.querySelector('#recipeForm select[name="category"]');
    if (sel) sel.innerHTML = categories.map(c => `<option value="${c._id}">${escapeHtml(c.name)}</option>`).join("");
  } catch (e) { console.error('Categories for form error:', e); }
}

function setPreviewImage(field) {
  const input = document.querySelector(`#recipeForm [name="${field}"]`);
  const img = byId(field === "banner" ? "previewBanner" : "previewCard");
  if (!input || !img) return;
  const url = input.value.trim();
  if (url) { img.src = url; img.style.display = ""; } else { img.src = ""; img.style.display = "none"; }
}
document.querySelector('#recipeForm [name="banner"]')?.addEventListener("input", () => setPreviewImage("banner"));
document.querySelector('#recipeForm [name="cardImg"]')?.addEventListener("input", () => setPreviewImage("cardImg"));

function openAddRecipeModal() {
  safeSetText("recipeModalLabel", "Add Recipe");
  const form = byId("recipeForm");
  form.reset();
  window.editRecipeId = null;
  setPreviewImage("banner");
  setPreviewImage("cardImg");
  fillRecipeFormCategories();
  new bootstrap.Modal(byId("addEditRecipeModal")).show();
}
async function openViewEditModal(id, readOnly = false) {
  try {
    if (!id) throw new Error('Recipe id missing');
    window.editRecipeId = id;
    await fillRecipeFormCategories();

    const res = await apiFetch(`${API}/api/recipes/${id}`);
    const r = await safeJson(res);
    if (!res.ok) throw new Error(r?.message || `${res.status} ${res.statusText}`);

    const form = byId("recipeForm");
    if (!form) throw new Error('Form not found');
    const f = form.elements;

    if (f.name) f.name.value = r.name || "";
    if (f.category) f.category.value = r.category?._id || r.category || "";
    if (f.time) f.time.value = r.time || "";
    if (f.banner) f.banner.value = r.banner || "";
    if (f.cardImg) f.cardImg.value = r.cardImg || "";
    if (f.ingredients) f.ingredients.value = (r.ingredients || []).join("\n");
    if (f.requirement) f.requirement.value = (r.requirement || []).join("\n");
    if (f.steps) f.steps.value = (r.steps || []).join("\n");
    if (f.notes) f.notes.value = r.notes || "";

    setPreviewImage("banner");
    setPreviewImage("cardImg");

    Array.from(form.querySelectorAll("input, textarea, select")).forEach(el => el.disabled = readOnly);
    const saveBtn = document.querySelector("#addEditRecipeModal .modal-footer .btn-success");
    if (saveBtn) saveBtn.style.display = readOnly ? "none" : "";

    new bootstrap.Modal(byId("addEditRecipeModal")).show();
  } catch (e) {
    console.error('openViewEditModal error:', e);
    adminToast(e.message || "Failed to load recipe", "error");
  }
}
byId("recipeForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target.elements;

  // NEW: get logged-in user identity
  const current = JSON.parse(localStorage.getItem("authUser") || "null");
  const submitter = current ? {
    email: current.email || "",
    name: current.name || "",
    id: current._id || current.id || ""
  } : null;

  const recipeData = {
    name: f.name.value.trim(),
    category: f.category.value.trim(),
    time: f.time.value.trim(),
    banner: f.banner.value.trim(),
    cardImg: f.cardImg.value.trim(),
    requirement: f.requirement.value.split("\n").map((x) => x.trim()).filter(Boolean),
    ingredients: f.ingredients.value.split("\n").map((x) => x.trim()).filter(Boolean),
    steps: f.steps.value.split("\n").map((x) => x.trim()).filter(Boolean),
    notes: f.notes?.value?.trim() || "",
    status: "approved",
    role: f.role?.value?.trim() || undefined,

    // NEW: attach identity so reply has a recipient by default
    submitterEmail: submitter?.email || undefined,
    submitterName: submitter?.name || undefined,
    submitterId: submitter?.id || undefined
  };

  try {
    if (window.editRecipeId) {
      const res = await apiFetch(`${API}/api/recipes/${window.editRecipeId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(recipeData)
      });
      const body = await safeJson(res);
      if (!res.ok) {
        throw new Error(body?.message || (body?.errors && body.errors[0]) || 'Update failed');
      }
      adminToast("Recipe updated");
    } else {
      const res = await apiFetch(`${API}/api/recipes`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(recipeData)
      });
      const body = await safeJson(res);
      if (!res.ok) {
        throw new Error(body?.message || (body?.errors && body.errors[0]) || 'Create failed');
      }
      adminToast("Recipe added");
    }
    await loadRecipes();
    bootstrap.Modal.getInstance(byId("addEditRecipeModal"))?.hide();
    loadDashboardKPIs();
  } catch (e) { adminToast(e.message || "Failed to save recipe", "error"); }
});
async function deleteRecipe(id) {
  if (!confirm("Delete recipe?")) return;
  try {
    const res = await apiFetch(`${API}/api/recipes/${id}`, { method: "DELETE" });
    const body = await safeJson(res);
    if (!res.ok) {
      throw new Error(body?.message || 'Delete failed');
    }
    adminToast("Recipe deleted");
    loadRecipes(); loadDashboardKPIs();
  } catch (e) { adminToast(e.message || "Delete failed", "error"); }
}
async function approveRecipe(id) {
  try {
    const res = await apiFetch(`${API}/api/recipes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "approved" }) });
    const body = await safeJson(res);
    if (!res.ok) throw new Error(body?.message || 'Approve failed');
    adminToast("Approved");
    loadRecipes(); loadDashboardKPIs();
  } catch (e) { adminToast(e.message || "Approve failed", "error"); }
}
async function denyRecipe(id) {
  try {
    const res = await apiFetch(`${API}/api/recipes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" })
    });
    const body = await safeJson(res);
    if (!res.ok) throw new Error(body?.message || 'Deny failed');
    adminToast("Denied");
    loadRecipes(); loadDashboardKPIs();
  } catch (e) { adminToast(e.message || "Deny failed", "error"); }
}

// Categories
async function loadCategoriesView() {
  renderCategoriesCardsLoading();
  try {
    const res = await apiFetch(`${API}/api/categories`);
    if (!res.ok) {
      const body = await safeJson(res);
      throw new Error(`${res.status} ${res.statusText} ${body?.message || ''}`.trim());
    }
    const body = await safeJson(res);
    const { categories = [] } = body;
    renderCategoriesCards(categories);
  } catch (e) {
    console.error('Categories load error:', e);
    renderCategoriesCardsError();
    adminToast(`Categories error: ${e.message}`, 'error');
  }
  const form = byId("addCategoryForm");
  if (form && !form.dataset.bound) {
    form.dataset.bound = "1";
    form.addEventListener("submit", onAddCategorySubmit);
  }
}
function renderCategoriesCardsLoading() {
  const row = byId("categoriesCardsRow");
  if (row) row.innerHTML = `<div class="col-12 text-center text-muted py-4">Loading...</div>`;
}
function renderCategoriesCardsError() {
  const row = byId("categoriesCardsRow");
  if (row) row.innerHTML = `<div class="col-12 text-center text-danger py-4">Failed to load categories</div>`;
}
function renderCategoriesCards(categories) {
  const row = byId("categoriesCardsRow");
  if (!row) return;
  if (!categories.length) {
    row.innerHTML = `<div class="col-12 text-center text-muted py-4">No categories yet</div>`;
    return;
  }
  row.innerHTML = categories.map(c => {
    const icon = c.icon || pickCategoryIcon(c.name);
    return `
      <div class="col-6 col-lg-3 py-2">
        <div class="card text-center p-3 h-100 position-relative">
          <button class="btn btn-sm btn-outline-none text-danger position-absolute top-0 end-0 m-2" title="Delete" onclick="deleteCategory('${c._id}')">
            <i class="bi bi-trash"></i>
          </button>
          <div class="display-6">${icon}</div>
          <div class="fw-bold mt-2">${escapeHtml(c.name)}</div>
          <div class="small text-muted">${escapeHtml(c._id)}</div>
        </div>
      </div>`;
  }).join("");
}
function pickCategoryIcon(name = "") {
  const key = String(name).toLowerCase();
  if (key.includes("veg") && !key.includes("non")) return "🥗";
  if (key.includes("non") || key.includes("meat") || key.includes("chicken")) return "🍗";
  if (key.includes("dessert") || key.includes("sweet")) return "🍨";
  if (key.includes("salad") || key.includes("healthy")) return "🥗";
  if (key.includes("juice") || key.includes("drink")) return "🧃";
  if (key.includes("breakfast")) return "🥣";
  return "🍽️";
}
async function onAddCategorySubmit(e) {
  e.preventDefault();
  const nameInput = byId("newCategoryName");
  const name = nameInput?.value?.trim();
  if (!name) { adminToast('Category name is required', 'error'); return; }
  if (name.length < 2) { adminToast('Category name must be at least 2 characters', 'error'); return; }

  try {
    const res = await apiFetch(`${API}/api/categories`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name })
    });
    const data = await safeJson(res);
    if (!res.ok) { adminToast(data?.message || "Failed to add category", "error"); return; }
    nameInput.value = "";
    adminToast("Category added");
    await loadCategoriesView();
    loadDashboardKPIs();
  } catch (e) { adminToast(`Network error: ${e.message}`, "error"); }
}
async function deleteCategory(id) {
  if (!confirm("Delete this category?")) return;
  try {
    const res = await apiFetch(`${API}/api/categories/${id}`, { method: "DELETE" });
    const body = await safeJson(res);
    if (!res.ok) {
      throw new Error(body?.message || 'Delete failed');
    }
    adminToast("Category deleted");
    await loadCategoriesView();
    loadDashboardKPIs();
  } catch (e) { adminToast(e.message || "Delete failed", "error"); }
}

// Users
async function loadUsers() {
  const tbody = document.querySelector("#usersTable tbody");
  if (tbody) tbody.innerHTML = `<tr><td colspan="3" class="text-center py-3">Loading...</td></tr>`;
  try {
    const res = await apiFetch(`${API}/api/admin/users`);
    if (!res.ok) {
      const body = await safeJson(res);
      throw new Error(`${res.status} ${res.statusText} ${body?.message || ''}`.trim());
    }
    const body = await safeJson(res);
    const { users = [] } = body;
    if (tbody) {
      tbody.innerHTML = users.map(u => `
        <tr>
          <td>${escapeHtml(u.name || "")}</td>
          <td>${escapeHtml(u.email || "")}</td>
          <td><span class="badge ${String(u.role || "").toLowerCase() === 'admin' ? 'bg-primary' : 'bg-secondary'} text-uppercase">
            ${escapeHtml(u.role || "")}
          </span></td>
        </tr>
      `).join("") || `<tr><td colspan="3" class="text-center py-3 text-muted">No users</td></tr>`;
    }
    safeSetText("dashboardTotalUsers", users.length || 0);
  } catch (e) {
    console.error('Users load error:', e);
    if (tbody) tbody.innerHTML = `<tr><td colspan="3" class="text-center py-3 text-danger">Error: ${escapeHtml(e.message)}</td></tr>`;
  }
}

// Suggestions
async function loadSuggestions() {
  const tbody = document.querySelector("#suggestionsTable tbody");
  if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center py-3">Loading...</td></tr>`;
  try {
    const res = await apiFetch(`${API}/api/suggestions`);
    if (!res.ok) {
      const body = await safeJson(res);
      throw new Error(`${res.status} ${res.statusText} ${body?.message || ''}`.trim());
    }
    const data = await safeJson(res);
    const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    if (tbody) {
      tbody.innerHTML = arr.map(s => `
  <tr data-id="${s._id}">
    <td>${escapeHtml(s.dish || "")}</td>
    <td>${escapeHtml(s.name || "")}</td>
    <td>${escapeHtml(s.email || "")}</td>
    <td>${escapeHtml(s.comment || "")}</td>
    <td class="sugg-status">${escapeHtml(s.status || "pending")}</td>
    <td class="text-center">
      <button class="icon-btn" title="Approve" onclick="approveSuggestion('${s._id}')"><i class="bi bi-check-circle-fill icon-success"></i></button>
      <button class="icon-btn" title="Reject" onclick="denySuggestion('${s._id}')"><i class="bi bi-x-circle-fill icon-danger"></i></button>
      <button class="icon-btn btn-reply" title="Reply"
              data-id="${s._id}"
              data-email="${escapeHtml(s.email || '')}"
              data-title="${escapeHtml(s.dish || '')}"
              data-type="suggestion">
        <i class="bi bi-reply-fill"></i>
      </button>
      <button class="icon-btn" title="Delete" onclick="deleteSuggestion('${s._id}')"><i class="bi bi-trash3-fill icon-danger"></i></button>
    </td>
  </tr>`).join("") || `<tr><td colspan="6" class="text-center py-3 text-muted">No suggestions</td></tr>`;
    }
  } catch (e) {
    console.error('Suggestions load error:', e);
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center py-3 text-danger">Error: ${escapeHtml(e.message)}</td></tr>`;
  }
}
async function deleteSuggestion(id) {
  if (!confirm("Delete this suggestion?")) return;
  try {
    const res = await apiFetch(`${API}/api/suggestions/${id}`, { method: "DELETE" });
    const body = await safeJson(res);
    if (!res.ok) {
      throw new Error(body?.message || 'Delete failed');
    }
    adminToast("Suggestion deleted");
    await loadSuggestions();
  } catch (e) {
    adminToast(e.message || "Delete failed", "error");
  }
}
async function approveSuggestion(id) {
  try {
    const res = await apiFetch(`${API}/api/suggestions/${id}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "approved" })
    });
    const body = await safeJson(res);
    if (!res.ok) {
      throw new Error(body?.message || 'Action failed');
    }
    adminToast("Suggestion approved");
    await loadSuggestions();
  } catch (e) { adminToast(e.message || "Action failed", "error"); }
}
async function denySuggestion(id) {
  try {
    const res = await apiFetch(`${API}/api/suggestions/${id}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "rejected" })
    });
    const body = await safeJson(res);
    if (!res.ok) {
      throw new Error(body?.message || 'Action failed');
    }
    adminToast("Suggestion rejected");
    await loadSuggestions();
  } catch (e) { adminToast(e.message || "Action failed", "error"); }
}

// Shared reply modal context
let replyContext = { type: null, id: null };

function openReplyModal(id, email, dishOrTitle, type = 'suggestion') {
  replyContext = { type, id };
  document.getElementById('replyEmail').value = email || '';
  const nameHint = email ? ` ${String(email).split('@')[0]}` : '';
  const subj = type === 'suggestion' ? 'suggestion' : 'recipe';
  const item = dishOrTitle ? ` on ${dishOrTitle}` : '';
  document.getElementById('replyText').value = `Hi${nameHint},\n\nThanks for your ${subj}${item}. `;
  new bootstrap.Modal(document.getElementById('replyModal')).show();
}

document.getElementById('replySendBtn')?.addEventListener('click', async () => {
  const text = document.getElementById('replyText').value.trim();
  const to = document.getElementById('replyEmail').value.trim();
  if (!replyContext.id) return adminToast('Nothing selected','error');
  if (!to) return adminToast('Missing recipient email','error');
  if (!text) return adminToast('Reply cannot be empty','error');

  const url = replyContext.type === 'recipe'
    ? `${API}/api/recipes/${replyContext.id}/reply`
    : `${API}/api/suggestions/${replyContext.id}/reply`;

  const btn = document.getElementById('replySendBtn');
  btn.disabled = true;
  try {
    const res = await apiFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: text })
    });
    const data = await safeJson(res);
    if (!res.ok) return adminToast(data?.message || 'Failed','error');

    adminToast('Reply sent');
    bootstrap.Modal.getInstance(document.getElementById('replyModal'))?.hide();
    if (replyContext.type === 'recipe') loadRecipes(); else loadSuggestions();
  } finally {
    btn.disabled = false;
  }
});

// Delegated handlers for reply buttons
document.getElementById('suggestionsTable')?.addEventListener('click', e => {
  const btn = e.target.closest('.btn-reply');
  if (!btn) return;
  openReplyModal(btn.dataset.id, btn.dataset.email, btn.dataset.title, btn.dataset.type);
});
document.getElementById('recipesTable')?.addEventListener('click', e => {
  const btn = e.target.closest('.btn-recipe-reply');
  if (!btn) return;
  openReplyModal(btn.dataset.id, btn.dataset.email, btn.dataset.title, btn.dataset.type);
});

// ---------- Analytics ----------

let weekOffset = 0;
let monthOffset = 0; 
let yearOffset = 0;

function pad(n){ return n < 10 ? '0' + n : '' + n; }
function ymdLocal(d){ return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }
function ymLocal(d){ return d.getFullYear() + '-' + pad(d.getMonth()+1); }
function firstOfMonthLocal(y,m){ return new Date(y, m, 1); }

function startOfMonday(d) {
  const x = new Date(d);
  const day = x.getDay();
  const delta = (day === 0 ? -6 : 1 - day);
  x.setDate(x.getDate() + delta);
  x.setHours(0,0,0,0);
  return x;
}
function window5Weeks(offset = 0) {
  const end = startOfMonday(new Date());
  end.setDate(end.getDate() + offset * 7 * 5);
  const out = [];
  for (let i = 4; i >= 0; i--) {
    const s = new Date(end); s.setDate(end.getDate() - i * 7);
    out.push(s);
  }
  return out;
}
function window7Days(offset = 0) {
  const base = new Date();
  base.setDate(base.getDate() + offset * 7);
  base.setHours(0,0,0,0);
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(base); d.setDate(base.getDate() - i);
    out.push(d);
  }
  return out;
}
function window12MonthsOf(year) {
  return Array.from({length:12}, (_,m) => firstOfMonthLocal(year, m));
}
function window5Years(offset = 0) {
  const y = new Date().getFullYear() + offset * 5;
  return Array.from({ length: 5 }, (_, i) => new Date(y - (4 - i), 0, 1));
}

function buildMonthlyForYear(year, apiData) {
  const idx = new Map(
    (apiData || [])
      .map(d => ({ ym: ymLocal(new Date(d.date)), c: Number(d.count || 0) }))
      .reduce((acc, x) => { acc.set(x.ym, (acc.get(x.ym) || 0) + x.c); return acc; }, new Map())
  );
  return window12MonthsOf(year).map(dt => {
    const ym = ymLocal(dt);
    return { x: dt, y: idx.get(ym) || 0 };
  });
}

function buildWindowedSeries(mode, apiData) {
  const norm = (apiData || [])
    .map(d => ({ date: new Date(d.date), count: Number(d.count || 0) }))
    .filter(r => !Number.isNaN(r.date.valueOf()));

  if (mode === 'weekly') {
    const byDay = new Map(norm.map(r => [ymdLocal(r.date), r.count]));
    const weeks = window5Weeks(weekOffset);
    return weeks.map(monday => {
      let y = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday); d.setDate(monday.getDate() + i);
        y += Number(byDay.get(ymdLocal(d)) || 0);
      }
      return { x: monday, y };
    });
  }

  if (mode === 'weekly-days') {
    const byDay = new Map(norm.map(r => [ymdLocal(r.date), r.count]));
    const days = window7Days(weekOffset);
    return days.map(d => ({ x: d, y: Number(byDay.get(ymdLocal(d)) || 0) }));
  }

  if (mode === 'monthly') {
    const y = new Date().getFullYear();
    let pts = buildMonthlyForYear(y, apiData);
    const now = new Date();
    pts = pts.filter(p => p.x.getMonth() <= now.getMonth());
    return pts;
  }
  const byYear = new Map(norm.reduce((acc, r) => {
    const y = r.date.getFullYear();
    acc.set(y, (acc.get(y) || 0) + r.count);
    return acc;
  }, new Map()));
  const years = window5Years(yearOffset);
  return years.map(d => ({ x: d, y: Number(byYear.get(d.getFullYear()) || 0) }));
}
let usersChart;
function renderUsersBar(points, mode) {
  const ctx = document.getElementById('usersChart');
  if (usersChart) usersChart.destroy();

  const unit = mode === 'weekly-days' ? 'day' : mode === 'weekly' ? 'week' : mode === 'monthly' ? 'month' : 'year';
  const displayFormats = { day:'dd MMM', week:'dd MMM', month:'MMM', year:'yyyy' };

  usersChart = new Chart(ctx, {
    type: 'bar',
    data: {
      datasets: [{
        label: 'Registrations',
        data: points.map(p => ({ x: p.x, y: p.y })),
        backgroundColor: 'rgba(251, 179, 86, 0.55)',
        borderColor: '#f18d41ff',
        borderWidth: 1,
        barPercentage: 0.8,
        categoryPercentage: 0.8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        datalabels: { display: false },
        legend: { display: false },
        tooltip: {
          displayColors: false,
          callbacks: {
            beforeTitle: () => '',
            title: items => {
              const d = new Date(items[0].parsed.x);
              if (unit === 'day')  return d.toLocaleDateString(undefined,{ weekday:'short', day:'2-digit', month:'short', year:'numeric' });
              if (unit === 'week') return `Week of ${d.toLocaleDateString(undefined,{ day:'2-digit', month:'short', year:'numeric' })}`;
              if (unit === 'month')return d.toLocaleDateString(undefined,{ month:'long', year:'numeric' });
              return d.toLocaleDateString(undefined,{ year:'numeric' });
            },
            label: ctx => ` Registrations: ${ctx.parsed.y}`,
            afterLabel: () => '',
            footer: () => ''
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: { unit, displayFormats, tooltipFormat: unit==='day'?'PP':unit==='month'?'LLLL yyyy':'yyyy' },
          grid: { display: false },
          ticks: {
            source: 'data',
            autoSkip: mode !== 'monthly',
            autoSkipPadding: 16,
            maxRotation: 0,
            font: { size: 12 },
            callback: (val, idx, ticks) => {
              const v = ticks[idx]?.value; if (!v) return '';
              const d = new Date(v);
              if (unit === 'day')  return d.toLocaleDateString(undefined,{ weekday:'short' });
              if (unit === 'week') return d.toLocaleDateString(undefined,{ day:'2-digit', month:'short' });
              if (unit === 'month')return d.toLocaleDateString(undefined,{ month:'short' });
              return d.toLocaleDateString(undefined,{ year:'numeric' });
            }
          }
        },
        y: {
          beginAtZero: true,
          ticks: { stepSize: 5, precision: 0 },
          grid: { color: 'rgba(0,0,0,0.06)' }
        }
      }
    }
  });
}

async function loadUsersAnalytics(mode = 'weekly') {
 const res = await apiFetch(`${API}/api/admin/analytics/users?period=${encodeURIComponent(
  mode === 'weekly-days' ? 'daily' : mode.startsWith('weekly') ? 'weekly' : mode
)}`);
 if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
 const body = await safeJson(res);
 const { data = [] } = body;

 const series = buildWindowedSeries(mode, data);

 const tbody = document.getElementById("usersAnalyticsTbody");
 if (tbody) {
   tbody.innerHTML = series.map(p => `
     <tr>
       <td>${
         p.x.toLocaleDateString(undefined,
           mode === 'weekly-days'
             ? { weekday:'short', day:'2-digit', month:'short', year:'numeric' }
             : mode === 'weekly'
               ? { day:'2-digit', month:'short', year:'numeric' }
               : mode === 'monthly'
                 ? { month:'long', year:'numeric' }
                 : { year:'numeric' })
       }</td>
       <td class="text-end">${p.y}</td>
     </tr>
   `).join('');
 }

 renderUsersBar(series, mode);
}
const periodSelect = document.getElementById('usersPeriod');
document.getElementById('prevBtn')?.addEventListener('click', () => {
  const m = periodSelect.value;
  if (m === 'weekly' || m === 'weekly-days') weekOffset--;
  else if (m === 'monthly') monthOffset--;
  else yearOffset--;
  loadUsersAnalytics(m);
});
document.getElementById('nextBtn')?.addEventListener('click', () => {
  const m = periodSelect.value;
  if (m === 'weekly' || m === 'weekly-days') weekOffset++;
  else if (m === 'monthly') monthOffset++;
  else yearOffset++;
  loadUsersAnalytics(m);
});
periodSelect?.addEventListener('change', () => {
  weekOffset = monthOffset = yearOffset = 0;
  loadUsersAnalytics(periodSelect.value);
});
document.getElementById('usersPeriod').value = 'monthly';
weekOffset = 0; monthOffset = 0; yearOffset = 0;
loadUsersAnalytics('monthly');
