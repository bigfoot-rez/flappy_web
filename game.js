// ============================
// SKY HERO DASH
// v15: restore full game.js, fix overlay stuck (CSS handled in v15 style.css),
//      bee + skeleton added, cat vs fox heads distinct, shield blocks 1 hit, glide is easier flying
// ============================

const APP_VERSION = "v15";

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
const versionText = document.getElementById("versionText");

// Settings controls
const soundToggle = document.getElementById("soundToggle");
const musicToggle = document.getElementById("musicToggle");
const bgSelect = document.getElementById("bgSelect");

const previewCanvas = document.getElementById("previewCanvas");
const pctx = previewCanvas ? previewCanvas.getContext("2d") : null;

const heroPreviewCanvas = document.getElementById("heroPreviewCanvas");
const hctx = heroPreviewCanvas ? heroPreviewCanvas.getContext("2d") : null;

const musicSelect = document.getElementById("musicSelect");
const musicPlayPreview = document.getElementById("musicPlayPreview");
const musicStopPreview = document.getElementById("musicStopPreview");

const sfxSelect = document.getElementById("sfxSelect");
const sfxTestFlap = document.getElementById("sfxTestFlap");
const sfxTestScore = document.getElementById("sfxTestScore");
const sfxTestPower = document.getElementById("sfxTestPower");
const sfxTestCrash = document.getElementById("sfxTestCrash");

const bodySelect = document.getElementById("bodySelect");
const headSelect = document.getElementById("headSelect");

const suitColor = document.getElementById("suitColor");
const capeColor = document.getElementById("capeColor");
const maskColor = document.getElementById("maskColor");
const trailSelect = document.getElementById("trailSelect");

const coinsText = document.getElementById("coinsText");
const buySpark = document.getElementById("buySpark");
const buyNeon = document.getElementById("buyNeon");
const buySmoke = document.getElementById("buySmoke");
const buyConfetti = document.getElementById("buyConfetti");

const localLeaderboardEl = document.getElementById("localLeaderboard");
const toast = document.getElementById("toast");

// Overlay
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlaySubtitle = document.getElementById("overlaySubtitle");
const overlayResume = document.getElementById("overlayResume");
const overlayHome = document.getElementById("overlayHome");
const overlaySettings = document.getElementById("overlaySettings");

// Splash
const splash = document.getElementById("splash");
const splashFill = document.getElementById("splashFill");

// ----------------------------
// LocalStorage keys
// ----------------------------
const LS = {
  name: "skyhero_name_v1",
  best: "skyhero_best_v1",
  coins: "skyhero_coins_v1",
  unlocks: "skyhero_unlocks_v2",
  settings: "skyhero_settings_v4",
  cosmetics: "skyhero_cosmetics_v4",
  localBoard: "skyhero_localboard_v1",
};

// ----------------------------
// Tuning
// ----------------------------
const BASE_GRAVITY = 0.55;
const BASE_LIFT = -10.0;

const BUILDING_SPEED_BASE = 2.6;
const BUILDING_WIDTH = 64;
const GAP_SIZE = 170;
const SPAWN_EVERY_FRAMES = 90;

const POWERUP_CHANCE = 0.25;
const POWERUP_SIZE = 18;

// Power-ups
const SHIELD_DURATION_MS = 8000;
const SHIELD_IFRAME_MS = 900;
const GLIDE_DURATION_MS = 6000;

// Particles
const RAIN_COUNT = 90;
const STAR_COUNT = 55;
let rainDrops = [];
let stars = [];
let previewRainDrops = [];
let previewStars = [];

// ----------------------------
// State
// ----------------------------
let hero, buildings, score, best, gameOver, started, paused;
let animationId = null;
let frame = 0;
let speedMult = 1;

let shieldUntil = 0;
let iframesUntil = 0;
let glideUntil = 0;

// Settings + cosmetics + unlocks
let settings = {
  soundOn: true,
  musicOn: true,
  background: "city_day",
  music: "chill",
  sfxPack: "classic",
};

let cosmetics = {
  suit: "#1f4bff",
  cape: "#d10000",
  mask: "#111111",
  trail: "none",
  body: "classic",
  head: "classic",
};

let unlocks = { spark: false, neon: false, smoke: false, confetti: false };
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

  const bgOK = new Set(["city_day", "city_night", "cloudy", "rainy"]);
  if (!bgOK.has(settings.background)) settings.background = "city_day";

  const musicOK = new Set(["none", "chill", "arcade", "night"]);
  if (!musicOK.has(settings.music)) settings.music = "chill";

  const sfxOK = new Set(["classic", "heroic", "robot"]);
  if (!sfxOK.has(settings.sfxPack)) settings.sfxPack = "classic";

  const partOK = new Set([
    "classic","armored","speed",
    "animal_cat","animal_dog","animal_fox",
    "bee","skeleton",
    "helmet","hood"
  ]);
  if (!partOK.has(cosmetics.body)) cosmetics.body = "classic";
  if (!partOK.has(cosmetics.head)) cosmetics.head = "classic";

  // trail lock safety
  if (cosmetics.trail !== "none" && !unlocks[cosmetics.trail]) cosmetics.trail = "none";
}

function getName() { return localStorage.getItem(LS.name) || ""; }
function setName(n) {
  const name = (n || "").trim().slice(0, 16);
  if (!name) return false;
  localStorage.setItem(LS.name, name);
  playerNameText.textContent = name;
  return true;
}
function ensureName() {
  const existing = getName();
  if (existing) return existing;
  const entered = prompt("Pick a nickname (max 16 chars):", "") || "";
  if (!setName(entered)) setName("Player");
  return getName();
}
function promptName() {
  const current = getName();
  const entered = prompt("Pick a nickname (max 16 chars):", current || "");
  if (entered === null) return;
  if (!setName(entered)) alert("Nickname can’t be empty.");
  renderLocalBoard();
}

