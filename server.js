const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const dataDir = path.join(root, "data");
const profilesPath = path.join(dataDir, "profiles.json");
const usersPath = path.join(dataDir, "users.json");
const port = Number(process.env.PORT) || 4174;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasSupabase = Boolean(supabaseUrl && supabaseServiceKey);
const mediaBucket = "profile-media";
let mediaBucketReady = false;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function ensureStore() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(profilesPath)) fs.writeFileSync(profilesPath, "{}", "utf8");
  if (!fs.existsSync(usersPath)) fs.writeFileSync(usersPath, '{"users":{},"sessions":{}}', "utf8");
}

function readProfilesFile() {
  ensureStore();
  return JSON.parse(fs.readFileSync(profilesPath, "utf8"));
}

function writeProfilesFile(profiles) {
  ensureStore();
  fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2), "utf8");
}

function readUsersFile() {
  ensureStore();
  const store = JSON.parse(fs.readFileSync(usersPath, "utf8"));
  store.users = store.users || {};
  store.sessions = store.sessions || {};
  return store;
}

function writeUsersFile(users) {
  ensureStore();
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), "utf8");
}

async function supabaseRequest(table, { method = "GET", query = "", body, prefer } = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}${query}`, {
    method,
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Supabase request failed with ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function supabaseStorageRequest(pathname, { method = "GET", body, contentType, extraHeaders = {} } = {}) {
  const response = await fetch(`${supabaseUrl}/storage/v1${pathname}`, {
    method,
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
      ...(contentType ? { "Content-Type": contentType } : {}),
      ...extraHeaders,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Supabase storage request failed with ${response.status}`);
  }

  return response;
}

async function ensureMediaBucket() {
  if (!hasSupabase || mediaBucketReady) return;

  const response = await fetch(`${supabaseUrl}/storage/v1/bucket/${mediaBucket}`, {
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
    },
  });

  if (response.status === 404) {
    await supabaseStorageRequest("/bucket", {
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify({
        id: mediaBucket,
        name: mediaBucket,
        public: false,
      }),
    });
  } else if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Could not check Supabase media bucket");
  }

  mediaBucketReady = true;
}

function extensionFromMime(mime) {
  const map = {
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
    "audio/mp4": "m4a",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/ogg": "ogv",
  };
  return map[mime] || "bin";
}

async function uploadMediaDataUrl({ ownerUserId, handle, field, dataUrl }) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return "";

  await ensureMediaBucket();
  const ext = extensionFromMime(parsed.mime);
  const objectPath = `${ownerUserId}/${handle}/${field}.${ext}`;
  await supabaseStorageRequest(`/object/${mediaBucket}/${objectPath}`, {
    method: "POST",
    contentType: parsed.mime,
    body: parsed.buffer,
    extraHeaders: {
      "x-upsert": "true",
      "cache-control": "3600",
    },
  });
  return objectPath;
}

function rowToProfile(row) {
  if (!row) return null;
  return {
    ...(row.data || {}),
    handle: row.handle,
    ownerUserId: row.owner_user_id,
    views: Number(row.views || 0),
    updatedAt: row.updated_at,
  };
}

function profileToRow(profile) {
  const { ownerToken, ownerUserId, views, updatedAt, ...data } = profile;
  return {
    handle: profile.handle,
    owner_user_id: ownerUserId,
    views: Number(views || 0),
    updated_at: updatedAt || new Date().toISOString(),
    data,
  };
}

async function prepareProfileForSave(profile, existingProfile) {
  if (!hasSupabase) return profile;

  const next = { ...profile };
  const mediaFields = [
    { data: "avatarData", path: "avatarPath", name: "avatarName", field: "avatar" },
    { data: "backgroundData", path: "backgroundPath", name: "backgroundName", field: "background" },
    { data: "musicData", path: "musicPath", name: "musicName", field: "music" },
  ];

  for (const item of mediaFields) {
    const value = next[item.data];
    if (typeof value === "string" && value.startsWith("data:")) {
      next[item.path] = await uploadMediaDataUrl({
        ownerUserId: next.ownerUserId,
        handle: next.handle,
        field: item.field,
        dataUrl: value,
      });
      delete next[item.data];
      continue;
    }

    if (next[item.path]) {
      delete next[item.data];
      continue;
    }

    if (value === "") {
      delete next[item.path];
      delete next[item.data];
      continue;
    }

    if (existingProfile?.[item.path]) {
      next[item.path] = existingProfile[item.path];
      delete next[item.data];
    }
  }

  return next;
}

