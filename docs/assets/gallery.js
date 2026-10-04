// Screenshot strip arrows and a full-screen viewer for the DueRadar site.
// Without JavaScript, each screenshot is still a link to the large image.
(function () {
  const gallery = document.querySelector('.gallery');
  const dialog = document.querySelector('.lightbox');
  if (!gallery || !dialog || typeof dialog.showModal !== 'function') return;

  const track = gallery.querySelector('.gallery-track');
  const links = Array.from(track.querySelectorAll('.gallery-item'));
  const prev = gallery.querySelector('.gallery-prev');
  const next = gallery.querySelector('.gallery-next');
  const image = dialog.querySelector('.lightbox-image');
  const caption = dialog.querySelector('.lightbox-caption');
  let current = 0;

  // Strip: move one screenshot at a time, and hide an arrow at each end.
  const step = () => links[0].getBoundingClientRect().width + 12;
  const updateArrows = () => {
    prev.hidden = track.scrollLeft <= 4;
    next.hidden = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  };
  const scrollStrip = (direction) => {
    track.scrollBy({ left: direction * step() });
    // Scroll events don't always arrive for smooth scrolling, so check again once it settles.
    setTimeout(updateArrows, 500);
  };
  prev.addEventListener('click', () => scrollStrip(-1));
  next.addEventListener('click', () => scrollStrip(1));
  track.addEventListener('scroll', updateArrows, { passive: true });
  track.addEventListener('scrollend', updateArrows);
  window.addEventListener('resize', updateArrows);
  updateArrows();

  // Viewer
  const show = (index) => {
    current = (index + links.length) % links.length;
    const thumb = links[current].querySelector('img');
    image.src = links[current].href;
    image.alt = thumb.alt;
    caption.textContent = `${thumb.alt} (${current + 1} of ${links.length})`;
    dialog.classList.remove('zoomed');
  };

  links.forEach((link, index) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      show(index);
      dialog.showModal();
    });
  });

  dialog.querySelector('.lightbox-close').addEventListener('click', () => dialog.close());
  dialog.querySelector('.lightbox-prev').addEventListener('click', () => show(current - 1));
  dialog.querySelector('.lightbox-next').addEventListener('click', () => show(current + 1));
  // Tap to zoom in on the spot you tapped; tap again to fit the screen.
  image.addEventListener('click', (event) => {
    const box = image.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    const zoomed = dialog.classList.toggle('zoomed');
    if (!zoomed) return;
    const big = image.getBoundingClientRect();
    dialog.scrollLeft += big.left + x * big.width - event.clientX;
    dialog.scrollTop += big.top + y * big.height - event.clientY;
  });

  // Tapping the dark area around the picture closes the viewer.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') show(current - 1);
    if (event.key === 'ArrowRight') show(current + 1);
  });

  // Swipe left or right to move between screenshots (not while zoomed in).
  let touchX = null;
  dialog.addEventListener('touchstart', (event) => {
    touchX = event.touches.length === 1 ? event.touches[0].clientX : null;
  }, { passive: true });
  dialog.addEventListener('touchend', (event) => {
    if (touchX === null || dialog.classList.contains('zoomed')) return;
    const dx = event.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    touchX = null;
  });
})();
