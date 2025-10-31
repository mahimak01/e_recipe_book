const API_BASE_URL = 'http://localhost:3000/api/auth';
const resetForm = document.getElementById('reset-form');
const toastContainer = document.getElementById('toast-container');

const closeBtn = document.getElementById('rp-close');
if (closeBtn) {
  closeBtn.addEventListener('click', () => {
    window.close();
    setTimeout(() => { if (!document.hidden) location.href = '/homePage.html'; }, 150);
  });
}

const token = new URLSearchParams(location.search).get('token');
if (!token) {
  showToast('No reset token found. Please request a new link.', 'error');
  setTimeout(()=> location.replace('forgot.html'), 1200);
}

const STRONG = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
function validatePassword(pw){
  if (pw.length < 8) return 'Password must be at least 8 characters.';
  return null;
}

function bindEyeToggle(iconId, inputId) {
  const icon = document.getElementById(iconId);
  const input = document.getElementById(inputId);
  if (!icon || !input) return;
  icon.addEventListener('click', () => {
    const isPwd = input.type === 'password';
    input.type = isPwd ? 'text' : 'password';
    icon.classList.toggle('fa-eye-slash', !isPwd);
    icon.classList.toggle('fa-eye', isPwd);
  });
}
bindEyeToggle('togglePassword', 'password');
bindEyeToggle('toggleConfirmPassword', 'confirmPassword');

resetForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const password = document.getElementById('password').value.trim();
  const confirm = document.getElementById('confirmPassword').value.trim();

  const err = validatePassword(password);
  if (err) return showToast(err, 'error');
  if (password !== confirm) return showToast('Passwords do not match.', 'error');

  const btn = resetForm.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Resetting...';

  try{
    const res = await fetch(`${API_BASE_URL}/reset-password/${encodeURIComponent(token)}`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Reset failed');

    showToast('Password reset successfully.', 'success');
    btn.disabled = false; btn.textContent = 'Reset Password';
  }catch(e2){
    showToast(e2.message, 'error');
    btn.disabled = false; btn.textContent = 'Reset Password';
  }
});

function showToast(msg, type){
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  toastContainer.appendChild(el);
  setTimeout(()=> el.remove(), 1800);
}
