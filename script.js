"use strict";

const editor = document.querySelector("#editor");
const viewport = document.querySelector("#viewport");
const canvas = document.querySelector("#particleCanvas");
const ctx = canvas.getContext("2d", { alpha: true });
const codeOutput = document.querySelector("#codeOutput");
const caret = document.querySelector("#caret");
const status = document.querySelector("#status");
const runButton = document.querySelector("#runButton");
const replayButton = document.querySelector("#replayButton");
const burstButton = document.querySelector("#burstButton");
const fullscreenButton = document.querySelector("#fullscreenButton");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const sourceCode = `// Krishna lives in every line of devotion
const devotion = new KanhaParticles({
  colors: ["cyan", "magenta", "gold"],
  flute: true,
  peacockFeather: true,
  blessing: "infinite"
});

devotion.reveal("KANHA");`;

const palette = [
  [101, 239, 255],
  [255, 77, 218],
  [255, 221, 98],
  [99, 237, 168],
  [155, 108, 255],
];

const image = new Image();
image.src = "assets/kanha.png";

let particles = [];
let dust = [];
let animationFrame = 0;
let typeTimer = 0;
let autoRunTimer = 0;
let revealStartedAt = 0;
let isRevealing = false;
let isComplete = false;
let pointer = { x: -1000, y: -1000, active: false };
let viewportSize = { width: 0, height: 0, dpr: 1 };

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function highlight(code) {
  const tokens = /(\/\/[^\n]*|"[^"\n]*"|\b(?:const|new|true|false|KanhaParticles|devotion|reveal|colors|flute|peacockFeather|blessing)\b)/g;
  let html = "";
  let cursor = 0;

  for (const match of code.matchAll(tokens)) {
    const token = match[0];
    const index = match.index;
    html += escapeHtml(code.slice(cursor, index));

    let tokenClass = "prop";
    if (token.startsWith("//")) tokenClass = "comment";
    else if (token.startsWith('"')) tokenClass = "str";
    else if (token === "const" || token === "new") tokenClass = "kw";
    else if (token === "true" || token === "false") tokenClass = "bool";
    else if (token === "KanhaParticles") tokenClass = "class";
    else if (token === "devotion" || token === "reveal") tokenClass = "fn";

    html += `<span class="${tokenClass}">${escapeHtml(token)}</span>`;
    cursor = index + token.length;
  }

  return html + escapeHtml(code.slice(cursor));
}

function clearSequenceTimers() {
  window.clearTimeout(typeTimer);
  window.clearTimeout(autoRunTimer);
}

function typeCode() {
  clearSequenceTimers();
  codeOutput.textContent = "";
  runButton.classList.remove("is-ready");
  status.textContent = "TYPING";
  status.classList.add("is-running");
  caret.hidden = false;

  let index = 0;
  const speed = reducedMotion ? 2 : 22;

  const tick = () => {
    index += reducedMotion ? 18 : Math.random() > 0.88 ? 2 : 1;
    codeOutput.textContent = sourceCode.slice(0, index);

    if (index < sourceCode.length) {
      const ch = sourceCode[index - 1];
      const pause = ch === "\n" ? speed * 2.4 : speed + Math.random() * 13;
      typeTimer = window.setTimeout(tick, pause);
      return;
    }

    codeOutput.innerHTML = highlight(sourceCode);
    caret.hidden = true;
    status.textContent = "READY";
    status.classList.remove("is-running");
    runButton.classList.add("is-ready");
    autoRunTimer = window.setTimeout(beginReveal, reducedMotion ? 120 : 1100);
  };

  tick();
}

function resizeCanvas() {
  const rect = viewport.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  viewportSize = { width: rect.width, height: rect.height, dpr };
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (isRevealing || isComplete) {
    buildParticles();
  } else {
    buildDust();
  }
}

function buildDust() {
  const { width, height } = viewportSize;
  dust = Array.from({ length: Math.round((width * height) / 16000) }, (_, index) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 1.2 + 0.25,
    alpha: Math.random() * 0.22 + 0.04,
    phase: index * 0.71 + Math.random() * 6,
    color: palette[index % palette.length],
  }));
}

