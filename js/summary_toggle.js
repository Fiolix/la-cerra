// summary_toggle.js als JavaScript-Modul

export function setupSummaryToggle() {
  const summaryBox = document.querySelector(".sector-summary");
  const textElement = summaryBox?.querySelector(".text-preview");
  const toggleButton = summaryBox?.querySelector(".toggle-summary");

  if (!summaryBox || !textElement || !toggleButton) {
    console.warn('The sector summary or its toggle button was not found.');
    return;
  }

  // Vorherige Eventlistener entfernen durch Ersetzen des Buttons
  toggleButton.replaceWith(toggleButton.cloneNode(true));
  const newToggleButton = summaryBox.querySelector(".toggle-summary");
  const contentId = textElement.id || `sector-summary-${document.body.dataset.page || 'content'}`;
  textElement.id = contentId;
  newToggleButton.setAttribute('aria-controls', contentId);
  newToggleButton.setAttribute('aria-expanded', 'false');

  newToggleButton.addEventListener("click", () => {
    const isExpanded = summaryBox.classList.toggle("expanded");
    textElement.classList.toggle("text-preview", !isExpanded);
    newToggleButton.textContent = isExpanded ? "Show less" : "Show more";
    newToggleButton.setAttribute('aria-expanded', String(isExpanded));
  });
}
