// Zentrale Seitennavigation und Initialisierung dynamischer Inhalte.

// Keep this value aligned with every local ?v= query via scripts/bump_asset_version.ps1.
const ASSET_VERSION = "20261020-route-table-controls-2";

const PAGE_ALIASES = {
  start: "start.html",
  news: "news.html",
  routes: "routes.html",
  bouldering: "sardinia.html",
  "bouldering.html": "sardinia.html",
  la_cerra: "la_cerra.html",
  "la-cerra": "la_cerra.html",
  "la-cerra.html": "la_cerra.html",
  somewhere: "somewhere.html",
  la_sportiva: "la_sportiva.html",
  sushi_free: "sushi_free.html",
  "sushi-free": "sushi_free.html",
  "sushi-free.html": "sushi_free.html",
  bermuda_triangle: "bermuda_triangle.html",
  second_life: "second_life.html",
  "2nd_life": "second_life.html",
  stuntblocs: "stuntblocs.html",
  jumble: "jumble.html",
  bloc_meadow: "bloc_meadow.html",
  monte_lu_bagnu: "monte_lu_bagnu.html",
  monte_pulchiana: "monte_pulchiana.html",
  where_the_wild_things_are: "where_the_wild_things_are.html",
  "where-the-wild-things-are": "where_the_wild_things_are.html",
  la_tartaruga: "la_tartaruga.html",
  "la-tartaruga": "la_tartaruga.html",
  piru_ruju: "piru_ruju.html",
  "piru-ruju": "piru_ruju.html",
  boulderplanet: "boulderplanet.html",
  sardinia: "sardinia.html",
  gallura: "sardinia.html",
  "gallura.html": "sardinia.html",
  register: "register.html",
  profile: "profile.html",
  guestbook: "guestbook.html",
  faq: "before_you_go.html",
  before_you_go: "before_you_go.html",
  "before-you-go": "before_you_go.html",
  "before-you-go.html": "before_you_go.html",
  information: "before_you_go.html",
  "information.html": "before_you_go.html",
  agriturismo: "agriturismo.html",
  contact: "contact.html",
  imprint: "imprint.html",
  privacy: "privacy.html",
  reset_password: "reset_password.html",
  "reset-password": "reset_password.html",
  admin: "admin.html"
};

let activeLoadId = 0;
let activeController = null;
let deferredMapListener = null;
let scrollTrackingFrame = 0;
let ignoreScrollTracking = false;
let scrollLoadId = 0;

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

window.addEventListener('scroll', () => {
  if (ignoreScrollTracking || scrollTrackingFrame) return;
  scrollTrackingFrame = window.requestAnimationFrame(() => {
    scrollTrackingFrame = 0;
    rememberCurrentScroll();
  });
}, { passive: true });

