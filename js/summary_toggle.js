document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ summary_toggle.js wurde geladen");

  const summaryBox = document.querySelector(".sector-summary");
  const textElement = summaryBox?.querySelector(".summary-text");

  if (!summaryBox || !textElement) {
    console.log("❌ summaryBox oder textElement nicht gefunden");
    return;
  } else {
    console.log("✅ summaryBox und summary-text gefunden");
  }

  const fullText = textElement.textContent;
  const shortText = fullText.length > 100 ? fullText.slice(0, 100) + "…" : fullText;

  const span = document.createElement("span");
  span.className = "text-preview";
  span.textContent = shortText;

  if (!summaryBox.hasAttribute("open")) {
    console.log("🔽 summary ist geschlossen, Vorschau wird angezeigt");
    textElement.replaceChildren(span);
  }

  summaryBox.addEventListener("toggle", () => {
    if (summaryBox.open) {
      console.log("🔼 summary aufgeklappt, voller Text wird angezeigt");
      textElement.textContent = fullText;
    } else {
      console.log("🔽 summary zugeklappt, Vorschau wird angezeigt");
      textElement.replaceChildren(span);
    }
  });
});
