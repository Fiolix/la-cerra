// content_loader.js (DEBUG-VERSION mit doppelter Ladeprüfung)

const contentElement = document.getElementById("content");
let lastLoadedPage = null;

async function loadPage(page) {
  if (page === lastLoadedPage) {
    console.log(`⚠️ Seite '${page}' wurde bereits geladen – Abbruch.`);
    return;
  }
  lastLoadedPage = page;

  const url = `/la-cerra/content/${page}`;
  console.log(`📥 Versuche zu laden: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Seite konnte nicht geladen werden");
    const html = await response.text();

    contentElement.innerHTML = html;
    console.log("✅ Inhalt erfolgreich geladen:", page);

    if (page === "profile") {
      import("/la-cerra/js/profile_handler.js")
        .then(module => module.initProfile())
        .catch(err => console.error("❌ Fehler beim Laden von profile_handler.js:", err));
    }

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

    if (page.replace(/\.html$/, '') === "register") {
      import("/la-cerra/js/register_handler.js")
        .then(module => module.initRegisterForm())
        .catch(err => console.error("❌ Fehler beim Laden von register_handler.js:", err));
    }

  } catch (err) {
    console.error("❌ Fehler beim Laden der Seite:", err);
    contentElement.innerHTML = `<p style='color:red'>Fehler beim Laden: ${page}</p>`;
  }

// 🔁 Scrollposition nach dem Laden wiederherstellen
    const savedScroll = sessionStorage.getItem('scrollY');
  if (savedScroll) {
    setTimeout(() => {
    window.scrollTo(0, Number(savedScroll));
    sessionStorage.removeItem('scrollY');
    }, 100);
   }
}

// Klick-Listener für [data-page]-Links
document.body.addEventListener("click", (e) => {
  const link = e.target.closest("[data-page]");
  if (!link) return;

  e.preventDefault();
  const page = link.getAttribute("data-page");
  loadPage(page);
});

// Event-Listener für externes Laden durch burger_menu.js
document.addEventListener("loadPage", (e) => {
  loadPage(e.detail);
});

window.addEventListener("DOMContentLoaded", () => {
  const lastPage = localStorage.getItem("lastPage") || "start.html";
  loadPage(lastPage);
});

