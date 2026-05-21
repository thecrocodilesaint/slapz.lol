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
};

const socialInputs = {
  discord: $("#discordInput"),
  instagram: $("#instagramInput"),
  tiktok: $("#tiktokInput"),
  youtube: $("#youtubeInput"),
  x: $("#xInput"),
  github: $("#githubInput"),
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

const dashboardButtons = document.querySelectorAll("[data-dashboard-target]");
const dashboardPanels = document.querySelectorAll("[data-dashboard-panel]");

const sessionKey = "nightcard-session-token";
let sessionToken = localStorage.getItem(sessionKey) || "";
let loadingTimer = null;
let loadingPercent = 8;

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

const publicHandleFromPath = () => {
  const match = location.pathname.match(/^\/u\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : "";
};

const isPublicProfilePage = Boolean(publicHandleFromPath());

if (isPublicProfilePage) {
  document.body.classList.add("public-profile", "previewing");
  $("#previewToolbar").hidden = true;
}

const setDashboardSection = (section) => {
  const nextSection = isPublicProfilePage ? "bio" : section;
  document.body.dataset.accountSection = nextSection;

  dashboardPanels.forEach((panel) => {
    panel.hidden = panel.dataset.dashboardPanel !== nextSection;
  });

  dashboardButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.dashboardTarget === nextSection);
  });

  if (nextSection === "games") {
    loadSnakeBestScore();
    drawSnake();
  }
};

setDashboardSection(isPublicProfilePage ? "bio" : "home");

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

snake.startButton.addEventListener("click", startSnake);
snake.pauseButton.addEventListener("click", pauseSnake);

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

  event.preventDefault();
  if (snake.gameOver) return;
  setSnakeDirection(direction[0], direction[1]);
  if (!snake.running) startSnake();
});

resetSnake();

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
  document.body.classList.remove("auth-required", "loading", "welcoming", "welcome-leaving", "owner-entering");
};

const showAuth = () => {
  if (!isPublicProfilePage) {
    document.body.classList.remove("loading");
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
    setAuthMessage(`Signed in as ${data.email}`);
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
  setDashboardSection("home");
  showAuth();
  setAuthMessage("Logged out. Sign in again to edit your profile.");
};

auth.logoutButton.addEventListener("click", logoutUser);
auth.accountLogoutButton.addEventListener("click", logoutUser);

dashboardButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setDashboardSection(button.dataset.dashboardTarget);
    exitPreview();
  });
});

document.querySelectorAll(".swatch").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".swatch").forEach((swatch) => swatch.classList.remove("active"));
    button.classList.add("active");
    document.body.dataset.theme = button.dataset.theme;
  });
});

const attachMouseBoxEffect = (element, { lift = 1, tilt = 1 } = {}) => {
  if (!element) return;

  element.addEventListener("pointermove", (event) => {
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
  video.play().catch(() => {});
  document.body.classList.add("has-video");
};

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

let publicMusicStarting = false;

const hidePublicEntryGate = () => {
  document.body.classList.remove("public-locked");
  $("#musicGate").classList.remove("entry-active");
};

const startPublicMusic = async () => {
  if (publicMusicStarting) return;
  const audio = $("#backgroundMusic");
  if (!audio.src) {
    hidePublicEntryGate();
    return;
  }

  publicMusicStarting = true;
  hidePublicEntryGate();
  try {
    if (audio.src) {
      audio.currentTime = 0;
      audio.muted = false;
      await audio.play();
      $("#musicIcon").textContent = "Pause";
      $("#musicToggle").setAttribute("aria-label", "Pause music");
    }
  } catch (error) {
    publicMusicStarting = false;
    showToast(`Music failed: ${error.name || "playback blocked"}`);
  }
};

$("#musicGate").addEventListener("pointerdown", startPublicMusic);
$("#musicGate").addEventListener("click", startPublicMusic);

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

const showPublicEntryGate = (hasMusic) => {
  if (!isPublicProfilePage) return;
  document.body.classList.add("public-locked");
  $("#musicGate").classList.add("entry-active");
  $("#musicGateHint").textContent = hasMusic ? "Click to start music" : "Click to enter";
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

const getActiveTheme = () => document.body.dataset.theme || "black";

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
  applySocialInputs(data.socialLinks || data.socials || {});

  document.body.dataset.theme = data.theme || "black";
  document.querySelectorAll(".swatch").forEach((swatch) => {
    swatch.classList.toggle("active", swatch.dataset.theme === document.body.dataset.theme);
  });

  $("#compactToggle").checked = Boolean(data.compactLinks);
  $("#particlesToggle").checked = data.animatedBackground !== false;
  $("#darkenVideoToggle").checked = data.darkVideo !== false;
  setCursorMode(data.cursorTrail === true || data.cursorTrail === "dot" ? "dot" : "normal");

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
  activeCursorTrail = Boolean(mode);
  document.body.classList.toggle("cursor-effect", activeCursorTrail);
  cursorDot.hidden = !activeCursorTrail || !cursorHasPosition;
  cursorTrailDots.forEach((dot) => {
    dot.node.hidden = !activeCursorTrail || !cursorHasPosition;
  });
}

window.addEventListener("pointermove", (event) => {
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
  cursorDot.hidden = !activeCursorTrail;
  cursorTrailDots.forEach((dot) => {
    dot.node.hidden = !activeCursorTrail;
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
