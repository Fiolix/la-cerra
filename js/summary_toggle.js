// summary_toggle.js (aktuell als reguläres Skript, kein Modul)

function setupSummaryToggle() {
  console.log("✅ summary_toggle.js wurde geladen");

  const summaryBox = document.querySelector(".sector-summary");
  const textElement = document.querySelector(".text-preview");
  const toggleButton = document.querySelector(".toggle-summary");

  if (!summaryBox || !textElement) {
    console.warn("❌ summaryBox oder textElement nicht gefunden");
    return;
  }

  toggleButton?.addEventListener("click", () => {
    summaryBox.classList.toggle("expanded");
    if (summaryBox.classList.contains("expanded")) {
      textElement.classList.remove("text-preview");
      toggleButton.textContent = "Weniger anzeigen";
    } else {
      textElement.classList.add("text-preview");
      toggleButton.textContent = "Mehr anzeigen";
    }
  });
}

// Automatisch ausführen, wenn als klassisches Skript eingebunden
setupSummaryToggle();