function buildParticles() {
  if (!image.complete || !image.naturalWidth) return;

  const { width, height } = viewportSize;
  const offscreen = document.createElement("canvas");
  const offCtx = offscreen.getContext("2d", { willReadFrequently: true });

  const reservedBottom = width < 600 ? 58 : 38;
  const maxWidth = width * (width < 600 ? 0.92 : 0.76);
  const maxHeight = (height - reservedBottom) * (width < 600 ? 0.9 : 0.94);
  const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
  const drawWidth = Math.floor(image.naturalWidth * scale);
  const drawHeight = Math.floor(image.naturalHeight * scale);
  const offsetX = Math.floor((width - drawWidth) / 2 - (width > 700 ? 56 : 0));
  const offsetY = Math.floor((height - reservedBottom - drawHeight) / 2);

  offscreen.width = Math.max(1, Math.floor(width));
  offscreen.height = Math.max(1, Math.floor(height));
  offCtx.clearRect(0, 0, width, height);
  offCtx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

  const pixels = offCtx.getImageData(0, 0, offscreen.width, offscreen.height).data;
  const gap = width < 600 ? 3 : 4;
  const targets = [];

  for (let y = 0; y < offscreen.height; y += gap) {
    for (let x = 0; x < offscreen.width; x += gap) {
      const pixel = (y * offscreen.width + x) * 4;
      const alpha = pixels[pixel + 3];
      if (alpha < 78 || Math.random() > alpha / 255) continue;

      targets.push({
        tx: x,
        ty: y,
        color: [pixels[pixel], pixels[pixel + 1], pixels[pixel + 2]],
      });
    }
  }

  const cap = width < 600 ? 4300 : 6500;
  const stride = Math.max(1, Math.ceil(targets.length / cap));
  const selected = targets.filter((_, index) => index % stride === 0);

  particles = selected.map((target, index) => {
    const edge = index % 4;
    let x;
    let y;

    if (edge === 0) {
      x = -25 - Math.random() * 100;
      y = Math.random() * height;
    } else if (edge === 1) {
      x = width + 25 + Math.random() * 100;
      y = Math.random() * height;
    } else if (edge === 2) {
      x = Math.random() * width;
      y = height + 25 + Math.random() * 100;
    } else {
      x = Math.random() * width;
      y = -25 - Math.random() * 100;
    }

    return {
      ...target,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: Math.random() * 1.45 + 0.55,
      alpha: 0,
      delay: Math.random() * 0.42,
      phase: Math.random() * Math.PI * 2,
    };
  });

  buildDust();
}

function beginReveal() {
  if (isRevealing) return;
  clearSequenceTimers();
  if (!image.complete || !image.naturalWidth) {
    status.textContent = "LOADING";
    image.addEventListener("load", beginReveal, { once: true });
    return;
  }

  isRevealing = true;
  isComplete = false;
  revealStartedAt = performance.now();
  editor.classList.add("is-revealing");
  editor.classList.remove("is-complete");
  status.textContent = "GENERATING";
  status.classList.add("is-running");
  runButton.classList.remove("is-ready");
  buildParticles();
}

function completeReveal() {
  if (isComplete) return;
  isComplete = true;
  status.textContent = "BLESSED";
  status.classList.remove("is-running");
  editor.classList.add("is-complete");
}

function resetSequence() {
  clearSequenceTimers();
  isRevealing = false;
  isComplete = false;
  particles = [];
  pointer.active = false;
  editor.classList.remove("is-revealing", "is-complete");
  ctx.clearRect(0, 0, viewportSize.width, viewportSize.height);
  typeCode();
}

function easeOutCubic(value) {
  const t = Math.max(0, Math.min(1, value));
  return 1 - Math.pow(1 - t, 3);
}

