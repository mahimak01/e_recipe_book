document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  const toast = document.getElementById("toast");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const message = document.getElementById("message").value.trim();
    if (name && email && message) {
      const contactData = {
        name,
        email,
        message,
        time: new Date().toLocaleString()
      };
      let storedContacts = JSON.parse(localStorage.getItem("contacts")) || [];
      storedContacts.push(contactData);
      localStorage.setItem("contacts", JSON.stringify(storedContacts));
      form.reset();
      toast.textContent = "Message sent successfully!";
      toast.classList.add("show");
      setTimeout(() => {
        toast.classList.remove("show");
      }, 3000);
    } else {
      toast.textContent = " Please fill all fields!";
      toast.classList.add("show", "error");

      setTimeout(() => {
        toast.classList.remove("show", "error");
      }, 3000);
    }
  });
});
