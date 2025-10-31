
document.addEventListener("DOMContentLoaded", () => {
  const continueButtons = document.querySelectorAll(".continue-btn");

  continueButtons.forEach(button => {
    button.addEventListener("click", () => {
      const blogId = button.getAttribute("data-id"); 
      window.location.href = `blogDetail.html?id=${blogId}`;
    });
  });
});