// ----------------------------
// Local leaderboard
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
  saveLocalBoard(board.slice(0, 5));
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
// Rounded rect helper
// ----------------------------
function roundedRectPath(ctx2, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx2.beginPath();
  ctx2.moveTo(x + rr, y);
  ctx2.arcTo(x + w, y, x + w, y + h, rr);
  ctx2.arcTo(x + w, y + h, x, y + h, rr);
  ctx2.arcTo(x, y + h, x, y, rr);
  ctx2.arcTo(x, y, x + w, y, rr);
  ctx2.closePath();
}

// ----------------------------
// Audio (simple synth)
// ----------------------------
let audioCtx = null;
let musicTimer = null;
let musicStep = 0;
let musicPreviewActive = false;

function ensureAudio() {
  if (!settings.soundOn && !settings.musicOn) return;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
}

function oscNote(freq, durationMs, type, gainVal) {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.value = freq;

  const t0 = audioCtx.currentTime;
  const t1 = t0 + durationMs / 1000;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gainVal, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t1);

  o.connect(g);
  g.connect(audioCtx.destination);
  o.start(t0);
  o.stop(t1);
}

function sfxParams(kind) {
  const pack = settings.sfxPack;
  if (pack === "classic") {
    if (kind === "flap")  return { f: 420, d: 60,  t: "square",   g: 0.06 };
    if (kind === "score") return { f: 620, d: 70,  t: "sine",     g: 0.07 };
    if (kind === "power") return { f: 880, d: 110, t: "triangle", g: 0.07 };
    return                { f: 160, d: 180, t: "sawtooth", g: 0.06 };
  }
  if (pack === "heroic") {
    if (kind === "flap")  return { f: 520, d: 70,  t: "triangle", g: 0.07 };
    if (kind === "score") return { f: 740, d: 90,  t: "triangle", g: 0.07 };
    if (kind === "power") return { f: 980, d: 140, t: "sine",     g: 0.07 };
    return                { f: 110, d: 220, t: "sawtooth", g: 0.07 };
  }
  // robot
  if (kind === "flap")  return { f: 300, d: 55,  t: "square", g: 0.06 };
  if (kind === "score") return { f: 460, d: 75,  t: "square", g: 0.06 };
  if (kind === "power") return { f: 620, d: 120, t: "square", g: 0.06 };
  return                { f: 90,  d: 240, t: "square", g: 0.06 };
}

function playSfx(kind) {
  if (!settings.soundOn) return;
  ensureAudio();
  if (!audioCtx) return;
  const p = sfxParams(kind);
  oscNote(p.f, p.d, p.t, p.g);
}

const MUSIC = {
  chill:  { bpm: 92,  steps: [[220,440],[247,494],[262,523],[247,494],[196,392],[220,440],[247,494],[220,440]], type:"sine",     gain:0.025 },
  arcade: { bpm: 120, steps: [[330],[392],[440],[392],[523],[392],[440],[392]],                         type:"square",   gain:0.018 },
  night:  { bpm: 98,  steps: [[185,370],[207,414],[233,466],[207,414],[155,311],[185,370],[207,414],[185,370]], type:"triangle", gain:0.022 }
};

function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
  musicStep = 0;
}

function canPlayMusicInGame() {
  return menu.classList.contains("hidden")
    && !paused
    && !gameOver
    && settings.soundOn
    && settings.musicOn
    && settings.music !== "none";
}

function startMusicLoop({ force = false, preview = false } = {}) {
  stopMusic();
  ensureAudio();
  if (!audioCtx) return;

  const key = settings.music;
  if (key === "none") return;

  const m = MUSIC[key];
  const stepMs = Math.round((60_000 / m.bpm) / 2);

  musicPreviewActive = !!preview;

  musicTimer = setInterval(() => {
    if (!force && !preview && !canPlayMusicInGame()) return;
    const chord = m.steps[musicStep % m.steps.length];
    for (const f of chord) oscNote(f, Math.max(90, stepMs - 10), m.type, m.gain);
    musicStep++;
  }, stepMs);
}

function stopMusicPreview() {
  musicPreviewActive = false;
  stopMusic();
}

function ensureMusicState() {
  if (musicPreviewActive) return;
  if (canPlayMusicInGame()) {
    if (!musicTimer) startMusicLoop({ force: false, preview: false });
  } else {
    stopMusic();
  }
}

// ----------------------------
// Theme particles
// ----------------------------
function initRain(arr, w, h) {
  arr.length = 0;
  for (let i = 0; i < RAIN_COUNT; i++) {
    arr.push({ x: Math.random()*w, y: Math.random()*h, vy: 6+Math.random()*7, len: 10+Math.random()*14 });
  }
}
function initStars(arr, w, h) {
  arr.length = 0;
  for (let i = 0; i < STAR_COUNT; i++) {
    arr.push({ x: Math.random()*w, y: Math.random()*(h*0.65), r: 0.6+Math.random()*1.4, tw: Math.random()*Math.PI*2 });
  }
}

// ----------------------------
// Overlay helpers
// ----------------------------
function hideOverlayHard() {
  overlay.classList.add("hidden");
  paused = false;
  pauseButton.textContent = "Pause";
}
function showOverlay(kind) {
  overlay.classList.remove("hidden");
  if (kind === "paused") {
    overlayTitle.textContent = "Paused";
    overlaySubtitle.textContent = "Resume, change settings, or go home.";
    overlayResume.textContent = "Resume";
  } else {
    overlayTitle.textContent = "Game Over";
    overlaySubtitle.textContent = "Try again or adjust your setup.";
    overlayResume.textContent = "Play Again";
  }
}
overlay.addEventListener("pointerdown", (e) => {
  if (e.target === overlay && !gameOver) {
    paused = false;
    hideOverlayHard();
    ensureMusicState();
    toastMsg("Resumed");
  }
}, { passive: true });

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
  iframesUntil = 0;
  glideUntil = 0;

  scoreText.textContent = "0";
  bestText.textContent = String(best);
  pauseButton.textContent = "Pause";

  hideOverlayHard();
}

function reset() {
  initGame();
  toastMsg("Reset");
}

function startPlay() {
  if (gameOver) reset();
  stopMusicPreview();

  menu.classList.add("hidden");
  settingsPanel.classList.add("hidden");
  shopPanel.classList.add("hidden");

  started = true;
  paused = false;
  gameOver = false;

  hideOverlayHard();
  ensureAudio();
  playSfx("flap");
  ensureMusicState();
}