window.addEventListener('pagehide', () => rememberCurrentScroll(true));
document.addEventListener('sectorTabChanged', () => {
  if (!ignoreScrollTracking) rememberCurrentScroll();
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

async function loadPage(page, options = {}) {
  const contentElement = document.getElementById("content");
  if (!contentElement) {
    console.error('The #content element was not found.');
    return;
  }

  let normalized;
  try {
    normalized = normalizePage(page);
  } catch (error) {
    showLoadError(contentElement, String(page || ""));
    console.error('Invalid page request:', error);
    return;
  }

  const { basePage, anchor } = normalized;
  const loadId = ++activeLoadId;

  activeController?.abort();
  activeController = new AbortController();
  if (deferredMapListener) {
    document.removeEventListener("sectorTabChanged", deferredMapListener);
    deferredMapListener = null;
  }

  localStorage.setItem("lastPage", basePage);
  contentElement.setAttribute("aria-busy", "true");

  try {
    const response = await fetch(`/la-cerra/content/${basePage}?v=${ASSET_VERSION}`, {
      signal: activeController.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    if (loadId !== activeLoadId) return;

    document.dispatchEvent(new Event("beforePageContentReplace"));
    const template = document.createElement("template");
    template.innerHTML = html;
    template.content.querySelectorAll("img").forEach(image => {
      if (!image.hasAttribute("loading")) image.loading = "lazy";
      if (!image.hasAttribute("decoding")) image.decoding = "async";
    });
    contentElement.replaceChildren(template.content.cloneNode(true));
    document.body.dataset.currentPage = basePage.replace('.html', '');
    updateDocumentTitle(contentElement, basePage);

    let handledScroll = false;
    let sectorUnavailable = false;

    const sectorModule = await import(`/la-cerra/js/sector_visibility.js?v=${ASSET_VERSION}`);
    if (loadId !== activeLoadId) return;
    await sectorModule.applySectorVisibility(contentElement);

    if (html.includes('data-sector-overview')) {
      const overviewModule = await import(`/la-cerra/js/sector_overview.js?v=${ASSET_VERSION}`);
      if (loadId !== activeLoadId) return;
      await overviewModule.initSectorOverview();
    }

    if (html.includes('data-sector-tabs')) {
      const tabsModule = await import(`/la-cerra/js/sector_tabs.js?v=${ASSET_VERSION}`);
      if (loadId !== activeLoadId) return;
      tabsModule.setupSectorTabs(anchor, options.sectorTab || '');
    }

    if (html.includes('data-interactive-map')) {
      const initializeMaps = async () => {
        const mapModule = await import(`/la-cerra/js/interactive_map.js?v=${ASSET_VERSION}`);
        if (loadId !== activeLoadId) return;
        mapModule.initInteractiveMaps();
      };

      const activeTab = contentElement.querySelector('[data-sector-tabs]')?.dataset.activeSectorTab;
      if (activeTab === 'map' || !contentElement.querySelector('[data-sector-tabs]')) {
        await initializeMaps();
      } else {
        deferredMapListener = event => {
          if (event.detail?.name !== 'map' || loadId !== activeLoadId) return;
          document.removeEventListener("sectorTabChanged", deferredMapListener);
          deferredMapListener = null;
          initializeMaps();
        };
        document.addEventListener("sectorTabChanged", deferredMapListener);
      }
    }

    const sectorSlug = contentElement.querySelector('[data-sektor]')?.dataset.sektor;
    if (sectorSlug) await sectorModule.applySectorContent(contentElement, sectorSlug);
    const localHiddenSectorPreview = ['localhost', '127.0.0.1'].includes(window.location.hostname)
      && new URL(window.location.href).searchParams.has('preview');
    if (sectorSlug && !localHiddenSectorPreview && !(await sectorModule.isSectorVisible(sectorSlug))) {
      showSectorUnavailable(contentElement, sectorModule.sectorLabel(sectorSlug));
      sectorUnavailable = true;
    }

    if (basePage === "start.html") {
      const statsModule = await import(`/la-cerra/js/area_stats.js?v=${ASSET_VERSION}`);
      if (loadId !== activeLoadId) return;
      await statsModule.initStartAreaStats();

      const module = await import(`/la-cerra/js/start_account.js?v=${ASSET_VERSION}`);
      if (loadId !== activeLoadId) return;
      await module.initStartAccount();

      const newsModule = await import(`/la-cerra/js/news_loader.js?v=${ASSET_VERSION}`);
      if (loadId !== activeLoadId) return;
      await newsModule.initStartNews();
    }

    if (basePage === "news.html") {
      const module = await import(`/la-cerra/js/news_loader.js?v=${ASSET_VERSION}`);
      if (loadId !== activeLoadId) return;
      await module.initNewsPage(anchor);
      handledScroll = Boolean(anchor);
    }

    if (basePage === "profile.html") {
      const module = await import(`/la-cerra/js/profile_handler.js?v=${ASSET_VERSION}`);
      if (loadId !== activeLoadId) return;
      await module.initProfile();
    }

    if (basePage === "admin.html") {
      const module = await import(`/la-cerra/js/admin_handler.js?v=${ASSET_VERSION}`);
      if (loadId !== activeLoadId) return;
      await module.initAdmin();
    }

    if (basePage === "guestbook.html") {
      const module = await import(`/la-cerra/js/guestbook_loader.js?v=${ASSET_VERSION}`);
      if (loadId !== activeLoadId) return;
      await module.initGuestbook();
    }

    if (basePage === "routes.html") {
      const module = await import(`/la-cerra/js/routes_directory.js?v=${ASSET_VERSION}`);
      if (loadId !== activeLoadId) return;
      await module.initRoutesDirectory();
    }

    if (!sectorUnavailable && html.includes('id="boulder-blocks"')) {
      const module = await import(`/la-cerra/js/boulder_loader.js?v=${ASSET_VERSION}`);
      if (loadId !== activeLoadId) return;
      await module.loadBlocks();
      if (loadId !== activeLoadId) return;

      if (anchor) {
        if (anchor.startsWith('route-')) module.openAndScrollToRoute(anchor, { scroll: false });
        else module.setBlockOpen(anchor, true);
      } else if (options.openBlockId) {
        module.setBlockOpen(options.openBlockId, true);
        const blockImage = document.getElementById(options.openBlockId)?.querySelector('img');
        await waitForImage(blockImage);
        if (loadId !== activeLoadId) return;
      }

      if (anchor) {
        await scrollToAnchor(anchor);
        handledScroll = true;
      }
    }

    if (!sectorUnavailable && html.includes("sector-summary")) {
      const module = await import(`/la-cerra/js/summary_toggle.js?v=${ASSET_VERSION}`);
      if (loadId !== activeLoadId) return;
      module.setupSummaryToggle();
    }

    if (!sectorUnavailable && html.includes('id="sector-select"')) {
      const module = await import(`/la-cerra/js/sector_navigation.js?v=${ASSET_VERSION}`);
      if (loadId !== activeLoadId) return;
      module.setupSectorNavigation();
    }

    if (!sectorUnavailable && html.includes('id="routen-diagramm"')) {
      const sektorName = document.querySelector('[data-sektor]')?.dataset.sektor
        || basePage.replace(".html", "");
      const module = await import(`/la-cerra/js/routen_diagram_loader.js?v=${ASSET_VERSION}`);
      if (loadId !== activeLoadId) return;
      await module.loadRoutenDiagramm(sektorName);
    }

    if (!sectorUnavailable && html.includes('id="la-cerra-routen-diagramm"')) {
      const module = await import(`/la-cerra/js/routen_diagram_loader.js?v=${ASSET_VERSION}`);
      if (loadId !== activeLoadId) return;
      await module.loadLaCerraDiagramm();
    }

    if (basePage === "register.html") {
      const module = await import(`/la-cerra/js/register_handler.js?v=${ASSET_VERSION}`);
      if (loadId !== activeLoadId) return;
      module.initRegisterForm();
    }

    if (basePage === "reset_password.html") {
      const module = await import(`/la-cerra/js/reset_password_handler.js?v=${ASSET_VERSION}`);
      if (loadId !== activeLoadId) return;
      await module.initResetPassword();
    }

    const factsModule = await import(`/la-cerra/js/facts_loader.js?v=${ASSET_VERSION}`);
    if (loadId !== activeLoadId) return;
    await factsModule.showNextFact();
    updateDocumentTitle(contentElement, basePage);

    if (anchor && !handledScroll) {
      await scrollToAnchor(anchor);
      handledScroll = true;
    }

    if (!handledScroll) await applyRequestedScroll(options);
    document.activeElement?.blur();
  } catch (error) {
    if (error?.name === "AbortError" || loadId !== activeLoadId) return;
    console.error('Page loading failed:', error);
    showLoadError(contentElement, basePage);
  } finally {
    if (loadId === activeLoadId) {
      contentElement.removeAttribute("aria-busy");
    }
  }
}

function updateDocumentTitle(container, basePage) {
  const pageHeading = container.querySelector('h1')?.textContent.trim();
  document.title = basePage === 'start.html' || !pageHeading
    ? 'Bouldering La Cerra'
    : `${pageHeading} | Bouldering La Cerra`;
}

function waitForImage(image) {
  if (!image || image.complete) return Promise.resolve();

  return new Promise(resolve => {
    const timeout = window.setTimeout(resolve, 4000);
    const finish = () => {
      window.clearTimeout(timeout);
      resolve();
    };

    image.addEventListener("load", finish, { once: true });
    image.addEventListener("error", finish, { once: true });
  });
}

async function scrollToAnchor(anchor) {
  let target = document.getElementById(anchor);
  let remainingAttempts = 20;

  while (!target && remainingAttempts-- > 0) {
    await new Promise(resolve => window.setTimeout(resolve, 100));
    target = document.getElementById(anchor);
  }

  if (!target) return false;

  const block = anchor.startsWith('route-') ? 'center' : 'start';
  const alignTarget = () => target.scrollIntoView({ behavior: 'auto', block });
  const imageIsBeforeTarget = image => (
    image !== target
    && Boolean(image.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING)
  );
  const hasLoadingImageBeforeTarget = () => Array.from(
    document.querySelectorAll('img.is-pending[src]')
  ).some(imageIsBeforeTarget);

  // A direct jump can activate lazy-loaded topo images just above the target.
  // Their natural height may differ from the reserved placeholder and move the
  // requested block or route after the first scroll. Re-align while those
  // already requested images settle, without loading the rest of the page.
  alignTarget();
  const startedAt = performance.now();
  let stableChecks = 0;
  let previousTop = target.getBoundingClientRect().top;

  while (performance.now() - startedAt < 4000) {
    await new Promise(resolve => window.setTimeout(resolve, 100));
    const currentTop = target.getBoundingClientRect().top;
    const moved = Math.abs(currentTop - previousTop) > 1;

    if (moved || hasLoadingImageBeforeTarget()) {
      alignTarget();
      stableChecks = 0;
    } else {
      stableChecks += 1;
    }

    previousTop = target.getBoundingClientRect().top;
    if (stableChecks >= 3) break;
  }

  alignTarget();
  return true;
}

function historyPageFromLocation() {
  const { basePage, anchor } = normalizePage(pageFromLocation());
  return `${basePage}${anchor ? `#${anchor}` : ''}`;
}

function scrollStorageKey(page = historyPageFromLocation()) {
  return `scroll-position:${page}`;
}

function rememberCurrentScroll(persist = false) {
  const page = historyPageFromLocation();
  const scrollY = Math.max(0, Math.round(window.scrollY));
  const sectorTab = document.querySelector('[data-sector-tabs]')?.dataset.activeSectorTab || '';
  history.replaceState({ ...(history.state || {}), page, scrollY, sectorTab }, '', window.location.href);
  if (persist) sessionStorage.setItem(scrollStorageKey(page), String(scrollY));
}

function loadWithScroll(page, options = {}) {
  const currentScrollLoadId = ++scrollLoadId;
  ignoreScrollTracking = true;
  return loadPage(page, options).finally(() => {
    window.requestAnimationFrame(() => {
      if (currentScrollLoadId !== scrollLoadId) return;
      ignoreScrollTracking = false;
      rememberCurrentScroll();
    });
  });
}

function applyRequestedScroll(options) {
  const requestedY = options.scrollMode === 'position' ? Number(options.scrollY) : 0;
  const scrollY = Number.isFinite(requestedY) ? Math.max(0, requestedY) : 0;
  return new Promise(resolve => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, left: 0, behavior: 'auto' });
        resolve();
      });
    });
  });
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

