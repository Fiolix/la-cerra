document.addEventListener("DOMContentLoaded", () => {
  function loadPage(page) {
    fetch(`content/${page}.html`)
      .then(res => res.text())
      .then(html => {
        document.getElementById("content").innerHTML = html;
      });
  }

  document.querySelectorAll("[data-page]").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const page = e.target.getAttribute("data-page");
      loadPage(page);
    });
  });

  // Startseite laden
  loadPage("bouldering");
});