function togglePause() {
  if (!started || gameOver) return;

  paused = !paused;
  pauseButton.textContent = paused ? "Resume" : "Pause";

  if (paused) {
    stopMusic();
    showOverlay("paused");
    toastMsg("Paused");
  } else {
    hideOverlayHard();
    toastMsg("Go!");
    ensureMusicState();
  }
}

function endGame() {
  if (gameOver) return;

  gameOver = true;
  paused = false;
  stopMusic();
  showOverlay("gameover");

  ensureAudio();
  playSfx("crash");

  const name = ensureName();

  if (score > best) {
    best = score;
    localStorage.setItem(LS.best, String(best));
    bestText.textContent = String(best);
  }

  coins += Math.min(60, Math.floor(score * 2));
  coinsText.textContent = String(coins);
  saveAll();

  submitLocalScore(name, score);
}

// ----------------------------
// Power-ups
// ----------------------------
function spawnBuildingPair() {
  const margin = 70;
  const topMin = margin;
  const topMax = canvas.height - margin - GAP_SIZE;
  const top = Math.floor(topMin + Math.random() * (topMax - topMin));

  let power = null;
  if (Math.random() < POWERUP_CHANCE) {
    const types = ["shield", "glide"];
    const t = types[Math.floor(Math.random() * types.length)];
    power = { type: t, x: canvas.width + 10 + BUILDING_WIDTH/2, y: top + GAP_SIZE/2, taken: false };
  }

  buildings.push({ x: canvas.width + 10, top, passed: false, power });
}

function buildingSpeed() {
  return BUILDING_SPEED_BASE * speedMult;
}
function effectiveGravity() {
  if (now() < glideUntil) return BASE_GRAVITY * 0.35;
  return BASE_GRAVITY;
}
function effectiveLift() {
  if (now() < glideUntil) return BASE_LIFT * 1.12;
  return BASE_LIFT;
}

function applyPower(type) {
  if (type === "shield") {
    shieldUntil = now() + SHIELD_DURATION_MS;
    toastMsg("Shield ON (blocks 1 hit)");
  } else {
    glideUntil = now() + GLIDE_DURATION_MS;
    toastMsg("Glide ON (easier flying)");
  }

  playSfx("power");
  coins += 5;
  coinsText.textContent = String(coins);
  saveAll();
}

function heroHitBuilding(gapTop, gapBottom, bX, bRight) {
  const heroRight = hero.x + hero.w;
  const heroBottom = hero.y + hero.h;
  const xOverlap = heroRight > bX && hero.x < bRight;
  if (!xOverlap) return false;
  return (hero.y < gapTop) || (heroBottom > gapBottom);
}

// ----------------------------
// Background rendering
// ----------------------------
function drawClouds(ctx2, f, w, h, strength=1) {
  ctx2.globalAlpha = 0.18 * strength;
  ctx2.fillStyle = "#ffffff";
  for (let i = 0; i < 6; i++) {
    const cx = (i * 120 + (f * 0.5)) % (w + 160) - 80;
    const cy = 28 + (i % 3) * 26;
    ctx2.beginPath();
    ctx2.arc(cx, cy, 16, 0, Math.PI*2);
    ctx2.arc(cx + 18, cy + 5, 13, 0, Math.PI*2);
    ctx2.arc(cx - 18, cy + 6, 12, 0, Math.PI*2);
    ctx2.fill();
  }
  ctx2.globalAlpha = 1;
}

function drawStars(ctx2, f, starArr) {
  ctx2.save();
  ctx2.fillStyle = "#fff";
  for (const s of starArr) {
    const tw = 0.55 + 0.45 * Math.sin(f * 0.03 + s.tw);
    ctx2.globalAlpha = 0.25 + 0.55 * tw;
    ctx2.beginPath();
    ctx2.arc(s.x, s.y, s.r, 0, Math.PI*2);
    ctx2.fill();
  }
  ctx2.restore();
  ctx2.globalAlpha = 1;
}

function drawRain(ctx2, dropArr, w, h) {
  ctx2.save();
  ctx2.globalAlpha = 0.35;
  ctx2.strokeStyle = "#d7f3ff";
  ctx2.lineWidth = 1;
  for (const d of dropArr) {
    ctx2.beginPath();
    ctx2.moveTo(d.x, d.y);
    ctx2.lineTo(d.x - 2, d.y + d.len);
    ctx2.stroke();
    d.y += d.vy;
    d.x -= 0.7;
    if (d.y > h + 20) { d.y = -20; d.x = Math.random() * w; }
    if (d.x < -30) d.x = w + 30;
  }
  ctx2.restore();
  ctx2.globalAlpha = 1;
}

function skylineColors(bg) {
  if (bg === "city_night") return { c1:"#0d1433", c2:"#121a44", c3:"#1a2358" };
  if (bg === "rainy")      return { c1:"#2f3a4a", c2:"#3b475b", c3:"#4a5870" };
  if (bg === "cloudy")     return { c1:"#3a3f55", c2:"#4a5070", c3:"#59628a" };
  return { c1:"#2b2b4f", c2:"#3a3a67", c3:"#4b4b85" };
}

function drawSkylineLayer(ctx2, f, w, color, baseY, alpha, speed) {
  ctx2.globalAlpha = alpha;
  ctx2.fillStyle = color;
  const offset = -((f * speed) % 140);
  for (let x = offset; x < w + 140; x += 140) {
    const bw = 90;
    const bh = 50 + ((x + f) % 45);
    ctx2.fillRect(x, baseY - bh, bw, bh);
  }
  ctx2.globalAlpha = 1;
}

