// content_loader.js (DEBUG-VERSION mit Modul-Erkennung + BurgerMenu-Kompatibilität)

const contentElement = document.getElementById("content");
const links = document.querySelectorAll("[data-page]");

console.log("📦 content_loader.js geladen");

// 1. Funktion zum Laden einer Seite auslagern
async function loadPage(page) {
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
}

// 2. Klick-Listener für alle Links mit [data-page]
links.forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const page = link.getAttribute("data-page");
    loadPage(page);
  });
});

// 3. Für externe Aufrufe durch burger_menu.js

document.addEventListener("loadPage", (e) => {
  console.log("📨 Event loadPage empfangen mit:", e.detail);
  loadPage(e.detail);
});

// 💡 Startseite automatisch laden (z. B. start.html)
window.addEventListener("DOMContentLoaded", () => {
  console.log("🌐 DOM fertig, lade Startseite...");
  loadPage("start.html");
});

if (html.includes('id="routen-diagramm"')) {
  const sektorName = page.replace(".html", ""); // z.B. „somewhere“
  import("/la-cerra/js/routen_diagram_loader.js")
    .then(module => module.loadRoutenDiagramm(sektorName))
    .catch(err => console.error("❌ Fehler beim Diagramm-Laden:", err));
}