async function listProfiles() {
  if (hasSupabase) {
    const rows = await supabaseRequest("app_profiles", { query: "?select=*" });
    return rows.map(rowToProfile);
  }
  return Object.values(readProfilesFile());
}

async function getProfile(handle) {
  if (hasSupabase) {
    const rows = await supabaseRequest("app_profiles", {
      query: `?handle=eq.${encodeURIComponent(handle)}&select=*&limit=1`,
    });
    return rowToProfile(rows[0]);
  }
  return readProfilesFile()[handle] || null;
}

async function getProfileByOwner(userId) {
  if (hasSupabase) {
    const rows = await supabaseRequest("app_profiles", {
      query: `?owner_user_id=eq.${encodeURIComponent(userId)}&select=*&order=updated_at.desc&limit=1`,
    });
    return rowToProfile(rows[0]);
  }

  return (
    Object.values(readProfilesFile())
      .filter((profile) => profile.ownerUserId === userId)
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))[0] || null
  );
}

async function saveProfile(profile) {
  if (hasSupabase) {
    await supabaseRequest("app_profiles", {
      method: "POST",
      query: "?on_conflict=handle",
      body: profileToRow(profile),
      prefer: "resolution=merge-duplicates,return=representation",
    });
    return;
  }

  const profiles = readProfilesFile();
  profiles[profile.handle] = profile;
  writeProfilesFile(profiles);
}

async function saveUserProfileLink(userId, { handle, origin }) {
  const profilePath = `/u/${handle}`;
  const profileUrl = `${origin}${profilePath}`;

  if (hasSupabase) {
    try {
      await supabaseRequest("app_users", {
        method: "PATCH",
        query: `?id=eq.${encodeURIComponent(userId)}`,
        body: {
          profile_handle: handle,
          profile_path: profilePath,
          profile_url: profileUrl,
        },
        prefer: "return=minimal",
      });
    } catch (error) {
      console.warn("Could not save profile link on app_users. Run the latest supabase-schema.sql.", error.message);
    }
    return;
  }

  const store = readUsersFile();
  if (store.users[userId]) {
    store.users[userId].profileHandle = handle;
    store.users[userId].profilePath = profilePath;
    store.users[userId].profileUrl = profileUrl;
    writeUsersFile(store);
  }
}

async function incrementProfileViews(profile) {
  const views = Number(profile.views || 0) + 1;
  profile.views = views;

  if (hasSupabase) {
    await supabaseRequest("app_profiles", {
      method: "PATCH",
      query: `?handle=eq.${encodeURIComponent(profile.handle)}`,
      body: {
        views,
        updated_at: profile.updatedAt || new Date().toISOString(),
      },
      prefer: "return=minimal",
    });
    return;
  }

  await saveProfile(profile);
}

async function findUserByEmail(email) {
  if (hasSupabase) {
    const rows = await supabaseRequest("app_users", {
      query: `?email=eq.${encodeURIComponent(email)}&select=*&limit=1`,
    });
    const user = rows[0];
    return user ? [user.id, { email: user.email, passwordHash: user.password_hash }] : null;
  }

  return Object.entries(readUsersFile().users).find(([, user]) => user.email === email) || null;
}

async function createUser(email, passwordHash) {
  const userId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  if (hasSupabase) {
    await supabaseRequest("app_users", {
      method: "POST",
      body: {
        id: userId,
        email,
        password_hash: passwordHash,
        created_at: createdAt,
      },
      prefer: "return=representation",
    });
    return userId;
  }

  const store = readUsersFile();
  store.users[userId] = { email, passwordHash, createdAt };
  writeUsersFile(store);
  return userId;
}

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const createdAt = new Date().toISOString();

  if (hasSupabase) {
    await supabaseRequest("app_sessions", {
      method: "POST",
      body: {
        token,
        user_id: userId,
        created_at: createdAt,
      },
      prefer: "return=representation",
    });
    return token;
  }

  const store = readUsersFile();
  store.sessions[token] = { userId, createdAt };
  writeUsersFile(store);
  return token;
}