function drawBackground(ctx2, f, w, h, bg, starArr, rainArr) {
  if (bg === "city_night") {
    const sky = ctx2.createLinearGradient(0,0,0,h);
    sky.addColorStop(0,"#06122b");
    sky.addColorStop(1,"#1b1f3a");
    ctx2.fillStyle = sky;
    ctx2.fillRect(0,0,w,h);
    drawStars(ctx2, f, starArr);
    drawClouds(ctx2, f, w, h, 0.5);
  } else if (bg === "cloudy") {
    const sky = ctx2.createLinearGradient(0,0,0,h);
    sky.addColorStop(0,"#9fb7c9");
    sky.addColorStop(1,"#d8e2ea");
    ctx2.fillStyle = sky;
    ctx2.fillRect(0,0,w,h);
    drawClouds(ctx2, f, w, h, 1.3);
  } else if (bg === "rainy") {
    const sky = ctx2.createLinearGradient(0,0,0,h);
    sky.addColorStop(0,"#566a7a");
    sky.addColorStop(1,"#a7b7c3");
    ctx2.fillStyle = sky;
    ctx2.fillRect(0,0,w,h);
    drawClouds(ctx2, f, w, h, 1.1);
  } else {
    const sky = ctx2.createLinearGradient(0,0,0,h);
    sky.addColorStop(0,"#87CEEB");
    sky.addColorStop(1,"#cdeffd");
    ctx2.fillStyle = sky;
    ctx2.fillRect(0,0,w,h);
    drawClouds(ctx2, f, w, h, 0.8);
  }

  const { c1, c2, c3 } = skylineColors(bg);
  drawSkylineLayer(ctx2, f, w, c1, h - 10, 0.85, 0.25);
  drawSkylineLayer(ctx2, f, w, c2, h - 28, 0.75, 0.45);
  drawSkylineLayer(ctx2, f, w, c3, h - 46, 0.65, 0.70);

  if (bg === "rainy") drawRain(ctx2, rainArr, w, h);
}

// ----------------------------
// Buildings + powerups visuals
// ----------------------------
function drawBuilding(x, y, width, height) {
  ctx.fillStyle = "#7a0a0a";
  ctx.fillRect(x, y, width, height);

  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#000";
  ctx.fillRect(x + width - 10, y, 10, height);
  ctx.globalAlpha = 1;

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

  ctx.fillStyle = (p.type === "shield")
    ? "rgba(0, 170, 255, 0.92)"
    : "rgba(255, 230, 90, 0.92)";

  ctx.beginPath();
  ctx.arc(0, 0, POWERUP_SIZE, 0, Math.PI*2);
  ctx.fill();

  ctx.fillStyle = "#000";
  ctx.font = "14px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(p.type === "shield" ? "S" : "G", 0, 1);

  ctx.restore();
}

// ----------------------------
// Hero visuals
// ----------------------------
function drawTrail(ctx2, f, hx, hy, trail) {
  if (trail === "none") return;
  const x = hx - 6;
  const y = hy + 18;

  if (trail === "spark") {
    ctx2.globalAlpha = 0.65;
    for (let i = 0; i < 4; i++) {
      ctx2.fillStyle = `rgba(255, 200, 40, ${0.25 + i * 0.12})`;
      ctx2.beginPath();
      ctx2.arc(x - i * 10, y + Math.sin((f + i) * 0.6) * 3, 4 - i * 0.7, 0, Math.PI*2);
      ctx2.fill();
    }
    ctx2.globalAlpha = 1;
    return;
  }

  if (trail === "neon") {
    ctx2.globalAlpha = 0.55;
    for (let i = 0; i < 5; i++) {
      ctx2.strokeStyle = `rgba(0, 255, 230, ${0.25 + i * 0.1})`;
      ctx2.lineWidth = 3 - i * 0.4;
      ctx2.beginPath();
      ctx2.moveTo(x - i * 10, y);
      ctx2.lineTo(x - i * 10 - 8, y + Math.sin((f + i) * 0.7) * 6);
      ctx2.stroke();
    }
    ctx2.globalAlpha = 1;
    return;
  }

  if (trail === "smoke") {
    ctx2.globalAlpha = 0.45;
    for (let i = 0; i < 5; i++) {
      ctx2.fillStyle = `rgba(40, 40, 40, ${0.20 + i * 0.06})`;
      ctx2.beginPath();
      ctx2.arc(x - i * 10, y + Math.sin((f + i) * 0.5) * 4, 6 - i * 0.8, 0, Math.PI*2);
      ctx2.fill();
    }
    ctx2.globalAlpha = 1;
    return;
  }

  if (trail === "confetti") {
    ctx2.globalAlpha = 0.75;
    for (let i = 0; i < 10; i++) {
      const ox = x - (i * 6) - (f % 6);
      const oy = y + Math.sin((f + i) * 0.9) * 6;
      ctx2.fillStyle = `hsl(${(f * 6 + i * 36) % 360} 90% 60%)`;
      ctx2.fillRect(ox, oy, 3, 3);
    }
    ctx2.globalAlpha = 1;
    return;
  }
}

