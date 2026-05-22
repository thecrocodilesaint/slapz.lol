const $ = (selector) => document.querySelector(selector);

const profile = {
  name: $("#name"),
  handle: $("#handle"),
  bio: $("#bio"),
  location: $("#location"),
  views: $("#views"),
};

const inputs = {
  name: $("#nameInput"),
  handle: $("#handleInput"),
  bio: $("#bioInput"),
  location: $("#locationInput"),
  cursorTrail: $("#cursorTrailInput"),
  sparkleEffect: $("#sparkleEffectInput"),
};

const socialInputs = {
  discord: $("#discordInput"),
  instagram: $("#instagramInput"),
  tiktok: $("#tiktokInput"),
  youtube: $("#youtubeInput"),
  x: $("#xInput"),
  github: $("#githubInput"),
};

const friendInputs = {
  name: $("#friendNameInput"),
  link: $("#friendLinkInput"),
};

const auth = {
  screen: $("#authScreen"),
  form: $("#authForm"),
  email: $("#authEmail"),
  password: $("#authPassword"),
  signupButton: $("#signupButton"),
  loginButton: $("#loginButton"),
  message: $("#authMessage"),
  logoutButton: $("#logoutButton"),
  accountLogoutButton: $("#accountLogoutButton"),
};

const settings = {
  email: $("#settingsEmail"),
  displayName: $("#settingsDisplayName"),
  handle: $("#settingsHandle"),
  profileLink: $("#settingsProfileLink"),
  views: $("#settingsViews"),
  created: $("#settingsCreated"),
  userId: $("#settingsUserId"),
};

const dashboardButtons = document.querySelectorAll("[data-dashboard-target]");
const dashboardPanels = document.querySelectorAll("[data-dashboard-panel]");
const dashboardThemeButtons = document.querySelectorAll("[data-dashboard-theme]");

const sessionKey = "nightcard-session-token";
const dashboardThemeKey = "funlol-dashboard-theme";
const dashboardMuteKey = "funlol-dashboard-mute-outside-bio";
const sidebarCollapsedKey = "funlol-sidebar-collapsed";
const finePointerQuery = window.matchMedia ? window.matchMedia("(hover: hover) and (pointer: fine)") : null;
const canUsePointerEffects = () => (finePointerQuery ? finePointerQuery.matches : true);
let sessionToken = localStorage.getItem(sessionKey) || "";
let loadingTimer = null;
let loadingPercent = 8;
let profileTheme = document.body.dataset.theme || "black";
let dashboardTheme = localStorage.getItem(dashboardThemeKey) || "black";
let dashboardMusicMutedOutsideBio = localStorage.getItem(dashboardMuteKey) === "true";
let sidebarCollapsed = localStorage.getItem(sidebarCollapsedKey) === "true";
let accountState = {
  email: "",
  userId: "",
  createdAt: "",
  profileHandle: "",
  profilePath: "",
  profileUrl: "",
};
let friends = [];

const mediaState = {
  avatarData: "",
  avatarName: "",
  avatarPath: "",
  backgroundData: "",
  backgroundName: "",
  backgroundType: "",
  backgroundPath: "",
  musicData: "",
  musicName: "",
  musicPath: "",
  musicObjectUrl: "",
};

const snake = {
  canvas: $("#snakeCanvas"),
  score: $("#snakeScore"),
  best: $("#snakeBestScore"),
  finalScore: $("#snakeFinalScore"),
  gameOverScreen: $("#snakeGameOver"),
  status: $("#snakeStatus"),
  startButton: $("#snakeStartButton"),
  pauseButton: $("#snakePauseButton"),
  gridSize: 18,
  snake: [{ x: 9, y: 9 }],
  apple: { x: 13, y: 9 },
  direction: { x: 1, y: 0 },
  nextDirection: { x: 1, y: 0 },
  scoreValue: 0,
  bestValue: 0,
  timer: null,
  running: false,
  paused: false,
  gameOver: false,
};

const clickRush = {
  board: $("#clickRushBoard"),
  target: $("#clickRushTarget"),
  score: $("#clickRushScore"),
  best: $("#clickRushBest"),
  time: $("#clickRushTime"),
  finalScore: $("#clickRushFinalScore"),
  gameOverScreen: $("#clickRushGameOver"),
  status: $("#clickRushStatus"),
  startButton: $("#clickRushStartButton"),
  resetButton: $("#clickRushResetButton"),
  scoreValue: 0,
  bestValue: 0,
  timeValue: 15,
  timer: null,
  running: false,
};

const wordleWords = [
  "BLAZE",
  "CRISP",
  "FROST",
  "GHOST",
  "GLARE",
  "NIGHT",
  "PIXEL",
  "PLAZA",
  "SHINE",
  "SOUND",
  "VIVID",
];

const wordleValidWords = new Set([
  ...wordleWords,
  "ABOUT",
  "ABOVE",
  "ACTOR",
  "ACUTE",
  "ADMIT",
  "ADOPT",
  "ADULT",
  "AFTER",
  "AGAIN",
  "AGENT",
  "AGREE",
  "AHEAD",
  "ALARM",
  "ALBUM",
  "ALERT",
  "ALIEN",
  "ALIVE",
  "ALLOW",
  "ALONE",
  "ALTER",
  "AMONG",
  "ANGER",
  "APPLE",
  "APPLY",
  "ARENA",
  "ARGUE",
  "ARISE",
  "ARROW",
  "AUDIO",
  "AVOID",
  "AWARD",
  "AWARE",
  "BADGE",
  "BASIC",
  "BEACH",
  "BEGAN",
  "BEGIN",
  "BEING",
  "BELOW",
  "BENCH",
  "BIRTH",
  "BLACK",
  "BLAME",
  "BLANK",
  "BLIND",
  "BLOCK",
  "BLOOD",
  "BOARD",
  "BOOST",
  "BOUND",
  "BRAIN",
  "BRAND",
  "BREAD",
  "BREAK",
  "BRICK",
  "BRING",
  "BROWN",
  "BUILD",
  "BUILT",
  "BUYER",
  "CABLE",
  "CARRY",
  "CATCH",
  "CAUSE",
  "CHAIN",
  "CHAIR",
  "CHART",
  "CHASE",
  "CHEAP",
  "CHECK",
  "CHEST",
  "CHILD",
  "CHOIR",
  "CIVIL",
  "CLAIM",
  "CLASS",
  "CLEAN",
  "CLEAR",
  "CLICK",
  "CLOCK",
  "CLOSE",
  "CLOUD",
  "COACH",
  "COAST",
  "COUNT",
  "COURT",
  "COVER",
  "CRAFT",
  "CRASH",
  "CREAM",
  "CRIME",
  "CROSS",
  "CROWD",
  "CROWN",
  "DAILY",
  "DANCE",
  "DEALT",
  "DEATH",
  "DEBUT",
  "DELAY",
  "DEPTH",
  "DIRTY",
  "DOUBT",
  "DRAFT",
  "DRAMA",
  "DREAM",
  "DRESS",
  "DRIVE",
  "EARLY",
  "EARTH",
  "EIGHT",
  "EMPTY",
  "ENEMY",
  "ENJOY",
  "ENTER",
  "ENTRY",
  "EQUAL",
  "ERROR",
  "EVENT",
  "EVERY",
  "EXACT",
  "EXIST",
  "EXTRA",
  "FAITH",
  "FALSE",
  "FAULT",
  "FIBER",
  "FIELD",
  "FIFTH",
  "FIGHT",
  "FINAL",
  "FIRST",
  "FIXED",
  "FLASH",
  "FLOOR",
  "FOCUS",
  "FORCE",
  "FRAME",
  "FRESH",
  "FRONT",
  "FRUIT",
  "GIANT",
  "GIVEN",
  "GLASS",
  "GRACE",
  "GRADE",
  "GRAND",
  "GRANT",
  "GRASS",
  "GREAT",
  "GREEN",
  "GROUP",
  "GUARD",
  "GUESS",
  "GUEST",
  "GUIDE",
  "HAPPY",
  "HEART",
  "HEAVY",
  "HONOR",
  "HORSE",
  "HOTEL",
  "HOUSE",
  "HUMAN",
  "IMAGE",
  "INDEX",
  "INNER",
  "INPUT",
  "ISSUE",
  "JOINT",
  "JUDGE",
  "KNOWN",
  "LABEL",
  "LARGE",
  "LASER",
  "LATER",
  "LAUGH",
  "LAYER",
  "LEARN",
  "LEAST",
  "LEAVE",
  "LEVEL",
  "LIGHT",
  "LIMIT",
  "LOCAL",
  "LOGIC",
  "LOOSE",
  "LOWER",
  "LUCKY",
  "MAGIC",
  "MAJOR",
  "MARCH",
  "MATCH",
  "MAYBE",
  "METAL",
  "MIGHT",
  "MINOR",
  "MODEL",
  "MONEY",
  "MONTH",
  "MOTOR",
  "MOUSE",
  "MOUTH",
  "MUSIC",
  "NEVER",
  "NOISE",
  "NORTH",
  "NOVEL",
  "NURSE",
  "OCEAN",
  "OFFER",
  "ORDER",
  "OTHER",
  "OUTER",
  "OWNER",
  "PANEL",
  "PAPER",
  "PARTY",
  "PAUSE",
  "PEACE",
  "PHASE",
  "PHONE",
  "PHOTO",
  "PIANO",
  "PIECE",
  "PILOT",
  "PLACE",
  "PLAIN",
  "PLANE",
  "PLANT",
  "PLATE",
  "POINT",
  "POWER",
  "PRESS",
  "PRICE",
  "PRIDE",
  "PRIME",
  "PRINT",
  "PRIZE",
  "PROOF",
  "PROUD",
  "QUEEN",
  "QUICK",
  "QUIET",
  "RADIO",
  "RAISE",
  "RANGE",
  "RAPID",
  "RATIO",
  "REACH",
  "REACT",
  "READY",
  "RIGHT",
  "RIVER",
  "ROBOT",
  "ROUGH",
  "ROUND",
  "ROUTE",
  "ROYAL",
  "RURAL",
  "SCALE",
  "SCENE",
  "SCOPE",
  "SCORE",
  "SENSE",
  "SERVE",
  "SHADE",
  "SHARE",
  "SHEET",
  "SHIFT",
  "SHIRT",
  "SHOCK",
  "SHORT",
  "SHOWN",
  "SIGHT",
  "SKILL",
  "SLEEP",
  "SLICE",
  "SMALL",
  "SMART",
  "SMILE",
  "SMOKE",
  "SOLID",
  "SOLVE",
  "SORRY",
  "SOUTH",
  "SPACE",
  "SPARE",
  "SPEAK",
  "SPEED",
  "SPEND",
  "SPICE",
  "SPORT",
  "SQUAD",
  "STAFF",
  "STAGE",
  "STAIR",
  "STAND",
  "START",
  "STATE",
  "STEAM",
  "STICK",
  "STILL",
  "STONE",
  "STORE",
  "STORM",
  "STORY",
  "STRIP",
  "STUDY",
  "STYLE",
  "SUGAR",
  "SUPER",
  "SWEET",
  "TABLE",
  "TAKEN",
  "TASTE",
  "TEACH",
  "THANK",
  "THEME",
  "THERE",
  "THICK",
  "THING",
  "THINK",
  "THIRD",
  "THOSE",
  "THREE",
  "THROW",
  "TIGHT",
  "TIMER",
  "TITLE",
  "TODAY",
  "TOPIC",
  "TOTAL",
  "TOUCH",
  "TOWER",
  "TRACK",
  "TRADE",
  "TRAIN",
  "TRIAL",
  "TRUCK",
  "TRULY",
  "TRUST",
  "UNDER",
  "UNION",
  "UNITY",
  "UPPER",
  "URBAN",
  "USAGE",
  "USUAL",
  "VALID",
  "VALUE",
  "VIDEO",
  "VIRAL",
  "VISIT",
  "VOICE",
  "WASTE",
  "WATCH",
  "WATER",
  "WHEEL",
  "WHERE",
  "WHILE",
  "WHITE",
  "WHOLE",
  "WOMAN",
  "WORLD",
  "WORRY",
  "WORTH",
  "WOULD",
  "WRITE",
  "WRONG",
  "YOUNG",
]);

