import { supabase } from './supabase.js';
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
  canvas.style.maxHeight = "100px";
  diagramContainer.innerHTML = "";
  diagramContainer.appendChild(canvas);
  diagramContainer.style.height = "100px";
  diagramContainer.style.padding = "0";

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
          padding: 0
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
          datalabels: {
            display: true,
            align: 'end',
            anchor: 'start',
            offset: 0,
            color: '#384e4d',
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
