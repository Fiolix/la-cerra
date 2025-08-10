// content_loader.js (mit Scroll-Speicherung & Fokus-Reset)

// Scrollposition beim Verlassen speichern
window.addEventListener("beforeunload", () => {
  sessionStorage.setItem("scrollY", window.scrollY);
});

async function loadPage(page) {
  if (loadPage.isLoading) {
    console.warn(`⏳ Seite wird gerade geladen – Abbruch.`);
    return;
  }
  loadPage.isLoading = true;

  const contentElement = document.getElementById("content");
  if (!contentElement) {
    console.error("❌ Kein #content-Element gefunden!");
    return;
  }

const [basePage, anchor] = page.split('#'); // z.B. "somewhere.html", "block-04-05"

localStorage.setItem("lastPage", basePage);
const url = `/la-cerra/content/${basePage}`;
console.log(`📥 Versuche zu laden: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Seite konnte nicht geladen werden");
    const html = await response.text();

    contentElement.innerHTML = html;
    console.log("✅ Inhalt erfolgreich geladen:", basePage);

    let handledScroll = false;

    if (basePage === "profile") {
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

if (anchor) {
  // 🔎 Warte kurz, bis der Ziel-Block existiert, dann scrolle dorthin
  let tries = 20;
  const tryScroll = () => {
    const el = document.getElementById(anchor); // z.B. "block-04-05"
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (tries-- > 0) {
      setTimeout(tryScroll, 100);
    }
  };
  tryScroll();
  handledScroll = true;
} else {
  restoreScrollPosition();
  handledScroll = true;
}

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
      const sektorName = basePage.replace(".html", "");
      import("/la-cerra/js/routen_diagram_loader.js")
        .then(m => m.loadRoutenDiagramm(sektorName))
        .catch(err => console.error("❌ Fehler beim Diagramm-Laden:", err));
    }

    if (basePage === "register") {
      import("/la-cerra/js/register_handler.js")
        .then(m => m.initRegisterForm())
        .catch(err => console.error("❌ Fehler beim Laden von register_handler.js:", err));
    }

    if (!handledScroll) restoreScrollPosition();

    // 🔓 Ladevorgang abgeschlossen
    loadPage.isLoading = false;

    // 🔍 Fokus entfernen, damit z. B. Dropdown kein scrollIntoView auslöst
    document.activeElement?.blur();

  } catch (err) {
    console.error("❌ Fehler beim Laden der Seite:", err);
    loadPage.isLoading = false;
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
  history.pushState({ page }, '', `?p=${encodeURIComponent(page)}`);
  loadPage(page);
});

if (!window.loadPageListenerRegistered) {
  document.addEventListener("loadPage", (e) => {
    sessionStorage.setItem("scrollY", window.scrollY);
    loadPage(e.detail);
  });
  window.loadPageListenerRegistered = true;
}

window.addEventListener('popstate', () => {
  const params = new URLSearchParams(location.search);
  const p = params.get('p');
  const page = p ? decodeURIComponent(p) : 'start.html';
  loadPage(page);
});


document.addEventListener("DOMContentLoaded", () => {
  const contentElement = document.getElementById("content");
  if (!contentElement) {
    console.error("❌ content-Element nicht vorhanden beim Initialisieren");
    return;
  }
  const params = new URLSearchParams(location.search);
  const p = params.get('p');
  const initial = p ? decodeURIComponent(p) : (localStorage.getItem("lastPage") || "start.html");
  loadPage(initial);
});
