document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ summary_toggle.js wurde geladen");

  // Warte bis das Element im DOM sichtbar ist (für dynamisches Nachladen über content_loader)
  const waitForElement = (selector, timeout = 2000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const check = () => {
        const element = document.querySelector(selector);
        if (element) {
          return resolve(element);
        }
        if (Date.now() - startTime > timeout) {
          return reject("❌ Element nicht gefunden: " + selector);
        }
        requestAnimationFrame(check);
      };
      check();
    });
  };

  waitForElement(".sector-summary").then(summaryBox => {
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
  }).catch(err => console.log(err));
});
