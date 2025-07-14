// content_loader.js (mit robuster Erkennung für register)

const contentElement = document.getElementById("content");

// 1. Funktion zum Laden einer Seite
async function loadPage(page) {
  const url = `/la-cerra/content/${page}`;
  console.log(`📥 Versuche zu laden: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Seite konnte nicht geladen werden");
    const html = await response.text();

    contentElement.innerHTML = html;
    console.log("✅ Inhalt erfolgreich geladen:", page);

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

    if (html.includes('id="routen-diagramm"')) {
      const sektorName = page.replace(".html", "");
      import("/la-cerra/js/routen_diagram_loader.js")
        .then(module => module.loadRoutenDiagramm(sektorName))
        .catch(err => console.error("❌ Fehler beim Diagramm-Laden:", err));
    }

    // Wichtig: Register-Modul auch bei "register" oder "register.html" laden
    if (page.replace(/\.html$/, '') === "register") {
      import("/la-cerra/js/register_handler.js")
        .then(module => module.initRegisterForm())
        .catch(err => console.error("❌ Fehler beim Laden von register_handler.js:", err));
    }

  } catch (err) {
    console.error("❌ Fehler beim Laden der Seite:", err);
    contentElement.innerHTML = `<p style='color:red'>Fehler beim Laden: ${page}</p>`;
  }
}

// 2. Klick-Listener für [data-page]-Links
document.body.addEventListener("click", (e) => {
  const link = e.target.closest("[data-page]");
  if (!link) return;

  e.preventDefault();
  const page = link.getAttribute("data-page");
  loadPage(page);
});

// 3. Event-Listener für externes Laden durch burger_menu.js
document.addEventListener("loadPage", (e) => {
  loadPage(e.detail);
});

// 4. Startseite automatisch laden
window.addEventListener("DOMContentLoaded", () => {
  loadPage("start.html");
});
