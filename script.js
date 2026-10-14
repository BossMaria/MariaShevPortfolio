const playground = document.querySelector('.playground');
const ballElements = [...document.querySelectorAll('.project-ball, .tool-ball')];
const footer = document.querySelector('.intro');
const logo = document.querySelector('.logo');
const projectCursor = document.querySelector('.project-cursor');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let bounds = { width: innerWidth, height: innerHeight, floor: innerHeight, left: 0, right: innerWidth };
let last = performance.now();
let hasLaunched = false;
let audioContext = null;
let lastClink = 0;
let drag = null;
let started = true;
let quietSince = 0;
let introRevealed = false;
let lastLogoHit = 0;
const HOME_STATE_KEY = 'shev-portfolio-home-state-brand-v2';
const tagPalettes={VATAGA:['#edfe8c','#88b718'],myCeli:['#edfe8c','#88b718'],'БИТЗ':['#ffdeef','#ff62b9'],'Secret Sauce':['#ffe47b','#ff9818'],'Secret Garden':['#ffe47b','#ff9818']};

const balls = ballElements.map((el, i) => ({
  el, x: 0, y: -400 - i * 145, vx: (i - 2) * 14, vy: 0,
  r: el.offsetWidth / 2, mass: 1, hovered: false, dragged: false,
  angle: 0, angularVelocity: 0, settlePhase: Math.random() * Math.PI * 2,
}));

function measure(reset = false) {
  const area = playground.getBoundingClientRect();
  const footerTop = footer.getBoundingClientRect().top - area.top;
  bounds = {
    width: area.width,
    height: area.height,
    floor: Math.max(200, footerTop - 10),
    left: 0,
    right: area.width,
  };
  balls.forEach((ball, i) => {
    ball.r = ball.el.offsetWidth / 2;
    if (reset || !hasLaunched) {
      const horizontalRoom = Math.max(0, bounds.width - ball.r * 2);
      ball.x = ball.r + Math.random() * horizontalRoom;
      ball.y = reducedMotion
        ? Math.max(ball.r, bounds.floor - ball.r - (i % 2) * ball.r * 1.75)
        : -ball.r - i * ball.r * (.52 + Math.random() * .48) - Math.random() * 120;
      ball.vx = (Math.random() - .5) * 46;
      ball.vy = reducedMotion ? 0 : 8 + Math.random() * 36;
      ball.angle = (Math.random() - .5) * 18;
    } else {
      ball.x = Math.min(bounds.right - ball.r, Math.max(bounds.left + ball.r, ball.x));
      ball.y = Math.min(bounds.floor - ball.r, ball.y);
    }
  });
  hasLaunched = true;
}

function enableSound() {
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) return;
  if (!audioContext) audioContext = new AudioEngine();
  if (audioContext.state === 'suspended') audioContext.resume();
}

function glassClink(strength = 1) {
  if (!audioContext || audioContext.state !== 'running') return;
  const now = audioContext.currentTime;
  if (now - lastClink < .055) return;
  lastClink = now;
  const level = Math.min(.105, .018 + strength * .00034);
  const output = audioContext.createGain();
  output.gain.setValueAtTime(level, now);
  output.gain.exponentialRampToValueAtTime(.0001, now + .13);
  output.connect(audioContext.destination);
  [1760, 2650, 3760].forEach((frequency, i) => {
    const oscillator = audioContext.createOscillator();
    const partial = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency * (1 + Math.random() * .035), now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * .91, now + .11);
    partial.gain.value = [1, .42, .16][i];
    oscillator.connect(partial).connect(output);
    oscillator.start(now);
    oscillator.stop(now + .14);
  });
}

function flashImpact(ball, strength) {
  const intensity = Math.min(1, .42 + strength / 420);
  ball.el.style.setProperty('--impact-opacity', String(.72 + intensity * .28));
  ball.el.style.setProperty('--impact-brightness', String(1.15 + intensity * .95));
  ball.el.classList.remove('is-impacting');
  void ball.el.offsetWidth;
  ball.el.classList.add('is-impacting');
  clearTimeout(ball.flashTimer);
  ball.flashTimer = setTimeout(() => ball.el.classList.remove('is-impacting'), 240);
}

