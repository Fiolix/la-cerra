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

  toggleButton.addEventListener("click", () => {
    const isExpanded = summaryBox.classList.toggle("expanded");
    textElement.classList.toggle("text-preview", !isExpanded);
    toggleButton.textContent = isExpanded ? "Show less" : "Show more";
  });
}
