document.addEventListener("DOMContentLoaded", function () {
  const menuIcon = document.querySelector(".menu-icon");
  const navMenu = document.createElement("nav");

  navMenu.classList.add("slide-menu");
  navMenu.innerHTML = `
    <div style="margin-bottom: 2rem; font-size: 1.5rem;">
      <a href="#home" title="Home"><img src="home-icon.png" alt="Home" style="width: 24px; height: 24px;" /></a>
    </div>
    <ul>
      <li><a href="#news">News</a></li>
      <li><a href="#agriturismo">Agriturismo La Cerra</a></li>
      <li><a href="#sardinia">Sardinia</a></li>
      <li class="toggleable">
        <a href="#bouldering">Bouldering</a>
        <ul>
          <li class="toggleable">
            <a href="#lacerra">La Cerra</a>
            <ul>
              <li><a href="#beispielsektor">Beispielsektor</a></li>
            </ul>
          </li>
          <li><a href="#gallura">Gallura</a></li>
        </ul>
      </li>
      <li><a href="#faq">FAQ</a></li>
    </ul>

    <div class="login-block">
      <h3>Login</h3>
      <input type="text" id="user" name="user" placeholder="User" />
      <input type="password" id="password" name="password" placeholder="Password" />
      <button type="button">Log In</button>
    </div>

    <div class="language-switcher">
      <img src="img/flag_en.png" alt="EN" title="English" />
      <img src="img/flag_it.png" alt="IT" title="Italiano" />
      <img src="img/flag_de.png" alt="DE" title="Deutsch" />
    </div>
  `;


  // Menü ganz oben einfügen
  document.body.insertBefore(navMenu, document.body.firstChild);

  // Dropdown-Menüs ein-/ausklappen
  navMenu.querySelectorAll("li.toggleable > a").forEach(link => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const parentLi = this.parentElement;
      parentLi.classList.toggle("open");
    });
  });

  // Burger-Menü anzeigen/verstecken
  menuIcon.addEventListener("click", function () {
    navMenu.classList.toggle("open");
  });

  document.addEventListener("click", function (e) {
    if (!navMenu.contains(e.target) && !menuIcon.contains(e.target)) {
      navMenu.classList.remove("open");
    }
  });
});