function reactLogo(strength) {
  const now = performance.now();
  if (now - lastLogoHit < 480) return;
  lastLogoHit = now;
  logo.style.setProperty('--logo-hit', String(Math.min(1, strength / 350)));
  logo.classList.remove('is-hit');
  void logo.offsetWidth;
  logo.classList.add('is-hit');
  setTimeout(() => logo.classList.remove('is-hit'), 500);
}

function saveHomeState() {
  const state = {
    width: bounds.width,
    floor: bounds.floor,
    balls: balls.map(ball => ({ x: ball.x, y: ball.y, angle: ball.angle }))
  };
  sessionStorage.setItem(HOME_STATE_KEY, JSON.stringify(state));
}

function restoreHomeState() {
  const raw = sessionStorage.getItem(HOME_STATE_KEY);
  if (!raw) return false;
  sessionStorage.removeItem(HOME_STATE_KEY);
  try {
    const state = JSON.parse(raw);
    const scaleX = bounds.width / Math.max(1, state.width || bounds.width);
    const scaleY = bounds.floor / Math.max(1, state.floor || bounds.floor);
    balls.forEach((ball, index) => {
      const saved = state.balls[index];
      if (!saved) return;
      ball.x = Math.max(ball.r, Math.min(bounds.width - ball.r, saved.x * scaleX));
      ball.y = Math.max(ball.r, Math.min(bounds.floor - ball.r, saved.y * scaleY));
      ball.vx = 0; ball.vy = 0; ball.angularVelocity = 0; ball.angle = saved.angle || 0;
      ball.dragged = false;
      ball.el.classList.remove('is-dragging');
    });
    drag = null;
    introRevealed = true;
    footer.classList.add('is-revealed');
    last = performance.now();
    return true;
  } catch {
    return false;
  }
}

function resolveCollision(a, b) {
  let dx = b.x - a.x, dy = b.y - a.y;
  let dist = Math.hypot(dx, dy) || .001;
  const minDist = a.r + b.r;
  if (dist >= minDist) return;
  const nx = dx / dist, ny = dy / dist;
  const overlap = minDist - dist;
  const aShare = a.dragged ? 0 : b.dragged ? 1 : .5;
  const bShare = b.dragged ? 0 : a.dragged ? 1 : .5;
  a.x -= nx * overlap * aShare; a.y -= ny * overlap * aShare;
  b.x += nx * overlap * bShare; b.y += ny * overlap * bShare;
  const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (relative < 0) {
    if (relative < -48) {
      glassClink(-relative);
      flashImpact(a, -relative);
      flashImpact(b, -relative);
    }
    const impulse = -(1.48) * relative / (a.dragged || b.dragged ? 1 : 2);
    if (!a.dragged) { a.vx -= impulse * nx; a.vy -= impulse * ny; }
    if (!b.dragged) { b.vx += impulse * nx; b.vy += impulse * ny; }
  }
}

