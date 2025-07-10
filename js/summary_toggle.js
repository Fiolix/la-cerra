// summary_toggle.js als JavaScript-Modul

export function setupSummaryToggle() {
  console.log("✅ summary_toggle.js wurde als Modul geladen");

  const summaryBox = document.querySelector(".sector-summary");
  const textElement = summaryBox?.querySelector(".text-preview");
  const toggleButton = summaryBox?.querySelector(".toggle-summary");

  if (!summaryBox || !textElement || !toggleButton) {
    console.warn("❌ summaryBox, textElement oder toggleButton nicht gefunden");
    return;
  }

  console.log("📢 setupSummaryToggle wird ausgeführt...");

  // Vorherige Eventlistener entfernen durch Ersetzen des Buttons
  toggleButton.replaceWith(toggleButton.cloneNode(true));
  const newToggleButton = summaryBox.querySelector(".toggle-summary");

  newToggleButton.addEventListener("click", () => {
    const isExpanded = summaryBox.classList.toggle("expanded");
    textElement.classList.toggle("text-preview", !isExpanded);
    newToggleButton.textContent = isExpanded ? "Show less" : "Show more";
  });
}
