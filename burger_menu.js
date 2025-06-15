document.addEventListener("DOMContentLoaded", function () {
  const menuIcon = document.querySelector(".menu-icon");
  const navMenu = document.createElement("nav");

  navMenu.classList.add("slide-menu");
  navMenu.innerHTML = `
    <div style="margin-bottom: 2rem; font-size: 1.5rem;">
      <a href="#home" title="Home">🏠</a>
    </div>
    <ul>
      <li><a href="#news">News</a></li>
      <li><a href="#agriturismo">Agriturismo La Cerra</a></li>
      <li><a href="#sardinia">Sardinia</a></li>
      <li>
        <a href="#bouldering">Bouldering</a>
        <ul>
          <li><a href="#lacerra">La Cerra</a></li>
          <li><a href="#beispielsektor">Beispielsektor</a></li>
          <li><a href="#gallura">Gallura</a></li>
        </ul>
      </li>
      <li><a href="#faq">FAQ</a></li>
    </ul>

    <div class="login-block">
      <h3>Login</h3>
      <label for="user">User:</label>
      <input type="text" id="user" name="user" />
      <label for="password">Password:</label>
      <input type="password" id="password" name="password" />
      <button type="button">Log In</button>
    </div>

    <div class="flags">
      <img src="flag-en.png" alt="EN" title="English" />
      <img src="flag-it.png" alt="IT" title="Italiano" />
      <img src="flag-de.png" alt="DE" title="Deutsch" />
    </div>
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
