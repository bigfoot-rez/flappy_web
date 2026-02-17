// ============================
// SKY HERO DASH
// v17: dash power-up spawn + shield stacks (max 3) + dash doesn't use shields
// ============================

const APP_VERSION = "v17";

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
const shopList = document.getElementById("shopList");
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
const auraSelect = document.getElementById("auraSelect");
const buildStyleSelect = document.getElementById("buildStyleSelect");

const coinsText = document.getElementById("coinsText");
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
  unlocks: "skyhero_unlocks_v16",
  settings: "skyhero_settings_v16",
  cosmetics: "skyhero_cosmetics_v16",
  localBoard: "skyhero_localboard_v1",
};

// ----------------------------
// Content definitions
// ----------------------------
const THEME_META = {
  city_day:   { label: "City (Day)",    locked: false },
  city_night: { label: "City (Night)",  locked: false },
  cloudy:     { label: "Cloudy",        locked: false },
  rainy:      { label: "Rainy (City)",  locked: false },

  sunset:     { label: "Sunset",        locked: true,  unlockKey: "bg_sunset" },
  neon:       { label: "Neon Night",    locked: true,  unlockKey: "bg_neon" },
  desert:     { label: "Desert",        locked: true,  unlockKey: "bg_desert" },
  forest:     { label: "Forest",        locked: true,  unlockKey: "bg_forest" },
  snow:       { label: "Snow",          locked: true,  unlockKey: "bg_snow" },
};

const TRAILS = {
  spark:    { label: "Spark",     cost: 50,  unlockKey: "trail_spark" },
  neon:     { label: "Neon",      cost: 120, unlockKey: "trail_neon" },
  smoke:    { label: "Smoke",     cost: 80,  unlockKey: "trail_smoke" },
  confetti: { label: "Confetti",  cost: 160, unlockKey: "trail_confetti" },
  embers:   { label: "Embers",    cost: 140, unlockKey: "trail_embers" },
  bubbles:  { label: "Bubbles",   cost: 110, unlockKey: "trail_bubbles" },
  stars:    { label: "Star Dust", cost: 180, unlockKey: "trail_stars" },
  glitch:   { label: "Glitch",    cost: 200, unlockKey: "trail_glitch" },
};

const AURAS = {
  halo:   { label: "Halo",   cost: 120, unlockKey: "aura_halo" },
  shadow: { label: "Shadow", cost: 90,  unlockKey: "aura_shadow" },
  pulse:  { label: "Pulse",  cost: 160, unlockKey: "aura_pulse" },
  frost:  { label: "Frost",  cost: 150, unlockKey: "aura_frost" },
};

const BUILD_STYLES = {
  brick: { label: "Brick", locked: false },
  glass: { label: "Glass", locked: true, unlockKey: "build_glass", cost: 160 },
  neon:  { label: "Neon",  locked: true, unlockKey: "build_neon",  cost: 200 },
  stone: { label: "Stone", locked: true, unlockKey: "build_stone", cost: 140 },
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

// powerups
const POWERUP_CHANCE = 0.28;           // chance a pair has a power-up at all
const POWERUP_SIZE = 18;
const DASH_PICKUP_WEIGHT = 0.45;       // if a powerup spawns, chance it's dash (rest shield)
const MAX_SHIELDS = 3;
const MAX_DASH = 2;

// dash behavior
const DASH_DURATION_MS = 750;          // how long dash lasts
const DASH_SPEED_MULT = 3.15;          // how fast buildings move during dash
const DASH_TAP_WINDOW_MS = 230;        // quick double-tap window for dash trigger

// Invuln after shield hit
const SHIELD_IFRAME_MS = 950;

// Particles
let rainDrops = [];
let stars = [];
let snow = [];
let previewRainDrops = [];
let previewStars = [];
let previewSnow = [];

// ----------------------------
// State
// ----------------------------
let hero, buildings, score, best, gameOver, started, paused;
let frame = 0;
let speedMult = 1;

// NEW: stacking shields + dash charges
let shieldCharges = 0;   // 0..3
let dashCharges = 0;     // 0..2
let dashUntil = 0;       // active dash end time
let iframesUntil = 0;    // short invuln after shield blocks hit

// tap timing for dash trigger
let lastTapAt = 0;

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
  aura: "none",
  buildStyle: "brick",
  body: "classic",
  head: "classic",
};

let unlocks = {}; // {unlockKey:true}
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
function saveJSON(key, obj) { localStorage.setItem(key, JSON.stringify(obj)); }

function saveAll() {
  saveJSON(LS.settings, settings);
  saveJSON(LS.cosmetics, cosmetics);
  saveJSON(LS.unlocks, unlocks);
  localStorage.setItem(LS.coins, String(coins));
}

function isUnlocked(key) { return !!unlocks[key]; }
function unlock(key) { unlocks[key] = true; saveAll(); }