function showSectorUnavailable(container, sectorName) {
  container.innerHTML = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="#" data-page="la_cerra.html">La Cerra</a> › ${sectorName}
    </nav>
    <section class="account-notice" role="status">
      <h2>${sectorName}</h2>
      <p>This sector is temporarily unavailable. No block or route data has been deleted.</p>
      <button type="button" data-page="la_cerra.html">Back to La Cerra</button>
    </section>
  `;
}

document.body.addEventListener("click", event => {
  const retryButton = event.target.closest("[data-retry-page]");
  if (retryButton) {
    loadWithScroll(decodeURIComponent(retryButton.dataset.retryPage), {
      scrollMode: 'position',
      scrollY: window.scrollY
    });
    return;
  }

  const link = event.target.closest("[data-page]");
  if (!link) return;

  event.preventDefault();
  const page = link.getAttribute("data-page");
  if (!page) return;

  const { basePage, anchor } = normalizePage(page);
  const historyPage = `${basePage}${anchor ? `#${anchor}` : ""}`;
  rememberCurrentScroll();
  history.pushState({ page: historyPage, scrollY: 0 }, "", `?p=${encodeURIComponent(historyPage)}`);
  loadWithScroll(historyPage, { scrollMode: 'top' });
});

document.addEventListener("reloadCurrentPage", event => {
  const detail = event.detail || {};
  loadWithScroll(pageFromLocation(), {
    scrollMode: 'position',
    scrollY: Number.isFinite(detail.scrollY) ? detail.scrollY : window.scrollY,
    openBlockId: detail.openBlockId || '',
    sectorTab: detail.sectorTab
      || document.querySelector('[data-sector-tabs]')?.dataset.activeSectorTab
      || ''
  });
});

document.addEventListener("loadPage", event => {
  const page = typeof event.detail === 'string' ? event.detail : event.detail?.page;
  if (!page) return;
  loadWithScroll(page, { scrollMode: 'position', scrollY: window.scrollY });
});

document.addEventListener("navigateToPage", event => {
  const detail = typeof event.detail === 'string' ? { page: event.detail } : (event.detail || {});
  const page = detail.page;
  if (!page) return;
  const { basePage, anchor } = normalizePage(page);
  const historyPage = `${basePage}${anchor ? `#${anchor}` : ""}`;
  rememberCurrentScroll();
  const params = new URLSearchParams();
  params.set('p', historyPage);
  Object.entries(detail.params || {}).forEach(([key, value]) => {
    if (value != null && String(value) !== '') params.set(key, String(value));
  });
  history.pushState({ page: historyPage, scrollY: 0 }, "", `?${params.toString()}`);
  loadWithScroll(historyPage, { scrollMode: 'top' });
});

window.addEventListener("popstate", event => {
  loadWithScroll(pageFromLocation(), {
    scrollMode: 'position',
    scrollY: Number.isFinite(event.state?.scrollY) ? event.state.scrollY : 0,
    sectorTab: event.state?.sectorTab || ''
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const page = pageFromLocation();
  const navigationType = performance.getEntriesByType('navigation')[0]?.type;
  const storedScroll = Number(sessionStorage.getItem(scrollStorageKey(historyPageFromLocation())));
  const stateScroll = Number(history.state?.scrollY);
  const reloadScroll = Number.isFinite(stateScroll)
    ? stateScroll
    : (Number.isFinite(storedScroll) ? storedScroll : 0);
  const restoreReload = navigationType === 'reload';
  history.replaceState({
    ...(history.state || {}),
    page: historyPageFromLocation(),
    scrollY: restoreReload ? reloadScroll : 0,
    sectorTab: history.state?.sectorTab || ''
  }, '', window.location.href);
  loadWithScroll(page, {
    scrollMode: restoreReload ? 'position' : 'top',
    scrollY: reloadScroll,
    sectorTab: restoreReload ? (history.state?.sectorTab || '') : ''
  });
});
