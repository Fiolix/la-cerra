let projectListenerBound = false;
const SWIPE_MAX_WIDTH = 759;
const SWIPE_MAX_DURATION = 900;
const SWIPE_EDGE_GUARD = 20;
const SWIPE_IGNORE_SELECTOR = [
  '[data-interactive-map]',
  '.maplibregl-map',
  '.sector-tabs',
  'a',
  'button',
  'input',
  'select',
  'textarea',
  'label',
  'summary',
  'video',
  'iframe',
  '[contenteditable="true"]'
].join(',');

function getTabsRoot() {
  return document.querySelector('[data-sector-tabs]');
}

function animateSwipePanel(panel, direction) {
  if (!panel || !direction || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const directionClass = direction === 'next' ? 'is-swipe-from-right' : 'is-swipe-from-left';
  panel.classList.remove('is-swipe-entering', 'is-swipe-from-right', 'is-swipe-from-left');
  panel.classList.add('is-swipe-entering', directionClass);
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => panel.classList.remove('is-swipe-entering'));
  });
  window.setTimeout(() => panel.classList.remove(directionClass), 240);
}

export function activateSectorTab(name, { focus = false, swipeDirection = '' } = {}) {
  const root = getTabsRoot();
  if (!root) return false;

  const selectedButton = root.querySelector(`[data-sector-tab="${name}"]`);
  const selectedPanel = root.querySelector(`[data-sector-panel="${name}"]`);
  if (!selectedButton || !selectedPanel) return false;

  root.querySelectorAll('[data-sector-tab]').forEach(button => {
    const active = button === selectedButton;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  });

  root.querySelectorAll('[data-sector-panel]').forEach(panel => {
    panel.hidden = panel !== selectedPanel;
  });
  root.dataset.activeSectorTab = name;
  animateSwipePanel(selectedPanel, swipeDirection);

  if (focus) selectedButton.focus();
  document.dispatchEvent(new CustomEvent('sectorTabChanged', {
    detail: { name }
  }));
  window.dispatchEvent(new Event('resize'));
  return true;
}

function setupSectorSwipe(root, buttons) {
  if (root.dataset.sectorSwipeReady === 'true') return;
  root.dataset.sectorSwipeReady = 'true';

  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let tracking = false;

  root.addEventListener('touchstart', event => {
    const touch = event.touches[0];
    if (
      window.innerWidth > SWIPE_MAX_WIDTH
      || event.touches.length !== 1
      || event.target.closest(SWIPE_IGNORE_SELECTOR)
      || touch.clientX < SWIPE_EDGE_GUARD
      || touch.clientX > window.innerWidth - SWIPE_EDGE_GUARD
    ) {
      tracking = false;
      return;
    }

    startX = touch.clientX;
    startY = touch.clientY;
    startTime = performance.now();
    tracking = true;
  }, { passive: true });

  root.addEventListener('touchmove', event => {
    if (!tracking || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      tracking = false;
      return;
    }
    if (Math.abs(deltaX) > 14) event.preventDefault();
  }, { passive: false });

  root.addEventListener('touchend', event => {
    if (!tracking) return;
    tracking = false;
    const touch = event.changedTouches[0];
    if (!touch || performance.now() - startTime > SWIPE_MAX_DURATION) return;

    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    const threshold = Math.max(56, Math.min(82, window.innerWidth * 0.16));
    if (Math.abs(deltaX) < threshold || Math.abs(deltaX) < Math.abs(deltaY) * 1.35) return;

    const currentIndex = buttons.findIndex(button => button.dataset.sectorTab === root.dataset.activeSectorTab);
    const direction = deltaX < 0 ? 1 : -1;
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= buttons.length) return;

    activateSectorTab(buttons[nextIndex].dataset.sectorTab, {
      swipeDirection: direction > 0 ? 'next' : 'previous'
    });
  }, { passive: true });

  root.addEventListener('touchcancel', () => {
    tracking = false;
  }, { passive: true });
}

export function setupSectorTabs(anchor = '', preferredTab = '') {
  const root = getTabsRoot();
  if (!root) return;

  const tabList = root.querySelector('.sector-tabs');
  const buttons = Array.from(root.querySelectorAll('[data-sector-tab]'));
  tabList?.setAttribute('role', 'tablist');

  buttons.forEach(button => {
    button.setAttribute('role', 'tab');
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    panel?.setAttribute('role', 'tabpanel');
    panel?.setAttribute('aria-labelledby', button.id || `${button.dataset.sectorTab}-tab`);
    if (!button.id) button.id = `${button.dataset.sectorTab}-tab`;

    button.addEventListener('click', () => activateSectorTab(button.dataset.sectorTab));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const currentIndex = buttons.indexOf(button);
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const nextButton = buttons[(currentIndex + direction + buttons.length) % buttons.length];
      activateSectorTab(nextButton.dataset.sectorTab, { focus: true });
    });
  });

  setupSectorSwipe(root, buttons);

  const anchorTarget = anchor ? document.getElementById(anchor) : null;
  const anchorPanel = anchorTarget?.closest('[data-sector-panel]')?.dataset.sectorPanel;
  activateSectorTab(anchorPanel || (/^(block|route)-/.test(anchor) ? 'boulders' : preferredTab || 'overview'));

  if (!projectListenerBound) {
    document.addEventListener('showSectorProjects', () => activateSectorTab('boulders'));
    projectListenerBound = true;
  }
}
