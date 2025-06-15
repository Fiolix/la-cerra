document.addEventListener("DOMContentLoaded", () => {
  function loadPage(page) {
    fetch(`content/${page}.html`)
      .then(res => {
        if (!res.ok) throw new Error("Seite nicht gefunden");
        return res.text();
      })
      .then(html => {
        document.getElementById("content").innerHTML = html;
      })
      .catch(err => {
        document.getElementById("content").innerHTML = "<p>Inhalt nicht gefunden.</p>";
      });
  }

  document.querySelectorAll("[data-page]").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const page = e.target.getAttribute("data-page");
      if (page && page !== "#") {
        loadPage(page);
      }
    });
  });

  // Standardseite beim Laden
  loadPage("bouldering");
});
