import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";
import ChartDataLabels from "https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels/+esm";

Chart.register(ChartDataLabels); // Plugin registrieren

export async function loadRoutenDiagramm(sektorName) {
  const diagramContainer = document.getElementById("routen-diagramm");
  if (!diagramContainer) {
    console.warn("⚠️ Kein Diagramm-Container auf dieser Seite vorhanden.");
    return;
  }

  console.log("📊 Lade Routen-Diagramm für:", sektorName);

  const supabase = createClient(
    "https://ymeumqnmcumgqlffwwjb.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltZXVtcW5tY3VtZ3FsZmZ3d2piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTAyMTEsImV4cCI6MjA2NjYyNjIxMX0.wOCjVUegJsBS8t11yXkgrN-I41wJlOreJ3feUtVaMxs"
  );

  const { data: sektorBlocks, error: blockError } = await supabase
    .from("blocks")
    .select("id")
    .eq("sektor", sektorName);

  if (blockError || !sektorBlocks || sektorBlocks.length === 0) {
    console.error("❌ Fehler beim Laden des Blocks:", blockError);
    return;
  }

  const blockIds = sektorBlocks.map(b => b.id);

  const { data: routes, error: routeError } = await supabase
    .from("routes")
    .select("grad")
    .in("block_id", blockIds);

  if (routeError || !routes || routes.length === 0) {
    console.warn("⚠️ Keine Routen gefunden für", sektorName);
    return;
  }

  const schwierigkeiten = ["2", "3", "4", "5", "6", "7", "8"];
  const anzahl = schwierigkeiten.map(schw =>
    routes.filter(r => r.grad?.startsWith(schw)).length
  );

  const canvas = document.createElement("canvas");
  canvas.style.height = "100%";
  diagramContainer.innerHTML = "";
  diagramContainer.appendChild(canvas);
  canvas.parentElement.style.minHeight = "100px";

  setTimeout(() => {
    const chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: schwierigkeiten.map(s => `Fb ${s}`),
        datasets: [{
          label: "Routes",
          data: anzahl,
          backgroundColor: "#384e4d"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 30 }
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
          datalabels: {
            display: true,
            align: 'end',
            anchor: 'start',
            offset: -26,
            color: 'white',
            font: { weight: 'bold', size: 14 },
            clamp: false,
            clip: false,
            formatter: value => value > 0 ? value : ''
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            display: false,
            grid: { display: false },
            suggestedMax: Math.max(...anzahl) + 2
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 14 } }
          }
        }
      },
      plugins: [ChartDataLabels]
    });

    console.log("📐 Canvas-Höhe nach Initialisierung:", canvas.offsetHeight, canvas.clientHeight);
  }, 50);
}
