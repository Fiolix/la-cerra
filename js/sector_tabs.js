let projectListenerBound = false;

function getTabsRoot() {
  return document.querySelector('[data-sector-tabs]');
}

export function activateSectorTab(name, { focus = false } = {}) {
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

  if (focus) selectedButton.focus();
  window.dispatchEvent(new Event('resize'));
  return true;
}

export function setupSectorTabs(anchor = '') {
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

  activateSectorTab(anchor.startsWith('block-') ? 'boulders' : 'overview');

  if (!projectListenerBound) {
    document.addEventListener('showSectorProjects', () => activateSectorTab('boulders'));
    projectListenerBound = true;
  }
}