let wordleDictionaryWords = [...wordleWords];
let wordleDictionarySet = new Set(wordleValidWords);
let wordleDictionaryLoaded = false;

const wordle = {
  board: $("#wordleBoard"),
  input: $("#wordleInput"),
  try: $("#wordleTry"),
  left: $("#wordleLeft"),
  status: $("#wordleStatus"),
  guessButton: $("#wordleGuessButton"),
  resetButton: $("#wordleResetButton"),
  target: "",
  row: 0,
  size: 5,
  maxRows: 6,
  complete: false,
};

const loadWordleDictionary = async () => {
  try {
    const response = await fetch("/words-5.txt", { cache: "force-cache" });
    if (!response.ok) throw new Error("Dictionary file not found");

    const words = (await response.text())
      .split(/\r?\n/)
      .map((word) => word.trim().toUpperCase())
      .filter((word) => /^[A-Z]{5}$/.test(word));
    const uniqueWords = [...new Set(words)];
    if (!uniqueWords.length) throw new Error("Dictionary file is empty");

    wordleDictionaryWords = uniqueWords;
    wordleDictionarySet = new Set(uniqueWords);
    wordleDictionaryLoaded = true;

    if (activeGame === "wordle" && !wordle.complete) {
      resetWordle();
    }
  } catch (error) {
    console.warn("Using fallback Wordle dictionary:", error.message);
  }
};

const crossy = {
  canvas: $("#crossyCanvas"),
  score: $("#crossyScore"),
  best: $("#crossyBest"),
  level: $("#crossyLevel"),
  finalScore: $("#crossyFinalScore"),
  gameOverScreen: $("#crossyGameOver"),
  status: $("#crossyStatus"),
  startButton: $("#crossyStartButton"),
  resetButton: $("#crossyResetButton"),
  cols: 9,
  rows: 11,
  player: { x: 4, y: 10 },
  cars: [],
  obstacles: [],
  scoreValue: 0,
  bestValue: 0,
  levelValue: 1,
  highestRow: 10,
  timer: null,
  running: false,
  gameOver: false,
};

const gamesGrid = $("#gamesGrid");
const gameCards = document.querySelectorAll("[data-game-card]");
const gameExpandedPanels = document.querySelectorAll("[data-game-expanded]");
let activeGame = "";

const publicHandleFromPath = () => {
  const match = location.pathname.match(/^\/u\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : "";
};

const isPublicProfilePage = Boolean(publicHandleFromPath());

if (isPublicProfilePage) {
  document.body.classList.add("public-profile", "previewing");
  $("#previewToolbar").hidden = true;
}

function updateThemeButtons() {
  document.querySelectorAll(".editor .swatch").forEach((swatch) => {
    swatch.classList.toggle("active", swatch.dataset.theme === profileTheme);
  });

  dashboardThemeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.dashboardTheme === dashboardTheme);
  });
}

function applyThemeForCurrentSection() {
  const section = document.body.dataset.accountSection;
  const nextTheme = !isPublicProfilePage && section !== "bio" ? dashboardTheme : profileTheme;
  document.body.dataset.theme = nextTheme;
  updateThemeButtons();
}

function syncDashboardAudioState() {
  const audio = $("#backgroundMusic");
  const section = document.body.dataset.accountSection;
  const shouldMute = !isPublicProfilePage && section !== "bio" && dashboardMusicMutedOutsideBio;
  if (audio) audio.muted = shouldMute;

  const muteButton = $("#dashboardMuteButton");
  if (muteButton) {
    muteButton.classList.toggle("active", dashboardMusicMutedOutsideBio);
    muteButton.setAttribute("aria-pressed", String(dashboardMusicMutedOutsideBio));
    muteButton.textContent = dashboardMusicMutedOutsideBio ? "Muted outside Bio" : "Mute outside Bio";
  }
}

function syncSidebarCollapsedState() {
  document.body.classList.toggle("sidebar-collapsed", sidebarCollapsed);

  const collapseButton = $("#sidebarCollapseButton");
  const collapseIcon = $("#sidebarCollapseIcon");
  const label = sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar";

  if (collapseButton) {
    collapseButton.setAttribute("aria-expanded", String(!sidebarCollapsed));
    collapseButton.setAttribute("aria-label", label);
    collapseButton.title = label;
  }

  if (collapseIcon) {
    collapseIcon.textContent = sidebarCollapsed ? ">" : "<";
  }
}

const setDashboardSection = (section) => {
  const nextSection = isPublicProfilePage ? "bio" : section;
  document.body.dataset.accountSection = nextSection;
  applyThemeForCurrentSection();
  syncDashboardAudioState();

  dashboardPanels.forEach((panel) => {
    panel.hidden = panel.dataset.dashboardPanel !== nextSection;
  });

  dashboardButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.dashboardTarget === nextSection);
  });

  if (nextSection === "games") {
    loadSnakeBestScore();
    loadClickRushBestScore();
  }

  if (nextSection === "settings") {
    updateSettingsDetails();
  }
};

setDashboardSection(isPublicProfilePage ? "bio" : "home");
syncSidebarCollapsedState();

const cleanHandle = (value) =>
  value
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 24);

const socialLabels = {
  discord: "Discord",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  x: "X",
  github: "GitHub",
};

const cleanSocialHandle = (value) =>
  value
    .trim()
    .replace(/^@+/, "")
    .replace(/^\/+/, "");

const isFullUrl = (value) => /^(https?:)?\/\//i.test(value);
const looksLikeDomain = (value) => /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(value);

const socialUrlFor = (platform, value) => {
  const raw = value.trim();
  if (!raw) return "";
  if (isFullUrl(raw)) return raw.startsWith("//") ? `https:${raw}` : raw;
  if (looksLikeDomain(raw)) return `https://${raw}`;

  const handle = cleanSocialHandle(raw);
  if (!handle) return "";

  const encoded = encodeURIComponent(handle);
  const routes = {
    discord: `https://discord.com/users/${encoded}`,
    instagram: `https://www.instagram.com/${encoded}`,
    tiktok: `https://www.tiktok.com/@${encoded}`,
    youtube: `https://www.youtube.com/${raw.trim().startsWith("@") ? raw.trim() : `@${handle}`}`,
    x: `https://x.com/${encoded}`,
    github: `https://github.com/${encoded}`,
  };

  return routes[platform] || "";
};

const collectSocialLinks = () =>
  Object.fromEntries(
    Object.entries(socialInputs).map(([platform, input]) => [platform, input.value.trim()])
  );

const applySocialInputs = (links = {}) => {
  Object.entries(socialInputs).forEach(([platform, input]) => {
    input.value = links[platform] || "";
  });
};

const syncSocialLinks = () => {
  const socials = $("#socials");
  let activeCount = 0;

  Object.entries(socialInputs).forEach(([platform, input]) => {
    const link = socials.querySelector(`[data-social="${platform}"]`);
    const url = socialUrlFor(platform, input.value);
    if (!link || !url) {
      if (link) link.hidden = true;
      return;
    }

    activeCount += 1;
    link.hidden = false;
    link.href = url;
    link.setAttribute("aria-label", socialLabels[platform]);
    link.title = socialLabels[platform];
  });

  socials.classList.toggle("is-empty", activeCount === 0);
};

const showToast = (message) => {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1700);
};

const localSnakeScoreKey = () => `funlol-snake-best:${auth.email.value.trim().toLowerCase() || "local"}`;
const localClickRushScoreKey = () => `funlol-click-rush-best:${auth.email.value.trim().toLowerCase() || "local"}`;
const localCrossyScoreKey = () => `funlol-crossy-best:${auth.email.value.trim().toLowerCase() || "local"}`;

