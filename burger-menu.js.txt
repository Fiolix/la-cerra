document.addEventListener("DOMContentLoaded", function () {
  const menuIcon = document.querySelector(".menu-icon");
  const navMenu = document.createElement("nav");

  navMenu.classList.add("slide-menu");
  navMenu.innerHTML = `
    <ul>
      <li><a href="#news">News</a></li>
      <li><a href="#about">About</a></li>
      <li><a href="#sektoren">Sectors</a></li>
      <li><a href="#login">Login</a></li>
      <li>
        <span class="flags">
          <img src="flag-en.png" alt="EN" title="English" />
          <img src="flag-it.png" alt="IT" title="Italiano" />
          <img src="flag-de.png" alt="DE" title="Deutsch" />
        </span>
      </li>
    </ul>
  `;

  document.body.appendChild(navMenu);

  menuIcon.addEventListener("click", function () {
    navMenu.classList.toggle("open");
  });

  document.addEventListener("click", function (e) {
    if (!navMenu.contains(e.target) && !menuIcon.contains(e.target)) {
      navMenu.classList.remove("open");
    }
  });
});
