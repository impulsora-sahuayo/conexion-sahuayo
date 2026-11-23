(() => {
  'use strict';

  const TOTAL_PAGES = 35;
  const PAGE_WIDTH = 1075;
  const PAGE_HEIGHT = 1382;
  const TURN_MS = 820;
  const SINGLE_TURN_MS = 640;
  const EDITION_ID = 'nov_dic_2026';
  const SPREAD_GAP = 2;

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 4;
  const DOUBLE_TAP_ZOOM = 2.2;
  const DESKTOP_ZOOM_STEP = 0.25;

  const pagePath = (n) => `pages/page-${String(n).padStart(2, '0')}.jpg`;
  const thumbPath = (n) => `thumbs/page-${String(n).padStart(2, '0')}.jpg`;

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

    zoomOutBtn: document.getElementById('zoomOutBtn'),
    zoomResetBtn: document.getElementById('zoomResetBtn'),
    zoomInBtn: document.getElementById('zoomInBtn'),

    swipeHint: document.getElementById('swipeHint')
  };

  let currentPage = 1;

  let touchStartX = null;
  let touchStartY = null;
  let touchStartTime = 0;
  let isTurning = false;
  let turnSerial = 0;
  let readingStarted = false;
  let completionSent = false;
  const preloadedPages = new Map();

  function track(eventName, fields = {}) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, { edicion: EDITION_ID, ...fields });
    }
  }

  function beginReading(origin) {
    if (readingStarted) return;
    readingStarted = true;
    track('abrir_lector', { origen: origin, total_paginas: TOTAL_PAGES });
    trackNavigation(pagesForView());
  }

  function pageReady(n) {
    if (n < 1 || n > TOTAL_PAGES) return Promise.resolve();
    if (preloadedPages.has(n)) return preloadedPages.get(n);
    const promise = new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      const finish = async () => {
        try { if (img.decode) await img.decode(); } catch (_) { /* Compatible con imágenes ya cargadas */ }
        resolve();
      };
      img.onload = finish;
      img.onerror = resolve;
      img.src = pagePath(n);
      if (img.complete && img.naturalWidth) finish();
    });
    preloadedPages.set(n, promise);
    return promise;
  }

  function cancelTurn() {
    turnSerial += 1;
    isTurning = false;
    el.pageStage.querySelectorAll('.flip-leaf').forEach((node) => node.remove());
    el.readerCanvas.querySelectorAll('.flip-snapshot').forEach((node) => node.remove());
    el.readerShell.classList.remove('page-is-turning');
  }

  let focusMode = false;
  let savedScrollY = 0;

  let zoomScale = 1;
  let panX = 0;
  let panY = 0;
  let panStart = null;
  let pinchStart = null;
  let lastTap = { time: 0, x: 0, y: 0 };

  let mousePanStart = null;

  const isSpread = () => window.matchMedia('(min-width: 901px)').matches;
  const isMobileViewport = () => window.matchMedia('(max-width: 900px)').matches;

  const isDesktopReading = () =>
    isSpread() &&
    el.readerShell.classList.contains('reading-active');

  function normalizedSpreadPage(page) {
    if (!isSpread() || page === 1) return page;
    // Si el total es impar, las dos hojas finales quedan separadas.
    if (TOTAL_PAGES % 2 === 1 && page >= TOTAL_PAGES - 1) return page;
    return page % 2 === 0 ? page : page - 1;
  }

  function pagesFor(page) {
    if (!isSpread() || page === 1) return [page];
    const left = normalizedSpreadPage(page);
    if (TOTAL_PAGES % 2 === 1 && left >= TOTAL_PAGES - 1) return [left];
    return left < TOTAL_PAGES ? [left, left + 1] : [left];
  }

  function pagesForView() { return pagesFor(currentPage); }

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

    const horizontalPadding =
      parseFloat(canvasStyle.paddingLeft) +
      parseFloat(canvasStyle.paddingRight);

    const verticalPadding =
      parseFloat(canvasStyle.paddingTop) +
      parseFloat(canvasStyle.paddingBottom);

    return {
      width: Math.max(1, el.readerCanvas.clientWidth - horizontalPadding),
      height: Math.max(1, el.readerCanvas.clientHeight - verticalPadding)
    };
  }

  function fitStage(pageCount) {
    const available = canvasAvailableSize();

    const naturalWidth =
      (PAGE_WIDTH * pageCount) +
      (pageCount > 1 ? SPREAD_GAP : 0);

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

    const maxX = Math.max(
      0,
      ((stageWidth * zoomScale) - available.width) / 2
    );

    const maxY = Math.max(
      0,
      ((stageHeight * zoomScale) - available.height) / 2
    );

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

  function updateDesktopZoomControls() {
    if (!el.zoomOutBtn || !el.zoomResetBtn || !el.zoomInBtn) return;

    el.zoomResetBtn.textContent = `${Math.round(zoomScale * 100)}%`;

    el.zoomOutBtn.disabled =
      zoomScale <= MIN_ZOOM + 0.001;

    el.zoomInBtn.disabled =
      zoomScale >= MAX_ZOOM - 0.001;
  }

  function applyTransform(animate = false) {
    clampPan();

    el.pageStage.classList.toggle('zoom-animate', animate);
    el.pageStage.classList.toggle('is-zoomed', zoomScale > 1.01);

    el.pageStage.style.setProperty('--zoom', zoomScale.toFixed(4));
    el.pageStage.style.setProperty('--pan-x', `${panX.toFixed(2)}px`);
    el.pageStage.style.setProperty('--pan-y', `${panY.toFixed(2)}px`);

    el.readerCanvas.classList.toggle(
      'desktop-zoom-active',
      isDesktopReading() && zoomScale > 1.01
    );

    updateHint();
    updateDesktopZoomControls();

    if (animate) {
      window.setTimeout(() => {
        el.pageStage.classList.remove('zoom-animate');
      }, 220);
    }
  }

  function resetZoom(animate = false) {
    zoomScale = 1;
    panX = 0;
    panY = 0;
    panStart = null;
    pinchStart = null;
    mousePanStart = null;

    el.readerCanvas.classList.remove('desktop-panning');

    applyTransform(animate);
  }

  function zoomAt(clientX, clientY, targetScale, animate = false) {
    const canvasRect = el.readerCanvas.getBoundingClientRect();

    const pointX =
      clientX - (canvasRect.left + canvasRect.width / 2);

    const pointY =
      clientY - (canvasRect.top + canvasRect.height / 2);

    const oldScale = zoomScale;

    const newScale = Math.max(
      MIN_ZOOM,
      Math.min(MAX_ZOOM, targetScale)
    );

    if (Math.abs(newScale - oldScale) < 0.001) return;

    panX =
      pointX -
      (newScale * (pointX - panX) / oldScale);

    panY =
      pointY -
      (newScale * (pointY - panY) / oldScale);

    zoomScale = newScale;

    applyTransform(animate);
  }

  function setDesktopZoom(targetScale) {
    if (!isDesktopReading()) return;

    const nextScale = Math.max(
      MIN_ZOOM,
      Math.min(MAX_ZOOM, targetScale)
    );

    if (nextScale <= MIN_ZOOM + 0.001) {
      resetZoom(true);
      return;
    }

    const rect = el.readerCanvas.getBoundingClientRect();

    zoomAt(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      nextScale,
      true
    );
  }

  function render(direction = null, preserveZoom = false) {
    currentPage = Math.max(
      1,
      Math.min(TOTAL_PAGES, currentPage)
    );

    if (isSpread()) {
      currentPage = normalizedSpreadPage(currentPage);
    }

    const pages = pagesForView();
    const single = pages.length === 1;

    if (single) {
      setImage(
        el.leftPage,
        el.leftSlot,
        pages[0],
        true
      );

      setImage(
        el.rightPage,
        el.rightSlot,
        null
      );
    } else {
      setImage(
        el.leftPage,
        el.leftSlot,
        pages[0],
        false
      );

      setImage(
        el.rightPage,
        el.rightSlot,
        pages[1],
        false
      );
    }

    fitStage(pages.length);

    if (!preserveZoom) {
      resetZoom(false);
    } else {
      applyTransform(false);
    }

    updateIndicator(pages);

    el.prevBtn.disabled = currentPage <= 1;
    el.nextBtn.disabled =
      pages[pages.length - 1] >= TOTAL_PAGES;

    updateThumbActive();
    prefetchAround();

    // Las animaciones se realizan antes de renderizar el nuevo estado.
  }

  function createLeafImage(page) {
    const img = document.createElement('img');
    img.src = pagePath(page);
    img.alt = '';
    img.draggable = false;
    return img;
  }

  function wait(ms) { return new Promise((resolve) => window.setTimeout(resolve, ms)); }

  async function animateTurn(targetPage, direction) {
    if (isTurning || targetPage < 1 || targetPage > TOTAL_PAGES) return;
    const oldPages = pagesForView();
    const newPages = pagesFor(targetPage);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || zoomScale > 1.01) {
      currentPage = targetPage;
      render();
      trackNavigation(newPages);
      return;
    }

    isTurning = true;
    const serial = ++turnSerial;
    el.readerShell.classList.add('page-is-turning');
    el.prevBtn.disabled = true;
    el.nextBtn.disabled = true;
    try {
      await Promise.all([...new Set([...oldPages, ...newPages])].map(pageReady));
      if (serial !== turnSerial) return;

      if (isSpread() && oldPages.length === 2 && newPages.length === 2) {
        const next = direction === 'next';
        // Mantiene la hoja estacionaria mientras la página gira con frente y reverso.
        setImage(el.leftPage, el.leftSlot, next ? oldPages[0] : newPages[0]);
        setImage(el.rightPage, el.rightSlot, next ? newPages[1] : oldPages[1]);
        const leaf = document.createElement('div');
        leaf.className = `flip-leaf flip-leaf--${direction}`;
        const front = document.createElement('div');
        front.className = 'flip-leaf-face flip-leaf-front';
        front.appendChild(createLeafImage(next ? oldPages[1] : oldPages[0]));
        const back = document.createElement('div');
        back.className = 'flip-leaf-face flip-leaf-back';
        back.appendChild(createLeafImage(next ? newPages[0] : newPages[1]));
        leaf.append(front, back);
        el.pageStage.appendChild(leaf);
        // Confirmar el estado inicial antes de activar la transición CSS.
        void leaf.offsetWidth;
        await new Promise((resolve) => requestAnimationFrame(() => {
          leaf.classList.add('flip-leaf--active');
          window.setTimeout(resolve, TURN_MS);
        }));
      } else {
        // Portada, contraportada y lectura móvil: transición de hoja independiente.
        const stageRect = el.pageStage.getBoundingClientRect();
        const canvasRect = el.readerCanvas.getBoundingClientRect();
        const snapshot = document.createElement('div');
        snapshot.className = `flip-snapshot flip-snapshot--${direction}`;
        snapshot.style.left = `${stageRect.left - canvasRect.left}px`;
        snapshot.style.top = `${stageRect.top - canvasRect.top}px`;
        snapshot.style.width = `${stageRect.width}px`;
        snapshot.style.height = `${stageRect.height}px`;
        oldPages.forEach((n) => snapshot.appendChild(createLeafImage(n)));
        el.readerCanvas.appendChild(snapshot);
        void snapshot.offsetWidth;
        currentPage = targetPage;
        render();
        await new Promise((resolve) => requestAnimationFrame(() => {
          snapshot.classList.add('flip-snapshot--active');
          window.setTimeout(resolve, SINGLE_TURN_MS);
        }));
      }
      if (serial !== turnSerial) return;
      currentPage = targetPage;
      render();
      trackNavigation(newPages);
    } finally {
      if (serial === turnSerial) {
        cancelTurn();
        render(null, true);
      }
    }
  }

  function trackNavigation(pages) {
    if (!readingStarted) return;
    track('cambio_paginas', { pagina_inicial: pages[0], paginas_visibles: pages.join('-'), total_paginas: TOTAL_PAGES });
    if (!completionSent && pages.includes(TOTAL_PAGES)) {
      completionSent = true;
      track('llegar_ultima_pagina', { total_paginas: TOTAL_PAGES });
    }
  }

  function nextPage() {
    if (isTurning) return;
    const pages = pagesForView();
    if (pages[pages.length - 1] >= TOTAL_PAGES) return;
    beginReading('navegacion');
    let target;
    if (isSpread()) {
      target = currentPage === 1 ? 2 :
        (TOTAL_PAGES % 2 === 1 && currentPage >= TOTAL_PAGES - 1
          ? currentPage + 1 : currentPage + 2);
    } else target = currentPage + 1;
    animateTurn(target, 'next');
  }

  function prevPage() {
    if (isTurning || currentPage <= 1) return;
    beginReading('navegacion');
    let target;
    if (isSpread()) {
      target = (TOTAL_PAGES % 2 === 1 && currentPage === TOTAL_PAGES)
        ? currentPage - 1 : currentPage <= 2 ? 1 : currentPage - 2;
    } else target = currentPage - 1;
    animateTurn(target, 'prev');
  }

  function goToPage(n) {
    beginReading('indice');
    cancelTurn();
    currentPage = Number(n);

    closeDrawer();
    render();
    trackNavigation(pagesForView());

    el.readerCanvas.focus({
      preventScroll: true
    });
  }

  function openDrawer() {
    el.thumbDrawer.classList.add('open');
    el.drawerBackdrop.classList.add('open');

    el.thumbDrawer.setAttribute(
      'aria-hidden',
      'false'
    );

    updateThumbActive();

    const active =
      el.thumbGrid.querySelector('.thumb.active');

    if (active) {
      active.scrollIntoView({
        block: 'center'
      });
    }
  }

  function closeDrawer() {
    el.thumbDrawer.classList.remove('open');
    el.drawerBackdrop.classList.remove('open');

    el.thumbDrawer.setAttribute(
      'aria-hidden',
      'true'
    );
  }

  function buildThumbnails() {
    const frag =
      document.createDocumentFragment();

    for (
      let n = 1;
      n <= TOTAL_PAGES;
      n += 1
    ) {
      const button =
        document.createElement('button');

      button.type = 'button';
      button.className = 'thumb';
      button.dataset.page = String(n);

      button.setAttribute(
        'aria-label',
        n === 1
          ? 'Ir a portada'
          : `Ir a página ${n}`
      );

      const img =
        document.createElement('img');

      img.loading = 'lazy';
      img.src = thumbPath(n);
      img.alt = '';

      const label =
        document.createElement('span');

      label.textContent =
        n === 1
          ? 'Portada'
          : `Página ${n}`;

      button.append(img, label);

      button.addEventListener(
        'click',
        () => goToPage(n)
      );

      frag.appendChild(button);
    }

    el.thumbGrid.appendChild(frag);
  }

  function lockPageScroll() {
    savedScrollY =
      window.scrollY ||
      window.pageYOffset ||
      0;

    document.body.style.top =
      `-${savedScrollY}px`;

    document.body.classList.add(
      'reader-focus-active'
    );
  }

  function unlockPageScroll() {
    document.body.classList.remove(
      'reader-focus-active'
    );

    document.body.style.top = '';

    window.scrollTo(
      0,
      savedScrollY
    );
  }

  function enterFocusMode() {
    if (focusMode) return;

    focusMode = true;

    lockPageScroll();

    el.readerShell.classList.add(
      'reading-active'
    );

    if (isMobileViewport()) {
      el.readerShell.classList.add(
        'mobile-focus'
      );
    }

    el.fullscreenBtn.setAttribute(
      'aria-label',
      'Salir del modo lectura'
    );

    el.fullscreenBtn.setAttribute(
      'title',
      'Salir del modo lectura'
    );

    resetZoom(false);

    window.setTimeout(() => {
      render(null, true);
    }, 50);
  }

  function exitFocusMode() {
    if (!focusMode) return;

    focusMode = false;

    el.readerShell.classList.remove(
      'mobile-focus',
      'reading-active'
    );

    el.fullscreenBtn.setAttribute(
      'aria-label',
      'Pantalla completa'
    );

    el.fullscreenBtn.setAttribute(
      'title',
      'Pantalla completa'
    );

    resetZoom(false);
    unlockPageScroll();

    window.setTimeout(() => {
      render();
    }, 50);
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
        // Si el navegador rechaza fullscreen nativo,
        // usamos el modo lectura alternativo.
      }
    }

    enterFocusMode();
  }

  function openReader() {
    beginReading('boton');
    el.readerSection.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

    window.setTimeout(() => {
      el.readerCanvas.focus({
        preventScroll: true
      });
    }, 600);
  }

  function distance(a, b) {
    return Math.hypot(
      b.clientX - a.clientX,
      b.clientY - a.clientY
    );
  }

  function midpoint(a, b) {
    return {
      x: (a.clientX + b.clientX) / 2,
      y: (a.clientY + b.clientY) / 2
    };
  }

  function handleTap(x, y) {
    const now = Date.now();

    const closeEnough =
      Math.hypot(
        x - lastTap.x,
        y - lastTap.y
      ) < 44;

    if (
      now - lastTap.time < 320 &&
      closeEnough
    ) {
      if (zoomScale > 1.01) {
        resetZoom(true);
      } else {
        zoomAt(
          x,
          y,
          DOUBLE_TAP_ZOOM,
          true
        );
      }

      lastTap = {
        time: 0,
        x: 0,
        y: 0
      };
    } else {
      lastTap = {
        time: now,
        x,
        y
      };
    }
  }

  /* Mouse drag para escritorio cuando hay zoom */
  el.readerCanvas.addEventListener(
    'mousedown',
    (event) => {
      if (
        !isDesktopReading() ||
        zoomScale <= 1.01 ||
        event.button !== 0
      ) {
        return;
      }

      event.preventDefault();

      mousePanStart = {
        x: event.clientX,
        y: event.clientY,
        panX,
        panY
      };

      el.readerCanvas.classList.add(
        'desktop-panning'
      );
    }
  );

  window.addEventListener(
    'mousemove',
    (event) => {
      if (!mousePanStart) return;

      panX =
        mousePanStart.panX +
        (event.clientX - mousePanStart.x);

      panY =
        mousePanStart.panY +
        (event.clientY - mousePanStart.y);

      applyTransform(false);
    }
  );

  window.addEventListener(
    'mouseup',
    () => {
      if (!mousePanStart) return;

      mousePanStart = null;

      el.readerCanvas.classList.remove(
        'desktop-panning'
      );
    }
  );

  /* Controles principales */
  el.openReaderBtn.addEventListener(
    'click',
    openReader
  );

  el.prevBtn.addEventListener(
    'click',
    prevPage
  );

  el.nextBtn.addEventListener(
    'click',
    nextPage
  );

  el.pageIndicator.addEventListener(
    'click',
    openDrawer
  );

  el.thumbsBtn.addEventListener(
    'click',
    openDrawer
  );

  el.closeThumbsBtn.addEventListener(
    'click',
    closeDrawer
  );

  el.drawerBackdrop.addEventListener(
    'click',
    closeDrawer
  );

  el.fullscreenBtn.addEventListener(
    'click',
    toggleFullscreen
  );

  if (el.zoomOutBtn) {
    el.zoomOutBtn.addEventListener(
      'click',
      () => setDesktopZoom(
        zoomScale - DESKTOP_ZOOM_STEP
      )
    );
  }

  if (el.zoomResetBtn) {
    el.zoomResetBtn.addEventListener(
      'click',
      () => resetZoom(true)
    );
  }

  if (el.zoomInBtn) {
    el.zoomInBtn.addEventListener(
      'click',
      () => setDesktopZoom(
        zoomScale + DESKTOP_ZOOM_STEP
      )
    );
  }

  /* Navegación de teclado dentro del lector */
  el.readerCanvas.addEventListener(
    'keydown',
    (event) => {
      if (
        event.key === 'ArrowRight' ||
        event.key === 'PageDown'
      ) {
        event.preventDefault();
        nextPage();
      } else if (
        event.key === 'ArrowLeft' ||
        event.key === 'PageUp'
      ) {
        event.preventDefault();
        prevPage();
      } else if (
        event.key === 'Home'
      ) {
        event.preventDefault();
        cancelTurn();
        beginReading('teclado');
        currentPage = 1;
        render();
        trackNavigation(pagesForView());
      } else if (
        event.key === 'End'
      ) {
        event.preventDefault();
        cancelTurn();
        beginReading('teclado');
        currentPage = TOTAL_PAGES;
        render();
        trackNavigation(pagesForView());
      }
    }
  );

  /* Atajos globales para zoom en escritorio */
  document.addEventListener(
    'keydown',
    (event) => {
      if (
        isDesktopReading() &&
        (
          event.key === '+' ||
          event.key === '='
        )
      ) {
        event.preventDefault();

        setDesktopZoom(
          zoomScale + DESKTOP_ZOOM_STEP
        );

        return;
      }

      if (
        isDesktopReading() &&
        event.key === '-'
      ) {
        event.preventDefault();

        setDesktopZoom(
          zoomScale - DESKTOP_ZOOM_STEP
        );

        return;
      }

      if (
        isDesktopReading() &&
        event.key === '0'
      ) {
        event.preventDefault();

        resetZoom(true);
        return;
      }

      if (
        event.key === 'Escape' &&
        el.thumbDrawer.classList.contains('open')
      ) {
        closeDrawer();
      } else if (
        event.key === 'Escape' &&
        focusMode
      ) {
        exitFocusMode();
      }
    }
  );

  /* Gestos táctiles */
  el.readerCanvas.addEventListener(
    'touchstart',
    (event) => {
      if (
        focusMode &&
        event.touches.length === 2
      ) {
        event.preventDefault();

        const a = event.touches[0];
        const b = event.touches[1];
        const mid = midpoint(a, b);

        const rect =
          el.readerCanvas.getBoundingClientRect();

        pinchStart = {
          distance: distance(a, b),
          scale: zoomScale,
          panX,
          panY,
          x:
            mid.x -
            (rect.left + rect.width / 2),
          y:
            mid.y -
            (rect.top + rect.height / 2)
        };

        panStart = null;
        return;
      }

      if (event.touches.length !== 1) return;

      const t = event.touches[0];

      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchStartTime = Date.now();

      if (
        focusMode &&
        zoomScale > 1.01
      ) {
        panStart = {
          x: t.clientX,
          y: t.clientY,
          panX,
          panY
        };
      }
    },
    { passive: false }
  );

  el.readerCanvas.addEventListener(
    'touchmove',
    (event) => {
      if (!focusMode) return;

      if (
        event.touches.length === 2 &&
        pinchStart
      ) {
        event.preventDefault();

        const a = event.touches[0];
        const b = event.touches[1];
        const mid = midpoint(a, b);

        const rect =
          el.readerCanvas.getBoundingClientRect();

        const pointX =
          mid.x -
          (rect.left + rect.width / 2);

        const pointY =
          mid.y -
          (rect.top + rect.height / 2);

        const ratio =
          distance(a, b) /
          Math.max(
            1,
            pinchStart.distance
          );

        const newScale = Math.max(
          MIN_ZOOM,
          Math.min(
            MAX_ZOOM,
            pinchStart.scale * ratio
          )
        );

        panX =
          pointX -
          (
            newScale *
            (
              pinchStart.x -
              pinchStart.panX
            ) /
            pinchStart.scale
          );

        panY =
          pointY -
          (
            newScale *
            (
              pinchStart.y -
              pinchStart.panY
            ) /
            pinchStart.scale
          );

        zoomScale = newScale;

        applyTransform(false);
        return;
      }

      if (
        event.touches.length === 1 &&
        zoomScale > 1.01 &&
        panStart
      ) {
        event.preventDefault();

        const t = event.touches[0];

        panX =
          panStart.panX +
          (t.clientX - panStart.x);

        panY =
          panStart.panY +
          (t.clientY - panStart.y);

        applyTransform(false);
      }
    },
    { passive: false }
  );

  el.readerCanvas.addEventListener(
    'touchend',
    (event) => {
      if (pinchStart) {
        if (event.touches.length < 2) {
          pinchStart = null;
        }

        if (zoomScale < 1.04) {
          resetZoom(true);
        }

        touchStartX = null;
        touchStartY = null;
        panStart = null;

        return;
      }

      if (
        touchStartX === null ||
        touchStartY === null
      ) {
        return;
      }

      const t = event.changedTouches[0];

      const dx =
        t.clientX - touchStartX;

      const dy =
        t.clientY - touchStartY;

      const elapsed =
        Date.now() - touchStartTime;

      const moved =
        Math.hypot(dx, dy);

      touchStartX = null;
      touchStartY = null;
      panStart = null;

      if (
        focusMode &&
        zoomScale > 1.01
      ) {
        if (
          moved < 12 &&
          elapsed < 280
        ) {
          handleTap(
            t.clientX,
            t.clientY
          );
        }

        return;
      }

      if (
        Math.abs(dx) > 48 &&
        Math.abs(dx) >
          Math.abs(dy) * 1.2
      ) {
        dx < 0
          ? nextPage()
          : prevPage();

        return;
      }

      if (
        focusMode &&
        moved < 12 &&
        elapsed < 280
      ) {
        handleTap(
          t.clientX,
          t.clientY
        );
      }
    },
    { passive: true }
  );

  let resizeTimer;

  function handleResize() {
    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(() => {
      cancelTurn();
      render(
        null,
        isDesktopReading() || focusMode
      );
    }, 120);
  }

  window.addEventListener(
    'resize',
    handleResize
  );

  if (window.visualViewport) {
    window.visualViewport.addEventListener(
      'resize',
      handleResize
    );
  }

  document.addEventListener(
    'fullscreenchange',
    () => {
      mousePanStart = null;

      el.readerCanvas.classList.remove(
        'desktop-panning'
      );

      const nativeReaderFullscreen =
        document.fullscreenElement ===
        el.readerShell;

      el.readerShell.classList.toggle(
        'reading-active',
        nativeReaderFullscreen || focusMode
      );

      if (nativeReaderFullscreen) {
        el.fullscreenBtn.setAttribute(
          'aria-label',
          'Salir de pantalla completa'
        );

        el.fullscreenBtn.setAttribute(
          'title',
          'Salir de pantalla completa'
        );

        window.setTimeout(() => {
          render(null, true);
        }, 80);

        return;
      }

      if (!focusMode) {
        el.fullscreenBtn.setAttribute(
          'aria-label',
          'Pantalla completa'
        );

        el.fullscreenBtn.setAttribute(
          'title',
          'Pantalla completa'
        );

        resetZoom(false);

        window.setTimeout(() => {
          render();
        }, 80);
      }
    }
  );

  document.querySelectorAll('[data-ga-download]').forEach((link) => {
    link.addEventListener('click', () => {
      track('descargar_pdf', { ubicacion: link.dataset.gaDownload, total_paginas: TOTAL_PAGES });
    });
  });

  buildThumbnails();
  updateDesktopZoomControls();
  render();
})();