function loadAll() {
  settings = { ...settings, ...loadJSON(LS.settings, settings) };
  cosmetics = { ...cosmetics, ...loadJSON(LS.cosmetics, cosmetics) };
  unlocks = { ...unlocks, ...loadJSON(LS.unlocks, {}) };
  coins = Math.max(0, Number(localStorage.getItem(LS.coins) || "0"));

  const bgOK = new Set(Object.keys(THEME_META));
  if (!bgOK.has(settings.background)) settings.background = "city_day";

  const musicOK = new Set(["none", "chill", "arcade", "night"]);
  if (!musicOK.has(settings.music)) settings.music = "chill";

  const sfxOK = new Set(["classic", "heroic", "robot"]);
  if (!sfxOK.has(settings.sfxPack)) settings.sfxPack = "classic";

  if (cosmetics.trail !== "none" && !isUnlocked(TRAILS[cosmetics.trail]?.unlockKey)) cosmetics.trail = "none";
  if (cosmetics.aura !== "none" && !isUnlocked(AURAS[cosmetics.aura]?.unlockKey)) cosmetics.aura = "none";

  if (!BUILD_STYLES[cosmetics.buildStyle]) cosmetics.buildStyle = "brick";
  const bs = BUILD_STYLES[cosmetics.buildStyle];
  if (bs.locked && !isUnlocked(bs.unlockKey)) cosmetics.buildStyle = "brick";

  const meta = THEME_META[settings.background];
  if (meta?.locked && meta.unlockKey && !isUnlocked(meta.unlockKey)) settings.background = "city_day";
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
function saveLocalBoard(board) { localStorage.setItem(LS.localBoard, JSON.stringify(board)); }
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
    if (kind === "dash")  return { f: 980, d: 90,  t: "sawtooth", g: 0.06 };
    return                { f: 160, d: 180, t: "sawtooth", g: 0.06 };
  }
  if (pack === "heroic") {
    if (kind === "flap")  return { f: 520, d: 70,  t: "triangle", g: 0.07 };
    if (kind === "score") return { f: 740, d: 90,  t: "triangle", g: 0.07 };
    if (kind === "power") return { f: 980, d: 140, t: "sine",     g: 0.07 };
    if (kind === "dash")  return { f: 1180,d: 110, t: "square",   g: 0.06 };
    return                { f: 110, d: 220, t: "sawtooth", g: 0.07 };
  }
  // robot
  if (kind === "flap")  return { f: 300, d: 55,  t: "square", g: 0.06 };
  if (kind === "score") return { f: 460, d: 75,  t: "square", g: 0.06 };
  if (kind === "power") return { f: 620, d: 120, t: "square", g: 0.06 };
  if (kind === "dash")  return { f: 820, d: 90,  t: "square", g: 0.06 };
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

function stopMusicPreview() { musicPreviewActive = false; stopMusic(); }

function ensureMusicState() {
  if (musicPreviewActive) return;
  if (canPlayMusicInGame()) {
    if (!musicTimer) startMusicLoop({ force: false, preview: false });
  } else stopMusic();
}

// ----------------------------
// Theme particles
// ----------------------------
function initRain(arr, w, h) {
  arr.length = 0;
  for (let i = 0; i < 90; i++) {
    arr.push({ x: Math.random()*w, y: Math.random()*h, vy: 6+Math.random()*7, len: 10+Math.random()*14 });
  }
}
function initStars(arr, w, h) {
  arr.length = 0;
  for (let i = 0; i < 65; i++) {
    arr.push({ x: Math.random()*w, y: Math.random()*(h*0.65), r: 0.6+Math.random()*1.6, tw: Math.random()*Math.PI*2 });
  }
}
function initSnow(arr, w, h) {
  arr.length = 0;
  for (let i = 0; i < 70; i++) {
    arr.push({ x: Math.random()*w, y: Math.random()*h, vy: 1.2+Math.random()*2.0, vx: -0.4 + Math.random()*0.8, r: 0.8+Math.random()*2.2 });
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

  // NEW
  shieldCharges = 0;
  dashCharges = 0;
  dashUntil = 0;
  iframesUntil = 0;

  scoreText.textContent = "0";
  bestText.textContent = String(best);
  pauseButton.textContent = "Pause";

  hideOverlayHard();
}

function reset() { initGame(); toastMsg("Reset"); }

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

  coins += Math.min(90, Math.floor(score * 2));
  coinsText.textContent = String(coins);
  saveAll();

  submitLocalScore(name, score);
}

// ----------------------------
// Buildings + powerups
// ----------------------------
function choosePowerType() {
  // If a powerup spawns, decide dash vs shield.
  // Bias toward shield early game (optional feel): dash slightly less common at score < 6
  const base = DASH_PICKUP_WEIGHT;
  const w = (score < 6) ? Math.max(0.25, base - 0.15) : base;
  return (Math.random() < w) ? "dash" : "shield";
}

function spawnBuildingPair() {
  const margin = 70;
  const topMin = margin;
  const topMax = canvas.height - margin - GAP_SIZE;
  const top = Math.floor(topMin + Math.random() * (topMax - topMin));

  let power = null;
  if (Math.random() < POWERUP_CHANCE) {
    power = {
      type: choosePowerType(),
      x: canvas.width + 10 + BUILDING_WIDTH/2,
      y: top + GAP_SIZE/2,
      taken: false
    };
  }

  buildings.push({ x: canvas.width + 10, top, passed: false, power });
}

function isDashing() { return now() < dashUntil; }

function buildingSpeed() {
  if (isDashing()) return BUILDING_SPEED_BASE * DASH_SPEED_MULT;
  return BUILDING_SPEED_BASE * speedMult;
}
function effectiveGravity() { return BASE_GRAVITY; }
function effectiveLift() { return BASE_LIFT; }

