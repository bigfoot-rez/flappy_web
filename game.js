// ============================
// SKY HERO DASH (Local LB only)
// Background themes v8
// ============================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// HUD
const scoreText = document.getElementById("scoreText");
const bestText = document.getElementById("bestText");
const playerNameText = document.getElementById("playerName");
const resetButton = document.getElementById("resetButton");
const pauseButton = document.getElementById("pauseButton");

// Menu/UI
const menu = document.getElementById("menu");
const playButton = document.getElementById("playButton");
const settingsButton = document.getElementById("settingsButton");
const closeSettings = document.getElementById("closeSettings");
const settingsPanel = document.getElementById("settingsPanel");
const shopButton = document.getElementById("shopButton");
const shopPanel = document.getElementById("shopPanel");
const changeNameButton = document.getElementById("changeNameButton");

const soundToggle = document.getElementById("soundToggle");
const bgSelect = document.getElementById("bgSelect");

const suitColor = document.getElementById("suitColor");
const capeColor = document.getElementById("capeColor");
const maskColor = document.getElementById("maskColor");
const trailSelect = document.getElementById("trailSelect");

const coinsText = document.getElementById("coinsText");
const buySpark = document.getElementById("buySpark");
const buyNeon = document.getElementById("buyNeon");

const localLeaderboardEl = document.getElementById("localLeaderboard");
const toast = document.getElementById("toast");

// ----------------------------
// LocalStorage keys
// ----------------------------
const LS = {
  name: "skyhero_name_v1",
  best: "skyhero_best_v1",
  coins: "skyhero_coins_v1",
  unlocks: "skyhero_unlocks_v1",
  settings: "skyhero_settings_v2",   // bumped because we added background theme
  cosmetics: "skyhero_cosmetics_v1",
  localBoard: "skyhero_localboard_v1",
};

// ----------------------------
// Tuning
// ----------------------------
const GRAVITY = 0.55;
const LIFT = -10.0;

const BUILDING_SPEED_BASE = 2.6;
const BUILDING_WIDTH = 64;
const GAP_SIZE = 170;
const SPAWN_EVERY_FRAMES = 90;

const POWERUP_CHANCE = 0.22;
const POWERUP_SIZE = 18;

const SHIELD_DURATION_MS = 5500;
const SLOWMO_DURATION_MS = 4500;

// Rain particles
const RAIN_COUNT = 90;
let rainDrops = [];

// Stars for night
const STAR_COUNT = 55;
let stars = [];

// ----------------------------
// State
// ----------------------------
let hero, buildings, score, best, gameOver, started, paused;
let animationId = null;
let frame = 0;

let speedMult = 1;
let shieldUntil = 0;
let slowmoUntil = 0;

// Settings + cosmetics + unlocks
let settings = {
  soundOn: true,
  background: "city_day", // city_day | city_night | cloudy | rainy
};
let cosmetics = { suit: "#1f4bff", cape: "#d10000", mask: "#111111", trail: "none" };
let unlocks = { spark: false, neon: false };
let coins = 0;

// ----------------------------
// Helpers
// ----------------------------
function now() { return Date.now(); }

function toastMsg(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 1400);
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function saveJSON(key, obj) {
  localStorage.setItem(key, JSON.stringify(obj));
}

function saveAll() {
  saveJSON(LS.settings, settings);
  saveJSON(LS.cosmetics, cosmetics);
  saveJSON(LS.unlocks, unlocks);
  localStorage.setItem(LS.coins, String(coins));
}

function loadAll() {
  settings = { ...settings, ...loadJSON(LS.settings, settings) };
  cosmetics = { ...cosmetics, ...loadJSON(LS.cosmetics, cosmetics) };
  unlocks = { ...unlocks, ...loadJSON(LS.unlocks, unlocks) };
  coins = Math.max(0, Number(localStorage.getItem(LS.coins) || "0"));

  // enforce unlock rules
  if (cosmetics.trail === "spark" && !unlocks.spark) cosmetics.trail = "none";
  if (cosmetics.trail === "neon" && !unlocks.neon) cosmetics.trail = "none";

  // validate background
  const allowed = new Set(["city_day", "city_night", "cloudy", "rainy"]);
  if (!allowed.has(settings.background)) settings.background = "city_day";
}

