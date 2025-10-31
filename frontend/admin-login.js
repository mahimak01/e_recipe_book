const eyeBtn = document.getElementById('eyeBtn');
const passIn = document.getElementById('ad-pass');
eyeBtn?.addEventListener("click", () => {
  if (!passIn) return;
  passIn.type = passIn.type === "password" ? "text" : "password";
  eyeBtn.classList.toggle('bi-eye-slash');
  eyeBtn.classList.toggle('bi-eye');
});
function showToast(msg, type = "success") {
  const t = document.getElementById('toast');
  if (!t) return alert(msg);
  t.textContent = msg;
  t.className = "toast" + (type === "error" ? " error" : "");
  t.classList.remove('d-none');
  setTimeout(() => t.classList.add('d-none'), 1850);
}
document.getElementById('adminLoginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('ad-email')?.value?.trim().toLowerCase() || "";
  const password = document.getElementById('ad-pass')?.value || "";
  if (!email || !password) {
    showToast("Email and password required", "error");
    return;
  }
  const API_BASE = 'http://localhost:3000';
  const url = `${API_BASE}/api/auth/login`;
  try {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data?.message || 'Login failed', 'error');
      return;
    }
    localStorage.setItem('authToken', data?.token || "");
    localStorage.setItem('authUser', JSON.stringify(data?.user || {}));
    const role = String(data?.user?.role || "").toLowerCase();
    if (role !== 'admin') {
      showToast("Only admins can access dashboard", "error");
      return;
    }
    showToast("Login successful");
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 300);
  } catch (err) {
    console.error('[admin-login] fetch error:', err);
    showToast('Cannot reach API. Is the server running?', 'error');
  }
});
