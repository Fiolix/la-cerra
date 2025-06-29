export async function setupSummaryToggle() {
  console.log("✅ summary_toggle.js geladen (als Modul)");

  const waitForElement = (selector, timeout = 2000) => {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        const element = document.querySelector(selector);
        if (element) return resolve(element);
        if (Date.now() - start > timeout) return reject("⏱️ Element nicht gefunden: " + selector);
        requestAnimationFrame(check);
      };
      check();
    });
  };

  try {
    const summaryBox = await waitForElement(".sector-summary");
    const textElement = summaryBox.querySelector(".summary-text");

    if (!textElement) {
      console.log("❌ .summary-text nicht gefunden");
      return;
    }

    console.log("✅ summaryBox und summary-text gefunden");
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
  } catch (err) {
    console.log(err);
  }
}

// wird NICHT automatisch aufgerufen
