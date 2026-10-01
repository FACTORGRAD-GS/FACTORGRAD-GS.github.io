(() => {
  const labels = {
    playroom_00018: 'Playroom',
    flowers_00020: 'Flowers',
    train_00007: 'Train',
    room_00035: 'Room',
    drjohnson_00017: 'Dr Johnson'
  };
  const methods = [
    ['view-gt', 'gt', 'ground truth'],
    ['view-skipgs', 'skipgs', 'SkipGS rendering'],
    ['view-ours', 'factorgrad_gs', 'FactorGrad-GS rendering']
  ];
  let scene = 'playroom_00018';
  let view = 'full';
  const sceneButtons = [...document.querySelectorAll('[data-scene]')];
  const viewButtons = [...document.querySelectorAll('[data-view]')];

  function refresh() {
    sceneButtons.forEach(button => {
      const selected = button.dataset.scene === scene;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    viewButtons.forEach(button => {
      const selected = button.dataset.view === view;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    methods.forEach(([id, suffix, description]) => {
      const img = document.getElementById(id);
      img.src = 'assets/gallery/' + scene + '_' + suffix + '_' + view + '.png';
      img.alt = labels[scene] + ' ' + description + ', ' + (view === 'full' ? 'full frame.' : 'close-up.');
    });
  }

  sceneButtons.forEach(button => button.addEventListener('click', () => {
    scene = button.dataset.scene;
    refresh();
  }));
  viewButtons.forEach(button => button.addEventListener('click', () => {
    view = button.dataset.view;
    refresh();
  }));

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.blink-card img').forEach(img => {
      const sceneId = img.getAttribute('src').split('/').pop().replace('.gif', '');
      img.src = 'assets/gallery/' + sceneId + '_factorgrad_gs_full.png';
      img.alt = labels[sceneId] + ' FactorGrad-GS rendering, still frame.';
    });
  }
  const interactiveRoot = document.querySelector('[data-interactive-viewer]');
  if (interactiveRoot) {
    const canvas = document.getElementById('interactive-canvas');
    const ctx = canvas.getContext('2d');
    const slider = document.getElementById('interactive-slider');
    const frameLabel = document.getElementById('interactive-frame-label');
    const status = interactiveRoot.querySelector('[data-interactive-status]');
    const sceneButtons = [...interactiveRoot.querySelectorAll('[data-interactive-scene]')];
    const scenes = {
      flowers: { label: 'Flowers', directory: 'assets/interactive/flowers' },
      playroom: { label: 'Playroom', directory: 'assets/interactive/playroom' },
      room: { label: 'Room', directory: 'assets/interactive/room' }
    };
    const frameCount = 72;
    let sceneKey = 'flowers';
    let frame = 0;
    let zoom = 1;
    let dragStartX = 0;
    let accumulatedDx = 0;
    let dragging = false;
    let cache = new Map();

    function frameUrl(index) {
      return scenes[sceneKey].directory + '/' + String(index).padStart(4, '0') + '.webp';
    }

    function drawPlaceholder(message) {
      ctx.fillStyle = '#102b31';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#c9ddd8';
      ctx.font = '700 22px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(message, canvas.width / 2, canvas.height / 2);
      ctx.textAlign = 'start';
    }

    function drawImage(image) {
      if (canvas.width !== image.naturalWidth || canvas.height !== image.naturalHeight) {
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
      }
      const cw = canvas.width;
      const ch = canvas.height;
      const scale = zoom;
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      ctx.fillStyle = '#102b31';
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(image, (cw - width) / 2, (ch - height) / 2, width, height);
    }

    function loadFrame(index) {
      if (cache.has(index)) return cache.get(index);
      const image = new Image();
      image.decoding = 'async';
      image.src = frameUrl(index);
      cache.set(index, image);
      image.addEventListener('load', () => {
        if (index === frame) drawImage(image);
      }, { once: true });
      image.addEventListener('error', () => {
        if (index === frame) drawPlaceholder('Rendered view unavailable');
      }, { once: true });
      return image;
    }

    function preloadAround(index) {
      for (let offset = 0; offset < 8; offset += 1) {
        loadFrame((index + offset) % frameCount);
        loadFrame((index - offset + frameCount) % frameCount);
      }
    }

    function setFrame(nextFrame) {
      frame = (nextFrame + frameCount) % frameCount;
      slider.value = String(frame);
      frameLabel.value = (frame + 1) + ' / ' + frameCount;
      frameLabel.textContent = (frame + 1) + ' / ' + frameCount;
      status.textContent = scenes[sceneKey].label + ' · rendered viewpoint ' + (frame + 1) + ' / ' + frameCount;
      const image = loadFrame(frame);
      if (image.complete && image.naturalWidth) drawImage(image);
      else drawPlaceholder('Loading rendered view…');
      preloadAround(frame);
    }

    function setScene(nextScene) {
      if (!scenes[nextScene] || nextScene === sceneKey) return;
      sceneKey = nextScene;
      frame = 0;
      zoom = 1;
      cache = new Map();
      sceneButtons.forEach(button => {
        const selected = button.dataset.interactiveScene === sceneKey;
        button.classList.toggle('is-active', selected);
        button.setAttribute('aria-selected', String(selected));
      });
      canvas.setAttribute('aria-label', 'Interactive ' + scenes[sceneKey].label + ' rendered viewpoints');
      setFrame(0);
    }

    function setZoom(nextZoom) {
      zoom = Math.min(2.2, Math.max(1, nextZoom));
      const image = cache.get(frame);
      if (image && image.complete && image.naturalWidth) drawImage(image);
    }

    sceneButtons.forEach(button => button.addEventListener('click', () => setScene(button.dataset.interactiveScene)));
    slider.addEventListener('input', () => setFrame(Number(slider.value)));
    canvas.addEventListener('pointerdown', event => {
      dragging = true;
      dragStartX = event.clientX;
      accumulatedDx = 0;
      canvas.classList.add('is-dragging');
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      if (!dragging) return;
      accumulatedDx += event.clientX - dragStartX;
      dragStartX = event.clientX;
      while (Math.abs(accumulatedDx) >= 5) {
        setFrame(frame + (accumulatedDx > 0 ? -1 : 1));
        accumulatedDx += accumulatedDx > 0 ? -5 : 5;
      }
    });
    const stopDragging = event => {
      dragging = false;
      accumulatedDx = 0;
      canvas.classList.remove('is-dragging');
      if (event.pointerId !== undefined && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    canvas.addEventListener('pointerup', stopDragging);
    canvas.addEventListener('pointercancel', stopDragging);
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      setZoom(zoom + (event.deltaY < 0 ? 0.1 : -0.1));
    }, { passive: false });
    canvas.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); setFrame(frame - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); setFrame(frame + 1); }
      if (event.key === '0') { event.preventDefault(); setZoom(1); }
    });

    drawPlaceholder('Loading rendered view…');
    setFrame(0);
  }

})();