function getName() {
  return localStorage.getItem(LS.name) || "";
}
function setName(n) {
  const name = (n || "").trim().slice(0, 16);
  if (!name) return false;
  localStorage.setItem(LS.name, name);
  playerNameText.textContent = name;
  return true;
}
function promptName() {
  const current = getName();
  const entered = prompt("Pick a nickname (max 16 chars):", current || "");
  if (entered === null) return;
  if (!setName(entered)) alert("Nickname can’t be empty.");
  renderLocalBoard();
}
function ensureName() {
  const existing = getName();
  if (existing) return existing;
  const entered = prompt("Pick a nickname (max 16 chars):", "") || "";
  if (!setName(entered)) setName("Player");
  return getName();
}

// ----------------------------
// Local leaderboard (Top 5)
// ----------------------------
function loadLocalBoard() {
  try {
    const raw = localStorage.getItem(LS.localBoard);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(x => x && typeof x.name === "string" && typeof x.score === "number")
      .map(x => ({ name: x.name.slice(0, 16), score: Math.max(0, Math.floor(x.score)) }));
  } catch { return []; }
}
function saveLocalBoard(board) {
  localStorage.setItem(LS.localBoard, JSON.stringify(board));
}
function submitLocalScore(name, s) {
  let board = loadLocalBoard();
  board.push({ name, score: s });
  board.sort((a, b) => b.score - a.score);
  board = board.slice(0, 5);
  saveLocalBoard(board);
  renderLocalBoard();
}
function renderLocalBoard() {
  const board = loadLocalBoard().slice(0, 5);
  localLeaderboardEl.innerHTML = "";
  if (board.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No scores yet.";
    localLeaderboardEl.appendChild(li);
    return;
  }
  for (const e of board) {
    const li = document.createElement("li");
    li.textContent = `${e.name}: ${e.score}`;
    localLeaderboardEl.appendChild(li);
  }
}

// ----------------------------
// Sound (tones)
// ----------------------------
let audioCtx = null;

function audioOn() { return !!settings.soundOn; }

function ensureAudio() {
  if (!audioOn()) return;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
}

function beep(freq, durationMs, type = "sine", gainVal = 0.06) {
  if (!audioOn()) return;
  ensureAudio();
  if (!audioCtx) return;

  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = gainVal;

  o.connect(g);
  g.connect(audioCtx.destination);

  o.start();
  o.stop(audioCtx.currentTime + durationMs / 1000);
}

function sfxFlap() { beep(420, 60, "square", 0.05); }
function sfxScore() { beep(620, 70, "sine", 0.06); }
function sfxPower() { beep(840, 110, "triangle", 0.06); }
function sfxCrash() { beep(160, 180, "sawtooth", 0.05); }

// ----------------------------
// Theme particles (rain/stars)
// ----------------------------
function initRain() {
  rainDrops = [];
  for (let i = 0; i < RAIN_COUNT; i++) {
    rainDrops.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vy: 6 + Math.random() * 7,
      len: 10 + Math.random() * 14,
    });
  }
}

function initStars() {
  stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * (canvas.height * 0.65),
      r: 0.6 + Math.random() * 1.4,
      tw: Math.random() * Math.PI * 2,
    });
  }
}

// ----------------------------
// Game lifecycle
// ----------------------------
function initGame() {
  hero = { x: 80, y: canvas.height * 0.5, w: 34, h: 34, vy: 0 };
  buildings = [];
  score = 0;
  best = Math.max(0, Number(localStorage.getItem(LS.best) || "0"));
  gameOver = false;
  started = false;
  paused = false;
  frame = 0;

  speedMult = 1;
  shieldUntil = 0;
  slowmoUntil = 0;

  scoreText.textContent = "0";
  bestText.textContent = String(best);
  pauseButton.textContent = "Pause";
}

function reset() {
  if (animationId) cancelAnimationFrame(animationId);
  initGame();
  animationId = requestAnimationFrame(loop);
}

