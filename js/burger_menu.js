document.addEventListener("DOMContentLoaded", function () {
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
});

function setLanguage(lang) {
  alert('Sprache wechseln zu: ' + lang);
}
