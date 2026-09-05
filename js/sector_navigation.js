export function setupSectorNavigation() {
  const select = document.getElementById('sector-select');
  if (!select || select.dataset.navigationReady === 'true') return;

  select.dataset.navigationReady = 'true';
  select.addEventListener('change', () => {
    const page = select.value;
    if (!page) return;
    document.dispatchEvent(new CustomEvent('navigateToPage', { detail: page }));
  });
}
