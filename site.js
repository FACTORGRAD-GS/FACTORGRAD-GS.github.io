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
})();