function step(now) {
  const dt = Math.min((now - last) / 1000, .025);
  last = now;
  if (!reducedMotion && started) {
    balls.forEach(ball => {
      ball.hovered = ball.el.matches(':hover') || ball.el.matches(':focus-visible');
      if (ball.dragged) {
        const followEase = 1 - Math.pow(.34, dt * 60);
        ball.x += (drag.targetX - ball.x) * followEase;
        ball.y += (drag.targetY - ball.y) * followEase;
        const dragSpin = Math.max(-95, Math.min(95, (ball.vx / Math.max(1, ball.r)) * 16));
        ball.angularVelocity += (dragSpin - ball.angularVelocity) * .12;
        ball.angle += ball.angularVelocity * dt;
        return;
      }
      ball.vy += 500 * dt;

      const damping = ball.hovered ? .78 : .989;
      ball.vx *= Math.pow(damping, dt * 60);
      ball.vy *= Math.pow(damping, dt * 60);
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      const rollingSpeed = Math.max(-70, Math.min(70, (ball.vx / Math.max(1, ball.r)) * 18));
      ball.angularVelocity += (rollingSpeed - ball.angularVelocity) * (1 - Math.pow(.9, dt * 60));
      ball.angularVelocity *= Math.pow(.985, dt * 60);
      ball.angle += ball.angularVelocity * dt;

      if (ball.x < bounds.left + ball.r) {
        if (ball.vx < -65) { glassClink(-ball.vx); flashImpact(ball, -ball.vx); }
        ball.x = bounds.left + ball.r; ball.vx = Math.abs(ball.vx) * .72;
      }
      if (ball.x > bounds.right - ball.r) {
        if (ball.vx > 65) { glassClink(ball.vx); flashImpact(ball, ball.vx); }
        ball.x = bounds.right - ball.r; ball.vx = -Math.abs(ball.vx) * .72;
      }
      if (ball.y < ball.r) {
        const topImpact = -ball.vy;
        if (topImpact > 55) {
          glassClink(topImpact * .7);
          flashImpact(ball, topImpact);
          if (Math.abs(ball.x - bounds.width / 2) < 175) reactLogo(topImpact);
        }
        ball.y = ball.r; ball.vy = Math.abs(ball.vy) * .65;
      }
      if (ball.y > bounds.floor - ball.r) {
        if (ball.vy > 58) {
          glassClink(ball.vy * .82);
          flashImpact(ball, ball.vy);
        }
        ball.y = bounds.floor - ball.r;
        ball.vy = -Math.abs(ball.vy) * .38;
        ball.vx *= .94;
      }
    });
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) resolveCollision(balls[i], balls[j]);
    }

    if (!introRevealed) {
      const calm = balls.every(ball => !ball.dragged && Math.hypot(ball.vx, ball.vy) < 24);
      if (calm) {
        if (!quietSince) quietSince = now;
        if (now - quietSince > 120) {
          introRevealed = true;
          footer.classList.add('is-revealed');
        }
      } else {
        quietSince = 0;
      }
    }
  }
  balls.forEach(ball => {
    ball.el.style.transform = `translate3d(${ball.x - ball.r}px, ${ball.y - ball.r}px, 0)`;
    const speed = Math.hypot(ball.vx, ball.vy);
    const settleAmount = Math.max(0, Math.min(1, 1 - speed / 18));
    const heavyWobble = Math.sin(now * .0024 + ball.settlePhase) * .32 * settleAmount;
    ball.el.style.setProperty('--ball-rotation', `${ball.angle + heavyWobble}deg`);
  });
  requestAnimationFrame(step);
}

function openProject(ball) {
  if (drag) return;
  enableSound();
  saveHomeState();
  if(reducedMotion){window.location.href=ball.el.href;return}document.body.classList.add('is-page-leaving');setTimeout(()=>{window.location.href=ball.el.href},220);
}