function startPlay() {
  menu.classList.add("hidden");
  started = true;
  paused = false;
  ensureAudio();
  sfxFlap();
}

function togglePause() {
  if (gameOver || !started) return;
  paused = !paused;
  pauseButton.textContent = paused ? "Resume" : "Pause";
  toastMsg(paused ? "Paused" : "Go!");
}

function endGame() {
  if (gameOver) return;
  gameOver = true;
  paused = false;

  ensureAudio();
  sfxCrash();

  const name = ensureName();

  if (score > best) {
    best = score;
    localStorage.setItem(LS.best, String(best));
    bestText.textContent = String(best);
  }

  // coins reward per run
  coins += Math.min(60, Math.floor(score * 2));
  coinsText.textContent = String(coins);
  saveAll();

  submitLocalScore(name, score);

  menu.classList.remove("hidden");
}

// ----------------------------
// Buildings + power-ups
// ----------------------------
function spawnBuildingPair() {
  const margin = 70;
  const topMin = margin;
  const topMax = canvas.height - margin - GAP_SIZE;
  const top = Math.floor(topMin + Math.random() * (topMax - topMin));

  let power = null;
  if (Math.random() < POWERUP_CHANCE) {
    const types = ["shield", "slow"];
    const t = types[Math.floor(Math.random() * types.length)];
    power = { type: t, x: canvas.width + 10 + BUILDING_WIDTH / 2, y: top + GAP_SIZE / 2, taken: false };
  }

  buildings.push({ x: canvas.width + 10, top, passed: false, power });
}

function buildingSpeed() {
  let s = BUILDING_SPEED_BASE;
  if (now() < slowmoUntil) s *= 0.6;
  s *= speedMult;
  return s;
}

function applyPower(type) {
  if (type === "shield") {
    shieldUntil = now() + SHIELD_DURATION_MS;
    toastMsg("Shield ON!");
  } else if (type === "slow") {
    slowmoUntil = now() + SLOWMO_DURATION_MS;
    toastMsg("Slow-mo!");
  }
  ensureAudio();
  sfxPower();

  coins += 5;
  coinsText.textContent = String(coins);
  saveAll();
}

function heroHitBuilding(gapTop, gapBottom, bX, bRight) {
  const heroRight = hero.x + hero.w;
  const heroBottom = hero.y + hero.h;
  const xOverlap = heroRight > bX && hero.x < bRight;
  if (!xOverlap) return false;
  const hitTop = hero.y < gapTop;
  const hitBottom = heroBottom > gapBottom;
  return hitTop || hitBottom;
}

