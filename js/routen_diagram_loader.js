import ChartDataLabels from "https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels/+esm";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";

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

  // 1. Sektor-ID ermitteln
  const { data: sektorBlocks, error: blockError } = await supabase
    .from("blocks")
    .select("id")
    .eq("sektor", sektorName);

  console.log("📦 Block-Daten:", sektorBlocks);

  if (blockError || !sektorBlocks || sektorBlocks.length === 0) {
    console.error("❌ Fehler beim Laden des Blocks:", blockError);
    return;
  }

  const blockIds = sektorBlocks.map(b => b.id);

  // 2. Routen für alle Blöcke dieses Sektors laden
  const { data: routes, error: routeError } = await supabase
    .from("routes")
    .select("grad")
    .in("block_id", blockIds);

  console.log("📦 Routen-Daten:", routes);

  if (routeError || !routes || routes.length === 0) {
    console.warn("⚠️ Keine Routen gefunden für", sektorName);
    return;
  }

  // 3. Zähle Anzahl der Routen pro Schwierigkeit
  const schwierigkeiten = ["2", "3", "4", "5", "6", "7", "8"];
  const anzahl = schwierigkeiten.map(schw =>
    routes.filter(r => r.grad?.startsWith(schw)).length
  );

  console.log("📊 Schwierigkeit Zählung:", anzahl);

  // 4. Diagramm erzeugen
  const canvas = document.createElement("canvas");
  diagramContainer.innerHTML = "";
  diagramContainer.appendChild(canvas);

  new Chart(canvas, {
  type: "bar",
  data: {
    labels: schwierigkeiten.map(s => `Fb ${s}`),
    datasets: [{
      label: "Routenanzahl",
      data: anzahl,
      backgroundColor: "#384e4d", // Grünton der Seite
    }]
  },
  options: {
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
      datalabels: {
        anchor: 'end',
        align: 'start',
        color: 'white',
        font: {
          weight: 'bold'
        },
        formatter: Math.round
      }
    },
    scales: {
      y: {
        display: false,     // Y-Achse ausblenden
        grid: { display: false }  // Gitternetz entfernen
      },
      x: {
        grid: { display: false }  // X-Gitternetz auch entfernen
      }
    }
  },
  plugins: [ChartDataLabels] // WICHTIG: Datalabels-Plugin einbinden
});

