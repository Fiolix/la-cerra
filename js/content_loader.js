// content_loader.js (mit Scroll-Speicherung & Fokus-Reset)

// Scrollposition beim Verlassen speichern
window.addEventListener("beforeunload", () => {
  sessionStorage.setItem("scrollY", window.scrollY);
});

async function loadPage(page) {
  if (loadPage.currentPage === page) {
    console.warn(`🚫 Seite '${page}' ist bereits aktiv – kein erneutes Laden.`);
    return;
  }
  loadPage.currentPage = page;

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

    let handledScroll = false;

    if (page === "profile") {
      import("/la-cerra/js/profile_handler.js")
        .then(m => m.initProfile())
        .catch(err => console.error("❌ Fehler beim Laden von profile_handler.js:", err));
    }

    if (html.includes('id="boulder-blocks"')) {
      try {
        const mod = await import("/la-cerra/js/boulder_loader.js");
        await mod.loadBlocks();

        const images = document.querySelectorAll("#boulder-blocks img");
        await Promise.all(Array.from(images).map(img =>
          img.complete ? Promise.resolve() : new Promise(res => img.onload = res)
        ));

        restoreScrollPosition();
        handledScroll = true;
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

    if (!handledScroll) restoreScrollPosition();

    // 🔍 Fokus entfernen, damit z. B. Dropdown kein scrollIntoView auslöst
    document.activeElement?.blur();

  } catch (err) {
    console.error("❌ Fehler beim Laden der Seite:", err);
    contentElement.innerHTML = `<p style='color:red'>Fehler beim Laden: ${page}</p>`;
  }
}

function restoreScrollPosition() {
  const scrollY = sessionStorage.getItem("scrollY");
  if (scrollY) {
    console.log("🔁 Wiederherstellung ScrollY:", scrollY);
    window.scrollTo(0, Number(scrollY));
    sessionStorage.removeItem("scrollY");
  }
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
