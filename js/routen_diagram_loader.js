// routen_diagram_loader.js
import { createChart } from "https://cdn.jsdelivr.net/npm/chart.js";

export async function loadRoutenDiagramm(sektorName) {
  const diagramContainer = document.getElementById("routen-diagramm");
  if (!diagramContainer) return;

  console.log("📊 Lade Routen-Diagramm für:", sektorName);

  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm");
  const supabase = createClient(
    "https://ymeumqnmcumgqlffwwjb.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltZXVtcW5tY3VtZ3FsZmZ3d2piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTAyMTEsImV4cCI6MjA2NjYyNjIxMX0.wOCjVUegJsBS8t11yXkgrN-I41wJlOreJ3feUtVaMxs"
  );

  const { data: routes, error } = await supabase
    .from("routes")
    .select("schwierigkeit, block_id, blocks(name)")
    .eq("blocks.name", sektorName);

  if (error) {
    console.error("❌ Fehler beim Abrufen der Routen:", error);
    return;
  }

  const schwierigkeiten = ["2", "3", "4", "5", "6", "7", "8"];
  const anzahl = schwierigkeiten.map(schw =>
    routes.filter(r => r.schwierigkeit.startsWith(schw)).length
  );

  const canvas = document.createElement("canvas");
  diagramContainer.innerHTML = "";
  diagramContainer.appendChild(canvas);

  new Chart(canvas, {
    type: "bar",
    data: {
      labels: schwierigkeiten.map(s => `Fb ${s}`),
      datasets: [{
        label: "Routen nach Schwierigkeit",
        data: anzahl,
        backgroundColor: "#888"
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });
}
