/* ═══════════════════════════════════════════════
   AYALYM — Theme Toggle (dark ↔ light)
   Shared by landing.html and index.html
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  var KEY = 'ayalym-theme';

  function getTheme() {
    return localStorage.getItem(KEY) || 'dark';
  }

  function applyTheme(theme, save) {
    var html = document.documentElement;

    /* Toggle class on <html> for CSS targeting */
    if (theme === 'light') {
      html.classList.add('light-mode');
      html.classList.remove('dark-mode');
    } else {
      html.classList.add('dark-mode');
      html.classList.remove('light-mode');
    }

    /* App: enable/disable dark.css */
    var darkLink = document.getElementById('dark-css-link');
    if (darkLink) darkLink.disabled = (theme === 'light');

    /* Update every toggle button on the page */
    var btns = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < btns.length; i++) {
      var btn  = btns[i];
      var icon = btn.querySelector('.tt-icon');
      var lbl  = btn.querySelector('.tt-label');
      if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
      if (lbl)  lbl.textContent  = theme === 'dark' ? 'Claro' : 'Oscuro';
      btn.setAttribute('title',
        theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
      btn.setAttribute('aria-label',
        theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    }

    if (save !== false) localStorage.setItem(KEY, theme);
  }

  /* Public toggle function called by onclick */
  window.toggleTheme = function () {
    applyTheme(getTheme() === 'dark' ? 'light' : 'dark', true);
  };

  /* Apply on DOMContentLoaded (buttons are now in the DOM) */
  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(getTheme(), false);
  });
})();