function applyPower(type) {
  if (type === "shield") {
    const before = shieldCharges;
    shieldCharges = Math.min(MAX_SHIELDS, shieldCharges + 1);
    if (shieldCharges > before) toastMsg(`Shield +1 (x${shieldCharges})`);
    else toastMsg(`Shields full (x${shieldCharges})`);
    playSfx("power");
  } else if (type === "dash") {
    const before = dashCharges;
    dashCharges = Math.min(MAX_DASH, dashCharges + 1);
    if (dashCharges > before) toastMsg(`Dash ready (x${dashCharges})`);
    else toastMsg(`Dash full (x${dashCharges})`);
    playSfx("dash");
  } else {
    toastMsg("Power-up!");
    playSfx("power");
  }

  coins += 5;
  coinsText.textContent = String(coins);
  saveAll();
}

function tryDashTrigger() {
  if (!started || paused || gameOver) return false;
  if (dashCharges <= 0) return false;
  if (isDashing()) return false;

  dashCharges -= 1;
  dashUntil = now() + DASH_DURATION_MS;
  iframesUntil = Math.max(iframesUntil, now() + 200); // tiny buffer at start
  toastMsg(`DASH! (${dashCharges} left)`);
  playSfx("dash");
  return true;
}

function heroHitBuilding(gapTop, gapBottom, bX, bRight) {
  const heroRight = hero.x + hero.w;
  const heroBottom = hero.y + hero.h;
  const xOverlap = heroRight > bX && hero.x < bRight;
  if (!xOverlap) return false;
  return (hero.y < gapTop) || (heroBottom > gapBottom);
}

// ----------------------------
// Background + visuals
// (kept from v16)
// ----------------------------

