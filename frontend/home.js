
let slideIndex = 0;
const slides = document.querySelectorAll('.hero-slideshow .slide');
function showSlides() {
  if (!slides.length) return;
  slides.forEach(s => s.classList.remove('show'));
  slides[slideIndex].classList.add('show');
  slideIndex = (slideIndex + 1) % slides.length;
}
if (slides.length) {
  slides[0].classList.add('show');
  showSlides();
  setInterval(showSlides, 4000);
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('inview');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.18 });
document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));

window.addEventListener("load", () => {
  const popup = document.getElementById("suggestionPopup");
  const closeBtn = document.getElementById("closePopup");
  const form = document.getElementById("suggestionForm");

  setTimeout(() => {
    if (popup && !sessionStorage.getItem("suggestionDone")) {
      popup.style.display = "flex";
    }
  }, 8000);

  closeBtn?.addEventListener("click", () => {
    if (!popup) return;
    popup.style.display = "none";
    sessionStorage.setItem("suggestionDone", "true");
  });

  const cookTimeInput = document.getElementById("cookTime");
  if (cookTimeInput) {
    cookTimeInput.setAttribute("placeholder", "e.g. 30m | 1h 20m | 45min | 02:15");
    cookTimeInput.setAttribute("pattern", "^((\\d{1,2}:[0-5]\\d)|(\\d+h(\\s?\\d+m)?)|(\\d+\\s?(m|min)))$");
    cookTimeInput.setAttribute("title", "Use 30m, 1h 20m, 45min, or HH:MM");
  }
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const suggestion = {
      dish: document.getElementById("dish")?.value?.trim(),
      name: document.getElementById("name")?.value?.trim(),
      email: document.getElementById("email")?.value?.trim(),
      comment: document.getElementById("comment")?.value?.trim(),
      role: "user" 
    };
    try {
      const res = await fetch(`http://localhost:3000/api/suggestions`, {
        method: "POST",
        headers: { "Content-Type":"application/json", Accept:"application/json" },
        body: JSON.stringify(suggestion)
      });
      const data = await res.json().catch(()=> ({}));
      if (!res.ok) {
        showHomeToast(data?.message || "Failed to submit suggestion");
        return;
      }
      sessionStorage.setItem("suggestionDone", "true");
      showHomeToast("Thank you for your valuable suggestion!");
      if (popup) popup.style.display = "none";
if (form) form.reset(); 
    } catch (err) {
      showHomeToast("Network error while submitting suggestion");
    }
  });
});

function showHomeToast(msg, ms = 3000) {
  const box = document.getElementById("home-toast");
  if (!box) return alert(msg);
  box.textContent = msg;
  box.classList.add("show");
  window.clearTimeout(showHomeToast._t);
  showHomeToast._t = window.setTimeout(() => box.classList.remove("show"), ms);
}

const API_BASE = "http://localhost:3000";

