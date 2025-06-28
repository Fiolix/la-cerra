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
    textElement.innerHTML = "";
    textElement.appendChild(span);
  }

  summaryBox.addEventListener("toggle", () => {
    if (summaryBox.open) {
      textElement.textContent = fullText;
    } else {
      textElement.innerHTML = "";
      textElement.appendChild(span);
    }
  });
});
