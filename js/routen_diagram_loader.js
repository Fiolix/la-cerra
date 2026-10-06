import { supabase } from './supabase.js';
import { isProjectGrade } from './route_rules.js?v=20260913-bermuda-1';
import { getPersonalProjectRouteIds } from './route_projects.js?v=20261006-projects-1';
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";
import ChartDataLabels from "https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels/+esm";

Chart.register(ChartDataLabels); // Plugin registrieren

function showDiagramError(container, message, retry) {
  container.style.height = '';
  container.style.padding = '';
  container.innerHTML = `
    <div class="data-load-message compact" role="alert">
      <p>${message}</p>
      <button type="button" class="text-link small as-link" data-diagram-retry>Try again</button>
    </div>
  `;
  container.querySelector('[data-diagram-retry]')?.addEventListener('click', retry);
}

function createSectorStats(stats) {
  const row = document.createElement('div');
  row.className = 'sector-route-counts';

  const items = [
    ['Routes', stats.routes],
    ['Open projects', stats.openProjects]
  ];

  if (stats.personal) {
    items.push(
      ['Climbed', stats.personal.climbed === '—' ? '—' : `${stats.personal.climbed} / ${stats.routes}`],
      ['My projects', stats.personal.projectsUnavailable ? '—' : stats.personal.projects]
    );
  }

  items.forEach(([label, value]) => {
    const card = document.createElement('div');
    card.className = 'sector-route-count';
    const number = document.createElement('strong');
    number.textContent = String(value);
    const caption = document.createElement('span');
    caption.textContent = label;
    card.append(number, caption);
    row.appendChild(card);
  });

  return row;
}

async function loadSectorPersonalStats(routes) {
  let sessionResult;
  try {
    sessionResult = await supabase.auth.getSession();
  } catch (error) {
    console.error('Sector session could not be loaded:', error);
    return null;
  }

  const userId = sessionResult.data?.session?.user?.id;
  if (sessionResult.error || !userId) return null;

  const routeIds = routes.map(route => route.uuid).filter(Boolean);
  if (routeIds.length === 0) {
    return { climbed: 0, projects: 0, projectsUnavailable: false };
  }

  const [tickResult, projectResult] = await Promise.all([
    supabase
      .from('ticklist')
      .select('route_id')
      .eq('user_id', userId)
      .in('route_id', routeIds),
    getPersonalProjectRouteIds(userId)
  ]);

  if (tickResult.error) {
    console.error('Sector climbed statistics could not be loaded:', tickResult.error);
  }
  if (projectResult.error && !projectResult.unavailable) {
    console.error('Sector project statistics could not be loaded:', projectResult.error);
  }

  const gradedRouteIds = new Set(
    routes.filter(route => !isProjectGrade(route.grad)).map(route => route.uuid)
  );

  return {
    climbed: tickResult.error
      ? '—'
      : new Set((tickResult.data || []).map(entry => entry.route_id).filter(id => gradedRouteIds.has(id))).size,
    projects: Array.from(projectResult.ids).filter(id => routeIds.includes(id)).length,
    projectsUnavailable: projectResult.unavailable
  };
}

function renderRouteDiagram(diagramContainer, routes, { sectorStats = null } = {}) {
  const schwierigkeiten = ["2", "3", "4", "5", "6", "7", "8"];
  const anzahl = schwierigkeiten.map(schw =>
    routes.filter(route => route.grad?.startsWith(schw)).length
  );

  const canvas = document.createElement("canvas");
  const chartFrame = document.createElement('div');
  chartFrame.className = 'route-chart-frame';
  const axisPrefix = document.createElement("span");
  axisPrefix.className = "diagram-axis-prefix";
  axisPrefix.textContent = "Fb";
  axisPrefix.setAttribute("aria-hidden", "true");
  diagramContainer.innerHTML = "";
  diagramContainer.style.height = '';
  diagramContainer.style.padding = '';
  diagramContainer.classList.add('has-route-chart');
  if (sectorStats) diagramContainer.appendChild(createSectorStats(sectorStats));
  chartFrame.append(axisPrefix, canvas);
  diagramContainer.appendChild(chartFrame);

  const maximum = Math.max(...anzahl, 0);
  const headroom = Math.max(2, Math.ceil(maximum * 0.22));

  window.setTimeout(() => {
    new Chart(canvas, {
      type: "bar",
      data: {
        labels: schwierigkeiten,
        datasets: [{
          label: "Routes",
          data: anzahl,
          backgroundColor: "#384e4d",
          borderRadius: 7,
          borderSkipped: "bottom",
          barPercentage: 0.62,
          categoryPercentage: 0.76,
          maxBarThickness: 34
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 30, right: 10, bottom: 0, left: 18 } },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
          datalabels: {
            display: true,
            align: 'end',
            anchor: 'start',
            offset: 2,
            color: '#384e4d',
            font: { weight: '600', size: 13 },
            clamp: true,
            clip: true,
            formatter: value => value > 0 ? value : ''
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            display: false,
            grid: { display: false },
            suggestedMax: maximum + headroom
          },
          x: {
            grid: { display: false },
            border: { display: true, color: '#d8dfdd', width: 1 },
            ticks: {
              color: "#666",
              padding: 7,
              font: { family: "Arial", size: 13, weight: "normal" }
            }
          }
        }
      },
      plugins: [ChartDataLabels]
    });
  }, 50);
}

