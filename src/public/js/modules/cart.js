(function () {
  const STORAGE_KEY = 'jrb-visual-cart';

  function readCart() {
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (_error) {
      return [];
    }
  }

  function writeCart(items) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function formatTotal(value) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  function getCount(items) {
    return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }

  function getTotal(items) {
    return items.reduce((sum, item) => sum + (Number(item.priceValue || 0) * (item.quantity || 0)), 0);
  }

  function renderDrawer() {
    const drawer = document.querySelector('[data-cart-drawer]');
    if (!drawer) return;

    const summary = drawer.querySelector('[data-cart-summary]');
    const itemsWrap = drawer.querySelector('[data-cart-items]');
    const total = drawer.querySelector('[data-cart-total]');
    const countNodes = document.querySelectorAll('[data-cart-count]');
    const items = readCart();

    countNodes.forEach((node) => {
      node.textContent = String(getCount(items));
    });

    if (summary) summary.textContent = `${getCount(items)} articulos`;
    if (total) total.textContent = formatTotal(getTotal(items));

    if (!items.length) {
      itemsWrap.innerHTML = '<div class="cart-empty">Agrega productos para ver tu carrito visual.</div>';
      return;
    }

    itemsWrap.innerHTML = items.map((item, index) => `
      <article class="cart-item" data-cart-item-index="${index}">
        <div>
          <strong>${item.name}</strong>
          <p>${item.categoryLabel || ''}</p>
          <small>${item.sizeLabel || ''}</small>
        </div>
        <div class="cart-item__meta">
          <span>${item.priceLabel || '$0'}</span>
          <div class="cart-item__actions">
            <button type="button" data-cart-decrease aria-label="Disminuir">-</button>
            <strong>${item.quantity}</strong>
            <button type="button" data-cart-increase aria-label="Aumentar">+</button>
          </div>
        </div>
        <div class="cart-item__meta">
          <small>${item.quantity} x ${item.priceLabel || '$0'}</small>
          <button type="button" data-cart-remove class="text-link">Eliminar</button>
        </div>
      </article>
    `).join('');
  }

  function openDrawer() {
    const drawer = document.querySelector('[data-cart-drawer]');
    const toggle = document.querySelector('[data-cart-toggle]');
    if (!drawer) return;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
  }

  function closeDrawer() {
    const drawer = document.querySelector('[data-cart-drawer]');
    const toggle = document.querySelector('[data-cart-toggle]');
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function addItemFromDataset(raw) {
    if (!raw) return;
    const payload = JSON.parse(decodeURIComponent(raw));
    const items = readCart();
    const existing = items.find((item) => item.id === payload.id);

    if (existing) {
      existing.quantity += 1;
    } else {
      items.push({
        id: payload.id,
        name: payload.name,
        categoryLabel: payload.categoryLabel,
        sizeLabel: payload.sizeLabel,
        priceLabel: payload.priceLabel,
        priceValue: Number(payload.priceValue || 0),
        quantity: 1
      });
    }

    writeCart(items);
    renderDrawer();
    openDrawer();
  }

  function wireActions() {
    document.addEventListener('click', (event) => {
      const addButton = event.target.closest('[data-cart-add]');
      if (addButton) {
        addItemFromDataset(addButton.dataset.product);
        return;
      }

      if (event.target.closest('[data-cart-toggle]')) {
        const drawer = document.querySelector('[data-cart-drawer]');
        if (drawer?.classList.contains('is-open')) {
          closeDrawer();
        } else {
          openDrawer();
        }
        return;
      }

      if (event.target.closest('[data-cart-close]')) {
        closeDrawer();
        return;
      }

      const itemNode = event.target.closest('[data-cart-item-index]');
      if (!itemNode) return;

      const index = Number(itemNode.dataset.cartItemIndex);
      const items = readCart();
      const item = items[index];
      if (!item) return;

      if (event.target.closest('[data-cart-increase]')) {
        item.quantity += 1;
      } else if (event.target.closest('[data-cart-decrease]')) {
        item.quantity = Math.max(1, item.quantity - 1);
      } else if (event.target.closest('[data-cart-remove]')) {
        items.splice(index, 1);
      }

      writeCart(items);
      renderDrawer();
    });
  }

  function init() {
    renderDrawer();
    wireActions();
    document.querySelectorAll('[data-cart-add]').forEach((button) => {
      button.setAttribute('type', 'button');
    });
  }

  window.JRBCart = {
    init,
    render: renderDrawer
  };
})();