const drawSnake = () => {
  const canvas = snake.canvas;
  const context = canvas.getContext("2d");
  const cell = canvas.width / snake.gridSize;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#020204";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "rgba(255, 255, 255, 0.045)";
  context.lineWidth = 1;
  for (let index = 1; index < snake.gridSize; index += 1) {
    const line = index * cell;
    context.beginPath();
    context.moveTo(line, 0);
    context.lineTo(line, canvas.height);
    context.moveTo(0, line);
    context.lineTo(canvas.width, line);
    context.stroke();
  }

  context.fillStyle = "#f5f7fb";
  context.shadowColor = "rgba(255, 255, 255, 0.9)";
  context.shadowBlur = 16;
  context.beginPath();
  context.arc((snake.apple.x + 0.5) * cell, (snake.apple.y + 0.5) * cell, cell * 0.28, 0, Math.PI * 2);
  context.fill();

  snake.snake.forEach((segment, index) => {
    const inset = index === 0 ? 2 : 3.5;
    context.fillStyle = index === 0 ? "#ffffff" : "rgba(255, 255, 255, 0.78)";
    context.shadowColor = "rgba(255, 255, 255, 0.55)";
    context.shadowBlur = index === 0 ? 18 : 10;
    context.beginPath();
    context.roundRect(segment.x * cell + inset, segment.y * cell + inset, cell - inset * 2, cell - inset * 2, 6);
    context.fill();
  });

  context.shadowBlur = 0;
};

const randomSnakeCell = () => ({
  x: Math.floor(Math.random() * snake.gridSize),
  y: Math.floor(Math.random() * snake.gridSize),
});

const placeSnakeApple = () => {
  let nextApple = randomSnakeCell();
  while (snake.snake.some((segment) => segment.x === nextApple.x && segment.y === nextApple.y)) {
    nextApple = randomSnakeCell();
  }
  snake.apple = nextApple;
};

const updateSnakeScore = (score) => {
  snake.scoreValue = score;
  snake.score.textContent = String(score);
};

const updateSnakeBest = (score) => {
  snake.bestValue = Math.max(0, Number(score || 0));
  snake.best.textContent = String(snake.bestValue);
  localStorage.setItem(localSnakeScoreKey(), String(snake.bestValue));
};

const loadSnakeBestScore = async () => {
  updateSnakeBest(Number(localStorage.getItem(localSnakeScoreKey()) || 0));
  if (!sessionToken || isPublicProfilePage) return;

  try {
    const response = await fetch("/api/games/snake-score", { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load score");
    updateSnakeBest(data.highScore);
  } catch {
    snake.status.textContent = "Best score is saved on this device.";
  }
};

const saveSnakeBestScore = async () => {
  if (snake.scoreValue <= snake.bestValue) return;
  updateSnakeBest(snake.scoreValue);
  snake.status.textContent = "New best saved.";

  if (!sessionToken || isPublicProfilePage) return;

  try {
    const response = await fetch("/api/games/snake-score", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ score: snake.scoreValue }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not save score");
    updateSnakeBest(data.highScore);
  } catch {
    snake.status.textContent = "New best saved on this device.";
  }
};

const resetSnake = () => {
  snake.snake = [{ x: 9, y: 9 }];
  snake.direction = { x: 1, y: 0 };
  snake.nextDirection = { x: 1, y: 0 };
  snake.gameOver = false;
  snake.gameOverScreen.hidden = true;
  updateSnakeScore(0);
  placeSnakeApple();
  snake.status.textContent = "Use arrow keys or WASD.";
  drawSnake();
};

const stopSnake = () => {
  clearInterval(snake.timer);
  snake.timer = null;
  snake.running = false;
  snake.paused = false;
  snake.startButton.textContent = "Start";
  snake.pauseButton.textContent = "Pause";
};

const endSnakeGame = async () => {
  stopSnake();
  snake.gameOver = true;
  snake.finalScore.textContent = String(snake.scoreValue);
  snake.gameOverScreen.hidden = false;
  snake.startButton.textContent = "Restart";
  snake.status.textContent = `Game over. Score - ${snake.scoreValue}.`;
  await saveSnakeBestScore();
};

const stepSnake = () => {
  if (!snake.running || snake.paused || snake.gameOver) return;

  snake.direction = snake.nextDirection;
  const head = snake.snake[0];
  const nextHead = {
    x: head.x + snake.direction.x,
    y: head.y + snake.direction.y,
  };

  const hitWall =
    nextHead.x < 0 || nextHead.x >= snake.gridSize || nextHead.y < 0 || nextHead.y >= snake.gridSize;
  const hitBody = snake.snake.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y);
  if (hitWall || hitBody) {
    endSnakeGame();
    return;
  }

  snake.snake.unshift(nextHead);
  if (nextHead.x === snake.apple.x && nextHead.y === snake.apple.y) {
    updateSnakeScore(snake.scoreValue + 1);
    if (snake.scoreValue > snake.bestValue) saveSnakeBestScore();
    placeSnakeApple();
  } else {
    snake.snake.pop();
  }

  drawSnake();
};

const startSnake = () => {
  if (snake.gameOver || (snake.running && !snake.paused)) {
    resetSnake();
  }

  if (!snake.running) {
    snake.running = true;
    snake.paused = false;
    snake.startButton.textContent = "Restart";
    snake.status.textContent = "Playing";
    clearInterval(snake.timer);
    snake.timer = setInterval(stepSnake, 125);
    return;
  }

  if (snake.paused) {
    snake.paused = false;
    snake.pauseButton.textContent = "Pause";
    snake.status.textContent = "Playing";
    snake.timer = setInterval(stepSnake, 125);
  }
};

const pauseSnake = () => {
  if (!snake.running || snake.gameOver) return;

  if (snake.paused) {
    startSnake();
    return;
  }

  clearInterval(snake.timer);
  snake.timer = null;
  snake.paused = true;
  snake.pauseButton.textContent = "Resume";
  snake.status.textContent = "Paused";
};

const setSnakeDirection = (x, y) => {
  if (snake.direction.x + x === 0 && snake.direction.y + y === 0) return;
  snake.nextDirection = { x, y };
};

const updateClickRushScore = (score) => {
  clickRush.scoreValue = score;
  clickRush.score.textContent = String(score);
};

const updateClickRushBest = (score) => {
  clickRush.bestValue = Math.max(0, Number(score || 0));
  clickRush.best.textContent = String(clickRush.bestValue);
  localStorage.setItem(localClickRushScoreKey(), String(clickRush.bestValue));
};

const loadClickRushBestScore = () => {
  updateClickRushBest(Number(localStorage.getItem(localClickRushScoreKey()) || 0));
};

const saveClickRushBestScore = () => {
  if (clickRush.scoreValue > clickRush.bestValue) {
    updateClickRushBest(clickRush.scoreValue);
  }
};

const moveClickRushTarget = () => {
  clickRush.target.style.left = `${10 + Math.random() * 80}%`;
  clickRush.target.style.top = `${10 + Math.random() * 80}%`;
};

const stopClickRush = () => {
  clearInterval(clickRush.timer);
  clickRush.timer = null;
  clickRush.running = false;
  clickRush.startButton.textContent = "Start";
};

const resetClickRush = () => {
  stopClickRush();
  updateClickRushScore(0);
  clickRush.timeValue = 15;
  clickRush.time.textContent = String(clickRush.timeValue);
  clickRush.gameOverScreen.hidden = true;
  clickRush.status.textContent = "Click the glowing dot before time runs out.";
  moveClickRushTarget();
};

const endClickRush = () => {
  stopClickRush();
  clickRush.finalScore.textContent = String(clickRush.scoreValue);
  clickRush.gameOverScreen.hidden = false;
  clickRush.startButton.textContent = "Restart";
  clickRush.status.textContent = `Time up. Score - ${clickRush.scoreValue}.`;
  saveClickRushBestScore();
};

const startClickRush = () => {
  resetClickRush();
  clickRush.running = true;
  clickRush.startButton.textContent = "Restart";
  clickRush.status.textContent = "Playing";
  clickRush.timer = setInterval(() => {
    clickRush.timeValue -= 1;
    clickRush.time.textContent = String(clickRush.timeValue);
    if (clickRush.timeValue <= 0) endClickRush();
  }, 1000);
};

const buildWordleBoard = () => {
  wordle.board.innerHTML = "";
  for (let row = 0; row < wordle.maxRows; row += 1) {
    const rowElement = document.createElement("div");
    rowElement.className = "wordle-row";
    for (let col = 0; col < wordle.size; col += 1) {
      const tile = document.createElement("span");
      tile.className = "wordle-tile";
      rowElement.append(tile);
    }
    wordle.board.append(rowElement);
  }
};

const setWordleStats = () => {
  wordle.try.textContent = String(Math.min(wordle.row + 1, wordle.maxRows));
  wordle.left.textContent = String(Math.max(0, wordle.maxRows - wordle.row));
};

const resetWordle = () => {
  wordle.target = wordleDictionaryWords[Math.floor(Math.random() * wordleDictionaryWords.length)];
  wordle.row = 0;
  wordle.complete = false;
  wordle.input.value = "";
  wordle.input.disabled = false;
  wordle.status.textContent = wordleDictionaryLoaded
    ? "Guess any 5 letter English word."
    : "Loading the full word list.";
  buildWordleBoard();
  setWordleStats();
  if (activeGame === "wordle") wordle.input.focus();
};

const scoreWordleGuess = (guess) => {
  const result = Array(wordle.size).fill("absent");
  const remaining = {};

  for (let index = 0; index < wordle.size; index += 1) {
    const targetLetter = wordle.target[index];
    if (guess[index] === targetLetter) {
      result[index] = "correct";
    } else {
      remaining[targetLetter] = (remaining[targetLetter] || 0) + 1;
    }
  }

  for (let index = 0; index < wordle.size; index += 1) {
    const letter = guess[index];
    if (result[index] === "correct" || !remaining[letter]) continue;
    result[index] = "present";
    remaining[letter] -= 1;
  }

  return result;
};

const submitWordleGuess = () => {
  if (wordle.complete) return;

  const guess = wordle.input.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, wordle.size);
  wordle.input.value = guess;

  if (guess.length !== wordle.size) {
    wordle.status.textContent = "Enter 5 letters first.";
    return;
  }

  if (!wordleDictionarySet.has(guess)) {
    wordle.status.textContent = "That is not in the word list.";
    wordle.input.select();
    return;
  }

  const rowElement = wordle.board.children[wordle.row];
  const result = scoreWordleGuess(guess);
  [...rowElement.children].forEach((tile, index) => {
    tile.textContent = guess[index];
    tile.classList.add(result[index]);
  });

  wordle.row += 1;
  wordle.input.value = "";
  setWordleStats();

  if (guess === wordle.target) {
    wordle.complete = true;
    wordle.input.disabled = true;
    wordle.status.textContent = `You got it in ${wordle.row} ${wordle.row === 1 ? "try" : "tries"}.`;
    return;
  }

  if (wordle.row >= wordle.maxRows) {
    wordle.complete = true;
    wordle.input.disabled = true;
    wordle.status.textContent = `Out of tries. Word was ${wordle.target}.`;
    return;
  }

  wordle.status.textContent = "Keep guessing.";
};