function drawAnimalHead(ctx2, hx, hy, kind, furColor, accentColor) {
  ctx2.fillStyle = furColor;
  ctx2.beginPath();
  ctx2.arc(hx + 17, hy + 8, 10, 0, Math.PI*2);
  ctx2.fill();

  if (kind === "animal_cat") {
    // cat: sharp ears + whiskers + tiny triangle nose
    ctx2.beginPath();
    ctx2.moveTo(hx + 10, hy + 2);
    ctx2.lineTo(hx + 6, hy - 9);
    ctx2.lineTo(hx + 14, hy - 2);
    ctx2.closePath();
    ctx2.fill();

    ctx2.beginPath();
    ctx2.moveTo(hx + 24, hy + 2);
    ctx2.lineTo(hx + 28, hy - 9);
    ctx2.lineTo(hx + 20, hy - 2);
    ctx2.closePath();
    ctx2.fill();

    ctx2.globalAlpha = 0.40;
    ctx2.strokeStyle = "#000";
    ctx2.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx2.beginPath();
      ctx2.moveTo(hx + 9, hy + 13 + i * 2);
      ctx2.lineTo(hx + 2, hy + 12 + i * 2);
      ctx2.stroke();

      ctx2.beginPath();
      ctx2.moveTo(hx + 25, hy + 13 + i * 2);
      ctx2.lineTo(hx + 32, hy + 12 + i * 2);
      ctx2.stroke();
    }
    ctx2.globalAlpha = 1;

    ctx2.fillStyle = accentColor;
    ctx2.beginPath();
    ctx2.moveTo(hx + 17, hy + 14);
    ctx2.lineTo(hx + 14.5, hy + 11.5);
    ctx2.lineTo(hx + 19.5, hy + 11.5);
    ctx2.closePath();
    ctx2.fill();
  }

  if (kind === "animal_dog") {
    // dog: floppy ears + snout
    ctx2.globalAlpha = 0.9;
    ctx2.beginPath();
    ctx2.ellipse(hx + 7, hy + 10, 5, 9, 0.35, 0, Math.PI*2);
    ctx2.fill();
    ctx2.beginPath();
    ctx2.ellipse(hx + 27, hy + 10, 5, 9, -0.35, 0, Math.PI*2);
    ctx2.fill();
    ctx2.globalAlpha = 1;

    ctx2.fillStyle = "rgba(255,255,255,0.6)";
    ctx2.beginPath();
    ctx2.ellipse(hx + 17, hy + 13, 8.5, 6, 0, 0, Math.PI*2);
    ctx2.fill();

    ctx2.fillStyle = accentColor;
    ctx2.beginPath();
    ctx2.arc(hx + 17, hy + 13, 2.2, 0, Math.PI*2);
    ctx2.fill();
  }

  if (kind === "animal_fox") {
    // fox: taller ears + white cheeks + longer snout
    ctx2.beginPath();
    ctx2.moveTo(hx + 10, hy + 2);
    ctx2.lineTo(hx + 4, hy - 12);
    ctx2.lineTo(hx + 16, hy - 1);
    ctx2.closePath();
    ctx2.fill();

    ctx2.beginPath();
    ctx2.moveTo(hx + 24, hy + 2);
    ctx2.lineTo(hx + 30, hy - 12);
    ctx2.lineTo(hx + 18, hy - 1);
    ctx2.closePath();
    ctx2.fill();

    ctx2.globalAlpha = 0.45;
    ctx2.fillStyle = "#fff";
    ctx2.beginPath();
    ctx2.arc(hx + 10, hy + 13, 4.5, 0, Math.PI*2);
    ctx2.arc(hx + 24, hy + 13, 4.5, 0, Math.PI*2);
    ctx2.fill();
    ctx2.globalAlpha = 1;

    ctx2.fillStyle = "rgba(255,255,255,0.55)";
    ctx2.beginPath();
    ctx2.ellipse(hx + 18, hy + 14, 8.5, 5.2, 0.2, 0, Math.PI*2);
    ctx2.fill();

    ctx2.fillStyle = accentColor;
    ctx2.beginPath();
    ctx2.arc(hx + 21, hy + 14, 2.0, 0, Math.PI*2);
    ctx2.fill();
  }

  // eyes
  ctx2.fillStyle = "#fff";
  ctx2.fillRect(hx + 11, hy + 7, 5, 2);
  ctx2.fillRect(hx + 20, hy + 7, 5, 2);
}

function drawBeeHead(ctx2, hx, hy) {
  ctx2.fillStyle = "#ffd400";
  ctx2.beginPath();
  ctx2.arc(hx + 17, hy + 8, 10, 0, Math.PI*2);
  ctx2.fill();

  ctx2.globalAlpha = 0.25;
  ctx2.fillStyle = "#000";
  ctx2.fillRect(hx + 9, hy + 6, 16, 3);
  ctx2.globalAlpha = 1;

  ctx2.strokeStyle = "#000";
  ctx2.lineWidth = 2;
  ctx2.beginPath();
  ctx2.moveTo(hx + 14, hy - 1);
  ctx2.lineTo(hx + 10, hy - 8);
  ctx2.stroke();
  ctx2.beginPath();
  ctx2.moveTo(hx + 20, hy - 1);
  ctx2.lineTo(hx + 24, hy - 8);
  ctx2.stroke();

  ctx2.fillStyle = "#fff";
  ctx2.fillRect(hx + 11, hy + 7, 5, 2);
  ctx2.fillRect(hx + 20, hy + 7, 5, 2);
}

function drawSkeletonHead(ctx2, hx, hy) {
  ctx2.fillStyle = "#f1f1f1";
  ctx2.beginPath();
  ctx2.arc(hx + 17, hy + 8, 10, 0, Math.PI*2);
  ctx2.fill();

  ctx2.fillStyle = "#111";
  ctx2.beginPath();
  ctx2.arc(hx + 13, hy + 8, 2.8, 0, Math.PI*2);
  ctx2.arc(hx + 21, hy + 8, 2.8, 0, Math.PI*2);
  ctx2.fill();

  ctx2.globalAlpha = 0.5;
  ctx2.fillStyle = "#111";
  ctx2.fillRect(hx + 11, hy + 14, 12, 2);
  ctx2.globalAlpha = 1;
}

