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

const contentElement = document.getElementById("content");
if (!contentElement) {
  console.error("❌ Kein #content-Element gefunden!");
  return;
}

// ✅ Busy-Flags NACH erfolgreicher #content-Prüfung setzen
loadPage.isLoading = true;
window.__pageLoading = true;

const [basePage, anchor] = page.split('#'); // z.B. "somewhere" oder "somewhere.html", "block-04-05"

// 🔧 NEU: .html-Endung automatisch ergänzen
let base = basePage;
if (!base.endsWith('.html')) base = `${base}.html`;

localStorage.setItem("lastPage", base);
const url = `/la-cerra/content/${base}`;
console.log(`📥 Versuche zu laden: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Seite konnte nicht geladen werden");
    const html = await response.text();

    contentElement.innerHTML = html;
    console.log("✅ Inhalt erfolgreich geladen:", basePage);

    let handledScroll = false;

// 🔧 NEU: "profile" und "profile.html" gleich behandeln
const isProfile = (base === "profile.html" || basePage === "profile");
if (isProfile) {
  import("/la-cerra/js/profile_handler.js")
    .then(m => m.initProfile())
    .catch(err => console.error("❌ Fehler beim Laden von profile_handler.js:", err));
}

    if (html.includes('id="boulder-blocks"')) {
      try {
        const mod = await import("/la-cerra/js/boulder_loader.js");
        await mod.loadBlocks();

// Bilder im Hintergrund fertigladen – nicht blockieren
{
  const images = document.querySelectorAll("#boulder-blocks img");
  const waitImages = Promise.all(Array.from(images).map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(res => {
      const done = () => {
        img.removeEventListener('load', done);
        img.removeEventListener('error', done);
        res();
      };
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
      setTimeout(done, 3000);
    });
  }));
  // optional: nur für Diagnose
  waitImages.then(() => console.log("🖼️ Bilder in #boulder-blocks fertig (ok/fehler)"));
}

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

} else if (sessionStorage.getItem('forceTop') === '1') {
  // 🔝 explizit am Seitenanfang starten (Sektor-Link aus der Ticklist)
  window.scrollTo(0, 0);
  sessionStorage.removeItem('forceTop');
  handledScroll = true;

} else {
  // 🔁 normales Verhalten: alte Scrollposition wiederherstellen
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
  const sektorName = base.replace(".html", ""); // 🔧 NEU: die normalisierte Basis verwenden
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
window.__pageLoading = false;

// 🔍 Fokus entfernen, damit z. B. Dropdown kein scrollIntoView auslöst
document.activeElement?.blur();

} catch (err) {
  console.error("❌ Fehler beim Laden der Seite:", err);
  contentElement.innerHTML = `<p style='color:red'>Fehler beim Laden: ${basePage}</p>`;
} finally {
  // ✅ Egal was passiert – Flags sauber zurücksetzen
  loadPage.isLoading = false;
  window.__pageLoading = false;

  // Fokus wegnehmen (wie bisher)
  document.activeElement?.blur();
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

  // 🔝 Wenn der Link den Seitenanfang erzwingen soll (Sektor-Link aus der Ticklist)
  const forceTop = link.hasAttribute('data-scrolltop');
  if (forceTop) {
    sessionStorage.setItem('forceTop', '1');
  }

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