async function getAuthedUser(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;

  if (hasSupabase) {
    const sessions = await supabaseRequest("app_sessions", {
      query: `?token=eq.${encodeURIComponent(token)}&select=*&limit=1`,
    });
    const session = sessions[0];
    if (!session) return null;

    const users = await supabaseRequest("app_users", {
      query: `?id=eq.${encodeURIComponent(session.user_id)}&select=*&limit=1`,
    });
    const user = users[0];
    if (!user) return null;
    return { token, userId: user.id, email: user.email };
  }

  const store = readUsersFile();
  const session = store.sessions[token];
  if (!session) return null;

  const user = store.users[session.userId];
  if (!user) return null;
  return { token, userId: session.userId, email: user.email };
}

function cleanEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || "").split(":");
  if (!salt || !hash) return false;
  const testHash = hashPassword(password, salt).split(":")[1];
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(testHash, "hex"));
}

function sanitizeHandle(handle) {
  return String(handle || "")
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 24);
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function siteOrigin(req) {
  const host = req.headers.host || "";
  const protocol = host.includes("localhost") || host.startsWith("127.") ? "http" : req.headers["x-forwarded-proto"] || "https";
  return `${protocol}://${host}`;
}

function sendText(res, status, contentType, text) {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(text);
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;,]+);base64,(.*)$/);
  if (!match) return null;
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

