function addCardStructure(card) {
  const name = card.querySelector('span')?.textContent || '';
  card.innerHTML = `
    <img src="${card.dataset.sectorImage}" alt="" loading="lazy" />
    <span class="sector-card-copy">
      <strong>${name}</strong>
    </span>
    <span class="sector-card-arrow" aria-hidden="true">›</span>
  `;
}

export async function initSectorOverview() {
  const container = document.querySelector('[data-sector-overview]');
  if (!container) return;

  const cards = Array.from(container.querySelectorAll('.sector-card'));
  cards.forEach(addCardStructure);
}