function drawStars(ctx2, f, starArr) {
  ctx2.save();
  ctx2.fillStyle = "#fff";
  for (const s of starArr) {
    const tw = 0.55 + 0.45 * Math.sin(f * 0.03 + s.tw);
    ctx2.globalAlpha = 0.18 + 0.62 * tw;
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

function drawSnow(ctx2, arr, w, h) {
  ctx2.save();
  ctx2.fillStyle = "rgba(255,255,255,0.9)";
  for (const s of arr) {
    ctx2.globalAlpha = 0.35 + 0.25 * Math.sin((frame*0.03) + s.x*0.02);
    ctx2.beginPath();
    ctx2.arc(s.x, s.y, s.r, 0, Math.PI*2);
    ctx2.fill();
    s.y += s.vy;
    s.x += s.vx + Math.sin(frame*0.01 + s.y*0.02) * 0.25;
    if (s.y > h + 10) { s.y = -10; s.x = Math.random() * w; }
    if (s.x < -20) s.x = w + 20;
    if (s.x > w + 20) s.x = -20;
  }
  ctx2.restore();
  ctx2.globalAlpha = 1;
}

function drawCloudBand(ctx2, f, w, y, strength=1) {
  ctx2.save();
  ctx2.globalAlpha = 0.16 * strength;
  ctx2.fillStyle = "#ffffff";
  const speed = 0.22 * strength;
  for (let i = 0; i < 8; i++) {
    const cx = (i * 120 + (f * speed)) % (w + 180) - 90;
    const cy = y + (i % 3) * 10;
    ctx2.beginPath();
    ctx2.arc(cx, cy, 18, 0, Math.PI*2);
    ctx2.arc(cx + 22, cy + 6, 14, 0, Math.PI*2);
    ctx2.arc(cx - 22, cy + 7, 13, 0, Math.PI*2);
    ctx2.fill();
  }
  ctx2.restore();
}

function themeSkyGradient(ctx2, bg, h) {
  const g = ctx2.createLinearGradient(0,0,0,h);
  if (bg === "city_night") { g.addColorStop(0,"#06122b"); g.addColorStop(1,"#1b1f3a"); return g; }
  if (bg === "rainy")      { g.addColorStop(0,"#4d6372"); g.addColorStop(1,"#a7b7c3"); return g; }
  if (bg === "cloudy")     { g.addColorStop(0,"#9fb7c9"); g.addColorStop(1,"#d8e2ea"); return g; }
  if (bg === "sunset")     { g.addColorStop(0,"#ffb36b"); g.addColorStop(1,"#7b5cff"); return g; }
  if (bg === "neon")       { g.addColorStop(0,"#050215"); g.addColorStop(1,"#1a0b33"); return g; }
  if (bg === "desert")     { g.addColorStop(0,"#ffd59e"); g.addColorStop(1,"#ff9b6a"); return g; }
  if (bg === "forest")     { g.addColorStop(0,"#92d6c7"); g.addColorStop(1,"#2c6b52"); return g; }
  if (bg === "snow")       { g.addColorStop(0,"#cfe8ff"); g.addColorStop(1,"#eef7ff"); return g; }
  g.addColorStop(0,"#87CEEB"); g.addColorStop(1,"#cdeffd"); return g;
}

function skylinePalette(bg) {
  if (bg === "city_night") return ["#0d1433","#121a44","#1a2358","#232c6f"];
  if (bg === "neon")       return ["#0a0220","#1b0838","#240a4a","#1d2a6e"];
  if (bg === "sunset")     return ["#3a1f5a","#5c2a79","#7a2b6f","#913560"];
  if (bg === "rainy")      return ["#2f3a4a","#3b475b","#4a5870","#54657d"];
  if (bg === "cloudy")     return ["#3a3f55","#4a5070","#59628a","#6d79a2"];
  if (bg === "desert")     return ["#6b3a1f","#8a4a2a","#a85e34","#c1783f"];
  if (bg === "forest")     return ["#103d2f","#165342","#1f6b55","#2b8668"];
  if (bg === "snow")       return ["#3d4a63","#4c5c7a","#5e7396","#7c93b8"];
  return ["#2b2b4f","#3a3a67","#4b4b85","#6060a5"];
}

function drawLayerBlocks(ctx2, f, w, baseY, color, alpha, speed, tallBias=0.5, windowAlpha=0.0, windowColor="#ffeaa0") {
  ctx2.save();
  ctx2.globalAlpha = alpha;
  ctx2.fillStyle = color;

  const offset = -((f * speed) % 160);
  for (let x = offset; x < w + 200; x += 160) {
    const bw = 100;
    const rnd = (Math.sin((x + f) * 0.02) * 0.5 + 0.5);
    const bh = 40 + rnd * 95 * tallBias;
    ctx2.fillRect(x, baseY - bh, bw, bh);

    if (windowAlpha > 0) {
      ctx2.globalAlpha = alpha * windowAlpha;
      ctx2.fillStyle = windowColor;
      for (let wy = baseY - bh + 10; wy < baseY - 12; wy += 28) {
        for (let wx = x + 10; wx < x + bw - 12; wx += 22) {
          ctx2.fillRect(wx, wy, 8, 12);
        }
      }
      ctx2.globalAlpha = alpha;
      ctx2.fillStyle = color;
    }
  }

  ctx2.restore();
  ctx2.globalAlpha = 1;
}

function drawGround(ctx2, bg, f, w, h) {
  ctx2.save();
  const g = ctx2.createLinearGradient(0, h-80, 0, h);
  if (bg === "desert") { g.addColorStop(0,"#e7b36d"); g.addColorStop(1,"#c98b45"); }
  else if (bg === "forest") { g.addColorStop(0,"#1e5b44"); g.addColorStop(1,"#144233"); }
  else if (bg === "snow") { g.addColorStop(0,"#eaf3ff"); g.addColorStop(1,"#cfe1f7"); }
  else if (bg === "neon") { g.addColorStop(0,"#0b0620"); g.addColorStop(1,"#0a0220"); }
  else if (bg === "city_night") { g.addColorStop(0,"#0f1431"); g.addColorStop(1,"#0a0f26"); }
  else { g.addColorStop(0,"#2c3e50"); g.addColorStop(1,"#1b2a35"); }

  ctx2.fillStyle = g;
  ctx2.fillRect(0, h-70, w, 70);

  ctx2.globalAlpha = 0.25;
  ctx2.fillStyle = "#fff";
  const speed = 1.6;
  for (let x = -((f*speed)%60); x < w+60; x += 60) ctx2.fillRect(x, h-36, 32, 2);
  ctx2.globalAlpha = 1;
  ctx2.restore();
}

function drawBackground(ctx2, f, w, h, bg, starArr, rainArr, snowArr) {
  ctx2.fillStyle = themeSkyGradient(ctx2, bg, h);
  ctx2.fillRect(0,0,w,h);

  if (bg === "city_night" || bg === "neon") drawStars(ctx2, f, starArr);
  if (bg === "sunset") {
    ctx2.save();
    ctx2.globalAlpha = 0.35;
    ctx2.fillStyle = "#fff";
    ctx2.beginPath();
    ctx2.arc(w*0.82, h*0.22, 26, 0, Math.PI*2);
    ctx2.fill();
    ctx2.restore();
  }

  if (bg === "cloudy" || bg === "rainy") {
    drawCloudBand(ctx2, f, w, 40, 1.25);
    drawCloudBand(ctx2, f, w, 90, 1.0);
  } else {
    drawCloudBand(ctx2, f, w, 50, 0.75);
  }

  const pal = skylinePalette(bg);
  drawLayerBlocks(ctx2, f, w, h-120, pal[0], 0.55, 0.14, 0.65, 0.0);
  drawLayerBlocks(ctx2, f, w, h-100, pal[1], 0.60, 0.22, 0.75, (bg.includes("night")||bg==="neon") ? 0.65 : 0.0);
  drawLayerBlocks(ctx2, f, w, h-78,  pal[2], 0.70, 0.34, 0.9,  (bg.includes("night")||bg==="neon") ? 0.75 : 0.0);
  drawLayerBlocks(ctx2, f, w, h-58,  pal[3], 0.80, 0.52, 1.0,  (bg.includes("night")||bg==="neon") ? 0.85 : 0.0);

  drawGround(ctx2, bg, f, w, h);

  if (bg === "rainy") drawRain(ctx2, rainArr, w, h);
  if (bg === "snow") drawSnow(ctx2, snowArr, w, h);

  if (bg === "neon") {
    ctx2.save();
    ctx2.globalAlpha = 0.12;
    ctx2.strokeStyle = "#00ffe0";
    ctx2.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const y = 60 + i * 70 + Math.sin((f+i)*0.05)*6;
      ctx2.beginPath();
      ctx2.moveTo(0, y);
      ctx2.lineTo(w, y);
      ctx2.stroke();
    }
    ctx2.restore();
    ctx2.globalAlpha = 1;
  }
}

// ----------------------------
// Buildings visuals
// ----------------------------
function drawBrickBuilding(x, y, width, height) {
  ctx.fillStyle = "#7a0a0a";
  ctx.fillRect(x, y, width, height);

  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#000";
  ctx.fillRect(x + width - 10, y, 10, height);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "#4e0707";
  ctx.lineWidth = 1;

  for (let row = y; row < y + height; row += 14) {
    ctx.beginPath(); ctx.moveTo(x, row); ctx.lineTo(x + width, row); ctx.stroke();
  }
  for (let row = 0; row < height; row += 28) {
    const offset = (row / 28) % 2 === 0 ? 0 : 10;
    for (let col = x + offset; col < x + width; col += 20) {
      ctx.beginPath(); ctx.moveTo(col, y + row); ctx.lineTo(col, y + row + 14); ctx.stroke();
    }
  }

  const isNight = (settings.background === "city_night" || settings.background === "neon");
  if (isNight) {
    ctx.fillStyle = "rgba(255, 234, 120, 0.7)";
    for (let wy = y + 10; wy < y + height - 10; wy += 46) {
      for (let wx = x + 10; wx < x + width - 12; wx += 22) ctx.fillRect(wx, wy, 8, 12);
    }
  }
}

function drawGlassBuilding(x, y, width, height) {
  const g = ctx.createLinearGradient(x, y, x+width, y);
  g.addColorStop(0, "rgba(120,210,255,0.55)");
  g.addColorStop(1, "rgba(30,110,170,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, width, height);

  ctx.globalAlpha = 0.2;
  ctx.fillStyle = "#fff";
  for (let i = 0; i < 10; i++) {
    const yy = y + (i*22) + (frame%22);
    ctx.fillRect(x+8, yy, width-16, 2);
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.strokeRect(x+1, y+1, width-2, height-2);
}

function drawNeonBuilding(x, y, width, height) {
  ctx.fillStyle = "#0d0b1a";
  ctx.fillRect(x, y, width, height);

  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = "rgba(0,255,230,0.9)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x+1, y+1, width-2, height-2);
  ctx.globalAlpha = 1;

  ctx.globalAlpha = 0.25;
  for (let i=0;i<8;i++){
    ctx.fillStyle = `hsla(${(frame*4+i*40)%360} 90% 60% / 0.6)`;
    ctx.fillRect(x+10, y+10+i*28, width-20, 3);
  }
  ctx.globalAlpha = 1;
}

function drawStoneBuilding(x, y, width, height) {
  ctx.fillStyle = "#4a4a4a";
  ctx.fillRect(x, y, width, height);

  ctx.globalAlpha = 0.2;
  ctx.fillStyle = "#000";
  ctx.fillRect(x+width-10, y, 10, height);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  for (let row = y; row < y+height; row += 18) {
    ctx.beginPath(); ctx.moveTo(x, row); ctx.lineTo(x+width, row); ctx.stroke();
  }
  for (let col = x; col < x+width; col += 18) {
    ctx.beginPath(); ctx.moveTo(col, y); ctx.lineTo(col, y+height); ctx.stroke();
  }
}

function drawBuilding(x, y, width, height) {
  const style = cosmetics.buildStyle;
  if (style === "glass") return drawGlassBuilding(x,y,width,height);
  if (style === "neon") return drawNeonBuilding(x,y,width,height);
  if (style === "stone") return drawStoneBuilding(x,y,width,height);
  return drawBrickBuilding(x,y,width,height);
}

function drawPowerup(p) {
  if (!p || p.taken) return;

  ctx.save();
  ctx.translate(p.x, p.y);

  if (p.type === "shield") {
    ctx.fillStyle = "rgba(0, 170, 255, 0.92)";
    ctx.beginPath();
    ctx.arc(0, 0, POWERUP_SIZE, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("S", 0, 1);
  } else if (p.type === "dash") {
    ctx.fillStyle = "rgba(255, 110, 0, 0.92)";
    ctx.beginPath();
    ctx.arc(0, 0, POWERUP_SIZE, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("D", 0, 1);
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(0, 0, POWERUP_SIZE, 0, Math.PI*2);
    ctx.fill();
  }

  ctx.restore();
}

// ----------------------------
// Hero visuals (same as v16)
// (kept; only changed shielded logic + dash glow)
// ----------------------------
function drawTrail(ctx2, f, hx, hy, trail) {
  const x = hx - 6;
  const y = hy + 18;
  if (trail === "none") return;

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

  if (trail === "embers") {
    ctx2.globalAlpha = 0.70;
    for (let i = 0; i < 7; i++) {
      const t = (f + i*7);
      ctx2.fillStyle = `rgba(255, ${120 + (t%80)}, 40, ${0.10 + i*0.05})`;
      ctx2.beginPath();
      ctx2.arc(x - i*9, y + Math.sin(t*0.18)*6, 2.6 + (i%3)*0.4, 0, Math.PI*2);
      ctx2.fill();
    }
    ctx2.globalAlpha = 1;
    return;
  }

  if (trail === "bubbles") {
    ctx2.globalAlpha = 0.55;
    for (let i = 0; i < 7; i++) {
      const t = (f + i*11);
      ctx2.strokeStyle = `rgba(160, 230, 255, ${0.12 + i*0.05})`;
      ctx2.lineWidth = 1.5;
      ctx2.beginPath();
      ctx2.arc(x - i*10, y + Math.sin(t*0.12)*10, 4 + (i%3)*1.2, 0, Math.PI*2);
      ctx2.stroke();
    }
    ctx2.globalAlpha = 1;
    return;
  }

  if (trail === "stars") {
    ctx2.globalAlpha = 0.75;
    for (let i = 0; i < 8; i++) {
      const t = (f*0.2 + i);
      const px = x - i*9;
      const py = y + Math.sin(t*2.2)*7;
      ctx2.fillStyle = `rgba(255,255,255,${0.15 + i*0.07})`;
      ctx2.fillRect(px, py, 2, 2);
      ctx2.fillRect(px+3, py+1, 1, 1);
    }
    ctx2.globalAlpha = 1;
    return;
  }

  if (trail === "glitch") {
    ctx2.globalAlpha = 0.65;
    for (let i = 0; i < 8; i++) {
      const ox = x - i*8 - (frame%3);
      const oy = y + ((i%2===0)? -6:6) + Math.sin((f+i)*0.4)*2;
      ctx2.fillStyle = `hsla(${(f*8+i*45)%360} 95% 60% / ${0.10 + i*0.06})`;
      ctx2.fillRect(ox, oy, 8, 2);
    }
    ctx2.globalAlpha = 1;
    return;
  }
}

function drawAura(ctx2, f, hx, hy, aura) {
  if (aura === "none") return;
  const cx = hx + 17;
  const cy = hy + 17;

  if (aura === "halo") {
    ctx2.save();
    ctx2.globalAlpha = 0.35;
    ctx2.strokeStyle = "rgba(255,240,160,0.9)";
    ctx2.lineWidth = 4;
    ctx2.beginPath();
    ctx2.arc(cx, cy-16, 14, 0, Math.PI*2);
    ctx2.stroke();
    ctx2.restore();
    return;
  }

  if (aura === "shadow") {
    ctx2.save();
    ctx2.globalAlpha = 0.25;
    ctx2.fillStyle = "rgba(0,0,0,0.85)";
    ctx2.beginPath();
    ctx2.ellipse(cx-4, cy+20, 18, 8, 0, 0, Math.PI*2);
    ctx2.fill();
    ctx2.restore();
    return;
  }

  if (aura === "pulse") {
    ctx2.save();
    const r = 22 + 4*Math.sin(f*0.12);
    ctx2.globalAlpha = 0.18;
    ctx2.strokeStyle = "rgba(0,255,230,0.95)";
    ctx2.lineWidth = 3;
    ctx2.beginPath();
    ctx2.arc(cx, cy, r, 0, Math.PI*2);
    ctx2.stroke();
    ctx2.restore();
    return;
  }

  if (aura === "frost") {
    ctx2.save();
    ctx2.globalAlpha = 0.22;
    ctx2.strokeStyle = "rgba(210,245,255,0.95)";
    ctx2.lineWidth = 2.5;
    for (let i=0;i<7;i++){
      const ang = (i/7)*Math.PI*2 + (f*0.01);
      const x1 = cx + Math.cos(ang)*12;
      const y1 = cy + Math.sin(ang)*12;
      const x2 = cx + Math.cos(ang)*26;
      const y2 = cy + Math.sin(ang)*26;
      ctx2.beginPath();
      ctx2.moveTo(x1,y1);
      ctx2.lineTo(x2,y2);
      ctx2.stroke();
    }
    ctx2.restore();
  }
}

// --- minimal heads (kept) ---
function drawBeeHead(ctx2, hx, hy) {
  ctx2.fillStyle = "#ffd400";
  ctx2.beginPath();
  ctx2.arc(hx + 17, hy + 8, 10, 0, Math.PI*2);
  ctx2.fill();
  ctx2.globalAlpha = 0.25;
  ctx2.fillStyle = "#000";
  ctx2.fillRect(hx + 9, hy + 6, 16, 3);
  ctx2.globalAlpha = 1;
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
  ctx2.fillRect(hx + 11, hy + 14, 12, 2);
  ctx2.globalAlpha = 1;
}

function drawHeroVariant(ctx2, f, hx, hy, opts) {
  const { suit, cape, mask, body, head, trail, aura, shieldCount, dashing, iframes } = opts;

  drawAura(ctx2, f, hx, hy, aura);
  drawTrail(ctx2, f, hx, hy, trail);

  // dash glow
  if (dashing) {
    ctx2.save();
    ctx2.globalAlpha = 0.20;
    ctx2.fillStyle = "rgba(255,110,0,0.95)";
    ctx2.beginPath();
    ctx2.arc(hx + 17, hy + 17, 32, 0, Math.PI*2);
    ctx2.fill();
    ctx2.restore();
  }

  // shields ring(s)
  if (shieldCount > 0) {
    ctx2.save();
    for (let i = 0; i < shieldCount; i++) {
      ctx2.globalAlpha = 0.14 + i * 0.04;
      ctx2.strokeStyle = "rgba(0,170,255,0.95)";
      ctx2.lineWidth = 3;
      ctx2.beginPath();
      ctx2.arc(hx + 17, hy + 17, 24 + i * 4, 0, Math.PI*2);
      ctx2.stroke();
    }
    ctx2.restore();
  } else if (iframes) {
    ctx2.globalAlpha = 0.35 + 0.25 * Math.sin(f * 0.6);
  }

  // cape
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
  else {
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
    aura: cosmetics.aura,
    shieldCount: shieldCharges,
    dashing: isDashing(),
    iframes: now() < iframesUntil,
  });
}

// ----------------------------
// Update + draw loop
// ----------------------------
function update() {
  if (!paused && !gameOver && !overlay.classList.contains("hidden")) hideOverlayHard();
  if (!started || gameOver || paused) return;

  hero.vy += effectiveGravity();
  hero.y += hero.vy;

  // Still die to ground/ceiling even while dashing (keeps it fair)
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

    // Collision:
    // - If dashing: ignore building collision completely
    // - Else if iframes: ignore
    // - Else if shieldCharges>0: consume one shield (ONLY on collision), set iframes
    // - Else: die
    const hit = heroHitBuilding(gapTop, gapBottom, b.x, right);

    if (hit && !isDashing()) {
      if (now() < iframesUntil) {
        // ignore
      } else if (shieldCharges > 0) {
        shieldCharges -= 1;
        iframesUntil = now() + SHIELD_IFRAME_MS;
        hero.vy = Math.min(hero.vy, 0);
        hero.y = Math.max(0, hero.y - 18);
        toastMsg(`Shield used (x${shieldCharges})`);
        playSfx("power");
      } else {
        endGame();
        return;
      }
    }

    // scoring
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
  drawBackground(ctx, frame, canvas.width, canvas.height, settings.background, stars, rainDrops, snow);

  for (const b of buildings) {
    drawBuilding(b.x, 0, BUILDING_WIDTH, b.top);
    const gapBottom = b.top + GAP_SIZE;
    drawBuilding(b.x, gapBottom, BUILDING_WIDTH, canvas.height - gapBottom);
    drawPowerup(b.power);
  }

  drawHero();

  // HUD buffs
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.font = "12px Arial";

  const parts = [];
  if (shieldCharges > 0) parts.push(`Shield x${shieldCharges}`);
  if (dashCharges > 0) parts.push(`Dash x${dashCharges}`);
  if (isDashing()) parts.push("DASHING");

  const line = parts.join(" • ");
  if (line) ctx.fillText(line, 12, 18);

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
  drawBackground(pctx, frame, previewCanvas.width, previewCanvas.height, settings.background, previewStars, previewRainDrops, previewSnow);
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
    aura: cosmetics.aura,
    shieldCount: shieldCharges,
    dashing: false,
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
  requestAnimationFrame(loop);
}

// ----------------------------
// Input + mobile zoom fix + dash trigger
// ----------------------------
document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });

function handleTapAction() {
  ensureAudio();

  // overlay quick-resume behavior
  if (!overlay.classList.contains("hidden") && !gameOver) {
    paused = false;
    hideOverlayHard();
    ensureMusicState();
    return;
  }

  if (gameOver) { reset(); startPlay(); return; }

  if (!menu.classList.contains("hidden") || paused) return;

  // dash: quick double-tap
  const t = now();
  const dt = t - lastTapAt;
  lastTapAt = t;

  if (dt > 0 && dt <= DASH_TAP_WINDOW_MS) {
    const dashed = tryDashTrigger();
    if (dashed) return;
    // if no dash available, fall through to flap on second tap (feels responsive)
  }

  // normal flap
  hero.vy = effectiveLift();
  playSfx("flap");
}

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  handleTapAction();
}, { passive: false });

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    handleTapAction();
  }
  if (e.code === "Escape") {
    if (!overlay.classList.contains("hidden") && !gameOver) {
      paused = false;
      hideOverlayHard();
      ensureMusicState();
    }
  }
});

