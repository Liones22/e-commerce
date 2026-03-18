(function () {
  function init() {
    const shell = document.querySelector('[data-filter-shell]');
    const panel = document.querySelector('[data-filter-panel]');
    const toggle = document.querySelector('[data-filter-toggle]');

    if (!shell || !panel || !toggle) return;

    const openPanel = () => panel.classList.add('is-open');
    const closePanel = () => panel.classList.remove('is-open');

    toggle.addEventListener('click', () => {
      panel.classList.toggle('is-open');
    });

    document.addEventListener('click', (event) => {
      if (!panel.contains(event.target) && !toggle.contains(event.target)) {
        closePanel();
      }
    });

    shell.querySelectorAll('input, select').forEach((input) => {
      input.addEventListener('focus', openPanel);
    });
  }

  window.JRBCatalogFilters = { init };
})();
