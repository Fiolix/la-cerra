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
  navMenu.innerHTML = `
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

// --- Auth-Status im Burger-Menü rendern ---
const loginBlock = navMenu.querySelector('.login-block');
const originalLoginHTML = loginBlock.innerHTML;

async function renderBurgerAuth() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    // Username aus profiles holen
    const { data: profileData } = await supabase
      .from('profiles').select('username').eq('user_id', user.id).single();
    const username = profileData?.username || (user.email?.split('@')[0]) || 'you';

    // Eingeloggt-Ansicht
    loginBlock.innerHTML = `
      <h3>Ciao, ${username}</h3>
      <p style="font-size:0.9rem; opacity:.85;">${user.email || ''}</p>
      <p><a href="#" data-page="profile" style="text-decoration: none; color: inherit;">Go to profile</a></p>
      <button id="logout-button" type="button">Log out</button>
    `;

    // SPA-Navigation für den Profil-Link
    loginBlock.querySelectorAll('a[data-page]').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const page = a.getAttribute('data-page');
        if (page) {
          document.dispatchEvent(new CustomEvent('loadPage', { detail: page }));
          navMenu.classList.remove('open');
        }
      });
    });

    // Logout
    loginBlock.querySelector('#logout-button')?.addEventListener('click', async () => {
      await supabase.auth.signOut();
    });

  } else {
    // Ausgeloggt-Ansicht wiederherstellen (Original-HTML)
    loginBlock.innerHTML = originalLoginHTML;

    // SPA-Navigation im wiederhergestellten HTML binden
    loginBlock.querySelectorAll('a[data-page]').forEach(link => {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        const page = this.getAttribute('data-page');
        if (page && page !== '#') {
          document.dispatchEvent(new CustomEvent('loadPage', { detail: page }));
        }
      });
    });

    // Login-Handler neu aktivieren (auth_handler.js)
    document.dispatchEvent(new CustomEvent('loginBlockReady'));
  }
}

// Initial prüfen
renderBurgerAuth();

// Bei Änderungen (SIGNED_IN, SIGNED_OUT, etc.) neu rendern
supabase.auth.onAuthStateChange((_event) => {
  renderBurgerAuth();
});


// Rechte "Map"-Kachel anlegen (zunächst versteckt)
const mapFab = document.createElement('div');
mapFab.className = 'map-fab';
mapFab.textContent = 'Map';
mapFab.setAttribute('aria-label', 'Back to map');
mapFab.setAttribute('title', 'Map');
mapFab.style.display = 'none';
document.querySelector('.hero')?.appendChild(mapFab);


// Menü-Hintergrund ermitteln und auf beide Kacheln übernehmen
const menuBg = getComputedStyle(navMenu).backgroundColor;
const menuIconEl = document.querySelector(".menu-icon"); // linke Kachel
if (menuBg) {
  if (menuIconEl) {
    menuIconEl.style.backgroundColor = menuBg;
    menuIconEl.style.color = '#fff';
  }
  if (mapFab) {
    mapFab.style.backgroundColor = menuBg;
    mapFab.style.color = '#fff';
  }
}


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

  navMenu.querySelectorAll("a[data-page]").forEach(link => {
    if (!link.dataset.bound) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        const page = this.getAttribute("data-page");
        if (page && page !== "#") {
          const event = new CustomEvent("loadPage", { detail: page });
          document.dispatchEvent(event);
        }
      });
      link.dataset.bound = "true"; // ✅ Markiere diesen Link als \"gebunden\"
    }
  });

  menuIcon.addEventListener("click", function () {
    navMenu.classList.toggle("open");
  });

  document.addEventListener("click", function (e) {
    if (!navMenu.contains(e.target) && !menuIcon.contains(e.target)) {
      navMenu.classList.remove("open");
    }
  });
// Hilfsfunktionen für die Map-Kachel
function findMapEl() {
  // Primär das Element mit data-map (sauber & eindeutig)
  return document.querySelector('[data-map]');
}
function isSectorPage() {
  // Merkmal für Sektorseiten: es gibt den Block-Dropdown oder die Blocks-Liste
  return !!(document.getElementById('block-select') || document.getElementById('boulder-blocks'));
}
function updateMapFabVisibility() {
  if (!mapFab) return;
  const sector = isSectorPage();
  const mapEl = findMapEl();
  if (!sector || !mapEl) {
    mapFab.style.display = 'none';
    return;
  }
  const rect = mapEl.getBoundingClientRect();
  const mapBottom = rect.bottom + window.scrollY;
  // Erst zeigen, wenn vollständig unter der Karte gescrollt wurde
  const threshold = 24; // 24px unter Kartenunterkante
  mapFab.style.display = (window.scrollY > mapBottom + threshold) ? 'block' : 'none';

}

// Beim Scrollen prüfen
window.addEventListener('scroll', updateMapFabVisibility, { passive: true });
updateMapFabVisibility(); // Initial prüfen, direkt nach Seitenaufbau

// Nach Inhaltswechsel (wenn Sektor-Seite geladen wurde) erneut prüfen
const contentRoot = document.getElementById('content');
if (contentRoot) {
  const mo = new MutationObserver(() => {
    // kurz warten, bis Bilder/Map-Container im Layout sind
    setTimeout(updateMapFabVisibility, 0);
  });
  mo.observe(contentRoot, { childList: true, subtree: true });
}

// Klick auf die Kachel: zur Karte scrollen
mapFab.addEventListener('click', () => {
  const mapEl = findMapEl();
  const y = mapEl ? (mapEl.getBoundingClientRect().top + window.scrollY - 8) : 0;
  window.scrollTo({ top: y, behavior: 'smooth' });
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
