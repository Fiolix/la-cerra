// Zentrale Seitennavigation und Initialisierung dynamischer Inhalte.

const PAGE_ALIASES = {
  start: "start.html",
  bouldering: "bouldering.html",
  la_cerra: "la_cerra.html",
  "la-cerra": "la_cerra.html",
  "la-cerra.html": "la_cerra.html",
  somewhere: "somewhere.html",
  la_sportiva: "la_sportiva.html",
  gallura: "gallura.html",
  register: "register.html",
  profile: "profile.html"
};

let activeLoadId = 0;
let activeController = null;

window.addEventListener("beforeunload", () => {
  sessionStorage.setItem("scrollY", window.scrollY);
});

function normalizePage(page) {
  const rawPage = String(page || "start.html");
  const hashIndex = rawPage.indexOf("#");
  const rawBase = hashIndex >= 0 ? rawPage.slice(0, hashIndex) : rawPage;
  const anchor = hashIndex >= 0 ? rawPage.slice(hashIndex + 1) : "";
  const alias = PAGE_ALIASES[rawBase];
  const basePage = alias || (rawBase.endsWith(".html") ? rawBase : `${rawBase}.html`);

  if (!/^[a-z0-9_-]+\.html$/i.test(basePage)) {
    throw new Error("Ungültiger Seitenname");
  }

  return { basePage, anchor };
}

function pageFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const queryPage = params.get("p");
  let page = queryPage
    ? queryPage
    : (localStorage.getItem("lastPage") || "start.html");

  if (window.location.hash && !page.includes("#")) {
    page += window.location.hash;
  }

  return page;
}

async function loadPage(page) {
  const contentElement = document.getElementById("content");
  if (!contentElement) {
    console.error("Kein #content-Element gefunden.");
    return;
  }

  let normalized;
  try {
    normalized = normalizePage(page);
  } catch (error) {
    showLoadError(contentElement, String(page || ""));
    console.error("Ungültiger Seitenaufruf:", error);
    return;
  }

  const { basePage, anchor } = normalized;
  const loadId = ++activeLoadId;

  activeController?.abort();
  activeController = new AbortController();

  localStorage.setItem("lastPage", basePage);
  contentElement.setAttribute("aria-busy", "true");

  try {
    const response = await fetch(`/la-cerra/content/${basePage}`, {
      signal: activeController.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    if (loadId !== activeLoadId) return;

    contentElement.innerHTML = html;

    let handledScroll = false;

    if (basePage === "profile.html") {
      const module = await import("/la-cerra/js/profile_handler.js");
      if (loadId !== activeLoadId) return;
      await module.initProfile();
    }

    if (html.includes('id="boulder-blocks"')) {
      const module = await import("/la-cerra/js/boulder_loader.js");
      if (loadId !== activeLoadId) return;
      await module.loadBlocks();
      if (loadId !== activeLoadId) return;

      await waitForImages(document.querySelectorAll("#boulder-blocks img"));
      if (loadId !== activeLoadId) return;

      if (anchor) {
        scrollToAnchor(anchor);
        handledScroll = true;
      } else if (sessionStorage.getItem("forceTop") === "1") {
        window.scrollTo(0, 0);
        sessionStorage.removeItem("forceTop");
        handledScroll = true;
      }
    }

    if (html.includes("sector-summary")) {
      const module = await import("/la-cerra/js/summary_toggle.js");
      if (loadId !== activeLoadId) return;
      module.setupSummaryToggle();
    }

    if (html.includes('id="routen-diagramm"')) {
      const sektorName = basePage.replace(".html", "");
      const module = await import("/la-cerra/js/routen_diagram_loader.js");
      if (loadId !== activeLoadId) return;
      await module.loadRoutenDiagramm(sektorName);
    }

    if (basePage === "register.html") {
      const module = await import("/la-cerra/js/register_handler.js");
      if (loadId !== activeLoadId) return;
      module.initRegisterForm();
    }

    if (!handledScroll) restoreScrollPosition();
    document.activeElement?.blur();
  } catch (error) {
    if (error?.name === "AbortError" || loadId !== activeLoadId) return;
    console.error("Fehler beim Laden der Seite:", error);
    showLoadError(contentElement, basePage);
  } finally {
    if (loadId === activeLoadId) {
      contentElement.removeAttribute("aria-busy");
    }
  }
}

function waitForImages(images) {
  return Promise.all(Array.from(images).map(image => {
    if (image.complete) return Promise.resolve();

    return new Promise(resolve => {
      const timeout = window.setTimeout(resolve, 10000);
      const finish = () => {
        window.clearTimeout(timeout);
        resolve();
      };

      image.addEventListener("load", finish, { once: true });
      image.addEventListener("error", finish, { once: true });
    });
  }));
}

function scrollToAnchor(anchor) {
  let remainingAttempts = 20;

  const tryScroll = () => {
    const target = document.getElementById(anchor);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (remainingAttempts-- > 0) {
      window.setTimeout(tryScroll, 100);
    }
  };

  tryScroll();
}

function restoreScrollPosition() {
  const scrollY = sessionStorage.getItem("scrollY");
  if (scrollY !== null) {
    window.scrollTo(0, Number(scrollY));
    sessionStorage.removeItem("scrollY");
  }
}

function showLoadError(container, page) {
  container.innerHTML = `
    <section class="load-error" role="alert">
      <h2>Page could not be loaded</h2>
      <p>This page is currently unavailable. Please try again later.</p>
      <button type="button" data-retry-page="${encodeURIComponent(page)}">Try again</button>
    </section>
  `;
}

document.body.addEventListener("click", event => {
  const retryButton = event.target.closest("[data-retry-page]");
  if (retryButton) {
    loadPage(decodeURIComponent(retryButton.dataset.retryPage));
    return;
  }

  const link = event.target.closest("[data-page]");
  if (!link) return;

  event.preventDefault();
  const page = link.getAttribute("data-page");
  if (!page) return;

  if (link.hasAttribute("data-scrolltop")) {
    sessionStorage.setItem("forceTop", "1");
  }

  const { basePage, anchor } = normalizePage(page);
  const historyPage = `${basePage}${anchor ? `#${anchor}` : ""}`;
  history.pushState({ page: historyPage }, "", `?p=${encodeURIComponent(historyPage)}`);
  loadPage(historyPage);
});

document.addEventListener("loadPage", event => {
  sessionStorage.setItem("scrollY", window.scrollY);
  loadPage(event.detail);
});

window.addEventListener("popstate", () => {
  loadPage(pageFromLocation());
});

document.addEventListener("DOMContentLoaded", () => {
  loadPage(pageFromLocation());
});
