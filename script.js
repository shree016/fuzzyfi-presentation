// FuzzyFi slides. This page only presents the project: the heat maps and the
// chart are drawn from results saved from the Python code (data.js). Nothing is
// calculated live.

const slides = [...document.querySelectorAll(".slide")];
const dotsBox = document.querySelector("#dots");
const prevButton = document.querySelector("#prev");
const nextButton = document.querySelector("#next");
const countText = document.querySelector("#count");
const whereText = document.querySelector("#where");
const progressBar = document.querySelector("#progress");

let current = 0;

/* ---------------- Moving between slides ---------------- */

const dots = slides.map((slide, index) => {
  const dot = document.createElement("button");
  dot.className = "dot";
  dot.type = "button";
  dot.setAttribute("role", "tab");
  dot.setAttribute("aria-label", `Slide ${index + 1}: ${slide.dataset.title}`);
  dot.title = slide.dataset.title;
  dot.addEventListener("click", () => show(index));
  dotsBox.append(dot);
  return dot;
});

function show(index, updateHash = true) {
  current = Math.min(Math.max(index, 0), slides.length - 1);

  slides.forEach((slide, i) => {
    const active = i === current;
    slide.classList.toggle("is-active", active);
    slide.classList.toggle("is-before", i < current);
    slide.inert = !active;
    if (active) slide.scrollTop = 0;
  });
  dots.forEach((dot, i) => dot.setAttribute("aria-selected", i === current));

  prevButton.disabled = current === 0;
  nextButton.disabled = current === slides.length - 1;
  countText.textContent = `${current + 1} / ${slides.length}`;
  whereText.textContent = slides[current].dataset.title;
  progressBar.style.width = `${((current + 1) / slides.length) * 100}%`;
  document.title = `${slides[current].dataset.title} | FuzzyFi`;

  if (updateHash) history.replaceState(null, "", `#${current + 1}`);
}

const next = () => show(current + 1);
const prev = () => show(current - 1);

prevButton.addEventListener("click", prev);
nextButton.addEventListener("click", next);
document.querySelectorAll("[data-next]").forEach((button) => button.addEventListener("click", next));
document.querySelectorAll("[data-first]").forEach((button) => button.addEventListener("click", () => show(0)));

document.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const onButton = event.target instanceof Element && event.target.closest("button, a");

  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
    case "PageDown":
      next();
      break;
    case " ":
      if (onButton) return;
      event.shiftKey ? prev() : next();
      break;
    case "ArrowLeft":
    case "ArrowUp":
    case "PageUp":
      prev();
      break;
    case "Home":
      show(0);
      break;
    case "End":
      show(slides.length - 1);
      break;
    case "f":
    case "F":
      toggleFullscreen();
      break;
    default:
      return;
  }
  event.preventDefault();
});

// Swipe left or right on a phone
let touchStart = null;
document.addEventListener("touchstart", (event) => {
  touchStart = [event.touches[0].clientX, event.touches[0].clientY];
}, { passive: true });
document.addEventListener("touchend", (event) => {
  if (!touchStart) return;
  const dx = event.changedTouches[0].clientX - touchStart[0];
  const dy = event.changedTouches[0].clientY - touchStart[1];
  touchStart = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    dx < 0 ? next() : prev();
  }
});

// Links such as #5 open that slide
window.addEventListener("hashchange", () => show(slideFromHash(), false));
function slideFromHash() {
  const number = parseInt(location.hash.slice(1), 10);
  return Number.isNaN(number) ? 0 : number - 1;
}

/* ---------------- Full screen ---------------- */

const fullscreenButton = document.querySelector("#fullscreen");

function toggleFullscreen() {
  if (!document.fullscreenEnabled) return;
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen();
  }
}

if (!document.fullscreenEnabled) fullscreenButton.hidden = true;
fullscreenButton.addEventListener("click", toggleFullscreen);
document.addEventListener("fullscreenchange", () => {
  fullscreenButton.textContent = document.fullscreenElement ? "Exit full screen" : "Full screen";
});

/* ---------------- Floor maps from the saved results ---------------- */

const WIDTH = 30;  // floor width in metres
const SWARM_COLOUR = "#1f5bff";

function paintHeat(ctx, quality, width, height) {
  const heat = document.createElement("canvas");
  heat.width = RESULTS.cols;
  heat.height = RESULTS.rows;
  const heatCtx = heat.getContext("2d");
  const image = heatCtx.createImageData(RESULTS.cols, RESULTS.rows);
  quality.forEach((value, index) => {
    const brightness = Math.round(((value - 10) / 90) * 255);
    image.data.set([brightness, brightness, brightness, 255], index * 4);
  });
  heatCtx.putImageData(image, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(heat, 0, 0, width, height);
}

function drawWalls(ctx, scale) {
  ctx.lineCap = "round";
  [["#fff", 4], ["#000", 2]].forEach(([colour, width]) => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    RESULTS.walls.forEach(([x1, y1, x2, y2]) => {
      ctx.moveTo(x1 * scale, y1 * scale);
      ctx.lineTo(x2 * scale, y2 * scale);
    });
    ctx.stroke();
  });
}