export async function loadRoutenDiagramm(sektorName) {
  const diagramContainer = document.getElementById("routen-diagramm");
  if (!diagramContainer) {
    console.warn("⚠️ Kein Diagramm-Container auf dieser Seite vorhanden.");
    return;
  }

  console.log("📊 Lade Routen-Diagramm für:", sektorName);

  diagramContainer.innerHTML = '<p class="data-loading" role="status">Loading route statistics…</p>';

  let blockResult;
  try {
    blockResult = await supabase
      .from("blocks")
      .select("id")
      .eq("sektor", sektorName);
  } catch (error) {
    console.error("❌ Fehler beim Laden des Blocks:", error);
    showDiagramError(diagramContainer, 'Route statistics could not be loaded.', () => loadRoutenDiagramm(sektorName));
    return;
  }

  const { data: sektorBlocks, error: blockError } = blockResult;

  if (blockError) {
    console.error("❌ Fehler beim Laden des Blocks:", blockError);
    showDiagramError(diagramContainer, 'Route statistics could not be loaded.', () => loadRoutenDiagramm(sektorName));
    return;
  }

  if (!sektorBlocks || sektorBlocks.length === 0) {
    diagramContainer.textContent = "No route statistics are available for this sector.";
    return;
  }

  const blockIds = sektorBlocks.map(b => b.id);

  let routeResult;
  try {
    routeResult = await supabase
      .from("routes")
      .select("uuid, grad")
      .in("block_id", blockIds)
      .is("archived_at", null);
  } catch (error) {
    console.error("❌ Fehler beim Laden der Routen:", error);
    showDiagramError(diagramContainer, 'Route statistics could not be loaded.', () => loadRoutenDiagramm(sektorName));
    return;
  }

  const { data: routes, error: routeError } = routeResult;

  if (routeError) {
    console.error("❌ Fehler beim Laden der Routen:", routeError);
    showDiagramError(diagramContainer, 'Route statistics could not be loaded.', () => loadRoutenDiagramm(sektorName));
    return;
  }

  if (!routes || routes.length === 0) {
    console.warn("⚠️ Keine Routen gefunden für", sektorName);
    diagramContainer.textContent = "No route statistics are available for this sector.";
    return;
  }

  const gradedRoutes = routes.filter(route => !isProjectGrade(route.grad));
  const personal = await loadSectorPersonalStats(routes);
  renderRouteDiagram(diagramContainer, gradedRoutes, {
    sectorStats: {
      routes: gradedRoutes.length,
      openProjects: routes.length - gradedRoutes.length,
      personal
    }
  });
}

export async function loadLaCerraDiagramm() {
  const overview = document.querySelector('.la-cerra-route-overview');
  const diagramContainer = document.getElementById('la-cerra-routen-diagramm');
  if (!overview || !diagramContainer) return;

  const sectors = String(overview.dataset.sectors || '')
    .split(',')
    .map(sector => sector.trim())
    .filter(Boolean);
  const sectorCount = overview.querySelector('[data-sector-count]');
  const routeCount = overview.querySelector('[data-route-count]');
  const projectCount = overview.querySelector('[data-project-count]');

  sectorCount.textContent = String(sectors.length);
  routeCount.textContent = '…';
  projectCount.textContent = '…';
  diagramContainer.innerHTML = '<p class="data-loading" role="status">Loading route statistics…</p>';

  let blockResult;
  try {
    blockResult = await supabase
      .from('blocks')
      .select('id')
      .in('sektor', sectors);
  } catch (error) {
    console.error('La Cerra block statistics request failed:', error);
    routeCount.textContent = '—';
    projectCount.textContent = '—';
    showDiagramError(diagramContainer, 'Route statistics could not be loaded.', loadLaCerraDiagramm);
    return;
  }

  const { data: blocks, error: blockError } = blockResult;
  if (blockError) {
    console.error('La Cerra block statistics could not be loaded:', blockError);
    routeCount.textContent = '—';
    projectCount.textContent = '—';
    showDiagramError(diagramContainer, 'Route statistics could not be loaded.', loadLaCerraDiagramm);
    return;
  }

  if (!blocks?.length) {
    routeCount.textContent = '0';
    projectCount.textContent = '0';
    diagramContainer.textContent = 'No route statistics are available yet.';
    return;
  }

  let routeResult;
  try {
    routeResult = await supabase
      .from('routes')
      .select('grad')
      .in('block_id', blocks.map(block => block.id))
      .is('archived_at', null);
  } catch (error) {
    console.error('La Cerra route statistics request failed:', error);
    routeCount.textContent = '—';
    projectCount.textContent = '—';
    showDiagramError(diagramContainer, 'Route statistics could not be loaded.', loadLaCerraDiagramm);
    return;
  }

  const { data: routes, error: routeError } = routeResult;
  if (routeError) {
    console.error('La Cerra route statistics could not be loaded:', routeError);
    routeCount.textContent = '—';
    projectCount.textContent = '—';
    showDiagramError(diagramContainer, 'Route statistics could not be loaded.', loadLaCerraDiagramm);
    return;
  }

  const gradedRoutes = (routes || []).filter(route => !isProjectGrade(route.grad));
  const projects = (routes || []).filter(route => isProjectGrade(route.grad));
  routeCount.textContent = String(gradedRoutes.length);
  projectCount.textContent = String(projects.length);
  renderRouteDiagram(diagramContainer, gradedRoutes);
}