// ----------------------------
// Shop builder (same as v16)
// ----------------------------
function addShopButton(label, cost, unlockKey) {
  const b = document.createElement("button");
  b.className = "btn small";
  const owned = isUnlocked(unlockKey);
  b.textContent = owned ? `Owned: ${label}` : `Buy ${label} (${cost})`;

  if (owned) b.classList.add("secondary");

  b.addEventListener("click", () => {
    if (isUnlocked(unlockKey)) return toastMsg("Already unlocked.");
    if (coins < cost) return toastMsg(`Need ${cost} coins.`);
    coins -= cost;
    coinsText.textContent = String(coins);
    unlock(unlockKey);
    toastMsg("Unlocked!");
    b.textContent = `Owned: ${label}`;
    b.classList.add("secondary");
    syncLocksToUI();
  });

  shopList.appendChild(b);
}

function rebuildShop() {
  shopList.innerHTML = "";

  addShopButton("Spark Trail", TRAILS.spark.cost, TRAILS.spark.unlockKey);
  addShopButton("Neon Trail", TRAILS.neon.cost, TRAILS.neon.unlockKey);
  addShopButton("Smoke Trail", TRAILS.smoke.cost, TRAILS.smoke.unlockKey);
  addShopButton("Confetti Trail", TRAILS.confetti.cost, TRAILS.confetti.unlockKey);
  addShopButton("Embers Trail", TRAILS.embers.cost, TRAILS.embers.unlockKey);
  addShopButton("Bubbles Trail", TRAILS.bubbles.cost, TRAILS.bubbles.unlockKey);
  addShopButton("Star Dust Trail", TRAILS.stars.cost, TRAILS.stars.unlockKey);
  addShopButton("Glitch Trail", TRAILS.glitch.cost, TRAILS.glitch.unlockKey);

  addShopButton("Halo Aura", AURAS.halo.cost, AURAS.halo.unlockKey);
  addShopButton("Shadow Aura", AURAS.shadow.cost, AURAS.shadow.unlockKey);
  addShopButton("Pulse Aura", AURAS.pulse.cost, AURAS.pulse.unlockKey);
  addShopButton("Frost Aura", AURAS.frost.cost, AURAS.frost.unlockKey);

  addShopButton("Glass Buildings", BUILD_STYLES.glass.cost, BUILD_STYLES.glass.unlockKey);
  addShopButton("Neon Buildings", BUILD_STYLES.neon.cost, BUILD_STYLES.neon.unlockKey);
  addShopButton("Stone Buildings", BUILD_STYLES.stone.cost, BUILD_STYLES.stone.unlockKey);

  addShopButton("Sunset Background", 150, THEME_META.sunset.unlockKey);
  addShopButton("Neon Night Background", 180, THEME_META.neon.unlockKey);
  addShopButton("Desert Background", 140, THEME_META.desert.unlockKey);
  addShopButton("Forest Background", 140, THEME_META.forest.unlockKey);
  addShopButton("Snow Background", 160, THEME_META.snow.unlockKey);
}

