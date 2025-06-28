document.addEventListener("DOMContentLoaded", () => {
  const summaryBox = document.querySelector(".sector-summary");
  const fullText = summaryBox?.querySelector("p")?.textContent || "";

  if (!summaryBox || !fullText) return;

  const textElement = summaryBox.querySelector("p");
  const originalHTML = textElement.innerHTML;

  summaryBox.addEventListener("toggle", () => {
    if (summaryBox.open) {
      textElement.innerHTML = originalHTML;
    } else {
      const limitedText = fullText.length > 100 ? fullText.slice(0, 100) + "…" : fullText;
      textElement.innerHTML = `<span class="text-preview">${limitedText}</span>`;
    }
  });

  // initialer Zustand falls geschlossen
  if (!summaryBox.hasAttribute("open")) {
    const limitedText = fullText.length > 100 ? fullText.slice(0, 100) + "…" : fullText;
    textElement.innerHTML = `<span class="text-preview">${limitedText}</span>`;
  }
});
