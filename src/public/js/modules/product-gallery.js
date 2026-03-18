(function () {
  function init() {
    const gallery = document.querySelector('[data-product-gallery]');
    if (!gallery) return;

    const stage = gallery.querySelector('[data-product-gallery-stage]');
    const thumbs = gallery.querySelectorAll('[data-product-gallery-thumb]');
    const info = stage ? stage.querySelector('.product-gallery__info') : null;

    thumbs.forEach((thumb) => {
      thumb.addEventListener('click', () => {
        thumbs.forEach((item) => item.classList.remove('is-active'));
        thumb.classList.add('is-active');

        if (stage && thumb.dataset.galleryBg) {
          stage.style.background = thumb.dataset.galleryBg;
        }

        const title = thumb.dataset.galleryTitle || '';
        const subtitle = thumb.dataset.gallerySubtitle || '';
        const price = thumb.dataset.galleryPrice || '';
        const stock = thumb.dataset.galleryStock || '';

        if (info) {
          info.innerHTML = `<strong>${title}</strong><span>${subtitle} · ${price} · ${stock}</span>`;
        }
      });
    });
  }

  window.JRBProductGallery = { init };
})();