function syncLocksToUI() {
  const meta = THEME_META[settings.background];
  if (meta?.locked && meta.unlockKey && !isUnlocked(meta.unlockKey)) settings.background = "city_day";
  bgSelect.value = settings.background;

  if (cosmetics.trail !== "none" && !isUnlocked(TRAILS[cosmetics.trail]?.unlockKey)) cosmetics.trail = "none";
  trailSelect.value = cosmetics.trail;

  if (cosmetics.aura !== "none" && !isUnlocked(AURAS[cosmetics.aura]?.unlockKey)) cosmetics.aura = "none";
  auraSelect.value = cosmetics.aura;

  const bs = BUILD_STYLES[cosmetics.buildStyle];
  if (bs?.locked && !isUnlocked(bs.unlockKey)) cosmetics.buildStyle = "brick";
  buildStyleSelect.value = cosmetics.buildStyle;

  saveAll();
}

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
  const chosen = bgSelect.value;
  const meta = THEME_META[chosen];
  if (meta?.locked && meta.unlockKey && !isUnlocked(meta.unlockKey)) {
    toastMsg("That background is locked (buy it in Shop).");
    bgSelect.value = settings.background;
    return;
  }
  settings.background = chosen;
  saveAll();
  toastMsg(`Background: ${THEME_META[chosen]?.label || chosen}`);
});

