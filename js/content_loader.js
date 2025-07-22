// content_loader.js (überarbeitete Version)

// 🔁 Lädt dynamisch HTML-Inhalte und JS-Module je nach Seite
// ✅ Scrollposition wird nach dem Laden zuverlässig wiederhergestellt

async function loadPage(page) {
  const contentElement = document.getElementById("content");
  if (!contentElement) {
    console.error("❌ Kein #content-Element gefunden!");
    return;
  }

  localStorage.setItem("lastPage", page);
  const url = `/la-cerra/content/${page}`;
  console.log(`📥 Versuche zu laden: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Seite konnte nicht geladen werden");
    const html = await response.text();

    contentElement.innerHTML = html;
    console.log("✅ Inhalt erfolgreich geladen:", page);

    let afterImageLoad = () => restoreScrollPosition();

    if (page === "profile") {
      import("/la-cerra/js/profile_handler.js")
        .then(m => m.initProfile())
        .catch(err => console.error("❌ Fehler beim Laden von profile_handler.js:", err));
    }

    if (html.includes('id="boulder-blocks"')) {
      try {
        const mod = await import("/la-cerra/js/boulder_loader.js");
        await mod.loadBlocks();
        afterImageLoad = () => waitForImagesThenRestore(contentElement);
      } catch (err) {
        console.error("❌ Fehler beim Laden von boulder_loader.js:", err);
      }
    }

    if (html.includes("sector-summary")) {
      import("/la-cerra/js/summary_toggle.js")
        .then(m => m.setupSummaryToggle())
        .catch(err => console.error("❌ Fehler beim Diagramm-Toggle:", err));
    }

    if (html.includes('id="routen-diagramm"')) {
      const sektorName = page.replace(".html", "");
      import("/la-cerra/js/routen_diagram_loader.js")
        .then(m => m.loadRoutenDiagramm(sektorName))
        .catch(err => console.error("❌ Fehler beim Diagramm-Laden:", err));
    }

    if (page === "register") {
      import("/la-cerra/js/register_handler.js")
        .then(m => m.initRegisterForm())
        .catch(err => console.error("❌ Fehler beim Laden von register_handler.js:", err));
    }

    afterImageLoad();
  } catch (err) {
    console.error("❌ Fehler beim Laden der Seite:", err);
    contentElement.innerHTML = `<p style='color:red'>Fehler beim Laden: ${page}</p>`;
  }
}

function restoreScrollPosition() {
  const scrollY = sessionStorage.getItem("scrollY");
  if (scrollY) {
    window.scrollTo(0, Number(scrollY));
    sessionStorage.removeItem("scrollY");
  }
}

function waitForImagesThenRestore(container) {
  const scrollY = sessionStorage.getItem("scrollY");
  if (!scrollY) return;

  const images = container.querySelectorAll("img");
  if (images.length === 0) {
    restoreScrollPosition();
    return;
  }

  let loaded = 0;
  images.forEach(img => {
    if (img.complete) loaded++;
    else img.addEventListener("load", () => {
      loaded++;
      if (loaded === images.length) restoreScrollPosition();
    });
  });

  if (loaded === images.length) restoreScrollPosition();
}

document.body.addEventListener("click", (e) => {
  const link = e.target.closest("[data-page]");
  if (!link) return;
  e.preventDefault();
  const page = link.getAttribute("data-page");
  sessionStorage.setItem("scrollY", window.scrollY);
  loadPage(page);
});

document.addEventListener("loadPage", (e) => {
  sessionStorage.setItem("scrollY", window.scrollY);
  loadPage(e.detail);
});

document.addEventListener("DOMContentLoaded", () => {
  const contentElement = document.getElementById("content");
  if (!contentElement) {
    console.error("❌ content-Element nicht vorhanden beim Initialisieren");
    return;
  }
  const lastPage = localStorage.getItem("lastPage") || "start.html";
  loadPage(lastPage);
});