function drawDot(ctx, x, y, radius, ring) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = SWARM_COLOUR;
  ctx.fill();
  ctx.lineWidth = ring;
  ctx.strokeStyle = "#fff";
  ctx.stroke();
}

function drawParticles(ctx, scale, positions) {
  positions.forEach(([x1, y1, x2, y2]) => {
    drawDot(ctx, x1 * scale, y1 * scale, 3.5, 1);
    drawDot(ctx, x2 * scale, y2 * scale, 3.5, 1);
  });
}

function drawRouter(ctx, x, y, name, width) {
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fillStyle = "#000";
  ctx.fill();
  drawDot(ctx, x, y, 8, 3);

  ctx.font = '600 13px "Inter", "Segoe UI", Arial, sans-serif';
  const labelWidth = ctx.measureText(name).width + 20;
  const left = Math.min(Math.max(x - labelWidth / 2, 6), width - labelWidth - 6);
  const top = y < 44 ? y + 18 : y - 44;

  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.roundRect(left, top, labelWidth, 26, 13);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, left + labelWidth / 2, top + 13.5);
}

function drawRouters(ctx, scale, routers, width) {
  drawRouter(ctx, routers[0] * scale, routers[1] * scale, "Router 1", width);
  drawRouter(ctx, routers[2] * scale, routers[3] * scale, "Router 2", width);
}

function drawMap(canvas) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width) return;

  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const scale = width / WIDTH;

  switch (canvas.dataset.map) {
    case "plain":
      ctx.fillStyle = "#f2f2f2";
      ctx.fillRect(0, 0, width, height);
      drawWalls(ctx, scale);
      break;
    case "start":
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);
      drawWalls(ctx, scale);
      drawParticles(ctx, scale, RESULTS.pso.start);
      break;
    case "end":
      paintHeat(ctx, RESULTS.pso.quality, width, height);
      drawWalls(ctx, scale);
      drawParticles(ctx, scale, RESULTS.pso.end);
      drawRouters(ctx, scale, RESULTS.pso.routers, width);
      break;
    case "random":
    case "pso": {
      const result = RESULTS[canvas.dataset.map];
      paintHeat(ctx, result.quality, width, height);
      drawWalls(ctx, scale);
      drawRouters(ctx, scale, result.routers, width);
      break;
    }
  }
}

const maps = document.querySelectorAll("canvas.floor");
const drawAllMaps = () => maps.forEach(drawMap);

/* ---------------- Convergence chart ---------------- */

function drawChart() {
  const chart = document.querySelector("#chart");
  const scores = RESULTS.pso.history;
  const randomScore = RESULTS.random.score;
  const last = scores.length - 1;
  const left = 30, right = 312, top = 8, bottom = 140;

  const low = Math.floor(Math.min(scores[0], randomScore) / 10) * 10 - 10;
  const x = (iteration) => left + (iteration / last) * (right - left);
  const y = (score) => bottom - ((score - low) / (100 - low)) * (bottom - top);

  const ticks = [low, (low + 100) / 2, 100].map((value) => `
    <line x1="${left}" x2="${right}" y1="${y(value)}" y2="${y(value)}" stroke="#e6e6e6"/>
    <text x="${left - 6}" y="${y(value) + 4}" text-anchor="end" font-size="11" fill="#595959">${value}</text>`).join("");

  const points = scores.map((score, i) => `${x(i)},${y(score)}`).join(" ");

  chart.innerHTML = `
    ${ticks}
    <line x1="${left}" x2="${right}" y1="${y(randomScore)}" y2="${y(randomScore)}" stroke="#595959" stroke-width="1.5" stroke-dasharray="4 4"/>
    <text x="${right}" y="${y(randomScore) + 15}" text-anchor="end" font-size="11" fill="#595959">Random placement (${randomScore.toFixed(1)})</text>
    <polyline points="${points}" fill="none" stroke="#000" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="${x(last)}" cy="${y(scores[last])}" r="4.5" fill="#000" stroke="#fff" stroke-width="2"/>
    <text x="${x(last)}" y="${y(scores[last]) - 10}" text-anchor="end" font-size="11" font-weight="600">${scores[last].toFixed(1)}</text>
    <text x="${left}" y="158" font-size="11" fill="#595959">0</text>
    <text x="${(left + right) / 2}" y="158" text-anchor="middle" font-size="11" fill="#595959">Iteration</text>
    <text x="${right}" y="158" text-anchor="end" font-size="11" fill="#595959">${last}</text>`;
}

/* ---------------- Start ---------------- */

// Numbers in the text come from the saved results
document.querySelectorAll("[data-value]").forEach((element) => {
  const [group, key] = element.dataset.value.split(".");
  const value = RESULTS[group][key];
  element.textContent = key === "score" ? value.toFixed(1) : value;
});

show(slideFromHash(), false);
drawChart();
new ResizeObserver(drawAllMaps).observe(document.querySelector("#deck"));
document.fonts.ready.then(drawAllMaps);
