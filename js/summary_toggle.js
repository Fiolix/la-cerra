document.addEventListener("DOMContentLoaded", () => {
  const summaryBox = document.querySelector(".sector-summary");
  const fullText = summaryBox?.querySelector("p")?.textContent || "";

  if (!summaryBox || !fullText) return;

  const shortText = fullText.substring(0, 100) + (fullText.length > 100 ? "…" : "");
  const textElement = summaryBox.querySelector("p");

  if (!summaryBox.hasAttribute("open")) {
    textElement.textContent = shortText;
  }

  summaryBox.addEventListener("toggle", () => {
    if (summaryBox.open) {
      textElement.textContent = fullText;
    } else {
      textElement.textContent = shortText;
    }
  });
});