musicSelect.addEventListener("change", () => {
  settings.music = musicSelect.value;
  saveAll();
  toastMsg(`Track: ${musicSelect.options[musicSelect.selectedIndex].text}`);
});

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

sfxSelect.addEventListener("change", () => {
  settings.sfxPack = sfxSelect.value;
  saveAll();
  toastMsg(`SFX Pack: ${sfxSelect.options[sfxSelect.selectedIndex].text}`);
});
sfxTestFlap.addEventListener("click", () => { ensureAudio(); playSfx("flap"); });
sfxTestScore.addEventListener("click", () => { ensureAudio(); playSfx("score"); });
sfxTestPower.addEventListener("click", () => { ensureAudio(); playSfx("power"); });
sfxTestCrash.addEventListener("click", () => { ensureAudio(); playSfx("crash"); });

bodySelect.addEventListener("change", () => { cosmetics.body = bodySelect.value; saveAll(); toastMsg("Body updated"); });
headSelect.addEventListener("change", () => { cosmetics.head = headSelect.value; saveAll(); toastMsg("Head updated"); });

suitColor.addEventListener("input", () => { cosmetics.suit = suitColor.value; saveAll(); });
capeColor.addEventListener("input", () => { cosmetics.cape = capeColor.value; saveAll(); });
maskColor.addEventListener("input", () => { cosmetics.mask = maskColor.value; saveAll(); });