// ----------------------------
// Drawing: backgrounds
// ----------------------------
function drawClouds(strength = 1) {
  ctx.globalAlpha = 0.18 * strength;
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 6; i++) {
    const cx = (i * 120 + (frame * 0.5)) % (canvas.width + 160) - 80;
    const cy = 70 + (i % 3) * 48;
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.arc(cx + 22, cy + 6, 18, 0, Math.PI * 2);
    ctx.arc(cx - 22, cy + 8, 16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawStars() {
  ctx.save();
  ctx.fillStyle = "#fff";
  for (const s of stars) {
    const tw = 0.55 + 0.45 * Math.sin(frame * 0.03 + s.tw);
    ctx.globalAlpha = 0.25 + 0.55 * tw;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawRain() {
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "#d7f3ff";
  ctx.lineWidth = 1;

  for (const d of rainDrops) {
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x - 2, d.y + d.len);
    ctx.stroke();

    d.y += d.vy;
    d.x -= 0.7;

    if (d.y > canvas.height + 20) {
      d.y = -20;
      d.x = Math.random() * canvas.width;
    }
    if (d.x < -30) d.x = canvas.width + 30;
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawSky() {
  const bg = settings.background;

  if (bg === "city_night") {
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, "#06122b");
    sky.addColorStop(1, "#1b1f3a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawStars();
    drawClouds(0.5);
    return;
  }

  if (bg === "cloudy") {
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, "#9fb7c9");
    sky.addColorStop(1, "#d8e2ea");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawClouds(1.3);
    return;
  }

  if (bg === "rainy") {
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, "#566a7a");
    sky.addColorStop(1, "#a7b7c3");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawClouds(1.1);
    return;
  }

  // default city_day
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#87CEEB");
  sky.addColorStop(1, "#cdeffd");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawClouds(0.8);
}

function skylineColors() {
  // returns { c1,c2,c3 } for layers
  if (settings.background === "city_night") {
    return { c1: "#0d1433", c2: "#121a44", c3: "#1a2358" };
  }
  if (settings.background === "rainy") {
    return { c1: "#2f3a4a", c2: "#3b475b", c3: "#4a5870" };
  }
  if (settings.background === "cloudy") {
    return { c1: "#3a3f55", c2: "#4a5070", c3: "#59628a" };
  }
  return { c1: "#2b2b4f", c2: "#3a3a67", c3: "#4b4b85" }; // day
}

function drawSkylineLayer(speed, color, baseY, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;

  const offset = -((frame * speed) % 140);
  for (let x = offset; x < canvas.width + 140; x += 140) {
    const w = 90;
    const h = 80 + ((x + frame) % 70);
    ctx.fillRect(x, baseY - h, w, h);
  }

  ctx.globalAlpha = 1;
}

function drawParallaxCity() {
  const { c1, c2, c3 } = skylineColors();
  drawSkylineLayer(0.25, c1, 420, 0.80);
  drawSkylineLayer(0.45, c2, 360, 0.70);
  drawSkylineLayer(0.70, c3, 300, 0.60);

  // Rain overlay AFTER skyline for rainy theme
  if (settings.background === "rainy") drawRain();
}

// ----------------------------
// Drawing: buildings/hero/powerups
// ----------------------------
function drawBuilding(x, y, width, height) {
  ctx.fillStyle = "#7a0a0a";
  ctx.fillRect(x, y, width, height);

  // side shading
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#000";
  ctx.fillRect(x + width - 10, y, 10, height);
  ctx.globalAlpha = 1;

  // brick lines
  ctx.strokeStyle = "#4e0707";
  ctx.lineWidth = 1;

  for (let row = y; row < y + height; row += 14) {
    ctx.beginPath();
    ctx.moveTo(x, row);
    ctx.lineTo(x + width, row);
    ctx.stroke();
  }

  for (let row = 0; row < height; row += 28) {
    const offset = (row / 28) % 2 === 0 ? 0 : 10;
    for (let col = x + offset; col < x + width; col += 20) {
      ctx.beginPath();
      ctx.moveTo(col, y + row);
      ctx.lineTo(col, y + row + 14);
      ctx.stroke();
    }
  }

  // windows (brighter at night)
  const nightBoost = settings.background === "city_night" ? 1.0 : 0.0;
  ctx.fillStyle = `rgba(255, 234, 120, ${0.55 + nightBoost * 0.35})`;

  for (let wy = y + 10; wy < y + height - 10; wy += 46) {
    for (let wx = x + 10; wx < x + width - 12; wx += 22) {
      ctx.fillRect(wx, wy, 8, 12);
    }
  }
}

function drawPowerup(p) {
  if (!p || p.taken) return;

  ctx.save();
  ctx.translate(p.x, p.y);

  ctx.fillStyle = p.type === "shield"
    ? "rgba(0, 170, 255, 0.9)"
    : "rgba(180, 255, 90, 0.9)";

  ctx.beginPath();
  ctx.arc(0, 0, POWERUP_SIZE, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#000";
  ctx.font = "14px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(p.type === "shield" ? "S" : "⏳", 0, 1);

  ctx.restore();
}

function drawTrail() {
  if (cosmetics.trail === "none") return;

  const x = hero.x - 6;
  const y = hero.y + 18;

  if (cosmetics.trail === "spark") {
    ctx.globalAlpha = 0.65;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = `rgba(255, 200, 40, ${0.25 + i * 0.12})`;
      ctx.beginPath();
      ctx.arc(x - i * 10, y + Math.sin((frame + i) * 0.6) * 3, 4 - i * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  if (cosmetics.trail === "neon") {
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(0, 255, 230, ${0.25 + i * 0.1})`;
      ctx.lineWidth = 3 - i * 0.4;
      ctx.beginPath();
      ctx.moveTo(x - i * 10, y);
      ctx.lineTo(x - i * 10 - 8, y + Math.sin((frame + i) * 0.7) * 6);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function drawHero() {
  const x = hero.x;
  const y = hero.y;

  // shield glow
  if (now() < shieldUntil) {
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#00aaff";
    ctx.beginPath();
    ctx.arc(x + 17, y + 17, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  drawTrail();

  // cape flutter
  const flutter = Math.sin(frame * 0.2) * 4;
  ctx.fillStyle = cosmetics.cape;
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 18);
  ctx.lineTo(x - 18, y + 24 + flutter);
  ctx.lineTo(x + 2, y + 36);
  ctx.closePath();
  ctx.fill();

  // suit
  ctx.fillStyle = cosmetics.suit;
  ctx.fillRect(x, y + 10, 34, 24);

  // belt
  ctx.fillStyle = "#ffd400";
  ctx.fillRect(x + 6, y + 26, 22, 4);

  // head
  ctx.fillStyle = "#ffcc99";
  ctx.beginPath();
  ctx.arc(x + 17, y + 6, 10, 0, Math.PI * 2);
  ctx.fill();

  // mask
  ctx.fillStyle = cosmetics.mask;
  ctx.fillRect(x + 7, y + 2, 20, 6);

  // eyes
  ctx.fillStyle = "#fff";
  ctx.fillRect(x + 10, y + 4, 6, 2);
  ctx.fillRect(x + 19, y + 4, 6, 2);

  // emblem
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x + 17, y + 20, 4, 0, Math.PI * 2);
  ctx.fill();
}

// ----------------------------
// Update + draw loop
// ----------------------------
function update() {
  if (!started || gameOver || paused) return;

  // physics
  hero.vy += GRAVITY;
  hero.y += hero.vy;

  // bounds
  if (hero.y + hero.h > canvas.height) { hero.y = canvas.height - hero.h; endGame(); return; }
  if (hero.y < 0) { hero.y = 0; endGame(); return; }

  // spawn
  if (frame % SPAWN_EVERY_FRAMES === 0) spawnBuildingPair();

  // move/collide/score
  const spd = buildingSpeed();
  for (const b of buildings) {
    b.x -= spd;

    const gapTop = b.top;
    const gapBottom = b.top + GAP_SIZE;
    const right = b.x + BUILDING_WIDTH;

    // power-up positioning + pickup
    if (b.power && !b.power.taken) {
      b.power.x = b.x + BUILDING_WIDTH / 2;
      const dx = (hero.x + hero.w / 2) - b.power.x;
      const dy = (hero.y + hero.h / 2) - b.power.y;
      if (Math.hypot(dx, dy) < POWERUP_SIZE + 12) {
        b.power.taken = true;
        applyPower(b.power.type);
      }
    }

    // collision
    const hit = heroHitBuilding(gapTop, gapBottom, b.x, right);
    if (hit) {
      if (now() < shieldUntil) {
        shieldUntil = 0;
        toastMsg("Shield saved you!");
        ensureAudio();
        sfxPower();
      } else {
        endGame();
        return;
      }
    }

    // score on passing buildings
    if (!b.passed && right < hero.x) {
      b.passed = true;
      score++;
      scoreText.textContent = String(score);
      ensureAudio();
      sfxScore();

      coins += 1;
      coinsText.textContent = String(coins);
      saveAll();

      if (score % 10 === 0) speedMult = Math.min(1.25, speedMult + 0.05);
    }
  }

  buildings = buildings.filter(b => b.x + BUILDING_WIDTH > -60);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawSky();
  drawParallaxCity();

  for (const b of buildings) {
    drawBuilding(b.x, 0, BUILDING_WIDTH, b.top);
    const gapBottom = b.top + GAP_SIZE;
    drawBuilding(b.x, gapBottom, BUILDING_WIDTH, canvas.height - gapBottom);
    drawPowerup(b.power);
  }

  drawHero();

  if (paused && menu.classList.contains("hidden")) {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.font = "28px Arial";
    ctx.fillText("Paused", 145, 290);
  }
}

function loop() {
  frame++;
  update();
  draw();
  animationId = requestAnimationFrame(loop);
}

// ----------------------------
// Input + mobile zoom fix
// ----------------------------
document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  ensureAudio();
  if (menu.classList.contains("hidden")) {
    if (gameOver) reset();
    else { hero.vy = LIFT; sfxFlap(); }
  }
}, { passive: false });

document.addEventListener("keydown", (e) => {
  if (e.code !== "Space") return;
  e.preventDefault();
  ensureAudio();
  if (menu.classList.contains("hidden")) {
    if (gameOver) reset();
    else { hero.vy = LIFT; sfxFlap(); }
  }
});

// ----------------------------
// UI wiring
// ----------------------------
resetButton.addEventListener("click", () => reset());
pauseButton.addEventListener("click", () => togglePause());

playButton.addEventListener("click", () => startPlay());

settingsButton.addEventListener("click", () => {
  settingsPanel.classList.toggle("hidden");
  shopPanel.classList.add("hidden");
});

closeSettings.addEventListener("click", () => {
  settingsPanel.classList.add("hidden");
  shopPanel.classList.add("hidden");
});

shopButton.addEventListener("click", () => shopPanel.classList.toggle("hidden"));

changeNameButton.addEventListener("click", () => promptName());

// settings inputs
soundToggle.addEventListener("change", () => {
  settings.soundOn = !!soundToggle.checked;
  saveAll();
  toastMsg(settings.soundOn ? "Sound ON" : "Sound OFF");
});

bgSelect.addEventListener("change", () => {
  settings.background = bgSelect.value;
  saveAll();
  toastMsg(`Background: ${bgSelect.options[bgSelect.selectedIndex].text}`);
});

suitColor.addEventListener("input", () => { cosmetics.suit = suitColor.value; saveAll(); });
capeColor.addEventListener("input", () => { cosmetics.cape = capeColor.value; saveAll(); });
maskColor.addEventListener("input", () => { cosmetics.mask = maskColor.value; saveAll(); });

trailSelect.addEventListener("change", () => {
  const v = trailSelect.value;
  if (v === "spark" && !unlocks.spark) { toastMsg("Spark is locked. Buy it in Shop."); trailSelect.value = "none"; return; }
  if (v === "neon" && !unlocks.neon) { toastMsg("Neon is locked. Buy it in Shop."); trailSelect.value = "none"; return; }
  cosmetics.trail = v;
  saveAll();
});

// shop
buySpark.addEventListener("click", () => {
  if (unlocks.spark) return toastMsg("Spark already unlocked.");
  if (coins < 50) return toastMsg("Need 50 coins.");
  coins -= 50;
  unlocks.spark = true;
  coinsText.textContent = String(coins);
  saveAll();
  toastMsg("Spark unlocked!");
});

buyNeon.addEventListener("click", () => {
  if (unlocks.neon) return toastMsg("Neon already unlocked.");
  if (coins < 120) return toastMsg("Need 120 coins.");
  coins -= 120;
  unlocks.neon = true;
  coinsText.textContent = String(coins);
  saveAll();
  toastMsg("Neon unlocked!");
});

// ----------------------------
// Boot
// ----------------------------
(function boot() {
  loadAll();

  const name = ensureName();
  playerNameText.textContent = name;

  // init theme particles once
  initRain();
  initStars();

  // reflect UI
  soundToggle.checked = !!settings.soundOn;
  bgSelect.value = settings.background;

  suitColor.value = cosmetics.suit;
  capeColor.value = cosmetics.cape;
  maskColor.value = cosmetics.mask;
  trailSelect.value = cosmetics.trail;

  coinsText.textContent = String(coins);

  renderLocalBoard();

  menu.classList.remove("hidden");
  settingsPanel.classList.add("hidden");
  shopPanel.classList.add("hidden");

  initGame();
  loop();
})();
