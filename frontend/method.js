
const feedbackBtn = document.getElementById("feedbackBtn");
const feedbackForm = document.getElementById("feedbackForm");
const closeForm = document.getElementById("closeForm");
const feedbackDataForm = document.getElementById("feedbackDataForm");

feedbackBtn?.addEventListener("click", () => {
  feedbackForm.style.display = "flex";
});

closeForm?.addEventListener("click", (e) => {
  e.stopPropagation();
  feedbackForm.style.display = "none";

});

feedbackDataForm?.addEventListener("submit", (e) => {
  e.preventDefault();

  const recipeChoice = document.querySelector('input[name="recipe"]:checked')?.value || "No";
  const suggestion = document.getElementById("suggestion").value || "";

  const feedback = {
    recipeChoice,
    suggestion,
    date: new Date().toLocaleString(),
  };

  const feedbackList = JSON.parse(localStorage.getItem("feedbackList")) || [];
  feedbackList.push(feedback);
  localStorage.setItem("feedbackList", JSON.stringify(feedbackList));

  feedbackDataForm.reset();
  feedbackForm.style.display = "none";
  showToast("Form successfully submitted", "green");
});

feedbackForm?.addEventListener("click", (e) => {
  const formContent = document.querySelector("#feedbackForm .form-content");
  if (!formContent.contains(e.target)) {
    showToast("Please close or submit the form", "red");
  }
});

function showToast(message, type = "green") {
  const toast = document.createElement("div");
  toast.className = "toast-message " + (type === "green" ? "toast-green" : "toast-red");
  toast.innerText = message;

  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 100);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

document.addEventListener("DOMContentLoaded", async () => {
  const BASE_URL = "http://localhost:3000";
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  let recipe = null;

  if (id) {
    try {
      const res = await fetch(`${BASE_URL}/api/recipes/${encodeURIComponent(id)}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      recipe = await res.json();
    } catch (err) {
      console.error("Detail fetch error:", err);
      alert("Could not load recipe by id, trying saved selection...");
    }
  }

  if (!recipe) {
    try {
      recipe = JSON.parse(localStorage.getItem("selectedRecipe"));
    } catch {
      recipe = null;
    }
  }

  if (!recipe) {
    alert("No recipe found. Please search again.");
    window.location.href = "homePage.html";
    return;
  }

  const heroImg = document.querySelector(".hero-img");
  const heroTitle = document.querySelector(".hero-content h2");
  const heroDesc = document.querySelector(".hero-content p");
  const heroInfo = document.querySelector(".recipe-info");
if (heroImg) {
  const heroSrc = recipe.banner || recipe.imageUrl || recipe.image || recipe.cardImg || "/Images/default.jpg";
  heroImg.src = heroSrc;
  heroImg.style.width = "100%";
  heroImg.style.height = "100%";
  heroImg.style.objectFit = "cover";
}

  if (heroTitle) heroTitle.textContent = recipe.name || "Recipe Name";
  if (heroDesc) heroDesc.textContent = recipe.description || "Delicious recipe.";
   if (heroInfo) {
    heroInfo.innerHTML = `
      <div class="px-2 py-1 rounded-3 text-white">🍴 Category: ${recipe.category?.name || recipe.category || "N/A"}</div>
      <div class="px-2 py-1 rounded-3 text-white">⏰ Time: ${recipe.time || "N/A"}</div>
      <button id="likeBtn" class="btn border-none like-btn d-flex align-items-center ">
        <i id="likeIcon" class="bi bi-heart"></i>
      </button>
    `;
await wireLikeToggle(recipe);

  }


  const ingList = document.querySelector(".ingredients ul");
  if (ingList && Array.isArray(recipe.ingredients)) {
    ingList.innerHTML = recipe.ingredients.map((ing) => `<li class="py-2">${ing}</li>`).join("");
  }

  const instrDiv = document.querySelector(".instructions");
  if (instrDiv && Array.isArray(recipe.steps)) {
    instrDiv.innerHTML = `
      <h3 class="instructionhead mb-4">Instructions</h3>
      ${recipe.steps.map((s, i) => `<p><strong>Step ${i + 1}:</strong> ${s}</p>`).join("")}
    `;
  }


  const needList = document.querySelector(".need ul");
  const reqArray = recipe.requirements || recipe.requirement || [];
  if (needList) {
    if (reqArray.length > 0) {
      needList.innerHTML = reqArray.map((req) => `<li> ${req}</li>`).join("");
    } else {
      needList.innerHTML = "<li>No special equipment needed</li>";
    }
  }
});
const BASE_URL = "http://localhost:3000";

function getClientId() {
  const k = "anon_client_id";
  let v = localStorage.getItem(k);
  if (!v) {
    v = crypto?.randomUUID ? crypto.randomUUID() : (Date.now() + "-" + Math.random().toString(36).slice(2));
    localStorage.setItem(k, v);
  }
  return v;
}
const CLIENT_ID = getClientId(); 


function setIcon(liked, iconEl) {
  if (liked) { iconEl.classList.remove("bi-heart"); iconEl.classList.add("bi-heart-fill"); }
  else { iconEl.classList.remove("bi-heart-fill"); iconEl.classList.add("bi-heart"); }
}


async function fetchLiked(recipeId) {
  const res = await fetch(`${BASE_URL}/api/recipes/${encodeURIComponent(recipeId)}/likes?clientId=${encodeURIComponent(CLIENT_ID)}`, {
    headers: { Accept: "application/json" }
  });
  if (!res.ok) return false;
  const data = await res.json();
  return !!data.liked;
}

async function persistToggle(recipeId, likedNow) {
  const endpoint = likedNow ? "like" : "unlike";
  const res = await fetch(`${BASE_URL}/api/recipes/${encodeURIComponent(recipeId)}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ clientId: CLIENT_ID })
  });
  if (!res.ok) throw new Error("Failed");
  const data = await res.json();
  return !!data.liked;
} 
async function wireLikeToggle(recipe) {
  const likeBtn = document.getElementById("likeBtn");
  const likeIcon = document.getElementById("likeIcon");
  if (!likeBtn || !likeIcon) return; 

  const recipeId = recipe._id || new URLSearchParams(location.search).get("id");


  const initLiked = await fetchLiked(recipeId);
  setIcon(initLiked, likeIcon);

  likeBtn.addEventListener("click", async () => {
    const currentlyLiked = likeIcon.classList.contains("bi-heart-fill");
    const optimistic = !currentlyLiked;   
    setIcon(optimistic, likeIcon);       
    try {
      const confirmed = await persistToggle(recipeId, optimistic);
      setIcon(confirmed, likeIcon);      
    } catch {
      setIcon(currentlyLiked, likeIcon);  
    }
  });
}
