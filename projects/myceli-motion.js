(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const automatic = () => !reduced.matches && !navigator.connection?.saveData;
  const items = [...document.querySelectorAll('.myceli-motion')].map(figure => {
    const video = figure.querySelector('video');
    const button = figure.querySelector('button');
    const item = { video, button, visible: false, pausedByUser: false };
    video.muted = true;
    item.load = () => {
      if (!video.getAttribute('src')) {
        video.src = matchMedia('(max-width: 760px)').matches ? video.dataset.mobileSrc : video.dataset.src;
        video.load();
      }
    };
    item.play = () => { item.load(); video.play().catch(() => {}); };
    button.addEventListener('click', () => {
      item.pausedByUser = !video.paused;
      if (video.paused) item.play(); else video.pause();
    });
    const update = () => {
      button.textContent = video.paused ? '▶' : 'Ⅱ';
      button.setAttribute('aria-label', `${video.paused ? 'Воспроизвести' : 'Приостановить'}: ${video.getAttribute('aria-label')}`);
    };
    video.addEventListener('play', update);
    video.addEventListener('pause', update);
    return item;
  });
  const byVideo = new Map(items.map(item => [item.video, item]));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const item = byVideo.get(entry.target);
        item.visible = entry.isIntersecting;
        if (item.visible && automatic() && !item.pausedByUser && !document.hidden) item.play();
        else item.video.pause();
      }
    }, { threshold: 0.15 });
    items.forEach(item => observer.observe(item.video));
  }
  document.addEventListener('visibilitychange', () => {
    items.forEach(item => {
      if (document.hidden) item.video.pause();
      else if (item.visible && automatic() && !item.pausedByUser) item.play();
    });
  });
  reduced.addEventListener('change', () => items.forEach(item => {
    if (!automatic()) item.video.pause();
    else if (item.visible && !item.pausedByUser && !document.hidden) item.play();
  }));
})();