const updateCrossyScore = (score) => {
  crossy.scoreValue = score;
  crossy.score.textContent = String(score);
  if (score > crossy.bestValue) {
    crossy.bestValue = score;
    crossy.best.textContent = String(score);
    localStorage.setItem(localCrossyScoreKey(), String(score));
  }
};

const loadCrossyBestScore = () => {
  crossy.bestValue = Number(localStorage.getItem(localCrossyScoreKey()) || 0);
  crossy.best.textContent = String(crossy.bestValue);
};

const updateCrossyLevel = (level) => {
  crossy.levelValue = Math.max(1, Number(level || 1));
  crossy.level.textContent = String(crossy.levelValue);
};

const crossySpeedMultiplier = () => 1 + (crossy.levelValue - 1) * 0.18;

const isCrossyObstacle = (x, y) =>
  crossy.obstacles.some((obstacle) => obstacle.x === x && obstacle.y === y);

const createCrossyObstacles = () => {
  const patterns = [
    [
      { x: 1, y: 3 },
      { x: 6, y: 3 },
      { x: 3, y: 6 },
      { x: 7, y: 6 },
      { x: 2, y: 0 },
    ],
    [
      { x: 2, y: 3 },
      { x: 7, y: 3 },
      { x: 1, y: 6 },
      { x: 5, y: 6 },
      { x: 6, y: 0 },
    ],
    [
      { x: 0, y: 3 },
      { x: 4, y: 3 },
      { x: 8, y: 3 },
      { x: 2, y: 6 },
      { x: 6, y: 6 },
      { x: 4, y: 0 },
    ],
  ];
  crossy.obstacles = patterns[(crossy.levelValue - 1) % patterns.length];
};

const createCrossyCars = () => {
  const laneRows = [1, 2, 4, 5, 7, 8];
  crossy.cars = laneRows.flatMap((row, laneIndex) => {
    const direction = laneIndex % 2 === 0 ? 1 : -1;
    const speed = 0.045 + laneIndex * 0.006;
    return Array.from({ length: 2 }, (_, carIndex) => ({
      x: (carIndex * 4 + laneIndex * 1.35) % crossy.cols,
      y: row,
      width: laneIndex % 3 === 0 ? 1.6 : 1.25,
      direction,
      speed,
    }));
  });
};

const drawCrossy = () => {
  const context = crossy.canvas.getContext("2d");
  const cellWidth = crossy.canvas.width / crossy.cols;
  const cellHeight = crossy.canvas.height / crossy.rows;

  context.clearRect(0, 0, crossy.canvas.width, crossy.canvas.height);

  for (let row = 0; row < crossy.rows; row += 1) {
    const safeRow = row === 0 || row === 3 || row === 6 || row === crossy.rows - 1;
    context.fillStyle = safeRow ? "rgba(255, 255, 255, 0.07)" : "rgba(255, 255, 255, 0.025)";
    context.fillRect(0, row * cellHeight, crossy.canvas.width, cellHeight);
    context.strokeStyle = "rgba(255, 255, 255, 0.045)";
    context.beginPath();
    context.moveTo(0, row * cellHeight);
    context.lineTo(crossy.canvas.width, row * cellHeight);
    context.stroke();
  }

  crossy.obstacles.forEach((obstacle) => {
    const x = obstacle.x * cellWidth + cellWidth * 0.16;
    const y = obstacle.y * cellHeight + cellHeight * 0.16;
    const size = Math.min(cellWidth, cellHeight) * 0.68;
    context.fillStyle = "rgba(255, 255, 255, 0.18)";
    context.shadowColor = "rgba(255, 255, 255, 0.32)";
    context.shadowBlur = 10;
    context.beginPath();
    context.roundRect(x, y, size, size, 8);
    context.fill();
    context.strokeStyle = "rgba(255, 255, 255, 0.34)";
    context.stroke();
  });

  crossy.cars.forEach((car, index) => {
    const x = car.x * cellWidth;
    const y = car.y * cellHeight + cellHeight * 0.18;
    const width = car.width * cellWidth;
    const height = cellHeight * 0.64;
    context.fillStyle = index % 2 === 0 ? "#ffffff" : "rgba(255, 255, 255, 0.72)";
    context.shadowColor = "rgba(255, 255, 255, 0.55)";
    context.shadowBlur = 14;
    context.beginPath();
    context.roundRect(x, y, width, height, 8);
    context.fill();
  });

  context.shadowBlur = 0;
  context.fillStyle = "#ffffff";
  context.shadowColor = "rgba(255, 255, 255, 0.95)";
  context.shadowBlur = 18;
  context.beginPath();
  context.arc(
    (crossy.player.x + 0.5) * cellWidth,
    (crossy.player.y + 0.5) * cellHeight,
    Math.min(cellWidth, cellHeight) * 0.32,
    0,
    Math.PI * 2
  );
  context.fill();
  context.shadowBlur = 0;
};

const stopCrossy = () => {
  clearInterval(crossy.timer);
  crossy.timer = null;
  crossy.running = false;
  crossy.startButton.textContent = "Start";
};

const resetCrossy = () => {
  stopCrossy();
  loadCrossyBestScore();
  crossy.player = { x: Math.floor(crossy.cols / 2), y: crossy.rows - 1 };
  crossy.highestRow = crossy.rows - 1;
  crossy.gameOver = false;
  crossy.gameOverScreen.hidden = true;
  updateCrossyLevel(1);
  crossy.status.textContent = "Use arrow keys or WASD to cross.";
  updateCrossyScore(0);
  createCrossyObstacles();
  createCrossyCars();
  drawCrossy();
};

const endCrossy = () => {
  stopCrossy();
  crossy.gameOver = true;
  crossy.finalScore.textContent = String(crossy.scoreValue);
  crossy.gameOverScreen.hidden = false;
  crossy.startButton.textContent = "Restart";
  crossy.status.textContent = `Game over. Score - ${crossy.scoreValue}.`;
};

const checkCrossyCollision = () => {
  const playerLeft = crossy.player.x + 0.18;
  const playerRight = crossy.player.x + 0.82;
  return crossy.cars.some((car) => {
    if (car.y !== crossy.player.y) return false;
    return playerRight > car.x && playerLeft < car.x + car.width;
  });
};

const stepCrossy = () => {
  if (!crossy.running || crossy.gameOver) return;

  crossy.cars.forEach((car) => {
    car.x += car.speed * crossySpeedMultiplier() * car.direction;
    if (car.direction > 0 && car.x > crossy.cols + 0.35) car.x = -car.width - 0.35;
    if (car.direction < 0 && car.x < -car.width - 0.35) car.x = crossy.cols + 0.35;
  });

  if (checkCrossyCollision()) {
    endCrossy();
    drawCrossy();
    return;
  }

  drawCrossy();
};

const startCrossy = () => {
  if (crossy.running || crossy.gameOver) resetCrossy();
  crossy.running = true;
  crossy.startButton.textContent = "Restart";
  crossy.status.textContent = "Cross the roads.";
  clearInterval(crossy.timer);
  crossy.timer = setInterval(stepCrossy, 70);
};

const moveCrossyPlayer = (x, y) => {
  if (crossy.gameOver) return;
  if (!crossy.running) startCrossy();

  const nextPlayer = {
    x: Math.max(0, Math.min(crossy.cols - 1, crossy.player.x + x)),
    y: Math.max(0, Math.min(crossy.rows - 1, crossy.player.y + y)),
  };

  if (isCrossyObstacle(nextPlayer.x, nextPlayer.y)) {
    crossy.status.textContent = "That safe spot is blocked.";
    drawCrossy();
    return;
  }

  crossy.player = nextPlayer;

  if (crossy.player.y < crossy.highestRow) {
    const rowsCrossed = crossy.highestRow - crossy.player.y;
    crossy.highestRow = crossy.player.y;
    updateCrossyScore(crossy.scoreValue + rowsCrossed);
  }

  if (crossy.player.y === 0) {
    updateCrossyLevel(crossy.levelValue + 1);
    crossy.status.textContent = `Level ${crossy.levelValue}. Traffic is faster.`;
    crossy.player = { x: Math.floor(crossy.cols / 2), y: crossy.rows - 1 };
    crossy.highestRow = crossy.rows - 1;
    createCrossyObstacles();
    createCrossyCars();
  }

  if (checkCrossyCollision()) {
    endCrossy();
  }
  drawCrossy();
};

const openGame = (game) => {
  activeGame = game;
  gamesGrid.classList.add("has-expanded");
  gameCards.forEach((card) => {
    card.classList.toggle("expanded", card.dataset.gameCard === game);
  });
  gameExpandedPanels.forEach((panel) => {
    panel.hidden = panel.dataset.gameExpanded !== game;
  });

  if (game === "snake") {
    loadSnakeBestScore();
    drawSnake();
  }

  if (game === "click-rush") {
    loadClickRushBestScore();
    resetClickRush();
  }

  if (game === "wordle") {
    resetWordle();
  }

  if (game === "crossy") {
    resetCrossy();
  }
};

const closeActiveGame = () => {
  activeGame = "";
  gamesGrid.classList.remove("has-expanded");
  gameCards.forEach((card) => card.classList.remove("expanded"));
  gameExpandedPanels.forEach((panel) => {
    panel.hidden = true;
  });
  stopSnake();
  stopClickRush();
  stopCrossy();
};

