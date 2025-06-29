// content_loader.js

const contentElement = document.getElementById("content");
const links = document.querySelectorAll("[data-page]");

links.forEach(link => {
  link.addEventListener("click", async (e) => {
    e.preventDefault();

    const page = link.getAttribute("data-page");
    const url = `/la-cerra/content/${page}`;

    try {
      const response = await fetch(url);
      const html = await response.text();
      contentElement.innerHTML = html;

      // Boulder-Daten laden (nur für somewhere.html)
      if (page === "somewhere.html") {
        import("/la-cerra/js/boulder_loader.js")
          .then(module => module.loadBlocks())
          .catch(err => console.error("❌ Fehler beim Laden von boulder_loader.js:", err));
      }

      // Prüfen, ob ein Summary enthalten ist (generisch)
      if (html.includes("sector-summary")) {
        import("/la-cerra/js/summary_toggle.js")
          .then(module => {
            console.log("🔁 Summary-Setup wird ausgeführt");
            module.setupSummaryToggle();
          })
          .catch(err => console.error("❌ Fehler beim Laden von summary_toggle.js:", err));
      }

    } catch (err) {
      console.error("❌ Fehler beim Laden der Seite:", err);
    }
  });
});