balls.forEach(ball => {
  ball.el.addEventListener('pointerenter', () => {
    if (drag) return;
    if(!ball.el.classList.contains('project-ball')){projectCursor.classList.remove('is-visible');return}const projectName=ball.el.dataset.project;const palette=tagPalettes[projectName]||['#edfe8c','#88b718'];projectCursor.style.setProperty('--tag-color',palette[0]);projectCursor.style.setProperty('--tag-ink',palette[1]);projectCursor.querySelector('strong').textContent = projectName;
    projectCursor.querySelector('i').textContent = ball.el.dataset.year;
    projectCursor.querySelector('b').textContent = ball.el.dataset.category;
    projectCursor.style.setProperty('--tag-a-x',`${Math.round(Math.random()*34)}px`);projectCursor.style.setProperty('--tag-a-y',`${78+Math.round(Math.random()*25)}px`);projectCursor.style.setProperty('--tag-a-r',`${2+Math.random()*7}deg`);projectCursor.style.setProperty('--tag-b-x',`${62+Math.round(Math.random()*62)}px`);projectCursor.style.setProperty('--tag-b-y',`${Math.round(Math.random()*28)}px`);projectCursor.style.setProperty('--tag-b-r',`${-7+Math.random()*6}deg`);
    projectCursor.classList.add('is-visible');
  });
  ball.el.addEventListener('pointerleave', () => projectCursor.classList.remove('is-visible'));

  ball.el.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    enableSound();
    projectCursor.classList.remove('is-visible');
    const rect = playground.getBoundingClientRect();
    ball.dragged = true;
    ball.vx = 0; ball.vy = 0;
    drag = {
      ball,
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left - ball.x,
      offsetY: event.clientY - rect.top - ball.y,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: performance.now(),
      moved: false,
      targetX: ball.x,
      targetY: ball.y,
    };
    ball.el.classList.add('is-dragging');
    ball.el.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  ball.el.addEventListener('pointermove', event => {
    if(ball.el.classList.contains('project-ball')&&(!drag||drag.ball!==ball)){const r=ball.el.getBoundingClientRect(),lx=(event.clientX-r.left)/r.width,ly=(event.clientY-r.top)/r.height,nx=Math.max(-1,Math.min(1,lx*2-1)),ny=Math.max(-1,Math.min(1,ly*2-1));ball.el.style.setProperty('--parallax-x',`${-nx*ball.r*.075}px`);ball.el.style.setProperty('--parallax-y',`${-ny*ball.r*.075}px`)}
    if (!drag || drag.ball !== ball || drag.pointerId !== event.pointerId) return;
    const rect = playground.getBoundingClientRect();
    const now = performance.now();
    const elapsed = Math.max(8, now - drag.lastTime) / 1000;
    const nextX = event.clientX - rect.left - drag.offsetX;
    const nextY = event.clientY - rect.top - drag.offsetY;
    ball.vx = (event.clientX - drag.lastX) / elapsed;
    ball.vy = (event.clientY - drag.lastY) / elapsed;
    drag.targetX = Math.max(bounds.left + ball.r, Math.min(bounds.right - ball.r, nextX));
    drag.targetY = Math.max(ball.r, Math.min(bounds.floor - ball.r, nextY));
    drag.moved ||= Math.hypot(event.clientX - drag.lastX, event.clientY - drag.lastY) > 2;
    drag.lastX = event.clientX; drag.lastY = event.clientY; drag.lastTime = now;
  });
  ball.el.addEventListener('pointerleave',()=>{if(ball.el.classList.contains('project-ball')){ball.el.style.setProperty('--parallax-x','0px');ball.el.style.setProperty('--parallax-y','0px')}});

  const release = event => {
    if (!drag || drag.ball !== ball || drag.pointerId !== event.pointerId) return;
    ball.dragged = false;
    ball.vx = Math.max(-520, Math.min(520, ball.vx * .42));
    ball.vy = Math.max(-420, Math.min(420, ball.vy * .42));
    ball.el.classList.remove('is-dragging');
    ball.el.dataset.justDragged = drag.moved ? 'true' : 'false';
    drag = null;
  };
  ball.el.addEventListener('pointerup', release);
  ball.el.addEventListener('pointercancel', release);
  ball.el.addEventListener('click', event => {
    event.preventDefault();
    if (ball.el.dataset.justDragged === 'true') {
      ball.el.dataset.justDragged = 'false';
      return;
    }
    ball.el.dataset.justDragged = 'false';
    if (ball.el.classList.contains('project-ball')) openProject(ball);
  });
});
window.addEventListener('pointermove', event => {
  const cursorX = Math.max(8, Math.min(window.innerWidth - 370, event.clientX + 18));
  const cursorY = Math.max(8, Math.min(window.innerHeight - 180, event.clientY + 18));
  projectCursor.style.setProperty('--cursor-x', `${cursorX}px`);
  projectCursor.style.setProperty('--cursor-y', `${cursorY}px`);
});
window.addEventListener('pageshow',event=>{document.body.classList.remove('is-page-leaving');if(event.persisted)restoreHomeState()});
window.addEventListener('pointerdown', enableSound, { once: true });
window.addEventListener('click', enableSound, { once: true });
window.addEventListener('touchstart', enableSound, { once: true, passive: true });
window.addEventListener('keydown', enableSound, { once: true });
enableSound();
window.addEventListener('resize', () => measure(false));
measure(true);
const restoredHome = restoreHomeState();
if (reducedMotion && !restoredHome) {
  introRevealed = true;
  footer.classList.add('is-revealed');
}
if (!reducedMotion && !restoredHome) {
  setTimeout(() => {
    introRevealed = true;
    footer.classList.add('is-revealed');
  }, 650);
}
requestAnimationFrame(step);
