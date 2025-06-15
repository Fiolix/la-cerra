document.addEventListener("DOMContentLoaded", function () {
  const menuIcon = document.querySelector(".menu-icon");
  const navMenu = document.createElement("nav");

  navMenu.classList.add("slide-menu");
  navMenu.innerHTML = `
    <div style="margin-bottom: 2rem; font-size: 1.5rem;">
      <a href="index.html" title="Home"><img src="img/home_icon.png" alt="Home" style="width: 24px; height: 24px;" /></a>
    </div>
    <ul>
      <li><a href="news.html" class="depth-1">News</a></li>
      <li><a href="agriturismo.html" class="depth-1">Agriturismo La Cerra</a></li>
      <li><a href="sardinia.html" class="depth-1">Sardinia</a></li>
      <li class="toggleable">
        <a href="bouldering.html" class="depth-1">Bouldering</a>
        <ul>
          <li class="toggleable">
            <a href="la-cerra.html" class="depth-2">La Cerra</a>
            <ul>
              <li><a href="beispielsektor.html" class="depth-3">Beispielsektor</a></li>
            </ul>
          </li>
          <li><a href="gallura.html" class="depth-2">Gallura</a></li>
        </ul>
      </li>
      <li><a href="faq.html" class="depth-1">FAQ</a></li>
    </ul>

    <div class="login-block">
      <input type="text" id="user" name="user" placeholder="User" />
      <input type="password" id="password" name="password" placeholder="Password" />
      <button type="button">Login</button>
    </div>

    <div class="language-switcher">
      <img src="img/flag_en.png" alt="EN" title="English" onclick="setLanguage('en')" />
      <img src="img/flag_it.png" alt="IT" title="Italiano" onclick="setLanguage('it')" />
      <img src="img/flag_de.png" alt="DE" title="Deutsch" onclick="setLanguage('de')" />
    </div>
  `;

  document.body.insertBefore(navMenu, document.body.firstChild);

  navMenu.querySelectorAll("li.toggleable > a").forEach(link => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const parentLi = this.parentElement;
      parentLi.classList.toggle("open");
      if (this.href) {
        window.location.href = this.href;
      }
    });
  });

  menuIcon.addEventListener("click", function () {
    navMenu.classList.toggle("open");
  });

  document.addEventListener("click", function (e) {
    if (!navMenu.contains(e.target) && !menuIcon.contains(e.target)) {
      navMenu.classList.remove("open");
    }
  });

  navMenu.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", function (e) {
      if (this.classList.contains("depth-3")) {
        navMenu.classList.remove("open");
      }
    });
  });
});

function setLanguage(lang) {
  alert('Sprache wechseln zu: ' + lang);
  // Hier kann später echte Sprachlogik ergänzt werden
}
