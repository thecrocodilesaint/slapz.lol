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
};

const sessionKey = "nightcard-session-token";
let sessionToken = localStorage.getItem(sessionKey) || "";

const mediaState = {
  backgroundData: "",
  backgroundName: "",
  backgroundType: "",
  musicData: "",
  musicName: "",
};

const publicHandleFromPath = () => {
  const match = location.pathname.match(/^\/u\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : "";
};

const isPublicProfilePage = Boolean(publicHandleFromPath());

const cleanHandle = (value) =>
  value
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 24);

const showToast = (message) => {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1700);
};

const setAuthMessage = (message) => {
  auth.message.textContent = message;
};

const showEditor = () => {
  document.body.classList.remove("auth-required");
};

const showAuth = () => {
  if (!isPublicProfilePage) document.body.classList.add("auth-required");
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
    if (!response.ok) throw new Error(data.error || "Could not sign in");

    sessionToken = data.token;
    localStorage.setItem(sessionKey, sessionToken);
    setAuthMessage(`Signed in as ${data.email}`);
    showEditor();
  } catch (error) {
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
  updatePublicLink();
};

const formatViews = (count) => {
  const safeCount = Number(count || 0);
  return `${safeCount.toLocaleString()} ${safeCount === 1 ? "view" : "views"}`;
};

Object.values(inputs).forEach((input) => input.addEventListener("input", syncProfile));

auth.form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitAuth("signup");
});

auth.loginButton.addEventListener("click", () => submitAuth("login"));

auth.logoutButton.addEventListener("click", () => {
  sessionToken = "";
  localStorage.removeItem(sessionKey);
  showAuth();
  setAuthMessage("Logged out. Sign in again to edit your profile.");
});

document.querySelectorAll(".swatch").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".swatch").forEach((swatch) => swatch.classList.remove("active"));
    button.classList.add("active");
    document.body.dataset.theme = button.dataset.theme;
  });
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

  if (!src) {
    audio.removeAttribute("src");
    $("#musicPlayer").hidden = true;
    $("#musicFileName").textContent = "Choose an audio file";
    $("#musicIcon").textContent = "Play";
    return;
  }

  audio.src = src;
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
    setBackgroundSource("");
    return;
  }

  mediaState.backgroundData = await fileToDataUrl(file);
  mediaState.backgroundName = file.name;
  mediaState.backgroundType = file.type;
  setBackgroundSource(mediaState.backgroundData, file.name, file.type);
  document.body.classList.add("video-dark");
  $("#darkenVideoToggle").checked = true;
});

$("#musicInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) {
    mediaState.musicData = "";
    mediaState.musicName = "";
    setMusicSource("");
    return;
  }

  mediaState.musicData = await fileToDataUrl(file);
  mediaState.musicName = file.name;
  setMusicSource(mediaState.musicData, file.name);
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

$("#volumeInput").addEventListener("input", (event) => {
  $("#backgroundMusic").volume = Number(event.target.value) / 100;
});

const enterPreview = (isPublic = false) => {
  document.body.classList.add("previewing");
  $("#previewToolbar").hidden = isPublic;
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
  backgroundData: mediaState.backgroundData,
  backgroundName: mediaState.backgroundName,
  backgroundType: mediaState.backgroundType,
  musicData: mediaState.musicData,
  musicName: mediaState.musicName,
});

const applyProfile = (data) => {
  inputs.name.value = data.name || "Nova";
  inputs.handle.value = data.handle || "nightcard";
  inputs.bio.value = data.bio || "No bio yet.";
  inputs.location.value = data.location || "Somewhere online";

  document.body.dataset.theme = data.theme || "black";
  document.querySelectorAll(".swatch").forEach((swatch) => {
    swatch.classList.toggle("active", swatch.dataset.theme === document.body.dataset.theme);
  });

  $("#compactToggle").checked = Boolean(data.compactLinks);
  $("#particlesToggle").checked = data.animatedBackground !== false;
  $("#darkenVideoToggle").checked = data.darkVideo !== false;

  document.body.classList.toggle("compact", $("#compactToggle").checked);
  document.body.classList.toggle("no-motion", !$("#particlesToggle").checked);
  document.body.classList.toggle("video-dark", $("#darkenVideoToggle").checked);

  mediaState.backgroundData = data.backgroundData || data.videoData || "";
  mediaState.backgroundName = data.backgroundName || data.videoName || "";
  mediaState.backgroundType = data.backgroundType || (data.videoData ? "video/mp4" : "");
  mediaState.musicData = data.musicData || "";
  mediaState.musicName = data.musicName || "";

  setBackgroundSource(mediaState.backgroundData, mediaState.backgroundName, mediaState.backgroundType);
  setMusicSource(mediaState.musicData, mediaState.musicName);
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
    enterPreview(true);
    document.title = `${data.name || data.handle} | NightCard`;
  } catch (error) {
    profile.name.textContent = "Profile not found";
    profile.handle.textContent = `@${publicHandle}`;
    profile.bio.textContent = error.message;
    enterPreview(true);
  }
}

document.body.classList.add("video-dark");
syncProfile();

async function bootApp() {
  if (isPublicProfilePage) {
    await loadPublicProfile();
    return;
  }

  showAuth();
  if (!sessionToken) return;

  try {
    const response = await fetch("/api/me", { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Not signed in");
    setAuthMessage(`Signed in as ${data.email}`);
    showEditor();
  } catch {
    sessionToken = "";
    localStorage.removeItem(sessionKey);
    showAuth();
  }
}

bootApp();

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