function drawHeroVariant(ctx2, f, hx, hy, opts) {
  const { suit, cape, mask, body, head, trail, shielded, iframes } = opts;

  if (shielded) {
    ctx2.globalAlpha = 0.22;
    ctx2.fillStyle = "#00aaff";
    ctx2.beginPath();
    ctx2.arc(hx + 17, hy + 17, 30, 0, Math.PI*2);
    ctx2.fill();
    ctx2.globalAlpha = 1;
  } else if (iframes) {
    ctx2.globalAlpha = 0.35 + 0.25 * Math.sin(f * 0.6);
  }

  drawTrail(ctx2, f, hx, hy, trail);

  const capeAllowed = !(body === "skeleton" || body === "bee");
  if (capeAllowed) {
    const flutter = Math.sin(f * 0.2) * 4;
    ctx2.fillStyle = cape;
    ctx2.beginPath();
    ctx2.moveTo(hx + 6, hy + 18);
    ctx2.lineTo(hx - 18, hy + 24 + flutter);
    ctx2.lineTo(hx + 2, hy + 36);
    ctx2.closePath();
    ctx2.fill();
  }

  // body
  if (body === "bee") {
    ctx2.fillStyle = "#ffd400";
    ctx2.beginPath();
    ctx2.ellipse(hx + 17, hy + 22, 16, 12, 0, 0, Math.PI*2);
    ctx2.fill();

    ctx2.globalAlpha = 0.35;
    ctx2.fillStyle = "#000";
    ctx2.fillRect(hx + 6, hy + 18, 22, 3);
    ctx2.fillRect(hx + 6, hy + 23, 22, 3);
    ctx2.fillRect(hx + 6, hy + 28, 22, 3);
    ctx2.globalAlpha = 1;

    ctx2.globalAlpha = 0.35;
    ctx2.fillStyle = "#b9f2ff";
    ctx2.beginPath();
    ctx2.ellipse(hx + 12, hy + 16, 8, 6, -0.3, 0, Math.PI*2);
    ctx2.ellipse(hx + 22, hy + 16, 8, 6, 0.3, 0, Math.PI*2);
    ctx2.fill();
    ctx2.globalAlpha = 1;
  } else if (body === "skeleton") {
    ctx2.fillStyle = "#f1f1f1";
    roundedRectPath(ctx2, hx + 4, hy + 10, 26, 24, 6);
    ctx2.fill();

    ctx2.globalAlpha = 0.35;
    ctx2.strokeStyle = "#111";
    ctx2.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx2.beginPath();
      ctx2.moveTo(hx + 7, hy + 14 + i * 5);
      ctx2.lineTo(hx + 27, hy + 14 + i * 5);
      ctx2.stroke();
    }
    ctx2.beginPath();
    ctx2.moveTo(hx + 17, hy + 12);
    ctx2.lineTo(hx + 17, hy + 33);
    ctx2.stroke();
    ctx2.globalAlpha = 1;
  } else if (body.startsWith("animal_")) {
    ctx2.fillStyle = suit;
    ctx2.beginPath();
    ctx2.ellipse(hx + 17, hy + 22, 15.5, 11.5, 0, 0, Math.PI*2);
    ctx2.fill();

    if (body === "animal_cat") {
      ctx2.globalAlpha = 0.7;
      ctx2.beginPath();
      ctx2.ellipse(hx + 2, hy + 23, 6, 3, -0.6, 0, Math.PI*2);
      ctx2.fill();
      ctx2.globalAlpha = 1;
    } else if (body === "animal_dog") {
      ctx2.globalAlpha = 0.25;
      ctx2.fillStyle = "#000";
      ctx2.beginPath();
      ctx2.ellipse(hx + 22, hy + 22, 5, 4, 0.2, 0, Math.PI*2);
      ctx2.fill();
      ctx2.globalAlpha = 1;
    } else {
      ctx2.globalAlpha = 0.7;
      ctx2.fillStyle = "rgba(255,255,255,0.7)";
      ctx2.beginPath();
      ctx2.ellipse(hx + 3, hy + 24, 6, 3, -0.8, 0, Math.PI*2);
      ctx2.fill();
      ctx2.globalAlpha = 1;
    }
  } else if (body === "armored") {
    ctx2.fillStyle = suit;
    ctx2.fillRect(hx, hy + 10, 34, 24);
    ctx2.globalAlpha = 0.25;
    ctx2.fillStyle = "#000";
    ctx2.fillRect(hx + 2, hy + 12, 30, 4);
    ctx2.fillRect(hx + 2, hy + 18, 30, 4);
    ctx2.fillRect(hx + 2, hy + 24, 30, 4);
    ctx2.globalAlpha = 1;
  } else if (body === "speed") {
    ctx2.fillStyle = suit;
    roundedRectPath(ctx2, hx, hy + 10, 34, 24, 8);
    ctx2.fill();
    ctx2.globalAlpha = 0.22;
    ctx2.fillStyle = "#fff";
    ctx2.fillRect(hx + 6, hy + 12, 4, 20);
    ctx2.fillRect(hx + 16, hy + 12, 3, 20);
    ctx2.globalAlpha = 1;
  } else {
    ctx2.fillStyle = suit;
    ctx2.fillRect(hx, hy + 10, 34, 24);
    ctx2.fillStyle = "#ffd400";
    ctx2.fillRect(hx + 6, hy + 26, 22, 4);
  }

  // head
  if (head === "bee") drawBeeHead(ctx2, hx, hy);
  else if (head === "skeleton") drawSkeletonHead(ctx2, hx, hy);
  else if (head.startsWith("animal_")) drawAnimalHead(ctx2, hx, hy, head, suit, mask);
  else if (head === "helmet") {
    ctx2.fillStyle = "#c7c7c7";
    ctx2.beginPath();
    ctx2.arc(hx + 17, hy + 6, 11, Math.PI, 0);
    ctx2.lineTo(hx + 28, hy + 10);
    ctx2.lineTo(hx + 6, hy + 10);
    ctx2.closePath();
    ctx2.fill();

    ctx2.fillStyle = mask;
    ctx2.fillRect(hx + 7, hy + 4, 20, 6);

    ctx2.fillStyle = "#fff";
    ctx2.fillRect(hx + 10, hy + 6, 6, 2);
    ctx2.fillRect(hx + 19, hy + 6, 6, 2);
  } else if (head === "hood") {
    ctx2.fillStyle = "#2b2b2b";
    ctx2.beginPath();
    ctx2.arc(hx + 17, hy + 7, 12, 0, Math.PI*2);
    ctx2.fill();

    ctx2.fillStyle = "#ffcc99";
    ctx2.beginPath();
    ctx2.arc(hx + 17, hy + 8, 8, 0, Math.PI*2);
    ctx2.fill();

    ctx2.fillStyle = mask;
    ctx2.fillRect(hx + 9, hy + 6, 16, 5);

    ctx2.fillStyle = "#fff";
    ctx2.fillRect(hx + 11, hy + 7, 5, 2);
    ctx2.fillRect(hx + 20, hy + 7, 5, 2);
  } else {
    ctx2.fillStyle = "#ffcc99";
    ctx2.beginPath();
    ctx2.arc(hx + 17, hy + 6, 10, 0, Math.PI*2);
    ctx2.fill();

    ctx2.fillStyle = mask;
    ctx2.fillRect(hx + 7, hy + 2, 20, 6);

    ctx2.fillStyle = "#fff";
    ctx2.fillRect(hx + 10, hy + 4, 6, 2);
    ctx2.fillRect(hx + 19, hy + 4, 6, 2);
  }

  ctx2.globalAlpha = 1;
}