function drawBackgroundDust(time) {
  for (const mote of dust) {
    const shimmer = 0.55 + Math.sin(time * 0.0012 + mote.phase) * 0.45;
    const [r, g, b] = mote.color;
    ctx.beginPath();
    ctx.arc(mote.x, mote.y, mote.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${mote.alpha * shimmer})`;
    ctx.fill();
  }
}

function drawParticles(time) {
  const { width, height } = viewportSize;
  ctx.clearRect(0, 0, width, height);
  drawBackgroundDust(time);

  if (!particles.length || !isRevealing) return;

  const duration = reducedMotion ? 850 : 4700;
  const elapsed = time - revealStartedAt;
  const masterProgress = Math.min(1, elapsed / duration);

  ctx.globalCompositeOperation = "lighter";

  for (const particle of particles) {
    const local = Math.max(0, Math.min(1, (masterProgress - particle.delay) / (1 - particle.delay)));
    const eased = easeOutCubic(local);

    if (local > 0) {
      const attraction = 0.012 + eased * 0.055;
      particle.vx += (particle.tx - particle.x) * attraction;
      particle.vy += (particle.ty - particle.y) * attraction;

      const swirl = Math.sin((1 - eased) * Math.PI) * 0.7;
      particle.vx += Math.cos(particle.phase + time * 0.0017) * swirl;
      particle.vy += Math.sin(particle.phase + time * 0.0015) * swirl;

      if (pointer.active) {
        const dx = particle.x - pointer.x;
        const dy = particle.y - pointer.y;
        const distanceSquared = dx * dx + dy * dy;
        const influence = width < 600 ? 3100 : 5200;
        if (distanceSquared > 1 && distanceSquared < influence) {
          const force = (1 - distanceSquared / influence) * 1.2;
          const distance = Math.sqrt(distanceSquared);
          particle.vx += (dx / distance) * force;
          particle.vy += (dy / distance) * force;
        }
      }

      particle.vx *= 0.84;
      particle.vy *= 0.84;
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.alpha = Math.min(1, particle.alpha + 0.055);
    }

    if (local <= 0) continue;

    const [r, g, b] = particle.color;
    const distanceToTarget = Math.hypot(particle.tx - particle.x, particle.ty - particle.y);
    const settled = Math.max(0, 1 - distanceToTarget / 80);
    const twinkle = 0.82 + Math.sin(time * 0.004 + particle.phase) * 0.18;
    const radius = particle.radius * (0.82 + settled * 0.5);

    if (particle.radius > 1.35 && local > 0.3) {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, radius * 3.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.07 * particle.alpha})`;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${particle.alpha * twinkle})`;
    ctx.fill();
  }

  ctx.globalCompositeOperation = "source-over";

  if (masterProgress >= 0.92) completeReveal();
}

function animate(time) {
  drawParticles(time);
  animationFrame = requestAnimationFrame(animate);
}

function createBlessingWave(clientX, clientY) {
  if (!isRevealing || !particles.length) return;
  const rect = canvas.getBoundingClientRect();
  const originX = clientX == null ? rect.left + rect.width / 2 : clientX;
  const originY = clientY == null ? rect.top + rect.height / 2 : clientY;
  const x = originX - rect.left;
  const y = originY - rect.top;

  for (const particle of particles) {
    const dx = particle.x - x;
    const dy = particle.y - y;
    const distance = Math.max(24, Math.hypot(dx, dy));
    const force = Math.max(0, 12 - distance * 0.018);
    particle.vx += (dx / distance) * force;
    particle.vy += (dy / distance) * force;
  }
}

function setPointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
  pointer.active = true;
}

runButton.addEventListener("click", beginReveal);
replayButton.addEventListener("click", resetSequence);
burstButton.addEventListener("click", () => createBlessingWave());

canvas.addEventListener("pointermove", setPointer);
canvas.addEventListener("pointerleave", () => { pointer.active = false; });
canvas.addEventListener("pointerdown", (event) => {
  setPointer(event);
  createBlessingWave(event.clientX, event.clientY);
});

fullscreenButton.addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch {
    // Some in-app browsers disable fullscreen; the page remains fully usable.
  }
});

window.addEventListener("resize", resizeCanvas);
image.addEventListener("load", resizeCanvas, { once: true });

resizeCanvas();
typeCode();
animationFrame = requestAnimationFrame(animate);

window.addEventListener("beforeunload", () => {
  cancelAnimationFrame(animationFrame);
  clearSequenceTimers();
});