document.querySelectorAll("[data-open-game]").forEach((button) => {
  button.addEventListener("click", () => openGame(button.dataset.openGame));
});

document.querySelectorAll("[data-close-game]").forEach((button) => {
  button.addEventListener("click", closeActiveGame);
});

snake.startButton.addEventListener("click", startSnake);
snake.pauseButton.addEventListener("click", pauseSnake);
clickRush.startButton.addEventListener("click", startClickRush);
clickRush.resetButton.addEventListener("click", resetClickRush);
clickRush.target.addEventListener("click", () => {
  if (!clickRush.running) return;
  updateClickRushScore(clickRush.scoreValue + 1);
  moveClickRushTarget();
});
wordle.guessButton.addEventListener("click", submitWordleGuess);
wordle.resetButton.addEventListener("click", resetWordle);
wordle.input.addEventListener("input", () => {
  wordle.input.value = wordle.input.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, wordle.size);
});
wordle.input.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  submitWordleGuess();
});
crossy.startButton.addEventListener("click", startCrossy);
crossy.resetButton.addEventListener("click", resetCrossy);

document.addEventListener("keydown", (event) => {
  if (document.body.dataset.accountSection !== "games") return;

  const directions = {
    ArrowUp: [0, -1],
    w: [0, -1],
    W: [0, -1],
    ArrowDown: [0, 1],
    s: [0, 1],
    S: [0, 1],
    ArrowLeft: [-1, 0],
    a: [-1, 0],
    A: [-1, 0],
    ArrowRight: [1, 0],
    d: [1, 0],
    D: [1, 0],
  };

  const direction = directions[event.key];
  if (!direction) return;
  const isSnakeActive = activeGame === "snake";
  const isCrossyActive = activeGame === "crossy";
  if (!isSnakeActive && !isCrossyActive) return;

  event.preventDefault();
  if (isSnakeActive) {
    if (snake.gameOver) return;
    setSnakeDirection(direction[0], direction[1]);
    if (!snake.running) startSnake();
  }

  if (isCrossyActive) {
    moveCrossyPlayer(direction[0], direction[1]);
  }
});

resetSnake();
loadWordleDictionary();
resetWordle();
resetCrossy();

const setAuthMessage = (message) => {
  auth.message.textContent = message;
};

const setLoading = (percent, message) => {
  loadingPercent = Math.max(0, Math.min(100, percent));
  $("#loadingProgress").style.setProperty("--progress", `${loadingPercent}%`);
  if (message) $("#loadingText").textContent = message;
};

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

const startLoading = (message = "Loading...") => {
  clearInterval(loadingTimer);
  hideEntryGate();
  document.body.classList.remove("welcoming", "welcome-leaving", "owner-entering");
  document.body.classList.add("loading");
  setLoading(8, message);
  loadingTimer = setInterval(() => {
    if (loadingPercent < 88) setLoading(loadingPercent + 4);
  }, 180);
};

const finishLoading = async () => {
  clearInterval(loadingTimer);
  setLoading(100, "Ready");
  await wait(260);
  document.body.classList.remove("loading");
};

const playOwnerWelcome = async () => {
  if (isPublicProfilePage) return;

  hideEntryGate();
  document.body.classList.remove("auth-required", "previewing", "welcome-leaving", "owner-entering");
  document.body.classList.add("welcoming");
  await nextFrame();
  document.body.classList.remove("loading");
  await wait(1000);
  document.body.classList.remove("welcoming");
  document.body.classList.add("welcome-leaving", "owner-entering");
  await wait(1000);
  document.body.classList.remove("welcome-leaving", "owner-entering");
};

const finishLoadingIntoEditor = async () => {
  clearInterval(loadingTimer);
  setLoading(100, "Ready");
  await wait(260);
  setDashboardSection("home");
  await playOwnerWelcome();
};

const showEditor = () => {
  clearInterval(loadingTimer);
  hideEntryGate();
  document.body.classList.remove("auth-required", "loading", "welcoming", "welcome-leaving", "owner-entering");
};

const showAuth = () => {
  if (!isPublicProfilePage) {
    document.body.classList.remove("loading");
    hideEntryGate();
    exitPreview();
    document.body.classList.add("auth-required");
  }
};

const authHeaders = () => (sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {});

const submitAuth = async (mode) => {
  const email = auth.email.value.trim();
  const password = auth.password.value;
  setAuthMessage(mode === "signup" ? "Creating your account..." : "Logging in...");

  try {
    const response = await fetch(`/api/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      if (mode === "signup" && response.status === 409) {
        setAuthMessage("That email already exists. Trying to log you in...");
        return submitAuth("login");
      }
      throw new Error(data.error || "Could not sign in");
    }

    sessionToken = data.token;
    localStorage.setItem(sessionKey, sessionToken);
    auth.email.value = data.email;
    updateAccountState({ email: data.email });
    setAuthMessage(`Signed in as ${data.email}`);
    try {
      const detailsResponse = await fetch("/api/me", { headers: authHeaders() });
      const details = await detailsResponse.json();
      if (detailsResponse.ok) updateAccountState(details);
    } catch {
      updateSettingsDetails();
    }
    startLoading("Loading your profile...");
    await loadMyProfile();
    await finishLoadingIntoEditor();
  } catch (error) {
    document.body.classList.remove("loading");
    setAuthMessage(error.message);
  }
};

const tokenKeyForHandle = (handle) => `nightcard-owner-token:${handle}`;

const getOwnerToken = (handle) => {
  const key = tokenKeyForHandle(handle);
  let token = localStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(key, token);
  }
  return token;
};

const updatePublicLink = () => {
  const handle = cleanHandle(inputs.handle.value) || "nightcard";
  const url = `/u/${handle}`;
  $("#publicLink").href = url;
  $("#publicLink").textContent = url;
};

const friendsStorageKey = () => {
  const owner = accountState.userId || accountState.email || "guest";
  return `funlol-friends:${owner}`;
};

const friendUrlFor = (value) => {
  const raw = value.trim();
  if (!raw) return "";
  if (isFullUrl(raw)) return raw.startsWith("//") ? `https:${raw}` : raw;
  if (raw.startsWith("/u/")) return raw;
  const handle = cleanHandle(raw);
  return handle ? `/u/${handle}` : raw;
};

const friendHandleFor = (value) => {
  const raw = value.trim();
  if (!raw) return "";
  try {
    const url = raw.startsWith("http") ? new URL(raw) : new URL(raw, location.origin);
    const match = url.pathname.match(/^\/u\/([^/]+)/);
    if (match) return cleanHandle(decodeURIComponent(match[1]));
  } catch {
    // Fall through to plain handle cleanup.
  }
  return cleanHandle(raw);
};

const makeFriendId = () => (crypto.randomUUID ? crypto.randomUUID() : `friend-${Date.now()}-${Math.random()}`);

const sanitizeFriend = (friend) => {
  const rawName = String(friend?.name || "").trim().slice(0, 32);
  const rawLink = String(friend?.link || friend?.url || friend?.handle || "").trim();
  const handle = friendHandleFor(rawLink);
  const link = friendUrlFor(rawLink || handle);
  const name = rawName || (handle ? `@${handle}` : "Friend");

  if (!link && !handle) return null;
  return {
    id: friend?.id || makeFriendId(),
    name,
    handle,
    link,
  };
};

const sanitizeFriends = (items = []) =>
  items
    .map(sanitizeFriend)
    .filter(Boolean)
    .filter((friend, index, list) => list.findIndex((item) => item.link === friend.link) === index)
    .slice(0, 24);

const saveFriendsLocal = () => {
  if (isPublicProfilePage) return;
  localStorage.setItem(friendsStorageKey(), JSON.stringify(friends));
};

const loadFriendsLocal = () => {
  if (isPublicProfilePage) return [];
  try {
    return sanitizeFriends(JSON.parse(localStorage.getItem(friendsStorageKey()) || "[]"));
  } catch {
    return [];
  }
};

const friendInitials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "F";

const createFriendCard = (friend, { removable = false } = {}) => {
  const card = document.createElement("article");
  card.className = "friend-card";

  const avatar = document.createElement("span");
  avatar.className = "friend-avatar";
  avatar.textContent = friendInitials(friend.name);
  card.append(avatar);

  const copy = document.createElement("div");
  copy.className = "friend-copy";

  const name = document.createElement("strong");
  name.textContent = friend.name;
  copy.append(name);

  const link = document.createElement("a");
  link.href = friend.link || (friend.handle ? `/u/${friend.handle}` : "#");
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = friend.handle ? `@${friend.handle}` : friend.link;
  copy.append(link);
  card.append(copy);

  if (removable) {
    const removeButton = document.createElement("button");
    removeButton.className = "friend-remove";
    removeButton.type = "button";
    removeButton.setAttribute("aria-label", `Remove ${friend.name}`);
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      setFriends(friends.filter((item) => item.id !== friend.id));
    });
    card.append(removeButton);
  }

  return card;
};

function renderFriends() {
  const homeList = $("#homeFriendsList");
  const communitiesList = $("#communitiesFriendsList");
  const count = $("#friendsCount");
  const friendCountText = `${friends.length} ${friends.length === 1 ? "friend" : "friends"}`;
  if (count) count.textContent = friendCountText;

  [homeList, communitiesList].forEach((list) => {
    if (!list) return;
    list.textContent = "";
  });

  if (!friends.length) {
    const emptyHome = document.createElement("p");
    emptyHome.className = "friend-empty";
    emptyHome.textContent = "No friends added yet.";
    homeList?.append(emptyHome);

    const emptyCommunities = document.createElement("p");
    emptyCommunities.className = "friend-empty";
    emptyCommunities.textContent = "Add friends above and they will show here.";
    communitiesList?.append(emptyCommunities);
    return;
  }

  friends.forEach((friend) => {
    homeList?.append(createFriendCard(friend));
    communitiesList?.append(createFriendCard(friend, { removable: true }));
  });
}

function setFriends(nextFriends, { persist = true } = {}) {
  friends = sanitizeFriends(nextFriends);
  renderFriends();
  if (persist) saveFriendsLocal();
}

const shortId = (value) => {
  if (!value) return "Hidden until sign in";
  return value.length > 14 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
};

const formatDate = (value) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const updateAccountState = (data = {}) => {
  const previousOwner = accountState.userId || accountState.email;
  accountState = {
    ...accountState,
    email: data.email ?? accountState.email,
    userId: data.userId ?? accountState.userId,
    createdAt: data.createdAt ?? accountState.createdAt,
    profileHandle: data.profileHandle ?? accountState.profileHandle,
    profilePath: data.profilePath ?? accountState.profilePath,
    profileUrl: data.profileUrl ?? accountState.profileUrl,
  };
  const nextOwner = accountState.userId || accountState.email;
  if (!isPublicProfilePage && nextOwner && nextOwner !== previousOwner && !friends.length) {
    setFriends(loadFriendsLocal(), { persist: false });
  }
  updateSettingsDetails();
};

function updateSettingsDetails() {
  const handle = cleanHandle(inputs.handle.value || accountState.profileHandle) || "nightcard";
  const profilePath = accountState.profilePath || `/u/${handle}`;
  settings.email.textContent = accountState.email || auth.email.value.trim() || "Not signed in";
  settings.displayName.textContent = inputs.name.value.trim() || "Nova";
  settings.handle.textContent = `@${handle}`;
  settings.profileLink.href = profilePath;
  settings.profileLink.textContent = profilePath;
  settings.views.textContent = profile.views.textContent || "0 views";
  settings.created.textContent = formatDate(accountState.createdAt);
  settings.userId.textContent = shortId(accountState.userId);
}

const syncProfile = () => {
  profile.name.textContent = inputs.name.value.trim() || "Nova";
  const handle = cleanHandle(inputs.handle.value) || "nightcard";
  profile.handle.textContent = `@${handle}`;
  profile.bio.textContent = inputs.bio.value.trim() || "No bio yet.";
  profile.location.textContent = inputs.location.value.trim() || "Somewhere online";
  $("#featuredTitle").textContent = `${profile.name.textContent}'s profile`;
  $("#featuredText").textContent = profile.bio.textContent;
  syncSocialLinks();
  updatePublicLink();
  updateSettingsDetails();
};

const formatViews = (count) => {
  const safeCount = Number(count || 0);
  return `${safeCount.toLocaleString()} ${safeCount === 1 ? "view" : "views"}`;
};

[...Object.values(inputs), ...Object.values(socialInputs)].forEach((input) =>
  input.addEventListener("input", syncProfile)
);

auth.form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitAuth("signup");
});

