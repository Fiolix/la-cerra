document.addEventListener("DOMContentLoaded", () => {
  function loadPage(page) {
    fetch(`content/${page}.html`)
      .then(res => {
        if (!res.ok) throw new Error("Seite nicht gefunden");
        return res.text();
      })
      .then(html => {
        document.getElementById("content").innerHTML = html;

        // Spezialfall: Zusatzskript laden, wenn "somewhere" aktiv ist
        if (page === "somewhere") {
          import('./js/boulder_loader.js')
            .then(module => module.loadBlocks())
            .catch(err => console.error('❌ Fehler beim Laden von boulder_loader.js:', err));
        }

        // ⬇️ Ereignis nach erfolgreichem Laden auslösen:
        document.dispatchEvent(new CustomEvent("loadPage"));
      })
      .catch(err => {
        document.getElementById("content").innerHTML = "<p>Inhalt nicht gefunden.</p>";
      });
  }

  // EventListener für Menü-Links
  document.querySelectorAll("[data-page]").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const page = link.getAttribute("data-page");
      if (page) loadPage(page);
    });
  });

  // globaler EventListener von burger_menu.js
  document.addEventListener("loadPage", (e) => {
    const page = e.detail;
    if (page) loadPage(page);
  });

  // Startseite laden
  loadPage("start");
});
