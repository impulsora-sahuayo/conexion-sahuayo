(() => {
  'use strict';

  const TOTAL_PAGES = 34;
  const PAGE_WIDTH = 1241;
  const PAGE_HEIGHT = 1595;
  const SPREAD_GAP = 2;
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 4;
  const DOUBLE_TAP_ZOOM = 2.2;
  const pagePath = (n) => `pages/page-${String(n).padStart(2, '0')}.jpg`;

  const el = {
    openReaderBtn: document.getElementById('openReaderBtn'),
    readerSection: document.getElementById('revista'),
    readerShell: document.getElementById('readerShell'),
    readerCanvas: document.getElementById('readerCanvas'),
    pageStage: document.getElementById('pageStage'),
    leftSlot: document.getElementById('leftSlot'),
    rightSlot: document.getElementById('rightSlot'),
    leftPage: document.getElementById('leftPage'),
    rightPage: document.getElementById('rightPage'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    pageIndicator: document.getElementById('pageIndicator'),
    thumbsBtn: document.getElementById('thumbsBtn'),
    closeThumbsBtn: document.getElementById('closeThumbsBtn'),
    thumbDrawer: document.getElementById('thumbDrawer'),
    thumbGrid: document.getElementById('thumbGrid'),
    drawerBackdrop: document.getElementById('drawerBackdrop'),
    fullscreenBtn: document.getElementById('fullscreenBtn'),
    swipeHint: document.getElementById('swipeHint')
  };

  let currentPage = 1;
  let touchStartX = null;
  let touchStartY = null;
  let touchStartTime = 0;
  let animationTimer = null;
  let focusMode = false;
  let savedScrollY = 0;

  let zoomScale = 1;
  let panX = 0;
  let panY = 0;
  let panStart = null;
  let pinchStart = null;
  let lastTap = { time: 0, x: 0, y: 0 };

  const isSpread = () => window.matchMedia('(min-width: 901px)').matches;
  const isMobileViewport = () => window.matchMedia('(max-width: 900px)').matches;

  function normalizedSpreadPage(page) {
    if (!isSpread() || page === 1) return page;
    return page % 2 === 0 ? page : page - 1;
  }

  function pagesForView() {
    if (!isSpread()) return [currentPage];
    if (currentPage === 1) return [1];
    const left = normalizedSpreadPage(currentPage);
    return left < TOTAL_PAGES ? [left, left + 1] : [left];
  }

  function setImage(img, slot, pageNumber, single = false) {
    if (!pageNumber) {
      slot.hidden = true;
      img.removeAttribute('src');
      img.alt = '';
      return;
    }
    slot.hidden = false;
    slot.classList.toggle('single', single);
    img.src = pagePath(pageNumber);
    img.alt = pageNumber === 1
      ? 'Portada de Conexión Sahuayo'
      : `Página ${pageNumber} de Conexión Sahuayo`;
  }

  function updateIndicator(pages) {
    if (pages.length === 1 && pages[0] === 1) {
      el.pageIndicator.textContent = `Portada · 1 / ${TOTAL_PAGES}`;
    } else if (pages.length === 1) {
      el.pageIndicator.textContent = `${pages[0]} / ${TOTAL_PAGES}`;
    } else {
      el.pageIndicator.textContent = `${pages[0]}–${pages[1]} / ${TOTAL_PAGES}`;
    }
  }

  function updateThumbActive() {
    const visible = pagesForView();
    el.thumbGrid.querySelectorAll('.thumb').forEach((button) => {
      const n = Number(button.dataset.page);
      button.classList.toggle('active', visible.includes(n));
    });
  }

  function prefetchAround() {
    const step = isSpread() ? 2 : 1;
    [currentPage - step, currentPage + step].forEach((n) => {
      if (n >= 1 && n <= TOTAL_PAGES) {
        const img = new Image();
        img.src = pagePath(n);
      }
    });
  }

  function canvasAvailableSize() {
    const canvasStyle = window.getComputedStyle(el.readerCanvas);
    const horizontalPadding = parseFloat(canvasStyle.paddingLeft) + parseFloat(canvasStyle.paddingRight);
    const verticalPadding = parseFloat(canvasStyle.paddingTop) + parseFloat(canvasStyle.paddingBottom);
    return {
      width: Math.max(1, el.readerCanvas.clientWidth - horizontalPadding),
      height: Math.max(1, el.readerCanvas.clientHeight - verticalPadding)
    };
  }

  function fitStage(pageCount) {
    const available = canvasAvailableSize();
    const naturalWidth = (PAGE_WIDTH * pageCount) + (pageCount > 1 ? SPREAD_GAP : 0);
    const naturalHeight = PAGE_HEIGHT;
    const viewRatio = naturalWidth / naturalHeight;

    let stageWidth = available.width;
    let stageHeight = stageWidth / viewRatio;

    if (stageHeight > available.height) {
      stageHeight = available.height;
      stageWidth = stageHeight * viewRatio;
    }

    el.pageStage.style.width = `${Math.floor(stageWidth)}px`;
    el.pageStage.style.height = `${Math.floor(stageHeight)}px`;
  }

  function clampPan() {
    if (zoomScale <= 1.001) {
      panX = 0;
      panY = 0;
      return;
    }

    const available = canvasAvailableSize();
    const stageWidth = el.pageStage.offsetWidth;
    const stageHeight = el.pageStage.offsetHeight;
    const maxX = Math.max(0, ((stageWidth * zoomScale) - available.width) / 2);
    const maxY = Math.max(0, ((stageHeight * zoomScale) - available.height) / 2);

    panX = Math.max(-maxX, Math.min(maxX, panX));
    panY = Math.max(-maxY, Math.min(maxY, panY));
  }

  function updateHint() {
    if (!el.swipeHint) return;
    if (focusMode && isMobileViewport()) {
      el.swipeHint.textContent = zoomScale > 1.01
        ? 'Arrastra para mover · doble toque para ajustar'
        : 'Desliza para cambiar · pellizca para ampliar';
    } else {
      el.swipeHint.textContent = 'Desliza para cambiar de página';
    }
  }

  function applyTransform(animate = false) {
    clampPan();
    el.pageStage.classList.toggle('zoom-animate', animate);
    el.pageStage.classList.toggle('is-zoomed', zoomScale > 1.01);
    el.pageStage.style.setProperty('--zoom', zoomScale.toFixed(4));
    el.pageStage.style.setProperty('--pan-x', `${panX.toFixed(2)}px`);
    el.pageStage.style.setProperty('--pan-y', `${panY.toFixed(2)}px`);
    updateHint();

    if (animate) {
      window.setTimeout(() => el.pageStage.classList.remove('zoom-animate'), 220);
    }
  }

  function resetZoom(animate = false) {
    zoomScale = 1;
    panX = 0;
    panY = 0;
    panStart = null;
    pinchStart = null;
    applyTransform(animate);
  }

  function zoomAt(clientX, clientY, targetScale, animate = false) {
    const canvasRect = el.readerCanvas.getBoundingClientRect();
    const pointX = clientX - (canvasRect.left + canvasRect.width / 2);
    const pointY = clientY - (canvasRect.top + canvasRect.height / 2);
    const oldScale = zoomScale;
    const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetScale));

    if (Math.abs(newScale - oldScale) < 0.001) return;

    panX = pointX - (newScale * (pointX - panX) / oldScale);
    panY = pointY - (newScale * (pointY - panY) / oldScale);
    zoomScale = newScale;
    applyTransform(animate);
  }

  function render(direction = null, preserveZoom = false) {
    currentPage = Math.max(1, Math.min(TOTAL_PAGES, currentPage));
    if (isSpread()) currentPage = normalizedSpreadPage(currentPage);

    const pages = pagesForView();
    const single = pages.length === 1;

    if (single) {
      setImage(el.leftPage, el.leftSlot, pages[0], true);
      setImage(el.rightPage, el.rightSlot, null);
    } else {
      setImage(el.leftPage, el.leftSlot, pages[0], false);
      setImage(el.rightPage, el.rightSlot, pages[1], false);
    }

    fitStage(pages.length);
    if (!preserveZoom) resetZoom(false);
    else applyTransform(false);

    updateIndicator(pages);
    el.prevBtn.disabled = currentPage <= 1;
    el.nextBtn.disabled = pages[pages.length - 1] >= TOTAL_PAGES;
    updateThumbActive();
    prefetchAround();

    if (direction) {
      clearTimeout(animationTimer);
      el.pageStage.classList.remove('turn-next', 'turn-prev');
      void el.pageStage.offsetWidth;
      el.pageStage.classList.add(direction === 'next' ? 'turn-next' : 'turn-prev');
      animationTimer = setTimeout(() => el.pageStage.classList.remove('turn-next', 'turn-prev'), 380);
    }
  }

  function nextPage() {
    const pages = pagesForView();
    if (pages[pages.length - 1] >= TOTAL_PAGES) return;
    if (isSpread()) currentPage = currentPage === 1 ? 2 : currentPage + 2;
    else currentPage += 1;
    render('next');
  }

  function prevPage() {
    if (currentPage <= 1) return;
    if (isSpread()) currentPage = currentPage <= 2 ? 1 : currentPage - 2;
    else currentPage -= 1;
    render('prev');
  }

  function goToPage(n) {
    currentPage = Number(n);
    closeDrawer();
    render();
    el.readerCanvas.focus({ preventScroll: true });
  }

  function openDrawer() {
    el.thumbDrawer.classList.add('open');
    el.drawerBackdrop.classList.add('open');
    el.thumbDrawer.setAttribute('aria-hidden', 'false');
    updateThumbActive();
    const active = el.thumbGrid.querySelector('.thumb.active');
    if (active) active.scrollIntoView({ block: 'center' });
  }

  function closeDrawer() {
    el.thumbDrawer.classList.remove('open');
    el.drawerBackdrop.classList.remove('open');
    el.thumbDrawer.setAttribute('aria-hidden', 'true');
  }

  function buildThumbnails() {
    const frag = document.createDocumentFragment();
    for (let n = 1; n <= TOTAL_PAGES; n += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'thumb';
      button.dataset.page = String(n);
      button.setAttribute('aria-label', n === 1 ? 'Ir a portada' : `Ir a página ${n}`);

      const img = document.createElement('img');
      img.loading = 'lazy';
      img.src = pagePath(n);
      img.alt = '';

      const label = document.createElement('span');
      label.textContent = n === 1 ? 'Portada' : `Página ${n}`;

      button.append(img, label);
      button.addEventListener('click', () => goToPage(n));
      frag.appendChild(button);
    }
    el.thumbGrid.appendChild(frag);
  }

  function lockPageScroll() {
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.top = `-${savedScrollY}px`;
    document.body.classList.add('reader-focus-active');
  }

  function unlockPageScroll() {
    document.body.classList.remove('reader-focus-active');
    document.body.style.top = '';
    window.scrollTo(0, savedScrollY);
  }

  function enterFocusMode() {
    if (focusMode) return;
    focusMode = true;
    lockPageScroll();
    el.readerShell.classList.add('mobile-focus');
    el.fullscreenBtn.setAttribute('aria-label', 'Salir del modo lectura');
    el.fullscreenBtn.setAttribute('title', 'Salir del modo lectura');
    resetZoom(false);
    window.setTimeout(() => render(null, true), 50);
  }

  function exitFocusMode() {
    if (!focusMode) return;
    focusMode = false;
    el.readerShell.classList.remove('mobile-focus');
    el.fullscreenBtn.setAttribute('aria-label', 'Pantalla completa');
    el.fullscreenBtn.setAttribute('title', 'Pantalla completa');
    resetZoom(false);
    unlockPageScroll();
    window.setTimeout(() => render(), 50);
  }

  async function toggleFullscreen() {
    if (focusMode) {
      exitFocusMode();
      return;
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    const canUseNativeFullscreen = Boolean(
      document.fullscreenEnabled &&
      typeof el.readerShell.requestFullscreen === 'function'
    );

    if (canUseNativeFullscreen) {
      try {
        await el.readerShell.requestFullscreen();
        return;
      } catch (_) {
        // Fallback below for browsers such as Safari on iPhone.
      }
    }

    enterFocusMode();
  }

  function openReader() {
    el.readerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => el.readerCanvas.focus({ preventScroll: true }), 600);
  }

  function distance(a, b) {
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  }

  function midpoint(a, b) {
    return {
      x: (a.clientX + b.clientX) / 2,
      y: (a.clientY + b.clientY) / 2
    };
  }

  function handleTap(x, y) {
    const now = Date.now();
    const closeEnough = Math.hypot(x - lastTap.x, y - lastTap.y) < 44;
    if (now - lastTap.time < 320 && closeEnough) {
      if (zoomScale > 1.01) resetZoom(true);
      else zoomAt(x, y, DOUBLE_TAP_ZOOM, true);
      lastTap = { time: 0, x: 0, y: 0 };
    } else {
      lastTap = { time: now, x, y };
    }
  }

  el.openReaderBtn.addEventListener('click', openReader);
  el.prevBtn.addEventListener('click', prevPage);
  el.nextBtn.addEventListener('click', nextPage);
  el.pageIndicator.addEventListener('click', openDrawer);
  el.thumbsBtn.addEventListener('click', openDrawer);
  el.closeThumbsBtn.addEventListener('click', closeDrawer);
  el.drawerBackdrop.addEventListener('click', closeDrawer);
  el.fullscreenBtn.addEventListener('click', toggleFullscreen);

  el.readerCanvas.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'PageDown') {
      event.preventDefault();
      nextPage();
    } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      prevPage();
    } else if (event.key === 'Home') {
      event.preventDefault();
      currentPage = 1;
      render();
    } else if (event.key === 'End') {
      event.preventDefault();
      currentPage = TOTAL_PAGES;
      render();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && el.thumbDrawer.classList.contains('open')) {
      closeDrawer();
    } else if (event.key === 'Escape' && focusMode) {
      exitFocusMode();
    }
  });

  el.readerCanvas.addEventListener('touchstart', (event) => {
    if (focusMode && event.touches.length === 2) {
      event.preventDefault();
      const a = event.touches[0];
      const b = event.touches[1];
      const mid = midpoint(a, b);
      const rect = el.readerCanvas.getBoundingClientRect();
      pinchStart = {
        distance: distance(a, b),
        scale: zoomScale,
        panX,
        panY,
        x: mid.x - (rect.left + rect.width / 2),
        y: mid.y - (rect.top + rect.height / 2)
      };
      panStart = null;
      return;
    }

    if (event.touches.length !== 1) return;
    const t = event.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchStartTime = Date.now();

    if (focusMode && zoomScale > 1.01) {
      panStart = { x: t.clientX, y: t.clientY, panX, panY };
    }
  }, { passive: false });

  el.readerCanvas.addEventListener('touchmove', (event) => {
    if (!focusMode) return;

    if (event.touches.length === 2 && pinchStart) {
      event.preventDefault();
      const a = event.touches[0];
      const b = event.touches[1];
      const mid = midpoint(a, b);
      const rect = el.readerCanvas.getBoundingClientRect();
      const pointX = mid.x - (rect.left + rect.width / 2);
      const pointY = mid.y - (rect.top + rect.height / 2);
      const ratio = distance(a, b) / Math.max(1, pinchStart.distance);
      const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchStart.scale * ratio));

      panX = pointX - (newScale * (pinchStart.x - pinchStart.panX) / pinchStart.scale);
      panY = pointY - (newScale * (pinchStart.y - pinchStart.panY) / pinchStart.scale);
      zoomScale = newScale;
      applyTransform(false);
      return;
    }

    if (event.touches.length === 1 && zoomScale > 1.01 && panStart) {
      event.preventDefault();
      const t = event.touches[0];
      panX = panStart.panX + (t.clientX - panStart.x);
      panY = panStart.panY + (t.clientY - panStart.y);
      applyTransform(false);
    }
  }, { passive: false });

  el.readerCanvas.addEventListener('touchend', (event) => {
    if (pinchStart) {
      if (event.touches.length < 2) pinchStart = null;
      if (zoomScale < 1.04) resetZoom(true);
      touchStartX = null;
      touchStartY = null;
      panStart = null;
      return;
    }

    if (touchStartX === null || touchStartY === null) return;
    const t = event.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const elapsed = Date.now() - touchStartTime;
    const moved = Math.hypot(dx, dy);

    touchStartX = null;
    touchStartY = null;
    panStart = null;

    if (focusMode && zoomScale > 1.01) {
      if (moved < 12 && elapsed < 280) handleTap(t.clientX, t.clientY);
      return;
    }

    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      dx < 0 ? nextPage() : prevPage();
      return;
    }

    if (focusMode && moved < 12 && elapsed < 280) {
      handleTap(t.clientX, t.clientY);
    }
  }, { passive: true });

  let resizeTimer;
  function handleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => render(null, false), 120);
  }

  window.addEventListener('resize', handleResize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleResize);
  }

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      el.fullscreenBtn.setAttribute('aria-label', 'Pantalla completa');
      el.fullscreenBtn.setAttribute('title', 'Pantalla completa');
    }
    window.setTimeout(() => render(), 80);
  });

  buildThumbnails();
  render();
})();

