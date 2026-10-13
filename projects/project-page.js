const projectId = document.body.dataset.project;
const projects = window.PORTFOLIO_PROJECTS;
const project = projects[projectId];
const order = ['secret-sauce', 'vataga', 'bitz', 'secret-garden'];

function fillNextLink() {
  const currentIndex = order.indexOf(projectId);
  const next = projects[order[(currentIndex + 1) % order.length]];
  const nextLink = document.querySelector('[data-next-project]');
  nextLink.href = `${next.slug}.html`;
  nextLink.querySelector('strong').textContent = next.shortTitle;
}

function makeTags(items) {
  const list = document.createElement('div');
  list.className = 'case-tags';
  items.forEach(item => {
    const tag = document.createElement('span');
    tag.textContent = item;
    list.append(tag);
  });
  return list;
}

function fixHangingPrepositions(text) {
  return text.replace(/(^|\s)([А-Яа-яA-Za-z]{1,2})\s+(?=[А-Яа-яA-Za-z])/g, '$1$2\u00a0');
}

function renderEditorial() {
  document.body.classList.add('project-page--editorial');
  const main = document.querySelector('main');
  main.innerHTML = `
    <section class="case-head">
      <h1>${project.shortTitle}</h1>
      <div class="case-overview">
        <div class="case-introduction">
          <span>Introduction</span>
          <p>${fixHangingPrepositions(project.description)}<br>${fixHangingPrepositions(project.story)}</p>
        </div>
        <div class="case-taxonomy">
          <section data-case-services><h2>Services</h2></section>
          <section data-case-tools><h2>Tools</h2></section>
        </div>
      </div>
    </section>
    <section class="case-visuals" aria-label="Визуалы проекта"></section>
    <button class="case-to-top" type="button" aria-label="Вернуться наверх">
      <img src="../assets/projects/secret-sauce/figma/arrow-triangle.svg" alt="">
    </button>`;

  main.querySelector('[data-case-services]').append(makeTags(project.services || []));
  main.querySelector('[data-case-tools]').append(makeTags(project.tools || []));

  const visuals = main.querySelector('.case-visuals');
  project.gallery.forEach((entry, index) => {
    const item = typeof entry === 'string' ? { src: entry } : entry;
    const figure = document.createElement('figure');
    figure.className = 'case-visual';
    const image = document.createElement('img');
    image.src = item.src;
    image.alt = `${project.shortTitle}, визуал ${index + 1}`;
    image.loading = index > 2 ? 'lazy' : 'eager';
    figure.append(image);
    visuals.append(figure);
  });

  fillNextLink();
  const nextLink = document.querySelector('[data-next-project]');
  nextLink.className = 'case-footer';
  nextLink.innerHTML = `
    <span class="case-footer__socials" aria-label="Социальные сети">
      <span class="case-social-ball"><img src="../assets/projects/secret-sauce/figma/mail.svg" alt="Mail.ru"></span>
      <span class="case-social-ball"><img src="../assets/projects/secret-sauce/figma/telegram.svg" alt="Telegram"></span>
    </span>
    <span class="case-footer__next">Следующий проект <img class="case-footer__arrow" src="../assets/projects/secret-sauce/figma/arrow-triangle.svg" alt=""></span>`;

  const toTop = main.querySelector('.case-to-top');
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  const updateToTop = () => {
    toTop.classList.toggle('is-visible', window.scrollY > 900);
    const footerTop = nextLink.getBoundingClientRect().top;
    const safeGap = window.innerWidth <= 850 ? 16 : 28;
    const footerLift = Math.max(0, window.innerHeight - footerTop + safeGap);
    toTop.style.setProperty('--footer-lift', `${footerLift}px`);
  };
  window.addEventListener('scroll', updateToTop, { passive: true });
  window.addEventListener('resize', updateToTop, { passive: true });
  updateToTop();
}

function renderDefault() {
  document.querySelector('[data-project-title]').textContent = project.title;
  document.querySelector('[data-project-category]').textContent = project.category;
  document.querySelector('[data-project-year]').textContent = project.year || 'Selected project';
  document.querySelector('[data-project-credits]').textContent = project.credits;
  document.querySelector('[data-project-description]').textContent = project.description;

  const details = document.createElement('section');
  details.className = 'project-details';
  details.innerHTML = `
    <div class="project-details__label">О проекте</div>
    <div class="project-details__story"><h2>Если коротко</h2><p></p></div>
    <div class="project-details__lists">
      <div><h3>Задачи</h3><ul data-services></ul></div>
      <div><h3>Инструменты</h3><ul data-tools></ul></div>
    </div>`;
  details.querySelector('.project-details__story p').textContent = project.story || project.description;
  (project.services || []).forEach(item => {
    const li = document.createElement('li'); li.textContent = item; details.querySelector('[data-services]').append(li);
  });
  (project.tools || []).forEach(item => {
    const li = document.createElement('li'); li.textContent = item; details.querySelector('[data-tools]').append(li);
  });
  document.querySelector('.project-intro').after(details);

  const note = document.querySelector('[data-project-note]');
  if (project.note) note.textContent = project.note;
  else note.remove();

  const hero = document.querySelector('[data-project-hero]');
  hero.src = project.cover;
  hero.alt = project.title;

  const gallery = document.querySelector('[data-project-gallery]');
  const visualTitle = document.createElement('h2');
  visualTitle.className = 'project-gallery__title';
  visualTitle.textContent = project.galleryTitle || 'Визуальная система';
  gallery.append(visualTitle);
  project.gallery.forEach((item, index) => {
    const entry = typeof item === 'string' ? { src: item } : item;
    const figure = document.createElement('figure');
    figure.className = 'project-gallery__item';
    if (index === 0 || entry.layout?.includes('wide')) figure.classList.add('project-gallery__item--wide');
    if (entry.layout?.includes('contain')) figure.classList.add('project-gallery__item--contain');
    const image = document.createElement('img');
    image.src = entry.src;
    image.alt = `${project.shortTitle}, визуал ${index + 1}`;
    image.loading = index > 0 ? 'lazy' : 'eager';
    figure.append(image);
    if (entry.caption) {
      const caption = document.createElement('figcaption');
      caption.textContent = entry.caption;
      figure.append(caption);
    }
    gallery.append(figure);
  });

  if (!project.gallery.length) gallery.classList.add('project-gallery--empty');
  fillNextLink();
}

if (!project) {
  window.location.replace('../index.html');
} else {
  document.title = `${project.shortTitle} — Mari Shevchun`;
  if (project.layout === 'editorial') renderEditorial();
  else renderDefault();
  const typographyScript = document.createElement('script');
  typographyScript.src = '../typography.js';
  document.body.append(typographyScript);
  requestAnimationFrame(() => document.body.classList.add('is-ready'));
}