auth.loginButton.addEventListener("click", () => submitAuth("login"));

const logoutUser = () => {
  sessionToken = "";
  localStorage.removeItem(sessionKey);
  accountState = {
    email: "",
    userId: "",
    createdAt: "",
    profileHandle: "",
    profilePath: "",
    profileUrl: "",
  };
  setFriends([], { persist: false });
  updateSettingsDetails();
  setDashboardSection("home");
  showAuth();
  setAuthMessage("Logged out. Sign in again to edit your profile.");
};

auth.logoutButton.addEventListener("click", logoutUser);
auth.accountLogoutButton.addEventListener("click", logoutUser);

dashboardButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.dashboardTarget;
    if (target !== "games") closeActiveGame();
    setDashboardSection(target);
    exitPreview();
    if (target === "bio" && !isPublicProfilePage) {
      showOwnerBioEntryGate();
    } else if (!isPublicProfilePage) {
      hideEntryGate();
    }
  });
});

document.querySelectorAll(".editor .swatch").forEach((button) => {
  button.addEventListener("click", () => {
    profileTheme = button.dataset.theme || "black";
    applyThemeForCurrentSection();
  });
});

dashboardThemeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    dashboardTheme = button.dataset.dashboardTheme || "black";
    localStorage.setItem(dashboardThemeKey, dashboardTheme);
    applyThemeForCurrentSection();
  });
});

$("#dashboardMuteButton").addEventListener("click", () => {
  dashboardMusicMutedOutsideBio = !dashboardMusicMutedOutsideBio;
  localStorage.setItem(dashboardMuteKey, String(dashboardMusicMutedOutsideBio));
  syncDashboardAudioState();
});

$("#sidebarCollapseButton").addEventListener("click", () => {
  sidebarCollapsed = !sidebarCollapsed;
  localStorage.setItem(sidebarCollapsedKey, String(sidebarCollapsed));
  syncSidebarCollapsedState();
});

const attachMouseBoxEffect = (element, { lift = 1, tilt = 1 } = {}) => {
  if (!element) return;

  element.addEventListener("pointermove", (event) => {
    if (!canUsePointerEffects() || event.pointerType !== "mouse") return;

    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const liftX = (x - 0.5) * 10 * lift;
    const liftY = ((y - 0.5) * -14 - 6) * lift;
    const tiltX = (0.5 - y) * 10 * tilt;
    const tiltY = (x - 0.5) * 12 * tilt;

    element.style.setProperty("--lift-x", `${liftX.toFixed(2)}px`);
    element.style.setProperty("--lift-y", `${liftY.toFixed(2)}px`);
    element.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
    element.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
    element.style.setProperty("--spot-x", `${(x * 100).toFixed(1)}%`);
    element.style.setProperty("--spot-y", `${(y * 100).toFixed(1)}%`);
  });

  element.addEventListener("pointerleave", () => {
    element.style.setProperty("--lift-x", "0px");
    element.style.setProperty("--lift-y", "0px");
    element.style.setProperty("--tilt-x", "0deg");
    element.style.setProperty("--tilt-y", "0deg");
    element.style.setProperty("--spot-x", "50%");
    element.style.setProperty("--spot-y", "50%");
  });
};

attachMouseBoxEffect($("#hoverCard"));
attachMouseBoxEffect($(".account-sidebar"), { lift: 0.55, tilt: 0.65 });
document.querySelectorAll(".game-card-preview").forEach((card) => {
  attachMouseBoxEffect(card, { lift: 0.85, tilt: 0.8 });
});

$("#particlesToggle").addEventListener("change", (event) => {
  document.body.classList.toggle("no-motion", !event.target.checked);
});

$("#compactToggle").addEventListener("change", (event) => {
  document.body.classList.toggle("compact", event.target.checked);
});

$("#darkenVideoToggle").addEventListener("change", (event) => {
  document.body.classList.toggle("video-dark", event.target.checked);
});

inputs.cursorTrail.addEventListener("change", () => {
  applyCursorTrail(inputs.cursorTrail.value === "dot");
});

const setCursorMode = (mode) => {
  const nextMode = mode === "dot" ? "dot" : "normal";
  inputs.cursorTrail.value = nextMode;
  document.querySelectorAll(".cursor-option").forEach((button) => {
    const isActive = button.dataset.cursor === nextMode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-checked", String(isActive));
  });
  applyCursorTrail(nextMode === "dot");
};

document.querySelectorAll(".cursor-option").forEach((button) => {
  button.addEventListener("click", () => setCursorMode(button.dataset.cursor));
});

const sparkleEffects = new Set(["none", "white", "gold", "pink", "aqua", "purple"]);

const setSparkleEffect = (effect) => {
  const nextEffect = sparkleEffects.has(effect) ? effect : "none";
  inputs.sparkleEffect.value = nextEffect;
  document.body.dataset.sparkleEffect = nextEffect;
  document.querySelectorAll("[data-sparkle]").forEach((button) => {
    const isActive = button.dataset.sparkle === nextEffect;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-checked", String(isActive));
  });
};

document.querySelectorAll("[data-sparkle]").forEach((button) => {
  button.addEventListener("click", () => setSparkleEffect(button.dataset.sparkle));
});

$("#friendForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const friend = sanitizeFriend({
    name: friendInputs.name.value,
    link: friendInputs.link.value,
  });

  if (!friend) {
    showToast("Add a profile handle or link first");
    return;
  }

  setFriends([...friends, friend]);
  friendInputs.name.value = "";
  friendInputs.link.value = "";
  showToast(`Added ${friend.name}`);
});

$("#copyLink").addEventListener("click", async () => {
  const handle = profile.handle.textContent.slice(1);
  const link = `${location.origin}/u/${handle}`;
  try {
    await navigator.clipboard.writeText(link);
  } catch {
    window.prompt("Copy your profile link", link);
  }
  showToast("Public profile link copied");
});

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const dataUrlToObjectUrl = (dataUrl) => {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] || "audio/mpeg";
  const binary = atob(base64 || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
};

let publicLoopTransitionRunning = false;
let publicLoopFadeStarted = false;
let publicLoopAudioFrame = 0;

const preferredMusicVolume = () => Math.max(0, Math.min(1, Number($("#volumeInput").value) / 100 || 0.55));

const cancelPublicAudioFade = () => {
  if (publicLoopAudioFrame) {
    cancelAnimationFrame(publicLoopAudioFrame);
    publicLoopAudioFrame = 0;
  }
};

const fadePublicMusicTo = (targetVolume, duration = 900) => {
  const audio = $("#backgroundMusic");
  if (!audio.src) return Promise.resolve();
  cancelPublicAudioFade();

  const startVolume = audio.volume;
  const startedAt = performance.now();
  const target = Math.max(0, Math.min(1, targetVolume));

  return new Promise((resolve) => {
    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      audio.volume = startVolume + (target - startVolume) * eased;

      if (progress < 1) {
        publicLoopAudioFrame = requestAnimationFrame(tick);
        return;
      }

      publicLoopAudioFrame = 0;
      audio.volume = target;
      resolve();
    };

    publicLoopAudioFrame = requestAnimationFrame(tick);
  });
};

const resetPublicLoopTransition = () => {
  publicLoopTransitionRunning = false;
  publicLoopFadeStarted = false;
  document.body.classList.remove("public-loop-transitioning", "public-loop-revealing");
};

const shouldRunPublicLoopTransition = () => {
  const video = $("#backgroundVideo");
  return isPublicProfilePage && document.body.classList.contains("has-video") && Boolean(video.src);
};

