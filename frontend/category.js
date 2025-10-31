

document.addEventListener("DOMContentLoaded", () => {
  const BASE_URL = "http://localhost:3000";
  const grid = document.getElementById("recipeGrid");
  const catBtns = document.querySelectorAll(".categoryButton");
  const catMap = {
    vegetarian: "veg",
    "non-veg": "nonveg",
    healthy: "salad",
    juices: "juices",
    dessert: "dessert"
  };
  let allRecipes = [];

  function setActiveCategory(key) {
    catBtns.forEach(b =>
      b.classList.toggle("active", b.dataset.category === key)
    );
  }
function normCat(v){
  return String(v || "").trim().toLowerCase();
}
function getCategoryValue(recipe) {
  const c = recipe.category;
  if (!c) return "";
  const raw = typeof c === "string" ? c : (c.slug || c.name || c.key || "");
  let n = normCat(raw);
  if (n === "juice") n = "juices";
  if (n === "nonveg" || n === "non-veg") n = "nonveg";
  if (n === "veg" || n === "vegetarian") n = "veg";
  if (n === "salad" || n === "healthy") n = "salad";
  return n;
}

 function renderCategory(key) {
  const k = String(key || "").toLowerCase();
  const backendCat = (catMap[k] || k).toLowerCase();
  const want = (()=>{
    if (backendCat === "juice") return "juices";
    if (backendCat === "non-veg") return "nonveg";
    return backendCat;
  })();
  const filtered = want
    ? allRecipes.filter(r => getCategoryValue(r) === want)
    : [];
  renderGrid(filtered);
  setActiveCategory(k);
}

function renderGrid(recipes) {
  const wrapper = document.createElement("div");
  wrapper.className = "container";
  const row = document.createElement("div");
  row.className = "row";
  wrapper.appendChild(row);

  if (!recipes.length) {
    row.innerHTML = `<p class="text-center">No recipes found.</p>`;
  } else {
    const frag = document.createDocumentFragment();
    recipes.forEach(r => {
      const col = document.createElement("div");
      col.className = "col-md-4 col-sm-6 mb-4";
      const cardSrc =
        r.cardImg || r.imageUrl || r.image || r.banner || "/Images/default.jpg";

      col.innerHTML = `
        <div class="recipe-card position-relative rounded-3" data-id="${r._id || r.id || ""}">
          <img src="${cardSrc}" class="img-fluid" alt="${r.name || "Recipe"}">
          <button class="like-btn"><i class="fa fa-heart fs-5 rounded-circle py-1 px-1"></i></button>
          <div class="recipe-overlay">
            <div class="recipe-time"><i class="bi bi-clock fs-6 me-1"></i> ${r.time || "N/A"}</div>
            <div class="recipe-title fw-bold lh-1.2 fs-5">${r.name || "Unnamed"}</div>
          </div>
        </div>`;
      frag.appendChild(col);
    });
    row.appendChild(frag);
  }

  grid.innerHTML = "";
  grid.appendChild(wrapper);
  markActiveHearts(grid);
}

  async function loadAllRecipes() {
    try {
      const res = await fetch(`${BASE_URL}/api/recipes`, {
        headers: { Accept: "application/json" }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      allRecipes = Array.isArray(data.recipes)
        ? data.recipes
        : Array.isArray(data)
        ? data
        : [];
      const params = new URLSearchParams(window.location.search);
      const catType = params.get("type") || "vegetarian";
      renderCategory(catType);
    } catch (e) {
      console.error("Load failed:", e);
      grid.innerHTML = `<p class="text-danger text-center">Unable to load recipes.</p>`;
    }
  }
function loadFavs() {
  try {
    return JSON.parse(localStorage.getItem("favorites")) || [];
  } catch {
    return [];
  }
}

function saveFavs(arr) {
  localStorage.setItem("favorites", JSON.stringify(arr));
}

function markActiveHearts(container) {
  const favorites = loadFavs();
  const ids = new Set(favorites.map(f => f.id));
  container.querySelectorAll(".recipe-card").forEach(card => {
    const id = card.dataset.id;
    const heart = card.querySelector(".like-btn i");
    if (heart) {
      if (id && ids.has(id)) {
        heart.classList.add("text-danger"); // red heart
        card.querySelector(".like-btn").classList.add("liked");
      } else {
        heart.classList.remove("text-danger");
        card.querySelector(".like-btn").classList.remove("liked");
      }
    }
  });
}

async function toggleLike(card, likeBtn) {
  const id = card.dataset.id;
  if (!id) return;

  const heartIcon = likeBtn.querySelector("i");
  const title = card.querySelector(".recipe-title")?.innerText?.trim() || "";
  const image = card.querySelector("img")?.src || "";
  const time = card.querySelector(".recipe-time")?.innerText?.trim() || "";

  let favs = loadFavs();
  const alreadyLiked = favs.some(f => f.id === id);

  if (alreadyLiked) {
    favs = favs.filter(f => f.id !== id);
    heartIcon.classList.remove("text-danger");
    likeBtn.classList.remove("liked");
  } else {
    favs.push({ id, title, image, time });
    heartIcon.classList.add("text-danger");
    likeBtn.classList.add("liked");
  }

  saveFavs(favs);
  try {
    const res = await fetch(`${BASE_URL}/api/recipes/${encodeURIComponent(id)}/like`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ like: !alreadyLiked })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    console.warn("Like sync failed:", err);
  }
}

  document.body.addEventListener("click", e => {
    const btn = e.target.closest(".categoryButton");
    if (btn) {
      renderCategory(btn.dataset.category);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("type", btn.dataset.category);
      window.history.pushState({}, "", newUrl);
    }
  });
  grid.addEventListener("click", e => {
    const likeBtn = e.target.closest(".like-btn");
    const card = e.target.closest(".recipe-card");

    if (likeBtn && card) {
      e.stopPropagation();
      toggleLike(card, likeBtn);
    } else if (card) {
      window.location.href = `method.html?id=${encodeURIComponent(
        card.dataset.id
      )}`;
    }
  });
  loadAllRecipes();
});
document.addEventListener("DOMContentLoaded", () => {
    const aboutBtn = document.getElementById("aboutBtn");
    if (aboutBtn) {
        aboutBtn.addEventListener("click", () => {
            window.location.href = "about.html";
        });
    }

    const moreBtn = document.getElementById("moreBtn");
    if (moreBtn) {
        moreBtn.addEventListener("click", () => {
            window.location.href = "blog.html";
        });
    }
})