import { supabase } from './supabase.js';

supabase.auth.getUser().then(({ data }) => {
  console.log("👤 Eingeloggt als:", data?.user?.email);
});

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
            </ul>
          </li>
          <li><a href="#" data-page="gallura">Gallura</a></li>
        </ul>
      </li>
      <li><a href="#" data-page="faq">FAQ</a></li>
    </ul>

    <div class="login-block">
      <h3>Login</h3>
      <input type="text" id="user" name="user" placeholder="User" />
      <input type="password" id="password" name="password" placeholder="Password" />
      <button id="login-button" type="button">Log In</button>
<p><a href="#" data-page="register" style="text-decoration: none; color: inherit; font-size: 0.9rem;">New here? Create an account</a></p>
    </div>

    <div class="language-switcher">
      <img src="img/flag_en.png" alt="EN" title="English" onclick="setLanguage('en')" />
      <img src="img/flag_it.png" alt="IT" title="Italiano" onclick="setLanguage('it')" />
      <img src="img/flag_de.png" alt="DE" title="Deutsch" onclick="setLanguage('de')" />
    </div>
  `;

  document.body.insertBefore(navMenu, document.body.firstChild);
  const menuClose = navMenu.querySelector(".menu-close");

  // Neues Event feuern, wenn Login-Elemente vorhanden sind
  const checkLoginBlockReady = setInterval(() => {
    if (
      document.getElementById("user") &&
      document.getElementById("password") &&
      document.getElementById("login-button")
    ) {
      document.dispatchEvent(new CustomEvent("loginBlockReady"));
      clearInterval(checkLoginBlockReady);
    }
  }, 50);

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

import { initAuth } from './auth_handler.js';

document.addEventListener("loginBlockReady", () => {
console.log("📡 loginBlockReady ausgelöst – auth_handler.js sollte jetzt starten");

  initAuth();
});

supabase.auth.getSession().then(({ data }) => {
  console.log("✅ Session beim Start (burger_menu.js):", data?.session);
});
