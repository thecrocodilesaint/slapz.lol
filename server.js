const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const dataDir = path.join(root, "data");
const profilesPath = path.join(dataDir, "profiles.json");
const port = Number(process.env.PORT) || 4174;

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
}

function readProfiles() {
  ensureStore();
  return JSON.parse(fs.readFileSync(profilesPath, "utf8"));
}

function writeProfiles(profiles) {
  ensureStore();
  fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2), "utf8");
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
  const protocol = req.headers["x-forwarded-proto"] || "https";
  return `${protocol}://${req.headers.host}`;
}

function sendText(res, status, contentType, text) {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(text);
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
    const profiles = readProfiles();
    const urls = [
      { loc: origin, lastmod: new Date().toISOString() },
      ...Object.values(profiles).map((profile) => ({
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

  if (req.method === "GET" && url.pathname.startsWith("/api/profiles/")) {
    const handle = sanitizeHandle(decodeURIComponent(url.pathname.split("/").pop()));
    const profile = readProfiles()[handle];
    if (!profile) {
      sendJson(res, 404, { error: "Profile not found" });
      return;
    }
    sendJson(res, 200, profile);
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

      const profiles = readProfiles();
      profiles[handle] = {
        ...incoming,
        handle,
        updatedAt: new Date().toISOString(),
      };
      writeProfiles(profiles);
      sendJson(res, 200, { handle, url: `/u/${handle}` });
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
  console.log(`NightCard running at http://localhost:${port}`);
});