function normalizeArrayLike(data) {
  if (Array.isArray(data?.recipes)) return data.recipes;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

const DEFAULT_IMG = "/Images/default.jpg"; 

function getCardImage(r){
  const v = r?.cardImg || r?.imageUrl || r?.image || r?.banner;
  return (v && String(v).trim()) ? v : DEFAULT_IMG;
}
function setBg(el, url){
  if (!el) return;
  const apply = (u)=>{
    el.style.backgroundImage = `url('${u}')`;
    el.style.backgroundSize = "cover";
    el.style.backgroundPosition = "center";
    el.style.backgroundRepeat = "no-repeat";
    el.style.minHeight = el.style.minHeight || "240px";
    el.style.borderRadius = el.style.borderRadius || "12px";
  };
  const img = new Image();
  img.onload = ()=> apply(url || DEFAULT_IMG);
  img.onerror = ()=> apply(DEFAULT_IMG);
  img.src = url || DEFAULT_IMG;
}


function loadFavIds() {
  try {
    const favs = JSON.parse(localStorage.getItem("favorites")) || [];
    if (Array.isArray(favs) && favs.length && typeof favs[0] === "object") {
      return favs.map(f => String(f.id || f._id || f.recipeId || f)).filter(Boolean);
    }
    return favs.map(String);
  } catch { return []; }
}

function isFav(rec) {
  const val = rec?.isFavorite ?? rec?.favorite ?? false;
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val === 1;
  if (typeof val === "string") return val.toLowerCase() === "true";
  return false;
}

function getCategoryName(rec) {
  const c = rec?.category;
  if (!c) return "";
  if (typeof c === "string") return c;
  if (typeof c === "object") return (c.name || c.slug || c.key || "").toString();
  return "";
}

function openRecipeDetail(rec) {
  const recipeId = rec?._id || rec?.id;
  if (!recipeId) return;
  const category = getCategoryName(rec);
  const payload = {
    id: recipeId,
    name: rec.name || rec.title || "Recipe",
    category
  };
  localStorage.setItem("selectedRecipe", JSON.stringify(payload));
  const url = `category.html?id=${encodeURIComponent(recipeId)}${category ? `&category=${encodeURIComponent(category)}` : ""}`;
  location.href = url;
}

async function fetchAllRecipes() {
  const res = await fetch(`${API_BASE}/api/recipes?status=approved`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const arr = normalizeArrayLike(data);
  return Array.isArray(arr) ? arr : [];
}

document.addEventListener("DOMContentLoaded", () => {
  const BASE_URL = API_BASE;

  const exploreBtn = document.getElementById("exploreBtn");
  if (exploreBtn) exploreBtn.addEventListener("click", () => location.href = "category.html");

  const searchBtn = document.getElementById("searchBtn");
  const searchInput = document.getElementById("searchInput");

  if (searchBtn && searchInput) {
    searchBtn.setAttribute("aria-controls", "searchInput");
    searchBtn.setAttribute("aria-expanded", "false");
  }

  async function performSearch(query) {
    try {
      const res = await fetch(`${BASE_URL}/api/recipes?status=approved&search=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error(`Search failed ${res.status}`);
      const data = await res.json();
      const recipes = normalizeArrayLike(data);
      if (!recipes.length) return showHomeToast("No recipes found.");
      const r = recipes[0];
      const sel = {
        id: r._id || r.id,
        name: r.name || r.title || "Recipe",
        category: getCategoryName(r)
      };
      localStorage.setItem("selectedRecipe", JSON.stringify(sel));
      location.href = `method.html?id=${encodeURIComponent(sel.id)}${sel.category ? `&category=${encodeURIComponent(sel.category)}` : ""}`;
    } catch (err) {
      console.error(err);
      showHomeToast("Error while searching.");
    }
  }

  function showSearch() {
    if (!searchInput) return;
    searchInput.style.display = "block";
    searchBtn?.setAttribute("aria-expanded", "true");
    searchInput.focus();
  }
  function hideSearch() {
    if (!searchInput) return;
    searchInput.style.display = "none";
    searchBtn?.setAttribute("aria-expanded", "false");
    searchInput.value = "";
    const popup = document.getElementById("autocomplete");
    const listBox = document.getElementById("suggestList");
    if (popup) popup.style.display = "none";
    if (listBox) listBox.innerHTML = "";
  }

  if (searchBtn && searchInput) {
    searchBtn.addEventListener("click", () => {
      const isVisible = searchInput.style.display === "block";
      if (isVisible) hideSearch(); else showSearch();
    });
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideSearch();
      if (e.key === "Enter" && searchInput.value.trim()) {
        performSearch(searchInput.value.trim());
      }
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-wrap") && searchInput.style.display === "block") {
        hideSearch();
      }
    });
  }
  document.querySelectorAll(".categoryBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.getAttribute("data-category");
      window.location.href = `category.html?type=${encodeURIComponent(cat || "")}`;
    });
  });
  const catButtons = document.querySelectorAll(".categoryBtn");
  const mapToBackend = { "vegetarian":"veg", "non-veg":"nonveg", "healthy":"salad", "juices":"juices", "dessert":"dessert" };
  catButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
      const frontKey = btn.dataset.category || "";
      const want = (mapToBackend[frontKey] || "").toLowerCase();
      if (!want) return;
      try {
        const res = await fetch(`${API_BASE}/api/recipes?status=approved&category=${encodeURIComponent(want)}`, {
          headers: { Accept: "application/json" }
        });
        if (!res.ok) throw new Error("Category fetch failed");
        const data = await res.json();
        const recipes = normalizeArrayLike(data);
        if (!recipes.length) { showHomeToast("No recipes in this category"); return; }
        openRecipeDetail(recipes[0]);
      } catch {
        showHomeToast("Unable to load category");
      }
    });
  });

  const go = (href) => { if (href) location.href = href; };
  document.getElementById("viewAllFavorites")?.addEventListener("click", () => go("favorites.html"));
  document.getElementById("viewBestRecipes")?.addEventListener("click", () => go("category.html"));
  document.getElementById("aboutBtn")?.addEventListener("click", () => go("about.html"));
  document.getElementById("moreBtn")?.addEventListener("click", () => go("blog.html"));

  ["viewAllFavorites","viewBestRecipes","aboutBtn","moreBtn"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", (e) => {
      const href = e.currentTarget?.dataset?.href;
      if (!href) {
      }
    });
  });
});

async function populateMostLove() {
  const tiles = [
    document.querySelector("#mostLove .image-01"),
    document.querySelector("#mostLove .image-02"),
    document.querySelector("#mostLove .image-03"),
    document.querySelector("#mostLove .image-04"),
    document.querySelector("#mostLove .image-05"),
  ].filter(Boolean); 

  if (!tiles.length) return;

  try {
    const all = await fetchAllRecipes();

    const favIds = new Set(loadFavIds());
    const isFavFlag = (r) => {
      const val = r?.isFavorite ?? r?.favorite ?? false;
      return (typeof val === "boolean" && val) ||
             (typeof val === "number" && val === 1) ||
             (typeof val === "string" && val.toLowerCase() === "true");
    };

    const onlyFavs = all.filter(r => favIds.has(String(r._id || r.id)) || isFavFlag(r));
    const show = onlyFavs.slice(0, 5);
    tiles.forEach((el, i) => {
      const rec = show[i] || null;
      if (!rec) {
        el.style.display = "none";
        el.onclick = null;
        return;
      }
      el.style.display = ""; 
      const img = getCardImage(rec);
      setBg(el, img);
      el.style.opacity = "1";
      el.style.pointerEvents = "auto";
      el.style.cursor = "pointer";
    
    });
  } catch (e) {
    console.warn("Most Love load failed:", e);
    tiles.forEach(el => { el.style.display = "none"; });
  }
}


async function populateBestCollection() {
  const tiles = [
    document.querySelector("#bestCollection .image-01"),
    document.querySelector("#bestCollection .image-02"),
    document.querySelector("#bestCollection .image-03"),
    document.querySelector("#bestCollection .image-04"),
    document.querySelector("#bestCollection .image-05"),
  ];
  if (tiles.some(t => !t)) return;

  const categories = ["vegetarian", "non-veg", "healthy", "juices", "dessert"];
  const mapToBackend = { "vegetarian":"veg", "non-veg":"nonveg", "healthy":"salad", "juices":"juices", "dessert":"dessert" };

  try {
    const all = await fetchAllRecipes();
    const norm = (x) => String(x || "").toLowerCase();
    const catOf = (r) => norm(getCategoryName(r));

    const picks = categories.map(frontKey => {
      const want = norm(mapToBackend[frontKey] || "");
      if (!want) return null;
      let best = all.find(r => catOf(r) === want && r.isBest === true);
      if (best) return best;
      const pool = all.filter(r => catOf(r) === want);
      if (pool.length) {
        pool.sort((a,b) => ((b.likes ?? b.like ?? 0) - (a.likes ?? a.like ?? 0)));
        return pool[0];
      }
      return all[0] || null;
    });

tiles.forEach((el, i) => {
  const rec = picks[i] || null;
  const img = rec ? getCardImage(rec) : DEFAULT_IMG;
  setBg(el, img);

  el.style.opacity = "1";
  el.style.pointerEvents = rec ? "auto" : "none";
  el.style.cursor = rec ? "pointer" : "default";
  el.onclick = null;

});

  } catch (e) {
    console.warn("Best Collection load failed:", e);
    tiles.forEach(el => {
      el.style.opacity = "0.6";
      el.style.pointerEvents = "none";
      el.style.backgroundImage = "url('/Images/default.jpg')";
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  populateMostLove();
  populateBestCollection();
});

document.addEventListener("DOMContentLoaded", () => {
  const BASE_URL = API_BASE;
  const searchBtn = document.getElementById("searchBtn");
  const input = document.getElementById("searchInput");
  const listBox = document.getElementById("suggestList");
  const popup = document.getElementById("autocomplete");

  let noMatchMsg = document.getElementById("noMatchMsg");
  if (!noMatchMsg) {
    noMatchMsg = document.createElement("div");
    noMatchMsg.id = "noMatchMsg";
    noMatchMsg.style.color = "red";
    noMatchMsg.style.marginTop = "10px";
    searchBtn?.parentNode?.appendChild(noMatchMsg);
  }

  let currentItems = [];
  let activeIndex = -1;
  let revealed = false;
  let lastAbort = null;

  function debounce(fn, delay = 250) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  searchBtn?.addEventListener("click", () => {
    if (!revealed && input) {
      input.style.display = "block";
      revealed = true;
    }
    input?.focus();
    if (noMatchMsg) noMatchMsg.innerText = "";
  });

  async function fetchSuggestions(q) {
    if (lastAbort) lastAbort.abort();
    lastAbort = new AbortController();
    const { signal } = lastAbort;
    if (!q || q.length < 1) return [];
    try {
      const res = await fetch(`${BASE_URL}/api/recipes?status=approved&search=${encodeURIComponent(q)}`, {
        headers: { Accept: "application/json" },
        signal
      });
      if (!res.ok) return [];
      const data = await res.json();
      const recipes = normalizeArrayLike(data);
      return recipes
        .filter(r => r && (r._id || r.id) && (r.name || r.title))
        .map(r => ({ id: r._id || r.id, name: r.name || r.title, category: getCategoryName(r) }));
    } catch {
      return [];
    }
  }

  function openList() { if (popup) popup.style.display = "block"; }
  function closeList() {
    if (popup) popup.style.display = "none";
    if (listBox) listBox.innerHTML = "";
    activeIndex = -1;
    currentItems = [];
  }

  function setActive(idx) {
    const lis = Array.from(listBox?.children || []);
    lis.forEach((el, i) => el.classList.toggle("active", i === idx));
    activeIndex = idx;
  }

  function selectItem(idx) {
    const it = currentItems[idx];
    if (!it || !input) return;
    input.value = it.name;
    closeList();
    if (noMatchMsg) noMatchMsg.innerText = "";
    input.dataset.selectedId = it.id;
    input.dataset.selectedCategory = it.category || "";
  }

  function renderList(items) {
    currentItems = items;
    if (!listBox) return;
    listBox.innerHTML = "";
    if (!items.length) {
      closeList();
      if (noMatchMsg) noMatchMsg.innerText = "sorry recipe not found .";
      return;
    }
    const frag = document.createDocumentFragment();
    items.forEach((it, idx) => {
      const li = document.createElement("li");
      li.className = "item py-2 px-3";
      li.textContent = it.name;
      li.style.cursor = "pointer";
      li.addEventListener("mouseenter", () => setActive(idx));
      li.addEventListener("mousedown", e => {
        e.preventDefault();
        selectItem(idx);
      });
      frag.appendChild(li);
    });
    listBox.appendChild(frag);
    openList();
  }

  const debouncedSuggest = debounce(async () => {
    const q = (input?.value || "").trim();
    if (!q) { closeList(); if (noMatchMsg) noMatchMsg.innerText = ""; return; }
    const items = await fetchSuggestions(q);
    renderList(items);
  }, 250);

  input?.addEventListener("input", debouncedSuggest);

  function resetSearchUI() {
    if (!input) return;
    input.value = "";
    input.removeAttribute("data-selected-id");
    input.removeAttribute("data-selected-category");
    if (noMatchMsg) noMatchMsg.innerText = "";
    if (popup && listBox) {
      popup.style.display = "none";
      listBox.innerHTML = "";
    }
  }

  resetSearchUI();
  window.addEventListener("pageshow", () => { resetSearchUI(); });

  input?.addEventListener("keydown", (e) => {
    const count = currentItems.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!count) return;
      setActive((activeIndex + 1) % count);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!count) return;
      setActive((activeIndex - 1 + count) % count);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selectedId = input.dataset.selectedId;
      const selectedCategory = input.dataset.selectedCategory || "";
      if (selectedId) {
        location.href = `method.html?id=${encodeURIComponent(selectedId)}${selectedCategory ? `&category=${encodeURIComponent(selectedCategory)}` : ""}`;
      } else {
        if (noMatchMsg) noMatchMsg.innerText = "sorry recipe not found .";
      }
    } else if (e.key === "Escape") {
      closeList();
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) {
      closeList();
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const floatingBtn = document.getElementById('floatingBtn');
  const popup = document.getElementById('suggestionPopup');
  if (floatingBtn && popup) {
    floatingBtn.addEventListener('click', () => {
      popup.style.display = 'flex';
    });
  }
});