const runPublicLoopTransition = async () => {
  if (!shouldRunPublicLoopTransition() || publicLoopTransitionRunning) return;

  const video = $("#backgroundVideo");
  const audio = $("#backgroundMusic");
  const targetVolume = preferredMusicVolume();
  const shouldRestartAudio = Boolean(audio.src && (!audio.paused || audio.currentTime > 0));

  publicLoopTransitionRunning = true;
  publicLoopFadeStarted = true;
  fadePublicMusicTo(0, 180);

  document.body.classList.remove("public-loop-revealing");
  document.body.classList.add("public-loop-transitioning");

  video.pause();
  video.currentTime = 0;
  video.play().catch(() => {});

  if (audio.src) {
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 0;
    if (shouldRestartAudio) {
      audio.play().catch(() => {});
    }
  }

  await wait(1120);
  document.body.classList.add("public-loop-revealing");

  if (audio.src && shouldRestartAudio) {
    fadePublicMusicTo(targetVolume, 900);
  }

  await wait(860);
  document.body.classList.remove("public-loop-transitioning", "public-loop-revealing");
  publicLoopTransitionRunning = false;
  publicLoopFadeStarted = false;
  if (audio.src && shouldRestartAudio) audio.volume = targetVolume;
};

const handlePublicVideoTimeUpdate = () => {
  const video = $("#backgroundVideo");
  if (!shouldRunPublicLoopTransition() || publicLoopFadeStarted || publicLoopTransitionRunning) return;
  if (!Number.isFinite(video.duration) || video.duration <= 1.5) return;

  const fadeLead = Math.min(1.35, Math.max(0.55, video.duration * 0.12));
  if (video.duration - video.currentTime <= fadeLead) {
    publicLoopFadeStarted = true;
    fadePublicMusicTo(0, fadeLead * 1000);
  }
};

const setAvatarSource = (src, name = "") => {
  const avatar = $("#avatar");
  avatar.src =
    src ||
    "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=320&q=80";
  $("#avatarFileName").textContent = name || "Choose a profile image";
};

$("#avatarInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) {
    mediaState.avatarData = "";
    mediaState.avatarName = "";
    mediaState.avatarPath = "";
    setAvatarSource("");
    return;
  }

  mediaState.avatarData = await fileToDataUrl(file);
  mediaState.avatarName = file.name;
  mediaState.avatarPath = "";
  setAvatarSource(mediaState.avatarData, file.name);
});

const setBackgroundSource = (src, name = "", type = "") => {
  const video = $("#backgroundVideo");
  const image = $("#backgroundImage");
  resetPublicLoopTransition();
  video.pause();
  video.removeAttribute("src");
  image.style.backgroundImage = "";
  document.body.classList.remove("has-video", "has-image");

  if (!src) {
    $("#backgroundFileName").textContent = "Choose an image or video";
    return;
  }

  $("#backgroundFileName").textContent = name || "Saved background";

  if (type.startsWith("image/")) {
    image.style.backgroundImage = `url("${src}")`;
    document.body.classList.add("has-image");
    return;
  }

  video.src = src;
  video.loop = !isPublicProfilePage;
  video.play().catch(() => {});
  document.body.classList.add("has-video");
};

$("#backgroundVideo").addEventListener("loadedmetadata", () => {
  $("#backgroundVideo").loop = !isPublicProfilePage;
  publicLoopFadeStarted = false;
});

$("#backgroundVideo").addEventListener("timeupdate", handlePublicVideoTimeUpdate);
$("#backgroundVideo").addEventListener("ended", () => {
  runPublicLoopTransition();
});

const setMusicSource = (src, name = "") => {
  const audio = $("#backgroundMusic");
  audio.pause();
  if (mediaState.musicObjectUrl) {
    URL.revokeObjectURL(mediaState.musicObjectUrl);
    mediaState.musicObjectUrl = "";
  }

  if (!src) {
    audio.removeAttribute("src");
    $("#musicPlayer").hidden = true;
    $("#musicFileName").textContent = "Choose an audio file";
    $("#musicIcon").textContent = "Play";
    syncDashboardAudioState();
    return;
  }

  mediaState.musicObjectUrl = src.startsWith("data:") ? dataUrlToObjectUrl(src) : "";
  audio.src = mediaState.musicObjectUrl || src;
  audio.preload = "auto";
  audio.load();
  audio.volume = Number($("#volumeInput").value) / 100;
  $("#trackName").textContent = name || "Background track";
  $("#musicFileName").textContent = name || "Saved background music";
  $("#musicPlayer").hidden = false;
  $("#musicIcon").textContent = "Play";
  syncDashboardAudioState();
};

$("#backgroundInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) {
    mediaState.backgroundData = "";
    mediaState.backgroundName = "";
    mediaState.backgroundType = "";
    mediaState.backgroundPath = "";
    setBackgroundSource("");
    return;
  }

  mediaState.backgroundData = await fileToDataUrl(file);
  mediaState.backgroundName = file.name;
  mediaState.backgroundType = file.type;
  mediaState.backgroundPath = "";
  setBackgroundSource(mediaState.backgroundData, file.name, file.type);
  document.body.classList.add("video-dark");
  $("#darkenVideoToggle").checked = true;
});

$("#clearBackgroundButton").addEventListener("click", () => {
  $("#backgroundInput").value = "";
  mediaState.backgroundData = "";
  mediaState.backgroundName = "";
  mediaState.backgroundType = "";
  mediaState.backgroundPath = "";
  setBackgroundSource("");
  showToast("Background file removed");
});

$("#musicInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) {
    mediaState.musicData = "";
    mediaState.musicName = "";
    mediaState.musicPath = "";
    setMusicSource("");
    return;
  }

  mediaState.musicData = await fileToDataUrl(file);
  mediaState.musicName = file.name;
  mediaState.musicPath = "";
  setMusicSource(mediaState.musicData, file.name);
});

$("#clearMusicButton").addEventListener("click", () => {
  $("#musicInput").value = "";
  mediaState.musicData = "";
  mediaState.musicName = "";
  mediaState.musicPath = "";
  setMusicSource("");
  showToast("Music file removed");
});

$("#musicToggle").addEventListener("click", async () => {
  const audio = $("#backgroundMusic");
  if (!audio.src) return;

  if (audio.paused) {
    await audio.play();
    $("#musicIcon").textContent = "Pause";
    $("#musicToggle").setAttribute("aria-label", "Pause music");
  } else {
    audio.pause();
    $("#musicIcon").textContent = "Play";
    $("#musicToggle").setAttribute("aria-label", "Play music");
  }
});

let entryMusicStarting = false;

const hideEntryGate = () => {
  document.body.classList.remove("entry-locked", "public-locked");
  $("#musicGate").classList.remove("entry-active");
};

const startEntryGate = async () => {
  if (entryMusicStarting || !$("#musicGate").classList.contains("entry-active")) return;
  const audio = $("#backgroundMusic");
  if (!audio.src) {
    hideEntryGate();
    return;
  }

  entryMusicStarting = true;
  hideEntryGate();
  try {
    if (audio.src) {
      audio.currentTime = 0;
      audio.muted = false;
      await audio.play();
      $("#musicIcon").textContent = "Pause";
      $("#musicToggle").setAttribute("aria-label", "Pause music");
    }
  } catch (error) {
    showToast(`Music failed: ${error.name || "playback blocked"}`);
  } finally {
    entryMusicStarting = false;
  }
};

$("#musicGate").addEventListener("pointerdown", startEntryGate);
$("#musicGate").addEventListener("click", startEntryGate);

$("#backgroundMusic").addEventListener("error", () => {
  showToast("Music file could not load. Re-upload a smaller MP3 and publish again.");
});

$("#volumeInput").addEventListener("input", (event) => {
  $("#backgroundMusic").volume = Number(event.target.value) / 100;
});

const enterPreview = (isPublic = false) => {
  if (document.body.classList.contains("auth-required")) return;
  document.body.classList.add("previewing");
  $("#previewToolbar").hidden = isPublic;
};

const showEntryGate = ({ title = "Click to enter", hint = "Click to enter", hasMusic = false } = {}) => {
  document.body.classList.add("entry-locked");
  $("#musicGate").classList.add("entry-active");
  $("#musicGate span").textContent = title;
  $("#musicGateHint").textContent = hasMusic ? "Click to start music" : hint;
};

const showPublicEntryGate = (hasMusic) => {
  if (!isPublicProfilePage) return;
  document.body.classList.add("public-locked");
  showEntryGate({
    title: "Click to enter",
    hint: "Click to enter",
    hasMusic,
  });
};

const showOwnerBioEntryGate = () => {
  if (isPublicProfilePage || document.body.classList.contains("auth-required")) return;
  showEntryGate({
    title: "Click to enter bio",
    hint: "Open your bio editor",
    hasMusic: Boolean($("#backgroundMusic").src),
  });
};

const exitPreview = () => {
  document.body.classList.remove("previewing");
  $("#previewToolbar").hidden = true;
};

$("#previewButton").addEventListener("click", () => enterPreview(false));
$("#exitPreview").addEventListener("click", exitPreview);

document.addEventListener("keydown", (event) => {
  if (isPublicProfilePage) return;
  if (event.key === "Escape" && document.body.classList.contains("previewing")) {
    exitPreview();
  }
});

const getActiveTheme = () => profileTheme || "black";

const collectProfile = () => ({
  name: inputs.name.value.trim() || "Nova",
  handle: cleanHandle(inputs.handle.value) || "nightcard",
  bio: inputs.bio.value.trim() || "No bio yet.",
  location: inputs.location.value.trim() || "Somewhere online",
  theme: getActiveTheme(),
  compactLinks: $("#compactToggle").checked,
  animatedBackground: $("#particlesToggle").checked,
  darkVideo: $("#darkenVideoToggle").checked,
  cursorTrail: inputs.cursorTrail.value === "dot",
  sparkleEffect: inputs.sparkleEffect.value || "none",
  friends,
  socialLinks: collectSocialLinks(),
  avatarData: mediaState.avatarData,
  avatarName: mediaState.avatarName,
  avatarPath: mediaState.avatarPath,
  backgroundData: mediaState.backgroundData,
  backgroundName: mediaState.backgroundName,
  backgroundType: mediaState.backgroundType,
  backgroundPath: mediaState.backgroundPath,
  musicData: mediaState.musicData,
  musicName: mediaState.musicName,
  musicPath: mediaState.musicPath,
});

