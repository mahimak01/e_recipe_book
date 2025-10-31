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

document.addEventListener("DOMContentLoaded", async () => {
  const favGrid = document.getElementById("favGrid");
  const API_BASE = "http://localhost:3000";


  let favorites = [];
  try { favorites = JSON.parse(localStorage.getItem("favorites")) || []; }
  catch { favorites = []; }
  if (!Array.isArray(favorites)) favorites = [];

  const favIds = favorites.map(f => String(f.id || f._id || f.recipeId || f)).filter(Boolean);

  let existingIds = new Set();
  try {
    const res = await fetch(`${API_BASE}/api/recipes?status=approved`, { headers: { Accept: 'application/json' } });
    const data = await res.json().catch(() => ({}));
    const arr = Array.isArray(data?.recipes) ? data.recipes : Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    existingIds = new Set(arr.map(r => String(r._id || r.id)).filter(Boolean));
  } catch {

  }

  const filtered = favorites.filter(f => existingIds.has(String(f.id || f._id || f.recipeId || f)));

  if (filtered.length !== favorites.length) {
    localStorage.setItem("favorites", JSON.stringify(filtered));
  }

  if (!filtered.length) {
    favGrid.innerHTML = "<p class='text-center'>No favorites yet!</p>";
    return;
  }

  const DEFAULT_IMG = "/Images/default.jpg";
  const frag = document.createDocumentFragment();
  filtered.forEach(fav => {
    const div = document.createElement("div");
    div.className = "col-md-4 mb-4";
    div.innerHTML = `
      <div class="recipe-card position-relative rounded-3" data-id="${fav.id || fav._id || ""}">
        <img src="${fav.image || fav.cardImg || fav.banner || DEFAULT_IMG}" alt="${fav.title || fav.name || "Recipe"}" class="img-fluid">
        <div class="recipe-overlay">
          <div class="recipe-time">${fav.time || "N/A"}</div>
          <div class="recipe-title fw-bold lh-1.2 fs-5">${fav.title || fav.name || "Unnamed"}</div>
        </div>
      </div>
    `;
    frag.appendChild(div);
  });
  favGrid.innerHTML = "";
  favGrid.appendChild(frag);

  favGrid.addEventListener("click", (e) => {
    const card = e.target.closest(".recipe-card");
    if (!card) return;
    const id = card.getAttribute("data-id");
    if (id) {
      window.location.href = `method.html?id=${encodeURIComponent(id)}`;
    }
  });
});