async function sendProfileMedia(res, profile, mediaType) {
  const fieldMap = {
    music: { data: "musicData", path: "musicPath", fallbackMime: "audio/mpeg" },
    avatar: { data: "avatarData", path: "avatarPath", fallbackMime: "image/jpeg" },
    background: { data: "backgroundData", path: "backgroundPath", fallbackMime: profile?.backgroundType || "application/octet-stream" },
  };
  const fields = fieldMap[mediaType];
  if (!profile || !fields) {
    sendJson(res, 404, { error: "Media not found" });
    return;
  }

  if (hasSupabase && profile[fields.path]) {
    const response = await supabaseStorageRequest(`/object/${mediaBucket}/${profile[fields.path]}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    res.writeHead(200, {
      "Content-Type": response.headers.get("content-type") || fields.fallbackMime,
      "Content-Length": buffer.length,
      "Cache-Control": "public, max-age=300",
    });
    res.end(buffer);
    return;
  }

  const media = parseDataUrl(profile[fields.data]);
  if (!media) {
    sendJson(res, 404, { error: "Media not found" });
    return;
  }

  res.writeHead(200, {
    "Content-Type": media.mime,
    "Content-Length": media.buffer.length,
    "Cache-Control": "public, max-age=300",
  });
  res.end(media.buffer);
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(content);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 25 * 1024 * 1024) {
        reject(new Error("Profile is too large. Use smaller media files for this demo."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "POST" && url.pathname === "/api/signup") {
    try {
      const body = JSON.parse((await readBody(req)) || "{}");
      const email = cleanEmail(body.email);
      const password = String(body.password || "");
      if (!email.includes("@") || password.length < 6) {
        sendJson(res, 400, { error: "Enter a valid email and a password with at least 6 characters" });
        return;
      }

      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        sendJson(res, 409, { error: "That email already has an account. Use Log in instead." });
        return;
      }

      const userId = await createUser(email, hashPassword(password));
      const token = await createSession(userId);
      sendJson(res, 201, { token, email });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/login") {
    try {
      const body = JSON.parse((await readBody(req)) || "{}");
      const email = cleanEmail(body.email);
      const password = String(body.password || "");
      const entry = await findUserByEmail(email);
      if (!entry || !verifyPassword(password, entry[1].passwordHash)) {
        sendJson(res, 401, { error: "Email or password is incorrect" });
        return;
      }

      const token = await createSession(entry[0]);
      sendJson(res, 200, { token, email });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/me") {
    const authed = await getAuthedUser(req);
    if (!authed) {
      sendJson(res, 401, { error: "Not signed in" });
      return;
    }
    sendJson(res, 200, { email: authed.email });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/my-profile") {
    const authed = await getAuthedUser(req);
    if (!authed) {
      sendJson(res, 401, { error: "Not signed in" });
      return;
    }

    const profile = await getProfileByOwner(authed.userId);
    if (!profile) {
      sendJson(res, 404, { error: "No profile yet" });
      return;
    }

    const { ownerToken, ownerUserId, ...safeProfile } = profile;
    sendJson(res, 200, safeProfile);
    return;
  }

  if (req.method === "GET" && url.pathname === "/robots.txt") {
    sendText(
      res,
      200,
      "text/plain; charset=utf-8",
      `User-agent: *\nAllow: /\nSitemap: ${siteOrigin(req)}/sitemap.xml\n`
    );
    return;
  }

  if (req.method === "GET" && url.pathname === "/sitemap.xml") {
    const origin = siteOrigin(req);
    const profiles = await listProfiles();
    const urls = [
      { loc: origin, lastmod: new Date().toISOString() },
      ...profiles.map((profile) => ({
        loc: `${origin}/u/${profile.handle}`,
        lastmod: profile.updatedAt || new Date().toISOString(),
      })),
    ];
    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((item) => `  <url>\n    <loc>${item.loc}</loc>\n    <lastmod>${item.lastmod}</lastmod>\n  </url>`)
      .join("\n")}\n</urlset>\n`;
    sendText(res, 200, "application/xml; charset=utf-8", body);
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/profiles/") && /\/(music|avatar|background)$/.test(url.pathname)) {
    const parts = url.pathname.split("/");
    const handle = sanitizeHandle(decodeURIComponent(parts[3] || ""));
    const mediaType = parts[4];
    const profile = await getProfile(handle);
    await sendProfileMedia(res, profile, mediaType);
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/profiles/")) {
    const handle = sanitizeHandle(decodeURIComponent(url.pathname.split("/").pop()));
    const profile = await getProfile(handle);
    if (!profile) {
      sendJson(res, 404, { error: "Profile not found" });
      return;
    }
    if (url.searchParams.get("view") === "1") {
      await incrementProfileViews(profile);
    }
    const { ownerToken, ownerUserId, ...publicProfile } = profile;
    if (url.searchParams.get("view") === "1") {
      publicProfile.hasAvatar = Boolean(publicProfile.avatarPath || publicProfile.avatarData);
      publicProfile.hasBackground = Boolean(publicProfile.backgroundPath || publicProfile.backgroundData);
      publicProfile.hasMusic = Boolean(publicProfile.musicPath || publicProfile.musicData);
      delete publicProfile.avatarData;
      delete publicProfile.backgroundData;
      delete publicProfile.musicData;
    }
    sendJson(res, 200, publicProfile);
    return;
  }

  if (req.method === "PUT" && url.pathname.startsWith("/api/profiles/")) {
    try {
      const body = await readBody(req);
      const incoming = JSON.parse(body || "{}");
      const handle = sanitizeHandle(incoming.handle || url.pathname.split("/").pop());
      if (!handle) {
        sendJson(res, 400, { error: "Handle is required" });
        return;
      }

      const existingProfile = await getProfile(handle);
      const authed = await getAuthedUser(req);
      if (!authed) {
        sendJson(res, 401, { error: "Sign in before publishing a profile" });
        return;
      }

      if (existingProfile && !existingProfile.ownerUserId && !existingProfile.ownerToken) {
        sendJson(res, 403, {
          error: "This profile was created before edit protection. Create a new handle or reset it on the server.",
        });
        return;
      }

      if (existingProfile?.ownerUserId && existingProfile.ownerUserId !== authed.userId) {
        sendJson(res, 403, { error: "You can only edit profiles created by your account" });
        return;
      }

      const origin = siteOrigin(req);
      const profilePath = `/u/${handle}`;
      const profileUrl = `${origin}${profilePath}`;
      const profile = await prepareProfileForSave({
        ...incoming,
        handle,
        profileHandle: handle,
        profilePath,
        profileUrl,
        ownerUserId: authed.userId,
        views: Number(existingProfile?.views || incoming.views || 0),
        updatedAt: new Date().toISOString(),
      }, existingProfile);
      await saveProfile(profile);
      await saveUserProfileLink(authed.userId, { handle, origin });
      sendJson(res, 200, { handle, url: profilePath, fullUrl: profileUrl });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/u/")) {
    sendFile(res, path.join(root, "index.html"));
    return;
  }

  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = path.normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(root, safePath);

  if (!filePath.startsWith(root)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  sendFile(res, filePath);
});

server.listen(port, () => {
  const storage = hasSupabase ? "Supabase" : "local JSON";
  console.log(`NightCard running at http://localhost:${port} using ${storage}`);
});