function drawHero() {
  drawHeroVariant(ctx, frame, hero.x, hero.y, {
    suit: cosmetics.suit,
    cape: cosmetics.cape,
    mask: cosmetics.mask,
    body: cosmetics.body,
    head: cosmetics.head,
    trail: cosmetics.trail,
    shielded: now() < shieldUntil,
    iframes: now() < iframesUntil,
  });
}

// ----------------------------
// Update + draw loop
// ----------------------------
function update() {
  if (!paused && !gameOver && !overlay.classList.contains("hidden")) {
    // extra safety: if overlay shows while not paused/gameover, hide it
    hideOverlayHard();
  }

  if (!started || gameOver || paused) return;

  hero.vy += effectiveGravity();
  hero.y += hero.vy;

  if (hero.y + hero.h > canvas.height) { hero.y = canvas.height - hero.h; endGame(); return; }
  if (hero.y < 0) { hero.y = 0; endGame(); return; }

  if (frame % SPAWN_EVERY_FRAMES === 0) spawnBuildingPair();

  const spd = buildingSpeed();

  for (const b of buildings) {
    b.x -= spd;

    const gapTop = b.top;
    const gapBottom = b.top + GAP_SIZE;
    const right = b.x + BUILDING_WIDTH;

    if (b.power && !b.power.taken) {
      b.power.x = b.x + BUILDING_WIDTH/2;
      const dx = (hero.x + hero.w/2) - b.power.x;
      const dy = (hero.y + hero.h/2) - b.power.y;
      if (Math.hypot(dx, dy) < POWERUP_SIZE + 12) {
        b.power.taken = true;
        applyPower(b.power.type);
      }
    }

    const hit = heroHitBuilding(gapTop, gapBottom, b.x, right);
    if (hit) {
      if (now() < iframesUntil) {
        // ignore
      } else if (now() < shieldUntil) {
        shieldUntil = 0;
        iframesUntil = now() + SHIELD_IFRAME_MS;
        hero.vy = Math.min(hero.vy, 0);
        hero.y = Math.max(0, hero.y - 18);
        toastMsg("Shield blocked the hit!");
        playSfx("power");
      } else {
        endGame();
        return;
      }
    }

    if (!b.passed && right < hero.x) {
      b.passed = true;
      score++;
      scoreText.textContent = String(score);
      playSfx("score");

      coins += 1;
      coinsText.textContent = String(coins);
      saveAll();

      if (score % 12 === 0) speedMult = Math.min(1.18, speedMult + 0.03);
    }
  }

  buildings = buildings.filter(b => b.x + BUILDING_WIDTH > -60);
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawBackground(ctx, frame, canvas.width, canvas.height, settings.background, stars, rainDrops);

  for (const b of buildings) {
    drawBuilding(b.x, 0, BUILDING_WIDTH, b.top);
    const gapBottom = b.top + GAP_SIZE;
    drawBuilding(b.x, gapBottom, BUILDING_WIDTH, canvas.height - gapBottom);
    drawPowerup(b.power);
  }

  drawHero();

  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.font = "12px Arial";
  const buffs = [
    now() < shieldUntil ? "Shield" : "",
    now() < glideUntil ? "Glide" : "",
    now() < iframesUntil ? "Safe" : ""
  ].filter(Boolean).join(" • ");
  if (buffs) ctx.fillText(buffs, 12, 18);
  ctx.globalAlpha = 1;

  if (paused) {
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#000";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.globalAlpha = 1;
  }
}

function drawPreview() {
  if (!pctx || !previewCanvas) return;
  drawBackground(pctx, frame, previewCanvas.width, previewCanvas.height, settings.background, previewStars, previewRainDrops);
}

function drawHeroPreview() {
  if (!hctx || !heroPreviewCanvas) return;

  const w = heroPreviewCanvas.width;
  const h = heroPreviewCanvas.height;
  hctx.clearRect(0,0,w,h);

  const g = hctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(1, "rgba(230,240,255,0.95)");
  hctx.fillStyle = g;
  hctx.fillRect(0,0,w,h);

  const hx = Math.floor(w/2 - 17);
  const hy = Math.floor(h/2 - 20);

  drawHeroVariant(hctx, frame, hx, hy, {
    suit: cosmetics.suit,
    cape: cosmetics.cape,
    mask: cosmetics.mask,
    body: cosmetics.body,
    head: cosmetics.head,
    trail: cosmetics.trail,
    shielded: false,
    iframes: false,
  });
}

function loop() {
  frame++;
  update();
  draw();
  drawPreview();
  drawHeroPreview();
  ensureMusicState();
  animationId = requestAnimationFrame(loop);
}

// ----------------------------
// Input + mobile zoom fix
// ----------------------------
document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  ensureAudio();

  // If overlay is showing while not gameOver, a tap clears it (extra safety)
  if (!overlay.classList.contains("hidden") && !gameOver) {
    paused = false;
    hideOverlayHard();
    ensureMusicState();
    return;
  }

  if (gameOver) {
    reset();
    startPlay();
    return;
  }

  if (menu.classList.contains("hidden") && !paused) {
    hero.vy = effectiveLift();
    playSfx("flap");
  }
}, { passive: false });