trailSelect.addEventListener("change", () => {
  const v = trailSelect.value;
  if (v !== "none") {
    const k = TRAILS[v]?.unlockKey;
    if (k && !isUnlocked(k)) {
      toastMsg("That trail is locked. Buy it in Shop.");
      trailSelect.value = cosmetics.trail;
      return;
    }
  }
  cosmetics.trail = v;
  saveAll();
  toastMsg("Trail updated");
});

auraSelect.addEventListener("change", () => {
  const v = auraSelect.value;
  if (v !== "none") {
    const k = AURAS[v]?.unlockKey;
    if (k && !isUnlocked(k)) {
      toastMsg("That aura is locked. Buy it in Shop.");
      auraSelect.value = cosmetics.aura;
      return;
    }
  }
  cosmetics.aura = v;
  saveAll();
  toastMsg("Aura updated");
});

buildStyleSelect.addEventListener("change", () => {
  const v = buildStyleSelect.value;
  const meta = BUILD_STYLES[v];
  if (meta?.locked && meta.unlockKey && !isUnlocked(meta.unlockKey)) {
    toastMsg("That building style is locked. Buy it in Shop.");
    buildStyleSelect.value = cosmetics.buildStyle;
    return;
  }
  cosmetics.buildStyle = v;
  saveAll();
  toastMsg("Building style updated");
});

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
  initSnow(snow, canvas.width, canvas.height);

  if (previewCanvas) {
    initRain(previewRainDrops, previewCanvas.width, previewCanvas.height);
    initStars(previewStars, previewCanvas.width, previewCanvas.height);
    initSnow(previewSnow, previewCanvas.width, previewCanvas.height);
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

  trailSelect.value = cosmetics.trail;
  auraSelect.value = cosmetics.aura;
  buildStyleSelect.value = cosmetics.buildStyle;

  coinsText.textContent = String(coins);
  renderLocalBoard();

  rebuildShop();
  syncLocksToUI();

  shopPanel.classList.add("hidden");
  settingsPanel.classList.add("hidden");
  menu.classList.remove("hidden");

  initGame();
  loop();
})();
