const canvas = document.querySelector('#vatagaCanvas');
const ctx = canvas.getContext('2d');
const form = document.querySelector('.v-controls');

function values() {
  return Object.fromEntries(new FormData(form).entries());
}

function draw(target, options = values(), seed = 1) {
  const c = target.getContext('2d');
  const w = target.width, h = target.height;
  const angle = Number(options.angle) * Math.PI / 180;
  const stripe = Number(options.width), gap = Number(options.gap), wave = Number(options.wave);
  c.fillStyle = options.bg; c.fillRect(0, 0, w, h);
  c.save(); c.translate(w / 2, h / 2); c.rotate(angle); c.translate(-w / 2, -h / 2);
  c.fillStyle = options.ink;
  for (let x = -h; x < w + h; x += stripe + gap) {
    c.beginPath();
    for (let y = -h; y <= h * 2; y += 14) {
      const bend = Math.sin(y * .012 + x * .006 + seed) * wave;
      const px = x + bend + Math.sin(y * .003 + seed * 2) * wave * .45;
      if (y === -h) c.moveTo(px, y); else c.lineTo(px, y);
    }
    for (let y = h * 2; y >= -h; y -= 14) {
      const bend = Math.sin(y * .012 + (x + stripe) * .006 + seed) * wave;
      const px = x + stripe + bend + Math.sin(y * .003 + seed * 2) * wave * .45;
      c.lineTo(px, y);
    }
    c.closePath(); c.fill();
  }
  c.restore();
  c.fillStyle = options.ink; c.font = `700 ${Math.round(w * .115)}px Arial`; c.textAlign = 'center'; c.fillText('VATAGA', w / 2, h * .53);
  c.font = `400 ${Math.round(w * .024)}px Arial`; c.fillText('GENERATIVE STRIPE TOOL', w / 2, h * .59);
}

function render() {
  const v = values();
  form.querySelectorAll('input[type=range]').forEach(input => {
    const out = form.querySelector(`[data-out="${input.name}"]`);
    out.value = input.name === 'angle' ? `${input.value}°` : input.value;
  });
  draw(canvas, v, 1);
  document.querySelectorAll('[data-poster]').forEach((poster, i) => draw(poster, {...v, angle: Number(v.angle) + (i - 1) * 18, wave: Number(v.wave) + i * 18}, i * 2.4));
}

form.addEventListener('input', render);
form.querySelector('[data-random]').addEventListener('click', () => {
  form.angle.value = Math.round(Math.random() * 100 - 50);
  form.width.value = Math.round(Math.random() * 82 + 18);
  form.gap.value = Math.round(Math.random() * 65 + 8);
  form.wave.value = Math.round(Math.random() * 110);
  render();
});
form.querySelector('[data-save]').addEventListener('click', () => {
  const link = document.createElement('a'); link.download = 'vataga-composition.png'; link.href = canvas.toDataURL('image/png'); link.click();
});
render();
