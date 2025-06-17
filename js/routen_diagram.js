// Dummy-Daten für das Balkendiagramm
const routeCounts = {
  2: 3,
  3: 4,
  4: 5,
  5: 4,
  6: 3,
  7: 4,
  8: 2
};

const totalRoutes = Object.values(routeCounts).reduce((a, b) => a + b, 0);

const container = document.createElement("section");
container.className = "routen-diagram";

const title = document.createElement("h3");
title.textContent = `${totalRoutes} Problems`;
container.appendChild(title);

const chart = document.createElement("div");
chart.className = "chart";

Object.entries(routeCounts).forEach(([grade, count]) => {
  const bar = document.createElement("div");
  bar.className = "bar";

  const label = document.createElement("div");
  label.className = "bar-label";
  label.textContent = grade;

  const value = document.createElement("div");
  value.className = "bar-value";
  value.style.height = `${count * 10 + 20}px`;
  value.textContent = count;

  bar.appendChild(value);
  bar.appendChild(label);
  chart.appendChild(bar);
});

container.appendChild(chart);

document.querySelector(".map").before(container);
