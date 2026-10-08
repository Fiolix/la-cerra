import { applySectorVisibility } from './sector_visibility.js?v=20261008-mobile-prototype-1';

function menuItemIcon(name) {
  const paths = {
    home: '<path d="M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    news: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>',
    bouldering: '<path d="m3 19 6-11 3 5 3-8 6 14z"/><path d="m8 19 4-6 3 6"/>',
    sardinia: '<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z"/><path d="M3.5 12h17M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3Z"/>',
    guide: '<path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
    stay: '<path d="M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M8 20v-6h8v6"/>',
    guestbook: '<path d="M4 4h16v12H9l-5 4z"/><path d="M8 8h8M8 12h5"/>'
  };
  return `<svg class="menu-item-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.guide}</svg>`;
}

document.addEventListener("DOMContentLoaded", function () {
  // ✅ Menü existiert schon? → nicht erneut einfügen
  if (document.querySelector("nav.slide-menu")) return;

  const menuIcon = document.querySelector(".menu-icon");
  const navMenu = document.createElement("nav");

  navMenu.classList.add("slide-menu");
  navMenu.id = "slide-menu";
  navMenu.innerHTML = `
    <div class="menu-heading">
      <a href="#" class="menu-brand" data-page="start" title="Home">
        <span>BOULDERING</span>
        <strong>LA CERRA</strong>
      </a>
      <button class="menu-close" type="button" aria-label="Close menu">×</button>
    </div>
    <ul class="menu-primary-list">
      <li><a href="#" data-page="start">${menuItemIcon('home')}<span>Home</span></a></li>
      <li><a href="#" data-page="news">${menuItemIcon('news')}<span>News</span></a></li>
      <li class="toggleable">
        <a href="#" data-page="bouldering">${menuItemIcon('bouldering')}<span>Bouldering</span><span class="menu-toggle-mark" aria-hidden="true">⌄</span></a>
        <ul>
          <li class="toggleable">
            <a href="#" data-page="la_cerra"><span>La Cerra</span><span class="menu-toggle-mark" aria-hidden="true">⌄</span></a>
            <ul>
              <li data-sector-slug="somewhere"><a href="#" data-page="somewhere">Somewhere</a></li>
              <li data-sector-slug="la_sportiva"><a href="#" data-page="la_sportiva">La Sportiva</a></li>
              <li data-sector-slug="sushi-free"><a href="#" data-page="sushi_free">Sushi-Free</a></li>
              <li data-sector-slug="bermuda_triangle"><a href="#" data-page="bermuda_triangle">Bermuda Triangle</a></li>
              <li data-sector-slug="second_life"><a href="#" data-page="second_life">2nd Life</a></li>
              <li data-sector-slug="stuntblocs"><a href="#" data-page="stuntblocs">Stuntblocs</a></li>
              <li data-sector-slug="jumble"><a href="#" data-page="jumble">Jumble</a></li>
              <li data-sector-slug="bloc_meadow"><a href="#" data-page="bloc_meadow">Bloc Meadow</a></li>
              <li data-sector-slug="monte_lu_bagnu"><a href="#" data-page="monte_lu_bagnu">Monte Lu Bagnu</a></li>
              <li data-sector-slug="monte_pulchiana"><a href="#" data-page="monte_pulchiana">Monte Pulchiana</a></li>
            </ul>
          </li>
          <li><a href="#" data-page="gallura">Gallura</a></li>
        </ul>
      </li>
      <li><a href="#" data-page="sardinia">${menuItemIcon('sardinia')}<span>Sardinia</span></a></li>
      <li><a href="#" data-page="before_you_go">${menuItemIcon('guide')}<span>Before You Go</span></a></li>
      <li><a href="https://agriturismolacerra.it" target="_blank" rel="noopener noreferrer">${menuItemIcon('stay')}<span>Agriturismo</span></a></li>
      <li><a href="#" data-page="guestbook">${menuItemIcon('guestbook')}<span>Guestbook</span></a></li>
    </ul>

    <div class="login-block">
      <h3>Account</h3>
      <p class="account-loading" role="status">Checking login…</p>
    </div>

    <div class="language-switcher">
      <img src="img/flag_en.png" alt="EN" title="English" onclick="setLanguage('en')" />
      <img src="img/flag_it.png" alt="IT" title="Italiano" onclick="setLanguage('it')" />
      <img src="img/flag_de.png" alt="DE" title="Deutsch" onclick="setLanguage('de')" />
    </div>
    <div class="menu-utility-links">
      <a href="#">Contact</a>
      <a href="#">Imprint</a>
      <a href="#" data-page="admin">Admin</a>
    </div>
  `;

  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'menu-backdrop';
  backdrop.setAttribute('aria-label', 'Close menu');
  document.body.insertBefore(backdrop, document.body.firstChild);
  document.body.insertBefore(navMenu, document.body.firstChild);
  applySectorVisibility(navMenu);
  const menuClose = navMenu.querySelector(".menu-close");

  document.dispatchEvent(new CustomEvent("loginBlockReady"));

  navMenu.querySelectorAll("li.toggleable > a").forEach(link => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const parentLi = this.parentElement;
      parentLi.classList.toggle("open");
    });
  });

  function setMenuOpen(open) {
    navMenu.classList.toggle("open", open);
    menuIcon.setAttribute("aria-expanded", String(open));
    menuIcon.classList.toggle("is-hidden", open);
    menuIcon.setAttribute("aria-hidden", String(open));
    menuIcon.tabIndex = open ? -1 : 0;
    backdrop.classList.toggle('is-visible', open);
    document.body.classList.toggle('menu-is-open', open);
  }

  navMenu.querySelectorAll("a[data-page]").forEach(link => {
    link.addEventListener("click", () => {
      const parentItem = link.closest("li");
      if (!parentItem?.classList.contains("toggleable")) {
        setMenuOpen(false);
      }
    });
  });

  menuIcon.addEventListener("click", function () {
    setMenuOpen(!navMenu.classList.contains("open"));
  });

  menuClose?.addEventListener("click", function () {
    setMenuOpen(false);
    menuIcon.focus();
  });

  backdrop.addEventListener('click', () => {
    setMenuOpen(false);
    menuIcon.focus();
  });

  document.addEventListener("openLoginMenu", function () {
    setMenuOpen(true);
    window.setTimeout(() => document.getElementById("user")?.focus(), 320);
  });

  document.addEventListener("closeBurgerMenu", function () {
    setMenuOpen(false);
  });

  document.addEventListener("click", function (e) {
    if (!navMenu.contains(e.target) && !menuIcon.contains(e.target)) {
      setMenuOpen(false);
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && navMenu.classList.contains("open")) {
      setMenuOpen(false);
      menuIcon.focus();
    }
  });
});

function setLanguage(lang) {
  alert('Sprache wechseln zu: ' + lang);
}

import { initAuth } from './auth_handler.js?v=20261008-mobile-prototype-1';

document.addEventListener("loginBlockReady", () => {
  initAuth();
});