document.addEventListener("keydown", (e) => {
  if (e.code === "Escape") {
    if (!overlay.classList.contains("hidden") && !gameOver) {
      paused = false;
      hideOverlayHard();
      ensureMusicState();
    }
    return;
  }
  if (e.code !== "Space") return;
  e.preventDefault();
  ensureAudio();

  if (gameOver) {
    reset();
    startPlay();
    return;
  }

  if (menu.classList.contains("hidden") && !paused) {
    hero.vy = effectiveLift();
    playSfx("flap");
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

// Overlay buttons
overlayResume.addEventListener("click", () => {
  if (gameOver) { reset(); startPlay(); }
  else { togglePause(); }
});
overlayHome.addEventListener("click", () => {
  paused = false;
  gameOver = false;
  started = false;
  hideOverlayHard();
  stopMusicPreview();
  stopMusic();
  menu.classList.remove("hidden");
  settingsPanel.classList.add("hidden");
  shopPanel.classList.add("hidden");
});
overlaySettings.addEventListener("click", () => {
  paused = false;
  hideOverlayHard();
  stopMusicPreview();
  stopMusic();
  menu.classList.remove("hidden");
  settingsPanel.classList.remove("hidden");
  shopPanel.classList.add("hidden");
});

// Settings controls
soundToggle.addEventListener("change", () => {
  settings.soundOn = !!soundToggle.checked;
  saveAll();
  if (!settings.soundOn) { stopMusicPreview(); stopMusic(); toastMsg("Sound OFF"); }
  else toastMsg("Sound ON");
});

musicToggle.addEventListener("change", () => {
  settings.musicOn = !!musicToggle.checked;
  saveAll();
  toastMsg(settings.musicOn ? "Music ON" : "Music OFF");
  if (!settings.musicOn) { stopMusicPreview(); stopMusic(); }
});

bgSelect.addEventListener("change", () => {
  settings.background = bgSelect.value;
  saveAll();
  toastMsg(`Background: ${bgSelect.options[bgSelect.selectedIndex].text}`);
});

musicSelect.addEventListener("change", () => {
  settings.music = musicSelect.value;
  saveAll();
  toastMsg(`Track: ${musicSelect.options[musicSelect.selectedIndex].text}`);
});

// Music preview
musicPlayPreview.addEventListener("click", () => {
  ensureAudio();
  if (!audioCtx) return toastMsg("Tap the game canvas once, then try preview.");
  if (!settings.soundOn || !settings.musicOn || settings.music === "none") {
    return toastMsg("Turn on Music + pick a track first.");
  }
  startMusicLoop({ force: true, preview: true });
  toastMsg("Music preview playing");
});

musicStopPreview.addEventListener("click", () => {
  stopMusicPreview();
  toastMsg("Music stopped");
});

// SFX
sfxSelect.addEventListener("change", () => {
  settings.sfxPack = sfxSelect.value;
  saveAll();
  toastMsg(`SFX Pack: ${sfxSelect.options[sfxSelect.selectedIndex].text}`);
});
sfxTestFlap.addEventListener("click", () => { ensureAudio(); playSfx("flap"); });
sfxTestScore.addEventListener("click", () => { ensureAudio(); playSfx("score"); });
sfxTestPower.addEventListener("click", () => { ensureAudio(); playSfx("power"); });
sfxTestCrash.addEventListener("click", () => { ensureAudio(); playSfx("crash"); });

// Cosmetics
bodySelect.addEventListener("change", () => { cosmetics.body = bodySelect.value; saveAll(); toastMsg("Body updated"); });
headSelect.addEventListener("change", () => { cosmetics.head = headSelect.value; saveAll(); toastMsg("Head updated"); });

suitColor.addEventListener("input", () => { cosmetics.suit = suitColor.value; saveAll(); });
capeColor.addEventListener("input", () => { cosmetics.cape = capeColor.value; saveAll(); });
maskColor.addEventListener("input", () => { cosmetics.mask = maskColor.value; saveAll(); });

trailSelect.addEventListener("change", () => {
  const v = trailSelect.value;
  if (v !== "none" && !unlocks[v]) {
    toastMsg("That trail is locked. Buy it in Shop.");
    trailSelect.value = "none";
    return;
  }
  cosmetics.trail = v;
  saveAll();
  toastMsg("Trail updated");
});

// Shop
function buy(item, cost) {
  if (unlocks[item]) return toastMsg("Already unlocked.");
  if (coins < cost) return toastMsg(`Need ${cost} coins.`);
  coins -= cost;
  unlocks[item] = true;
  coinsText.textContent = String(coins);
  saveAll();
  toastMsg("Unlocked!");
}
buySpark.addEventListener("click", () => buy("spark", 50));
buyNeon.addEventListener("click", () => buy("neon", 120));
buySmoke.addEventListener("click", () => buy("smoke", 80));
buyConfetti.addEventListener("click", () => buy("confetti", 160));

// ----------------------------
// Splash
// ----------------------------
function runSplash() {
  if (!splash || !splashFill) return;
  let pct = 0;
  const t = setInterval(() => {
    pct = Math.min(100, pct + 12);
    splashFill.style.width = pct + "%";
    if (pct >= 100) {
      clearInterval(t);
      setTimeout(() => splash.style.display = "none", 150);
    }
  }, 120);
}

// ----------------------------
// Boot
// ----------------------------
(function boot() {
  if (versionText) versionText.textContent = APP_VERSION;

  runSplash();
  loadAll();

  const name = ensureName();
  playerNameText.textContent = name;

  initRain(rainDrops, canvas.width, canvas.height);
  initStars(stars, canvas.width, canvas.height);
  if (previewCanvas) {
    initRain(previewRainDrops, previewCanvas.width, previewCanvas.height);
    initStars(previewStars, previewCanvas.width, previewCanvas.height);
  }

  soundToggle.checked = !!settings.soundOn;
  musicToggle.checked = !!settings.musicOn;
  bgSelect.value = settings.background;
  musicSelect.value = settings.music;
  sfxSelect.value = settings.sfxPack;

  bodySelect.value = cosmetics.body;
  headSelect.value = cosmetics.head;

  suitColor.value = cosmetics.suit;
  capeColor.value = cosmetics.cape;
  maskColor.value = cosmetics.mask;

  if (cosmetics.trail !== "none" && !unlocks[cosmetics.trail]) cosmetics.trail = "none";
  trailSelect.value = cosmetics.trail;

  coinsText.textContent = String(coins);
  renderLocalBoard();

  shopPanel.classList.add("hidden");
  settingsPanel.classList.add("hidden");
  menu.classList.remove("hidden");

  initGame();
  loop();
})();
