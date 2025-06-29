console.log("✅ summary_toggle.js wurde geladen");

document.addEventListener("DOMContentLoaded", () => {
  const summaryBox = document.querySelector(".sector-summary");
  const textElement = summaryBox?.querySelector(".summary-text");

  if (!summaryBox || !textElement) return;

  const fullText = textElement.textContent;
  const shortText = fullText.length > 100 ? fullText.slice(0, 100) + "…" : fullText;

  const span = document.createElement("span");
  span.className = "text-preview";
  span.textContent = shortText;

  if (!summaryBox.hasAttribute("open")) {
    textElement.replaceChildren(span);
  }

  summaryBox.addEventListener("toggle", () => {
    if (summaryBox.open) {
      textElement.textContent = fullText;
    } else {
      textElement.replaceChildren(span);
    }
  });
});