const applyProfile = (data) => {
  inputs.name.value = data.name || "Nova";
  inputs.handle.value = data.handle || "nightcard";
  inputs.bio.value = data.bio || "No bio yet.";
  inputs.location.value = data.location || "Somewhere online";
  updateAccountState({
    profileHandle: data.profileHandle || data.handle,
    profilePath: data.profilePath || (data.handle ? `/u/${data.handle}` : accountState.profilePath),
    profileUrl: data.profileUrl || accountState.profileUrl,
  });
  applySocialInputs(data.socialLinks || data.socials || {});

  profileTheme = data.theme || "black";
  applyThemeForCurrentSection();

  $("#compactToggle").checked = Boolean(data.compactLinks);
  $("#particlesToggle").checked = data.animatedBackground !== false;
  $("#darkenVideoToggle").checked = data.darkVideo !== false;
  setCursorMode(data.cursorTrail === true || data.cursorTrail === "dot" ? "dot" : "normal");
  setSparkleEffect(data.sparkleEffect || "none");
  setFriends(data.friends?.length ? data.friends : loadFriendsLocal(), { persist: false });

  document.body.classList.toggle("compact", $("#compactToggle").checked);
  document.body.classList.toggle("no-motion", !$("#particlesToggle").checked);
  document.body.classList.toggle("video-dark", $("#darkenVideoToggle").checked);

  mediaState.avatarData = data.avatarData || "";
  mediaState.avatarName = data.avatarName || "";
  mediaState.avatarPath = data.avatarPath || "";
  mediaState.backgroundData = data.backgroundData || data.videoData || "";
  mediaState.backgroundName = data.backgroundName || data.videoName || "";
  mediaState.backgroundType = data.backgroundType || (data.videoData ? "video/mp4" : "");
  mediaState.backgroundPath = data.backgroundPath || "";
  mediaState.musicData = data.musicData || "";
  mediaState.musicName = data.musicName || "";
  mediaState.musicPath = data.musicPath || "";

  const profileHandle = cleanHandle(data.handle || inputs.handle.value);
  const avatarSource = mediaState.avatarPath ? `/api/profiles/${profileHandle}/avatar` : mediaState.avatarData;
  const backgroundSource = mediaState.backgroundPath ? `/api/profiles/${profileHandle}/background` : mediaState.backgroundData;
  const musicSource = mediaState.musicPath ? `/api/profiles/${profileHandle}/music` : mediaState.musicData;

  setAvatarSource(avatarSource, mediaState.avatarName);
  setBackgroundSource(backgroundSource, mediaState.backgroundName, mediaState.backgroundType);
  setMusicSource(musicSource, mediaState.musicName);
  profile.views.textContent = formatViews(data.views);
  syncProfile();
};

$("#saveButton").addEventListener("click", async () => {
  const payload = collectProfile();
  $("#saveButton").textContent = "Publishing...";
  $("#saveButton").disabled = true;

  try {
    if (!sessionToken) throw new Error("Sign in before publishing a profile");
    const response = await fetch(`/api/profiles/${payload.handle}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not publish profile");

    $("#publicLink").href = result.url;
    $("#publicLink").textContent = result.url;
    updateAccountState({
      profileHandle: result.handle,
      profilePath: result.url,
      profileUrl: result.fullUrl,
    });
    showToast(`Published at ${result.url}`);
  } catch (error) {
    showToast(error.message);
  } finally {
    $("#saveButton").textContent = "Publish profile";
    $("#saveButton").disabled = false;
  }
});

async function loadPublicProfile() {
  const publicHandle = publicHandleFromPath();
  if (!publicHandle) return;

  try {
    const response = await fetch(`/api/profiles/${publicHandle}?view=1`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Profile not found");
    applyProfile(data);
    if (data.hasMusic && !mediaState.musicData && !mediaState.musicPath) {
      mediaState.musicData = `/api/profiles/${publicHandle}/music`;
      mediaState.musicName = data.musicName || "Background music";
      setMusicSource(mediaState.musicData, mediaState.musicName);
    }
    enterPreview(true);
    showPublicEntryGate(Boolean(data.hasMusic));
    document.title = `${data.name || data.handle} | NightCard`;
  } catch (error) {
    profile.name.textContent = "Profile not found";
    profile.handle.textContent = `@${publicHandle}`;
    profile.bio.textContent = error.message;
    enterPreview(true);
    showPublicEntryGate(false);
  }
}

async function loadMyProfile() {
  if (!sessionToken || isPublicProfilePage) return;

  try {
    const response = await fetch("/api/my-profile", { headers: authHeaders() });
    const data = await response.json();
    if (response.status === 404) return;
    if (!response.ok) throw new Error(data.error || "Could not load your profile");
    applyProfile(data);
    showToast("Loaded your saved profile");
  } catch (error) {
    setAuthMessage(error.message);
  }
}

document.body.classList.add("video-dark");
syncProfile();
renderFriends();

async function bootApp() {
  if (isPublicProfilePage) {
    startLoading("Loading public profile...");
    await loadPublicProfile();
    await finishLoading();
    return;
  }

  if (!sessionToken) {
    showAuth();
    return;
  }

  try {
    startLoading("Loading your profile...");
    const response = await fetch("/api/me", { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Not signed in");
    auth.email.value = data.email;
    updateAccountState(data);
    setAuthMessage(`Signed in as ${data.email}`);
    await loadMyProfile();
    await finishLoadingIntoEditor();
  } catch {
    sessionToken = "";
    localStorage.removeItem(sessionKey);
    document.body.classList.remove("loading");
    showAuth();
  }
}

bootApp();

const cursorDot = document.createElement("div");
cursorDot.className = "cursor-dot";
cursorDot.hidden = true;
document.body.append(cursorDot);

const cursorTrailDots = Array.from({ length: 8 }, (_, index) => {
  const dot = document.createElement("span");
  dot.className = "cursor-trail-dot";
  dot.hidden = true;
  dot.style.setProperty("--trail-size", `${Math.max(3, 7 - index * 0.45)}px`);
  dot.style.setProperty("--trail-opacity", `${Math.max(0.12, 0.5 - index * 0.045)}`);
  document.body.append(dot);
  return {
    node: dot,
    x: 0,
    y: 0,
  };
});

let activeCursorTrail = false;
let lastCursorX = 0;
let lastCursorY = 0;
let cursorHasPosition = false;

function applyCursorTrail(mode) {
  activeCursorTrail = Boolean(mode) && canUsePointerEffects();
  if (!activeCursorTrail) cursorHasPosition = false;
  document.body.classList.toggle("cursor-effect", activeCursorTrail);
  cursorDot.hidden = !activeCursorTrail || !cursorHasPosition;
  cursorTrailDots.forEach((dot) => {
    dot.node.hidden = !activeCursorTrail || !cursorHasPosition;
  });
}

const syncCursorForPointer = () => {
  applyCursorTrail(inputs.cursorTrail.value === "dot");
};

if (finePointerQuery?.addEventListener) {
  finePointerQuery.addEventListener("change", syncCursorForPointer);
} else if (finePointerQuery?.addListener) {
  finePointerQuery.addListener(syncCursorForPointer);
}

window.addEventListener("pointermove", (event) => {
  if (!canUsePointerEffects() || event.pointerType !== "mouse") {
    cursorDot.hidden = true;
    cursorTrailDots.forEach((dot) => {
      dot.node.hidden = true;
    });
    return;
  }

  lastCursorX = event.clientX;
  lastCursorY = event.clientY;
  cursorHasPosition = true;

  if (!activeCursorTrail) return;

  cursorDot.style.left = `${lastCursorX}px`;
  cursorDot.style.top = `${lastCursorY}px`;
  cursorDot.hidden = false;
  cursorTrailDots.forEach((dot) => {
    dot.node.hidden = false;
  });
});

window.addEventListener("pointerleave", () => {
  cursorDot.hidden = true;
  cursorTrailDots.forEach((dot) => {
    dot.node.hidden = true;
  });
});

window.addEventListener("pointerenter", () => {
  cursorDot.hidden = !activeCursorTrail || !cursorHasPosition;
  cursorTrailDots.forEach((dot) => {
    dot.node.hidden = !activeCursorTrail || !cursorHasPosition;
  });
});

function animateCursorTrail() {
  let targetX = lastCursorX;
  let targetY = lastCursorY;

  cursorTrailDots.forEach((dot, index) => {
    const followSpeed = 0.42 - index * 0.025;
    dot.x += (targetX - dot.x) * followSpeed;
    dot.y += (targetY - dot.y) * followSpeed;
    dot.node.style.left = `${dot.x}px`;
    dot.node.style.top = `${dot.y}px`;
    targetX = dot.x;
    targetY = dot.y;
  });

  requestAnimationFrame(animateCursorTrail);
}

animateCursorTrail();

const canvas = $("#stars");
const context = canvas.getContext("2d");
const stars = Array.from({ length: 90 }, () => ({
  x: Math.random(),
  y: Math.random(),
  size: Math.random() * 1.6 + 0.35,
  speed: Math.random() * 0.18 + 0.05,
}));

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * ratio;
  canvas.height = window.innerHeight * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawStars() {
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  context.fillStyle = "rgba(255, 255, 255, 0.74)";

  for (const star of stars) {
    star.y += star.speed / window.innerHeight;
    if (star.y > 1) {
      star.y = 0;
      star.x = Math.random();
    }

    context.beginPath();
    context.arc(star.x * window.innerWidth, star.y * window.innerHeight, star.size, 0, Math.PI * 2);
    context.fill();
  }

  requestAnimationFrame(drawStars);
}

resizeCanvas();
drawStars();
window.addEventListener("resize", resizeCanvas);
