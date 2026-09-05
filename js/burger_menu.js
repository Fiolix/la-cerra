document.addEventListener("DOMContentLoaded", function () {
  // ✅ Menü existiert schon? → nicht erneut einfügen
  if (document.querySelector("nav.slide-menu")) return;

  const menuIcon = document.querySelector(".menu-icon");
  const navMenu = document.createElement("nav");

  navMenu.classList.add("slide-menu");
  navMenu.id = "slide-menu";
  navMenu.innerHTML = `
    <button class="menu-close" type="button" aria-label="Close menu">×</button>
    <div class="home-icon-wrapper">
      <a href="#" data-page="start" title="Home"><img src="img/home_icon.png" alt="Home" style="width: 48px; height: 48px;" /></a>
    </div>
    <ul>
      <li><a href="#" data-page="news">News</a></li>
      <li><a href="#" data-page="agriturismo">Agriturismo La Cerra</a></li>
      <li><a href="#" data-page="sardinia">Sardinia</a></li>
      <li class="toggleable">
        <a href="#" data-page="bouldering">Bouldering</a>
        <ul>
          <li class="toggleable">
            <a href="#" data-page="la_cerra">La Cerra</a>
            <ul>
              <li><a href="#" data-page="somewhere">Somewhere</a></li>
              <li><a href="#" data-page="la_sportiva">La Sportiva</a></li>
              <li><a href="#" data-page="sushi_free">Sushi-Free</a></li>
              <li><a href="#" data-page="bermuda_triangle">Bermuda Triangle</a></li>
              <li><a href="#" data-page="second_life">2nd Life</a></li>
              <li><a href="#" data-page="stuntblocs">Stuntblocs</a></li>
              <li><a href="#" data-page="monte_lu_bagnu">Monte Lu Bagnu</a></li>
              <li><a href="#" data-page="monte_pulchiana">Monte Pulchiana</a></li>
            </ul>
          </li>
          <li><a href="#" data-page="gallura">Gallura</a></li>
        </ul>
      </li>
      <li><a href="#" data-page="faq">FAQ</a></li>
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
  `;

  document.body.insertBefore(navMenu, document.body.firstChild);
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

import { initAuth } from './auth_handler.js?v=20260905-stability-1';

document.addEventListener("loginBlockReady", () => {
  initAuth();
});
