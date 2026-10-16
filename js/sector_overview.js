function addCardStructure(card) {
  const name = card.querySelector('span')?.textContent || '';
  card.classList.toggle('sector-card-without-image', !card.dataset.sectorImage);
  const image = card.dataset.sectorImage
    ? `<img src="${card.dataset.sectorImage}" alt="" loading="lazy" />`
    : '';
  card.innerHTML = `
    ${image}
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
