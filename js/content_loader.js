// content_loader.js (DEBUG-VERSION mit Modul-Erkennung für summary_toggle und boulder_loader)

const contentElement = document.getElementById("content");
const links = document.querySelectorAll("[data-page]");

console.log("📦 content_loader.js geladen");

links.forEach(link => {
  link.addEventListener("click", async (e) => {
    e.preventDefault();

    const page = link.getAttribute("data-page");
    const url = `/la-cerra/content/${page}`;
    console.log(`📥 Versuche zu laden: ${url}`);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Seite konnte nicht geladen werden");
      const html = await response.text();
      contentElement.innerHTML = html;
      console.log("✅ Inhalt erfolgreich geladen:", page);
      console.log("📄 HTML-Inhalt erhalten:", html);

      // Dynamisch benötigte Module nachladen
      if (html.includes('id="boulder-blocks"')) {
        import("/la-cerra/js/boulder_loader.js")
          .then(module => module.loadBlocks())
          .catch(err => console.error("❌ Fehler beim Laden von boulder_loader.js:", err));
      }

      if (html.includes("sector-summary")) {
        import("/la-cerra/js/summary_toggle.js")
          .then(module => module.setupSummaryToggle())
          .catch(err => console.error("❌ Fehler beim Laden von summary_toggle.js:", err));
      }

    } catch (err) {
      console.error("❌ Fehler beim Laden der Seite:", err);
      contentElement.innerHTML = `<p style='color:red'>Fehler beim Laden: ${page}</p>`;
    }
  });
});
