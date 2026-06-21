const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const dataDir = process.env.FUNLOL_DATA_DIR ? path.resolve(process.env.FUNLOL_DATA_DIR) : path.join(root, "data");
const profilesPath = path.join(dataDir, "profiles.json");
const usersPath = path.join(dataDir, "users.json");
const port = Number(process.env.PORT) || 4174;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasSupabase = Boolean(supabaseUrl && supabaseServiceKey);
const mediaBucket = "profile-media";
let mediaBucketReady = false;
const passwordResetTtlMs = 30 * 60 * 1000;
const forgotPasswordCooldownMs = 60 * 1000;
const forgotPasswordAttempts = new Map();
const resetPasswordSuccessMessage = "If an account exists for this email, a password reset link has been sent.";
const resendApiKey = process.env.RESEND_API_KEY;
const sendgridApiKey = process.env.SENDGRID_API_KEY;
const passwordResetEmailFrom = process.env.PASSWORD_RESET_FROM || process.env.EMAIL_FROM || "";
const ownerEmail = "thecrocodilesaint@gmail.com";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
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
  store.passwordResets = store.passwordResets || {};
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

function publicProfilePayload(profile) {
  const {
    ownerToken,
    ownerUserId,
    friendRequests,
    sentFriendRequests,
    adminNotifications,
    tribes,
    tribeInvites,
    tribeJoinRequests,
    ...publicProfile
  } = profile;
  return publicProfile;
}

function handleFromFriendTarget(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const targetUrl = raw.startsWith("http") ? new URL(raw) : new URL(raw, "https://fun.lol");
    const match = targetUrl.pathname.match(/^\/u\/([^/]+)/);
    if (match) return sanitizeHandle(decodeURIComponent(match[1]));
  } catch {
    // Fall through to plain handle cleanup.
  }

  return sanitizeHandle(raw.replace(/^\/u\//i, ""));
}

function requestDisplayName(profile) {
  return String(profile?.name || profile?.handle || "friend").trim().slice(0, 32);
}

function requestLinkFor(handle) {
  return handle ? `/u/${handle}` : "";
}

function friendFromRequest(request) {
  const handle = sanitizeHandle(request?.fromHandle);
  const link = request?.fromLink || requestLinkFor(handle);
  if (!handle && !link) return null;
  return {
    id: handle || crypto.randomUUID(),
    name: String(request?.fromName || handle || "Friend").trim().slice(0, 32),
    handle,
    link,
  };
}

function ownFriendFromProfile(profile) {
  const handle = sanitizeHandle(profile?.handle);
  if (!handle) return null;
  return {
    id: handle,
    name: requestDisplayName(profile),
    handle,
    link: requestLinkFor(handle),
  };
}

function sentRequestFromTarget(profile, request) {
  const handle = sanitizeHandle(profile?.handle);
  if (!handle) return null;
  return {
    id: request.id,
    targetName: requestDisplayName(profile),
    targetHandle: handle,
    targetLink: requestLinkFor(handle),
    createdAt: request.createdAt,
  };
}

function mergeFriend(list, friend) {
  if (!friend) return Array.isArray(list) ? list : [];
  const current = Array.isArray(list) ? list : [];
  const friendKey = friend.handle || friend.link;
  if (current.some((item) => (item.handle || item.link) === friendKey)) return current;
  return [...current, friend].slice(0, 24);
}

function friendMatchesKey(friend, key) {
  const rawKey = String(key || "");
  const handleKey = handleFromFriendTarget(rawKey);
  return (
    String(friend?.id || "") === rawKey ||
    (handleKey && sanitizeHandle(friend?.handle) === handleKey) ||
    (handleKey && handleFromFriendTarget(friend?.link) === handleKey) ||
    String(friend?.link || "") === rawKey
  );
}

function sanitizeTribeName(name) {
  return String(name || "").trim().replace(/\s+/g, " ").slice(0, 36);
}

function sanitizeThemeColor(color) {
  const value = String(color || "").trim();
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#f5f7fb";
}

function sanitizeChatText(text) {
  return String(text || "").trim().replace(/\s+/g, " ").slice(0, 500);
}

function cleanIdList(items) {
  return [...new Set((Array.isArray(items) ? items : []).map((item) => String(item || "").trim()).filter(Boolean))];
}

function tribeMemberFromProfile(profile) {
  const handle = sanitizeHandle(profile?.handle);
  return {
    userId: String(profile?.ownerUserId || ""),
    displayName: requestDisplayName(profile),
    handle,
    link: requestLinkFor(handle),
  };
}

function normalizeTribe(tribe, ownerProfile) {
  const now = new Date().toISOString();
  const ownerId = String(tribe?.ownerId || ownerProfile?.ownerUserId || "");
  const rawMemberIds = Array.isArray(tribe?.memberIds)
    ? tribe.memberIds
    : Array.isArray(tribe?.members)
      ? tribe.members.map((member) => member?.userId || member?.id)
      : [];
  const memberIds = cleanIdList(rawMemberIds);
  if (ownerId && !memberIds.includes(ownerId)) memberIds.unshift(ownerId);

  return {
    tribeId: String(tribe?.tribeId || crypto.randomUUID()),
    name: sanitizeTribeName(tribe?.name) || "Untitled tribe",
    ownerId,
    ownerDisplayName: requestDisplayName(ownerProfile) || String(tribe?.ownerDisplayName || "Owner").slice(0, 32),
    ownerHandle: sanitizeHandle(ownerProfile?.handle || tribe?.ownerHandle),
    memberIds,
    pendingInviteIds: cleanIdList(tribe?.pendingInviteIds),
    pendingJoinIds: cleanIdList(tribe?.pendingJoinIds),
    messages: (Array.isArray(tribe?.messages) ? tribe.messages : [])
      .map((message) => ({
        id: String(message?.id || crypto.randomUUID()),
        senderId: String(message?.senderId || ""),
        senderDisplayName: String(message?.senderDisplayName || "Member").trim().slice(0, 32),
        senderHandle: sanitizeHandle(message?.senderHandle),
        text: sanitizeChatText(message?.text),
        createdAt: message?.createdAt || now,
      }))
      .filter((message) => message.senderId && message.text)
      .slice(-300),
    themeColor: sanitizeThemeColor(tribe?.themeColor),
    createdAt: tribe?.createdAt || now,
    updatedAt: tribe?.updatedAt || now,
  };
}

function normalizeTribesForProfile(profile) {
  return (Array.isArray(profile?.tribes) ? profile.tribes : []).map((tribe) => normalizeTribe(tribe, profile));
}

function profileFriendHandles(profile) {
  return new Set(
    (Array.isArray(profile?.friends) ? profile.friends : [])
      .map((friend) => sanitizeHandle(friend?.handle) || handleFromFriendTarget(friend?.link))
      .filter(Boolean)
  );
}

function serializeTribe(tribe, ownerProfile, viewerProfile, profiles = []) {
  const profileByOwnerId = new Map(profiles.map((profile) => [String(profile.ownerUserId || ""), profile]));
  const members = tribe.memberIds.map((memberId) => {
    const memberProfile = profileByOwnerId.get(String(memberId)) || (String(memberId) === String(ownerProfile?.ownerUserId) ? ownerProfile : null);
    if (memberProfile) return tribeMemberFromProfile(memberProfile);
    return {
      userId: String(memberId),
      displayName: "Unknown member",
      handle: "",
      link: "",
    };
  });
  const viewerId = String(viewerProfile?.ownerUserId || "");
  const { messages, ...safeTribe } = tribe;

  return {
    ...safeTribe,
    ownerDisplayName: requestDisplayName(ownerProfile),
    ownerHandle: sanitizeHandle(ownerProfile?.handle || tribe.ownerHandle),
    members,
    isOwner: Boolean(viewerId && viewerId === tribe.ownerId),
    isMember: Boolean(viewerId && tribe.memberIds.includes(viewerId)),
    hasPendingJoin: Boolean(viewerId && tribe.pendingJoinIds.includes(viewerId)),
  };
}

function canAccessTribe(tribe, userId) {
  const viewerId = String(userId || "");
  return Boolean(viewerId && (tribe.ownerId === viewerId || tribe.memberIds.includes(viewerId)));
}

async function listTribeSummaries(viewerProfile) {
  const profiles = await listProfiles();
  return profiles
    .flatMap((profile) => normalizeTribesForProfile(profile).map((tribe) => serializeTribe(tribe, profile, viewerProfile, profiles)))
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}

async function findTribeById(tribeId) {
  const profiles = await listProfiles();
  const cleanTribeId = String(tribeId || "");
  for (const ownerProfile of profiles) {
    const tribes = normalizeTribesForProfile(ownerProfile);
    const tribeIndex = tribes.findIndex((tribe) => tribe.tribeId === cleanTribeId);
    if (tribeIndex >= 0) {
      return {
        ownerProfile,
        tribe: tribes[tribeIndex],
        tribeIndex,
        tribes,
      };
    }
  }
  return null;
}

async function tribeStateFor(profile) {
  return {
    tribes: await listTribeSummaries(profile),
    tribeInvites: Array.isArray(profile?.tribeInvites) ? profile.tribeInvites : [],
    tribeJoinRequests: Array.isArray(profile?.tribeJoinRequests) ? profile.tribeJoinRequests : [],
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

function isOwnerUser(authed) {
  return cleanEmail(authed?.email) === ownerEmail;
}

async function requireOwner(req, res) {
  const authed = await getAuthedUser(req);
  if (!authed) {
    sendJson(res, 401, { error: "Sign in before opening owner tools" });
    return null;
  }
  if (!isOwnerUser(authed)) {
    sendJson(res, 403, { error: "Only the owner account can use this area" });
    return null;
  }
  return authed;
}

async function findUserById(userId) {
  const cleanUserId = String(userId || "").trim();
  if (!cleanUserId) return null;

  if (hasSupabase) {
    const rows = await supabaseRequest("app_users", {
      query: `?id=eq.${encodeURIComponent(cleanUserId)}&select=*&limit=1`,
    });
    const user = rows[0];
    return user
      ? {
          userId: user.id,
          email: user.email,
          createdAt: user.created_at,
          profileHandle: user.profile_handle,
          profilePath: user.profile_path,
          profileUrl: user.profile_url,
        }
      : null;
  }

  const user = readUsersFile().users[cleanUserId];
  return user
    ? {
        userId: cleanUserId,
        email: user.email,
        createdAt: user.createdAt,
        profileHandle: user.profileHandle,
        profilePath: user.profilePath,
        profileUrl: user.profileUrl,
      }
    : null;
}

function profileSummaryForAdmin(user, profile) {
  const handle = sanitizeHandle(profile?.handle || user.profileHandle);
  return {
    userId: user.userId,
    email: user.email,
    createdAt: user.createdAt,
    profileHandle: handle,
    profilePath: user.profilePath || (handle ? `/u/${handle}` : ""),
    profileUrl: user.profileUrl || "",
    displayName: profile?.handle ? requestDisplayName(profile) : "No profile",
    handle,
    views: Number(profile?.views || 0),
    updatedAt: profile?.updatedAt || "",
    hasProfile: Boolean(profile?.handle),
    isOwner: cleanEmail(user.email) === ownerEmail,
  };
}

async function listUsersForAdmin() {
  const profiles = await listProfiles();
  const profileByOwner = new Map();
  profiles.forEach((profile) => {
    if (!profile?.ownerUserId) return;
    const current = profileByOwner.get(profile.ownerUserId);
    if (!current || String(profile.updatedAt || "").localeCompare(String(current.updatedAt || "")) > 0) {
      profileByOwner.set(profile.ownerUserId, profile);
    }
  });

  let users;
  if (hasSupabase) {
    const rows = await supabaseRequest("app_users", {
      query: "?select=id,email,created_at,profile_handle,profile_path,profile_url&order=created_at.desc",
    });
    users = rows.map((user) => ({
      userId: user.id,
      email: user.email,
      createdAt: user.created_at,
      profileHandle: user.profile_handle,
      profilePath: user.profile_path,
      profileUrl: user.profile_url,
    }));
  } else {
    users = Object.entries(readUsersFile().users).map(([userId, user]) => ({
      userId,
      email: user.email,
      createdAt: user.createdAt,
      profileHandle: user.profileHandle,
      profilePath: user.profilePath,
      profileUrl: user.profileUrl,
    }));
    users.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  }

  return users.map((user) => profileSummaryForAdmin(user, profileByOwner.get(user.userId)));
}

function sanitizeAdminMessage(message) {
  return String(message || "").trim().replace(/\s+/g, " ").slice(0, 220);
}

async function adminSendNotification(targetUserId, message) {
  const target = await findUserById(targetUserId);
  if (!target) throw new Error("User was not found");

  const targetProfile = await getProfileByOwner(targetUserId);
  if (!targetProfile?.handle) throw new Error("That user needs a published profile before dashboard notices can be shown");

  const notice = {
    id: crypto.randomUUID(),
    type: "owner",
    title: "Owner notice",
    message: sanitizeAdminMessage(message),
    createdAt: new Date().toISOString(),
  };
  if (!notice.message) throw new Error("Enter a notification message");

  targetProfile.adminNotifications = [notice, ...(Array.isArray(targetProfile.adminNotifications) ? targetProfile.adminNotifications : [])].slice(0, 40);
  targetProfile.updatedAt = notice.createdAt;
  await saveProfile(targetProfile);
  return notice;
}

async function adminAddFriend(owner, targetUserId) {
  if (owner.userId === targetUserId) throw new Error("The owner account is already itself");

  const target = await findUserById(targetUserId);
  if (!target) throw new Error("User was not found");

  const ownerProfile = await getProfileByOwner(owner.userId);
  const targetProfile = await getProfileByOwner(targetUserId);
  if (!ownerProfile?.handle || !targetProfile?.handle) {
    throw new Error("Both accounts need published profiles before adding friends");
  }

  ownerProfile.friends = mergeFriend(ownerProfile.friends, ownFriendFromProfile(targetProfile));
  ownerProfile.sentFriendRequests = (Array.isArray(ownerProfile.sentFriendRequests) ? ownerProfile.sentFriendRequests : []).filter(
    (request) => request.targetHandle !== targetProfile.handle
  );
  ownerProfile.friendRequests = (Array.isArray(ownerProfile.friendRequests) ? ownerProfile.friendRequests : []).filter(
    (request) => request.fromHandle !== targetProfile.handle
  );
  ownerProfile.updatedAt = new Date().toISOString();

  targetProfile.friends = mergeFriend(targetProfile.friends, ownFriendFromProfile(ownerProfile));
  targetProfile.sentFriendRequests = (Array.isArray(targetProfile.sentFriendRequests) ? targetProfile.sentFriendRequests : []).filter(
    (request) => request.targetHandle !== ownerProfile.handle
  );
  targetProfile.friendRequests = (Array.isArray(targetProfile.friendRequests) ? targetProfile.friendRequests : []).filter(
    (request) => request.fromHandle !== ownerProfile.handle
  );
  targetProfile.updatedAt = ownerProfile.updatedAt;

  await saveProfile(ownerProfile);
  await saveProfile(targetProfile);
  return { friends: ownerProfile.friends || [] };
}

async function removeDeletedUserReferences(userId, deletedHandle = "") {
  const cleanHandleValue = sanitizeHandle(deletedHandle);
  const profiles = await listProfiles();

  for (const profile of profiles) {
    if (!profile?.handle || profile.ownerUserId === userId) continue;

    let changed = false;
    const filterByHandle = (items, key) => {
      const current = Array.isArray(items) ? items : [];
      const next = current.filter((item) => sanitizeHandle(item?.[key] || item?.handle) !== cleanHandleValue);
      if (next.length !== current.length) changed = true;
      return next;
    };

    if (cleanHandleValue) {
      profile.friends = filterByHandle(profile.friends, "handle");
      profile.friendRequests = filterByHandle(profile.friendRequests, "fromHandle");
      profile.sentFriendRequests = filterByHandle(profile.sentFriendRequests, "targetHandle");
    }

    const tribes = normalizeTribesForProfile(profile);
    const nextTribes = tribes.map((tribe) => ({
      ...tribe,
      memberIds: tribe.memberIds.filter((id) => id !== userId),
      pendingInviteIds: tribe.pendingInviteIds.filter((id) => id !== userId),
      pendingJoinIds: tribe.pendingJoinIds.filter((id) => id !== userId),
    }));
    if (JSON.stringify(nextTribes) !== JSON.stringify(tribes)) {
      profile.tribes = nextTribes;
      changed = true;
    }

    const currentJoinRequests = Array.isArray(profile.tribeJoinRequests) ? profile.tribeJoinRequests : [];
    const nextJoinRequests = currentJoinRequests.filter((request) => request.requesterId !== userId);
    if (nextJoinRequests.length !== currentJoinRequests.length) {
      profile.tribeJoinRequests = nextJoinRequests;
      changed = true;
    }

    const currentInvites = Array.isArray(profile.tribeInvites) ? profile.tribeInvites : [];
    const nextInvites = currentInvites.filter((invite) => invite.ownerId !== userId);
    if (nextInvites.length !== currentInvites.length) {
      profile.tribeInvites = nextInvites;
      changed = true;
    }

    if (changed) {
      profile.updatedAt = new Date().toISOString();
      await saveProfile(profile);
    }
  }
}

async function deleteUserAccount(userId) {
  const user = await findUserById(userId);
  if (!user) throw new Error("User was not found");
  if (cleanEmail(user.email) === ownerEmail) throw new Error("The owner account cannot be deleted");

  const profile = await getProfileByOwner(userId);
  await removeDeletedUserReferences(userId, profile?.handle || user.profileHandle);

  if (hasSupabase) {
    await supabaseRequest("app_profiles", {
      method: "DELETE",
      query: `?owner_user_id=eq.${encodeURIComponent(userId)}`,
      prefer: "return=minimal",
    });
    await supabaseRequest("app_sessions", {
      method: "DELETE",
      query: `?user_id=eq.${encodeURIComponent(userId)}`,
      prefer: "return=minimal",
    });
    try {
      await supabaseRequest("app_password_resets", {
        method: "DELETE",
        query: `?user_id=eq.${encodeURIComponent(userId)}`,
        prefer: "return=minimal",
      });
    } catch (error) {
      console.warn("Could not clear password reset rows during account delete:", error.message);
    }
    await supabaseRequest("app_users", {
      method: "DELETE",
      query: `?id=eq.${encodeURIComponent(userId)}`,
      prefer: "return=minimal",
    });
    return user;
  }

  const profiles = readProfilesFile();
  Object.entries(profiles).forEach(([handle, storedProfile]) => {
    if (storedProfile?.ownerUserId === userId) delete profiles[handle];
  });
  writeProfilesFile(profiles);

  const store = readUsersFile();
  delete store.users[userId];
  Object.entries(store.sessions).forEach(([token, session]) => {
    if (session.userId === userId) delete store.sessions[token];
  });
  Object.entries(store.passwordResets).forEach(([tokenHash, reset]) => {
    if (reset.userId === userId) delete store.passwordResets[tokenHash];
  });
  writeUsersFile(store);
  return user;
}

function onboardingStateForUser(user, profile) {
  const hasPublishedProfile = Boolean(profile?.handle || user?.profileHandle || user?.profile_handle);
  const completed = Boolean(user?.onboardingCompleted || user?.onboarding_completed || hasPublishedProfile);
  const skipped = Boolean(user?.onboardingSkipped || user?.onboarding_skipped);
  return {
    onboardingCompleted: completed,
    onboardingSkipped: skipped,
    onboardingUpdatedAt: user?.onboardingUpdatedAt || user?.onboarding_updated_at || "",
    needsOnboarding: !completed && !skipped,
  };
}

async function saveUserOnboardingStatus(userId, { completed = false, skipped = false } = {}) {
  const onboardingCompleted = Boolean(completed);
  const onboardingSkipped = onboardingCompleted ? false : Boolean(skipped);
  const onboardingUpdatedAt = new Date().toISOString();

  if (hasSupabase) {
    await supabaseRequest("app_users", {
      method: "PATCH",
      query: `?id=eq.${encodeURIComponent(userId)}`,
      body: {
        onboarding_completed: onboardingCompleted,
        onboarding_skipped: onboardingSkipped,
        onboarding_updated_at: onboardingUpdatedAt,
      },
      prefer: "return=minimal",
    });
    return { onboardingCompleted, onboardingSkipped, onboardingUpdatedAt };
  }

  const store = readUsersFile();
  if (!store.users[userId]) throw new Error("User not found");
  store.users[userId].onboardingCompleted = onboardingCompleted;
  store.users[userId].onboardingSkipped = onboardingSkipped;
  store.users[userId].onboardingUpdatedAt = onboardingUpdatedAt;
  writeUsersFile(store);
  return { onboardingCompleted, onboardingSkipped, onboardingUpdatedAt };
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
    try {
      await saveUserOnboardingStatus(userId, { completed: true });
    } catch (error) {
      console.warn("Could not mark onboarding completed. Run the latest supabase-schema.sql.", error.message);
    }
    return;
  }

  const store = readUsersFile();
  if (store.users[userId]) {
    store.users[userId].profileHandle = handle;
    store.users[userId].profilePath = profilePath;
    store.users[userId].profileUrl = profileUrl;
    store.users[userId].onboardingCompleted = true;
    store.users[userId].onboardingSkipped = false;
    store.users[userId].onboardingUpdatedAt = new Date().toISOString();
    writeUsersFile(store);
  }
}

async function getSnakeHighScore(userId) {
  if (hasSupabase) {
    try {
      const rows = await supabaseRequest("app_users", {
        query: `?id=eq.${encodeURIComponent(userId)}&select=snake_high_score&limit=1`,
      });
      return Number(rows[0]?.snake_high_score || 0);
    } catch (error) {
      console.warn("Could not read snake_high_score. Run the latest supabase-schema.sql.", error.message);
      return 0;
    }
  }

  const user = readUsersFile().users[userId];
  return Number(user?.snakeHighScore || 0);
}

async function saveSnakeHighScore(userId, score) {
  const safeScore = Math.max(0, Math.min(999999, Number.parseInt(score, 10) || 0));
  const currentScore = await getSnakeHighScore(userId);
  const highScore = Math.max(currentScore, safeScore);

  if (hasSupabase) {
    try {
      await supabaseRequest("app_users", {
        method: "PATCH",
        query: `?id=eq.${encodeURIComponent(userId)}`,
        body: { snake_high_score: highScore },
        prefer: "return=minimal",
      });
    } catch (error) {
      console.warn("Could not save snake_high_score. Run the latest supabase-schema.sql.", error.message);
    }
    return highScore;
  }

  const store = readUsersFile();
  if (store.users[userId]) {
    store.users[userId].snakeHighScore = highScore;
    writeUsersFile(store);
  }
  return highScore;
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
    return user
      ? [
          user.id,
          {
            email: user.email,
            passwordHash: user.password_hash,
            createdAt: user.created_at,
          profileHandle: user.profile_handle,
          profilePath: user.profile_path,
          profileUrl: user.profile_url,
          onboardingCompleted: Boolean(user.onboarding_completed),
          onboardingSkipped: Boolean(user.onboarding_skipped),
          onboardingUpdatedAt: user.onboarding_updated_at,
        },
      ]
      : null;
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
  store.users[userId] = {
    email,
    passwordHash,
    createdAt,
    onboardingCompleted: false,
    onboardingSkipped: false,
    onboardingUpdatedAt: "",
  };
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

function hashResetToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function getRequestIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "")
    .split(",")[0]
    .trim();
}

function shouldThrottleForgotPassword(req, email) {
  const key = `${getRequestIp(req)}:${email || "unknown"}`;
  const now = Date.now();
  const lastAttempt = forgotPasswordAttempts.get(key) || 0;
  forgotPasswordAttempts.set(key, now);
  return now - lastAttempt < forgotPasswordCooldownMs;
}

function cleanupForgotPasswordAttempts() {
  const cutoff = Date.now() - 5 * forgotPasswordCooldownMs;
  for (const [key, timestamp] of forgotPasswordAttempts) {
    if (timestamp < cutoff) forgotPasswordAttempts.delete(key);
  }
}

function maskEmail(email) {
  const [name = "", domain = ""] = String(email || "").split("@");
  if (!domain) return "invalid-email";
  const visibleName = name.length <= 2 ? `${name.slice(0, 1)}*` : `${name.slice(0, 2)}***`;
  return `${visibleName}@${domain}`;
}

function isLocalResetLink(resetLink) {
  try {
    const { hostname } = new URL(resetLink);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function passwordResetEmailContent(resetLink) {
  return {
    subject: "Reset your fun.lol password",
    text: [
      "Reset your fun.lol password",
      "",
      "Use this link to choose a new password. It expires in 30 minutes and can only be used once:",
      resetLink,
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Inter,Arial,sans-serif;background:#050508;color:#f5f7fb;padding:24px;border-radius:8px">
        <h1 style="margin:0 0 12px;font-size:28px">Reset your fun.lol password</h1>
        <p style="color:#b8bbc8;line-height:1.5">Use this link to choose a new password. It expires in 30 minutes and can only be used once.</p>
        <p><a href="${resetLink}" style="display:inline-block;padding:12px 16px;border-radius:8px;background:#f5f7fb;color:#050508;font-weight:800;text-decoration:none">Reset password</a></p>
        <p style="color:#8f95a8;font-size:13px;line-height:1.5">If you did not request this, you can ignore this email.</p>
      </div>
    `,
  };
}

function emailAddressFrom(value) {
  const text = String(value || "").trim();
  const match = text.match(/<([^>]+)>/);
  return match ? match[1].trim() : text;
}

async function sendWithResend(email, content) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: passwordResetEmailFrom,
      to: email,
      subject: content.subject,
      html: content.html,
      text: content.text,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Resend failed with ${response.status}`);
  }
}

async function sendWithSendGrid(email, content) {
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sendgridApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }] }],
      from: { email: emailAddressFrom(passwordResetEmailFrom) },
      subject: content.subject,
      content: [
        { type: "text/plain", value: content.text },
        { type: "text/html", value: content.html },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `SendGrid failed with ${response.status}`);
  }
}

async function createPasswordResetToken(userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + passwordResetTtlMs).toISOString();
  const createdAt = now.toISOString();

  if (hasSupabase) {
    try {
      await supabaseRequest("app_password_resets", {
        method: "PATCH",
        query: `?user_id=eq.${encodeURIComponent(userId)}&used_at=is.null`,
        body: { used_at: createdAt },
        prefer: "return=minimal",
      });
      await supabaseRequest("app_password_resets", {
        method: "POST",
        body: {
          id: crypto.randomUUID(),
          user_id: userId,
          token_hash: tokenHash,
          expires_at: expiresAt,
          created_at: createdAt,
        },
        prefer: "return=minimal",
      });
    } catch (error) {
      console.warn("Could not create Supabase reset token. Run the latest supabase-schema.sql.", error.message);
      throw new Error("Password reset is not configured yet.");
    }
    return token;
  }

  const store = readUsersFile();
  for (const reset of Object.values(store.passwordResets)) {
    if (reset.userId === userId && !reset.usedAt) reset.usedAt = createdAt;
  }
  store.passwordResets[tokenHash] = {
    userId,
    tokenHash,
    createdAt,
    expiresAt,
    usedAt: "",
  };
  writeUsersFile(store);
  return token;
}

async function findPasswordResetByToken(token) {
  const tokenHash = hashResetToken(token);
  const now = Date.now();

  if (hasSupabase) {
    const rows = await supabaseRequest("app_password_resets", {
      query: `?token_hash=eq.${encodeURIComponent(tokenHash)}&select=*&limit=1`,
    });
    const reset = rows[0];
    if (!reset || reset.used_at || new Date(reset.expires_at).getTime() <= now) return null;
    return {
      id: reset.id,
      tokenHash,
      userId: reset.user_id,
    };
  }

  const reset = readUsersFile().passwordResets[tokenHash];
  if (!reset || reset.usedAt || new Date(reset.expiresAt).getTime() <= now) return null;
  return reset;
}

async function markPasswordResetUsed(reset) {
  const usedAt = new Date().toISOString();
  if (hasSupabase) {
    await supabaseRequest("app_password_resets", {
      method: "PATCH",
      query: `?id=eq.${encodeURIComponent(reset.id)}`,
      body: { used_at: usedAt },
      prefer: "return=minimal",
    });
    return;
  }

  const store = readUsersFile();
  if (store.passwordResets[reset.tokenHash]) {
    store.passwordResets[reset.tokenHash].usedAt = usedAt;
    writeUsersFile(store);
  }
}

async function updateUserPassword(userId, passwordHash) {
  if (hasSupabase) {
    await supabaseRequest("app_users", {
      method: "PATCH",
      query: `?id=eq.${encodeURIComponent(userId)}`,
      body: { password_hash: passwordHash },
      prefer: "return=minimal",
    });
    return;
  }

  const store = readUsersFile();
  if (!store.users[userId]) throw new Error("User not found");
  store.users[userId].passwordHash = passwordHash;
  writeUsersFile(store);
}

async function invalidateUserSessions(userId) {
  if (hasSupabase) {
    await supabaseRequest("app_sessions", {
      method: "DELETE",
      query: `?user_id=eq.${encodeURIComponent(userId)}`,
      prefer: "return=minimal",
    });
    return;
  }

  const store = readUsersFile();
  for (const [token, session] of Object.entries(store.sessions)) {
    if (session.userId === userId) delete store.sessions[token];
  }
  writeUsersFile(store);
}

// Password reset delivery:
// - Uses RESEND_API_KEY or SENDGRID_API_KEY plus PASSWORD_RESET_FROM/EMAIL_FROM when configured.
// - Logs the one-time reset link only for localhost development fallback.
// - Never returns reset tokens from API responses, especially in production.
async function sendPasswordResetLink(email, resetLink) {
  const content = passwordResetEmailContent(resetLink);

  if (resendApiKey && passwordResetEmailFrom) {
    await sendWithResend(email, content);
    console.info(`[password reset] email sent with Resend to ${maskEmail(email)}`);
    return true;
  }

  if (sendgridApiKey && passwordResetEmailFrom) {
    await sendWithSendGrid(email, content);
    console.info(`[password reset] email sent with SendGrid to ${maskEmail(email)}`);
    return true;
  }

  if ((resendApiKey || sendgridApiKey) && !passwordResetEmailFrom) {
    console.warn("[password reset] email provider key exists, but PASSWORD_RESET_FROM or EMAIL_FROM is missing.");
  }

  if (isLocalResetLink(resetLink)) {
    console.log(`[dev password reset] ${email}: ${resetLink}`);
    return true;
  }

  console.warn(
    "[password reset] email provider missing. Configure RESEND_API_KEY or SENDGRID_API_KEY plus PASSWORD_RESET_FROM/EMAIL_FROM."
  );
  return false;
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
    return {
      token,
      userId: user.id,
      email: user.email,
      createdAt: user.created_at,
      profileHandle: user.profile_handle,
      profilePath: user.profile_path,
      profileUrl: user.profile_url,
      onboardingCompleted: Boolean(user.onboarding_completed),
      onboardingSkipped: Boolean(user.onboarding_skipped),
      onboardingUpdatedAt: user.onboarding_updated_at,
    };
  }

  const store = readUsersFile();
  const session = store.sessions[token];
  if (!session) return null;

  const user = store.users[session.userId];
  if (!user) return null;
  return {
    token,
    userId: session.userId,
    email: user.email,
    createdAt: user.createdAt,
    profileHandle: user.profileHandle,
    profilePath: user.profilePath,
    profileUrl: user.profileUrl,
    onboardingCompleted: Boolean(user.onboardingCompleted),
    onboardingSkipped: Boolean(user.onboardingSkipped),
    onboardingUpdatedAt: user.onboardingUpdatedAt || "",
  };
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

  if (req.method === "POST" && url.pathname === "/api/forgot-password") {
    try {
      cleanupForgotPasswordAttempts();
      const body = JSON.parse((await readBody(req)) || "{}");
      const email = cleanEmail(body.email);
      const maskedEmail = maskEmail(email);
      const isValidEmail = email.includes("@");

      if (!email || !isValidEmail) {
        console.info(`[password reset] ignored invalid email request: ${maskedEmail}`);
      } else if (shouldThrottleForgotPassword(req, email)) {
        console.info(`[password reset] cooldown active for ${maskedEmail}`);
      } else {
        const entry = await findUserByEmail(email);
        if (entry) {
          console.info(`[password reset] account found for ${maskedEmail}; generating reset token`);
          const token = await createPasswordResetToken(entry[0]);
          const resetLink = `${siteOrigin(req)}/reset-password?token=${encodeURIComponent(token)}`;
          console.info(`[password reset] reset token stored for ${maskedEmail}; sending reset link`);
          await sendPasswordResetLink(entry[1].email, resetLink);
        } else {
          console.info(`[password reset] no account found for ${maskedEmail}; generic response returned`);
        }
      }
      sendJson(res, 200, { message: resetPasswordSuccessMessage });
    } catch (error) {
      console.warn("Forgot password request failed:", error.message);
      sendJson(res, 200, { message: resetPasswordSuccessMessage });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/reset-password") {
    try {
      const body = JSON.parse((await readBody(req)) || "{}");
      const token = String(body.token || "").trim();
      const newPassword = String(body.newPassword || "");

      if (!token || newPassword.length < 6) {
        sendJson(res, 400, { error: "Use a valid reset link and a password with at least 6 characters." });
        return;
      }

      const reset = await findPasswordResetByToken(token);
      if (!reset) {
        sendJson(res, 400, { error: "This reset link is invalid or expired. Request a new one." });
        return;
      }

      await updateUserPassword(reset.userId, hashPassword(newPassword));
      await invalidateUserSessions(reset.userId);
      await markPasswordResetUsed(reset);
      sendJson(res, 200, { message: "Password reset. You can log in with your new password." });
    } catch (error) {
      console.warn("Reset password request failed:", error.message);
      sendJson(res, 400, { error: "Could not reset password. Request a new reset link and try again." });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/me") {
    const authed = await getAuthedUser(req);
    if (!authed) {
      sendJson(res, 401, { error: "Not signed in" });
      return;
    }
    const profileForOnboarding = authed.profileHandle ? null : await getProfileByOwner(authed.userId);
    const onboarding = onboardingStateForUser(authed, profileForOnboarding);
    sendJson(res, 200, {
      email: authed.email,
      userId: authed.userId,
      createdAt: authed.createdAt,
      profileHandle: authed.profileHandle || profileForOnboarding?.handle || "",
      profilePath: authed.profilePath || (profileForOnboarding?.handle ? `/u/${profileForOnboarding.handle}` : ""),
      profileUrl: authed.profileUrl,
      isOwner: isOwnerUser(authed),
      ...onboarding,
    });
    return;
  }

  if (req.method === "PATCH" && url.pathname === "/api/me/onboarding") {
    try {
      const authed = await getAuthedUser(req);
      if (!authed) {
        sendJson(res, 401, { error: "Sign in before updating onboarding" });
        return;
      }

      const body = JSON.parse((await readBody(req)) || "{}");
      const action = String(body.action || "").trim().toLowerCase();
      const completed = action === "complete" || action === "completed" || body.onboardingCompleted === true;
      const skipped = action === "skip" || action === "skipped" || body.onboardingSkipped === true;
      if (!completed && !skipped) {
        sendJson(res, 400, { error: "Choose complete or skip" });
        return;
      }

      const onboarding = await saveUserOnboardingStatus(authed.userId, { completed, skipped });
      sendJson(res, 200, {
        ...onboarding,
        needsOnboarding: !onboarding.onboardingCompleted && !onboarding.onboardingSkipped,
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (url.pathname === "/api/admin/users" && req.method === "GET") {
    try {
      const owner = await requireOwner(req, res);
      if (!owner) return;
      sendJson(res, 200, { users: await listUsersForAdmin() });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (url.pathname.startsWith("/api/admin/users/")) {
    try {
      const owner = await requireOwner(req, res);
      if (!owner) return;

      const parts = url.pathname.split("/").map(decodeURIComponent);
      const targetUserId = String(parts[4] || "").trim();
      const action = String(parts[5] || "").trim();
      if (!targetUserId) {
        sendJson(res, 400, { error: "User id is required" });
        return;
      }

      if (req.method === "POST" && action === "friend") {
        const result = await adminAddFriend(owner, targetUserId);
        sendJson(res, 200, result);
        return;
      }

      if (req.method === "POST" && action === "notifications") {
        const body = JSON.parse((await readBody(req)) || "{}");
        const notice = await adminSendNotification(targetUserId, body.message);
        sendJson(res, 201, { notice });
        return;
      }

      if (req.method === "DELETE" && !action) {
        const deleted = await deleteUserAccount(targetUserId);
        sendJson(res, 200, { deletedUserId: deleted.userId });
        return;
      }

      sendJson(res, 404, { error: "Owner action was not found" });
    } catch (error) {
      const status = /not found/i.test(error.message) ? 404 : 400;
      sendJson(res, status, { error: error.message });
    }
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

  if (req.method === "GET" && url.pathname === "/api/games/snake-score") {
    const authed = await getAuthedUser(req);
    if (!authed) {
      sendJson(res, 401, { error: "Not signed in" });
      return;
    }

    const highScore = await getSnakeHighScore(authed.userId);
    sendJson(res, 200, { highScore });
    return;
  }

  if (req.method === "PUT" && url.pathname === "/api/games/snake-score") {
    try {
      const authed = await getAuthedUser(req);
      if (!authed) {
        sendJson(res, 401, { error: "Not signed in" });
        return;
      }

      const body = JSON.parse((await readBody(req)) || "{}");
      const highScore = await saveSnakeHighScore(authed.userId, body.score);
      sendJson(res, 200, { highScore });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/friend-requests") {
    try {
      const authed = await getAuthedUser(req);
      if (!authed) {
        sendJson(res, 401, { error: "Sign in before sending friend requests" });
        return;
      }

      const body = JSON.parse((await readBody(req)) || "{}");
      const targetHandle = handleFromFriendTarget(body.target || body.handle || body.targetName);
      if (!targetHandle) {
        sendJson(res, 400, { error: "Enter a valid profile handle or link" });
        return;
      }

      const senderProfile = await getProfileByOwner(authed.userId);
      if (!senderProfile?.handle) {
        sendJson(res, 400, { error: "Publish your profile before sending friend requests" });
        return;
      }

      if (senderProfile.handle === targetHandle) {
        sendJson(res, 400, { error: "You cannot send a friend request to yourself" });
        return;
      }

      const targetProfile = await getProfile(targetHandle);
      if (!targetProfile) {
        sendJson(res, 404, { error: "That profile was not found" });
        return;
      }

      const existingRequests = Array.isArray(targetProfile.friendRequests) ? targetProfile.friendRequests : [];
      let request = existingRequests.find((item) => item.fromHandle === senderProfile.handle);
      const alreadyRequested = Boolean(request);
      const alreadyFriends = (Array.isArray(targetProfile.friends) ? targetProfile.friends : []).some(
        (friend) => friend.handle === senderProfile.handle || friend.link === requestLinkFor(senderProfile.handle)
      );

      let senderChanged = false;
      if (alreadyFriends) {
        const sentRequests = Array.isArray(senderProfile.sentFriendRequests) ? senderProfile.sentFriendRequests : [];
        const nextSentRequests = sentRequests.filter((item) => item.targetHandle !== targetHandle);
        senderChanged = nextSentRequests.length !== sentRequests.length;
        senderProfile.sentFriendRequests = nextSentRequests;
      }

      if (!alreadyRequested && !alreadyFriends) {
        request = {
          id: crypto.randomUUID(),
          fromName: requestDisplayName(senderProfile),
          fromHandle: senderProfile.handle,
          fromLink: requestLinkFor(senderProfile.handle),
          createdAt: new Date().toISOString(),
        };
        targetProfile.friendRequests = [
          ...existingRequests,
          request,
        ].slice(-40);
        targetProfile.updatedAt = new Date().toISOString();
        await saveProfile(targetProfile);
      }

      if (!alreadyFriends && request) {
        const sentRequest = sentRequestFromTarget(targetProfile, request);
        const sentRequests = Array.isArray(senderProfile.sentFriendRequests) ? senderProfile.sentFriendRequests : [];
        const hasSentRequest = sentRequests.some((item) => item.targetHandle === targetHandle || item.id === request.id);
        if (!hasSentRequest && sentRequest) {
          senderProfile.sentFriendRequests = [...sentRequests, sentRequest].slice(-40);
          senderChanged = true;
        }
      }

      if (senderChanged) {
        senderProfile.updatedAt = new Date().toISOString();
        await saveProfile(senderProfile);
      }

      sendJson(res, 200, {
        targetHandle,
        status: alreadyFriends ? "friends" : "sent",
        sentFriendRequests: senderProfile.sentFriendRequests || [],
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname.startsWith("/api/friend-requests/") && url.pathname.endsWith("/accept")) {
    try {
      const authed = await getAuthedUser(req);
      if (!authed) {
        sendJson(res, 401, { error: "Sign in before accepting friend requests" });
        return;
      }

      const requestId = decodeURIComponent(url.pathname.split("/")[3] || "");
      const ownerProfile = await getProfileByOwner(authed.userId);
      if (!ownerProfile) {
        sendJson(res, 404, { error: "Publish your profile before accepting requests" });
        return;
      }

      const requests = Array.isArray(ownerProfile.friendRequests) ? ownerProfile.friendRequests : [];
      const request = requests.find((item) => String(item.id) === requestId);
      if (!request) {
        sendJson(res, 404, { error: "Friend request was not found" });
        return;
      }

      ownerProfile.friends = mergeFriend(ownerProfile.friends, friendFromRequest(request));
      ownerProfile.friendRequests = requests.filter((item) => String(item.id) !== requestId);
      ownerProfile.updatedAt = new Date().toISOString();
      await saveProfile(ownerProfile);

      const senderHandle = sanitizeHandle(request.fromHandle);
      const senderProfile = senderHandle ? await getProfile(senderHandle) : null;
      if (senderProfile) {
        senderProfile.friends = mergeFriend(senderProfile.friends, ownFriendFromProfile(ownerProfile));
        senderProfile.sentFriendRequests = (Array.isArray(senderProfile.sentFriendRequests) ? senderProfile.sentFriendRequests : []).filter(
          (item) => item.id !== request.id && item.targetHandle !== ownerProfile.handle
        );
        senderProfile.updatedAt = new Date().toISOString();
        await saveProfile(senderProfile);
      }

      sendJson(res, 200, {
        friends: ownerProfile.friends || [],
        friendRequests: ownerProfile.friendRequests || [],
        sentFriendRequests: ownerProfile.sentFriendRequests || [],
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/friends/")) {
    try {
      const authed = await getAuthedUser(req);
      if (!authed) {
        sendJson(res, 401, { error: "Sign in before removing friends" });
        return;
      }

      const friendKey = decodeURIComponent(url.pathname.split("/")[3] || "");
      const ownerProfile = await getProfileByOwner(authed.userId);
      if (!ownerProfile) {
        sendJson(res, 404, { error: "Publish your profile before removing friends" });
        return;
      }

      const currentFriends = Array.isArray(ownerProfile.friends) ? ownerProfile.friends : [];
      const removedFriend = currentFriends.find((friend) => friendMatchesKey(friend, friendKey));
      if (!removedFriend) {
        sendJson(res, 404, { error: "Friend was not found" });
        return;
      }

      ownerProfile.friends = currentFriends.filter((friend) => !friendMatchesKey(friend, friendKey));
      ownerProfile.updatedAt = new Date().toISOString();
      await saveProfile(ownerProfile);

      const removedHandle = sanitizeHandle(removedFriend.handle) || handleFromFriendTarget(removedFriend.link);
      const otherProfile = removedHandle ? await getProfile(removedHandle) : null;
      if (otherProfile) {
        const ownerHandle = sanitizeHandle(ownerProfile.handle);
        otherProfile.friends = (Array.isArray(otherProfile.friends) ? otherProfile.friends : []).filter(
          (friend) => !friendMatchesKey(friend, ownerHandle)
        );
        otherProfile.updatedAt = new Date().toISOString();
        await saveProfile(otherProfile);
      }

      sendJson(res, 200, {
        friends: ownerProfile.friends || [],
        friendRequests: ownerProfile.friendRequests || [],
        sentFriendRequests: ownerProfile.sentFriendRequests || [],
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/tribes") {
    try {
      const authed = await getAuthedUser(req);
      if (!authed) {
        sendJson(res, 401, { error: "Sign in before viewing tribes" });
        return;
      }

      const viewerProfile = await getProfileByOwner(authed.userId);
      if (!viewerProfile) {
        sendJson(res, 404, { error: "Publish your profile before using tribes" });
        return;
      }

      const state = await tribeStateFor(viewerProfile);
      const search = String(url.searchParams.get("search") || "").trim().toLowerCase();
      sendJson(res, 200, {
        ...state,
        tribes: search ? state.tribes.filter((tribe) => tribe.name.toLowerCase().includes(search)) : state.tribes,
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/tribes") {
    try {
      const authed = await getAuthedUser(req);
      if (!authed) {
        sendJson(res, 401, { error: "Sign in before creating tribes" });
        return;
      }

      const body = JSON.parse((await readBody(req)) || "{}");
      const ownerProfile = await getProfileByOwner(authed.userId);
      if (!ownerProfile?.handle) {
        sendJson(res, 400, { error: "Publish your profile before creating tribes" });
        return;
      }

      const name = sanitizeTribeName(body.name);
      if (!name) {
        sendJson(res, 400, { error: "Enter a tribe name" });
        return;
      }

      const now = new Date().toISOString();
      const tribeId = crypto.randomUUID();
      const tribe = normalizeTribe(
        {
          tribeId,
          name,
          ownerId: authed.userId,
          ownerDisplayName: requestDisplayName(ownerProfile),
          ownerHandle: ownerProfile.handle,
          memberIds: [authed.userId],
          pendingInviteIds: [],
          pendingJoinIds: [],
          themeColor: sanitizeThemeColor(body.themeColor),
          createdAt: now,
          updatedAt: now,
        },
        ownerProfile
      );

      const friendHandles = profileFriendHandles(ownerProfile);
      const inviteHandles = [...new Set((Array.isArray(body.inviteHandles) ? body.inviteHandles : []).map(sanitizeHandle).filter(Boolean))]
        .filter((handle) => handle !== ownerProfile.handle && friendHandles.has(handle))
        .slice(0, 24);

      for (const inviteHandle of inviteHandles) {
        const targetProfile = await getProfile(inviteHandle);
        if (!targetProfile?.ownerUserId || tribe.memberIds.includes(targetProfile.ownerUserId)) continue;
        if (!tribe.pendingInviteIds.includes(targetProfile.ownerUserId)) tribe.pendingInviteIds.push(targetProfile.ownerUserId);

        const currentInvites = Array.isArray(targetProfile.tribeInvites) ? targetProfile.tribeInvites : [];
        const hasInvite = currentInvites.some((invite) => invite.tribeId === tribeId && invite.ownerId === authed.userId);
        if (hasInvite) continue;

        targetProfile.tribeInvites = [
          ...currentInvites,
          {
            id: crypto.randomUUID(),
            tribeId,
            tribeName: tribe.name,
            ownerId: authed.userId,
            ownerDisplayName: requestDisplayName(ownerProfile),
            ownerHandle: ownerProfile.handle,
            createdAt: now,
          },
        ].slice(-40);
        targetProfile.updatedAt = now;
        await saveProfile(targetProfile);
      }

      ownerProfile.tribes = [...normalizeTribesForProfile(ownerProfile), tribe].slice(-50);
      ownerProfile.updatedAt = now;
      await saveProfile(ownerProfile);

      sendJson(res, 201, await tribeStateFor(ownerProfile));
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if ((req.method === "GET" || req.method === "POST") && url.pathname.startsWith("/api/tribes/") && url.pathname.endsWith("/messages")) {
    try {
      const authed = await getAuthedUser(req);
      if (!authed) {
        sendJson(res, 401, { error: "Sign in before opening tribe chats" });
        return;
      }

      const viewerProfile = await getProfileByOwner(authed.userId);
      if (!viewerProfile) {
        sendJson(res, 404, { error: "Publish your profile before opening tribe chats" });
        return;
      }

      const tribeId = decodeURIComponent(url.pathname.split("/")[3] || "");
      const found = await findTribeById(tribeId);
      if (!found) {
        sendJson(res, 404, { error: "Tribe was not found" });
        return;
      }

      const { ownerProfile, tribe, tribeIndex, tribes } = found;
      if (!canAccessTribe(tribe, authed.userId)) {
        sendJson(res, 403, { error: "Only tribe members can open this chat" });
        return;
      }

      if (req.method === "GET") {
        sendJson(res, 200, { messages: tribe.messages || [] });
        return;
      }

      const body = JSON.parse((await readBody(req)) || "{}");
      const text = sanitizeChatText(body.text);
      if (!text) {
        sendJson(res, 400, { error: "Write a message first" });
        return;
      }

      const now = new Date().toISOString();
      const message = {
        id: crypto.randomUUID(),
        senderId: authed.userId,
        senderDisplayName: requestDisplayName(viewerProfile),
        senderHandle: sanitizeHandle(viewerProfile.handle),
        text,
        createdAt: now,
      };

      tribe.messages = [...(Array.isArray(tribe.messages) ? tribe.messages : []), message].slice(-300);
      tribe.updatedAt = now;
      tribes[tribeIndex] = tribe;
      ownerProfile.tribes = tribes;
      ownerProfile.updatedAt = now;
      await saveProfile(ownerProfile);

      sendJson(res, 201, { messages: tribe.messages });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname.startsWith("/api/tribe-invites/")) {
    try {
      const authed = await getAuthedUser(req);
      if (!authed) {
        sendJson(res, 401, { error: "Sign in before answering tribe invites" });
        return;
      }

      const parts = url.pathname.split("/");
      const inviteId = decodeURIComponent(parts[3] || "");
      const action = parts[4] || "";
      if (!["accept", "decline"].includes(action)) {
        sendJson(res, 404, { error: "Not found" });
        return;
      }

      const viewerProfile = await getProfileByOwner(authed.userId);
      if (!viewerProfile) {
        sendJson(res, 404, { error: "Publish your profile before answering tribe invites" });
        return;
      }

      const invites = Array.isArray(viewerProfile.tribeInvites) ? viewerProfile.tribeInvites : [];
      const invite = invites.find((item) => String(item.id) === inviteId);
      if (!invite) {
        sendJson(res, 404, { error: "Tribe invite was not found" });
        return;
      }

      const found = await findTribeById(invite.tribeId);
      if (found) {
        const { ownerProfile, tribe, tribeIndex, tribes } = found;
        tribe.pendingInviteIds = tribe.pendingInviteIds.filter((id) => id !== authed.userId);
        if (action === "accept" && !tribe.memberIds.includes(authed.userId)) {
          tribe.memberIds.push(authed.userId);
        }
        tribe.updatedAt = new Date().toISOString();
        tribes[tribeIndex] = tribe;
        ownerProfile.tribes = tribes;
        ownerProfile.updatedAt = tribe.updatedAt;
        await saveProfile(ownerProfile);
      }

      viewerProfile.tribeInvites = invites.filter((item) => String(item.id) !== inviteId);
      viewerProfile.updatedAt = new Date().toISOString();
      await saveProfile(viewerProfile);

      sendJson(res, 200, await tribeStateFor(viewerProfile));
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname.startsWith("/api/tribes/") && url.pathname.endsWith("/join")) {
    try {
      const authed = await getAuthedUser(req);
      if (!authed) {
        sendJson(res, 401, { error: "Sign in before joining tribes" });
        return;
      }

      const requesterProfile = await getProfileByOwner(authed.userId);
      if (!requesterProfile?.handle) {
        sendJson(res, 400, { error: "Publish your profile before joining tribes" });
        return;
      }

      const tribeId = decodeURIComponent(url.pathname.split("/")[3] || "");
      const found = await findTribeById(tribeId);
      if (!found) {
        sendJson(res, 404, { error: "Tribe was not found" });
        return;
      }

      const { ownerProfile, tribe, tribeIndex, tribes } = found;
      if (tribe.ownerId === authed.userId || tribe.memberIds.includes(authed.userId)) {
        sendJson(res, 200, { ...(await tribeStateFor(requesterProfile)), status: "joined" });
        return;
      }

      if (!tribe.pendingJoinIds.includes(authed.userId)) {
        tribe.pendingJoinIds.push(authed.userId);
        tribe.updatedAt = new Date().toISOString();
        tribes[tribeIndex] = tribe;
        ownerProfile.tribes = tribes;

        const currentRequests = Array.isArray(ownerProfile.tribeJoinRequests) ? ownerProfile.tribeJoinRequests : [];
        const hasRequest = currentRequests.some((request) => request.tribeId === tribe.tribeId && request.requesterId === authed.userId);
        if (!hasRequest) {
          ownerProfile.tribeJoinRequests = [
            ...currentRequests,
            {
              id: crypto.randomUUID(),
              tribeId: tribe.tribeId,
              tribeName: tribe.name,
              requesterId: authed.userId,
              requesterDisplayName: requestDisplayName(requesterProfile),
              requesterHandle: requesterProfile.handle,
              createdAt: tribe.updatedAt,
            },
          ].slice(-40);
        }
        ownerProfile.updatedAt = tribe.updatedAt;
        await saveProfile(ownerProfile);
      }

      sendJson(res, 200, { ...(await tribeStateFor(requesterProfile)), status: "requested" });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname.startsWith("/api/tribes/") && url.pathname.endsWith("/members")) {
    try {
      const authed = await getAuthedUser(req);
      if (!authed) {
        sendJson(res, 401, { error: "Sign in before adding tribe members" });
        return;
      }

      const tribeId = decodeURIComponent(url.pathname.split("/")[3] || "");
      const body = JSON.parse((await readBody(req)) || "{}");
      const requestedIds = cleanIdList(body.memberIds || body.userIds);
      const requestedHandles = [
        ...new Set(cleanIdList(body.friendHandles || body.handles).map(sanitizeHandle).filter(Boolean)),
      ];
      if (!requestedIds.length && !requestedHandles.length) {
        sendJson(res, 400, { error: "Select at least one friend to add" });
        return;
      }

      const found = await findTribeById(tribeId);
      if (!found) {
        sendJson(res, 404, { error: "Tribe was not found" });
        return;
      }

      const { ownerProfile, tribe, tribeIndex, tribes } = found;
      if (tribe.ownerId !== authed.userId || ownerProfile.ownerUserId !== authed.userId) {
        sendJson(res, 403, { error: "Only the tribe owner can add members directly" });
        return;
      }

      const friendHandles = profileFriendHandles(ownerProfile);
      const profiles = await listProfiles();
      const profilesById = new Map(profiles.map((profile) => [String(profile.ownerUserId || ""), profile]));
      const profilesByHandle = new Map(profiles.map((profile) => [sanitizeHandle(profile.handle), profile]));
      const addedIds = [];

      const tryAddProfile = (profile) => {
        const memberId = String(profile?.ownerUserId || "");
        const handle = sanitizeHandle(profile?.handle);
        if (!memberId || memberId === authed.userId || !handle || !friendHandles.has(handle)) return;
        if (tribe.memberIds.includes(memberId) || addedIds.includes(memberId)) return;
        addedIds.push(memberId);
      };

      requestedHandles.forEach((handle) => tryAddProfile(profilesByHandle.get(handle)));
      requestedIds.forEach((memberId) => tryAddProfile(profilesById.get(String(memberId))));

      if (addedIds.length) {
        const now = new Date().toISOString();
        tribe.memberIds = cleanIdList([...tribe.memberIds, ...addedIds]);
        tribe.pendingInviteIds = tribe.pendingInviteIds.filter((id) => !addedIds.includes(id));
        tribe.pendingJoinIds = tribe.pendingJoinIds.filter((id) => !addedIds.includes(id));
        tribe.updatedAt = now;
        tribes[tribeIndex] = tribe;
        ownerProfile.tribes = tribes;
        ownerProfile.tribeJoinRequests = (Array.isArray(ownerProfile.tribeJoinRequests) ? ownerProfile.tribeJoinRequests : []).filter(
          (request) => request.tribeId !== tribe.tribeId || !addedIds.includes(request.requesterId)
        );
        ownerProfile.updatedAt = now;
        await saveProfile(ownerProfile);

        for (const memberId of addedIds) {
          const targetProfile = profilesById.get(memberId);
          if (!targetProfile) continue;
          const invites = Array.isArray(targetProfile.tribeInvites) ? targetProfile.tribeInvites : [];
          const nextInvites = invites.filter((invite) => invite.tribeId !== tribe.tribeId);
          if (nextInvites.length !== invites.length) {
            targetProfile.tribeInvites = nextInvites;
            targetProfile.updatedAt = now;
            await saveProfile(targetProfile);
          }
        }
      }

      sendJson(res, 200, {
        ...(await tribeStateFor(ownerProfile)),
        addedCount: addedIds.length,
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname.startsWith("/api/tribe-join-requests/")) {
    try {
      const authed = await getAuthedUser(req);
      if (!authed) {
        sendJson(res, 401, { error: "Sign in before answering tribe requests" });
        return;
      }

      const parts = url.pathname.split("/");
      const requestId = decodeURIComponent(parts[3] || "");
      const action = parts[4] || "";
      if (!["accept", "decline"].includes(action)) {
        sendJson(res, 404, { error: "Not found" });
        return;
      }

      const ownerProfile = await getProfileByOwner(authed.userId);
      if (!ownerProfile) {
        sendJson(res, 404, { error: "Publish your profile before answering tribe requests" });
        return;
      }

      const requests = Array.isArray(ownerProfile.tribeJoinRequests) ? ownerProfile.tribeJoinRequests : [];
      const request = requests.find((item) => String(item.id) === requestId);
      if (!request) {
        sendJson(res, 404, { error: "Tribe request was not found" });
        return;
      }

      const tribes = normalizeTribesForProfile(ownerProfile);
      const tribeIndex = tribes.findIndex((tribe) => tribe.tribeId === request.tribeId);
      if (tribeIndex >= 0) {
        const tribe = tribes[tribeIndex];
        tribe.pendingJoinIds = tribe.pendingJoinIds.filter((id) => id !== request.requesterId);
        if (action === "accept" && !tribe.memberIds.includes(request.requesterId)) {
          tribe.memberIds.push(request.requesterId);
        }
        tribe.updatedAt = new Date().toISOString();
        tribes[tribeIndex] = tribe;
        ownerProfile.tribes = tribes;
      }

      ownerProfile.tribeJoinRequests = requests.filter((item) => String(item.id) !== requestId);
      ownerProfile.updatedAt = new Date().toISOString();
      await saveProfile(ownerProfile);

      sendJson(res, 200, await tribeStateFor(ownerProfile));
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "PATCH" && url.pathname.startsWith("/api/tribes/")) {
    try {
      const authed = await getAuthedUser(req);
      if (!authed) {
        sendJson(res, 401, { error: "Sign in before editing tribes" });
        return;
      }

      const tribeId = decodeURIComponent(url.pathname.split("/")[3] || "");
      const body = JSON.parse((await readBody(req)) || "{}");
      const ownerProfile = await getProfileByOwner(authed.userId);
      if (!ownerProfile) {
        sendJson(res, 404, { error: "Publish your profile before editing tribes" });
        return;
      }

      const tribes = normalizeTribesForProfile(ownerProfile);
      const tribeIndex = tribes.findIndex((tribe) => tribe.tribeId === tribeId && tribe.ownerId === authed.userId);
      if (tribeIndex < 0) {
        sendJson(res, 403, { error: "Only the tribe owner can edit this tribe" });
        return;
      }

      const tribe = tribes[tribeIndex];
      const nextName = sanitizeTribeName(body.name);
      if (!nextName) {
        sendJson(res, 400, { error: "Enter a tribe name" });
        return;
      }

      tribe.name = nextName;
      tribe.themeColor = sanitizeThemeColor(body.themeColor);
      tribe.updatedAt = new Date().toISOString();
      tribes[tribeIndex] = tribe;
      ownerProfile.tribes = tribes;
      ownerProfile.tribeJoinRequests = (Array.isArray(ownerProfile.tribeJoinRequests) ? ownerProfile.tribeJoinRequests : []).map((request) =>
        request.tribeId === tribe.tribeId ? { ...request, tribeName: tribe.name } : request
      );
      ownerProfile.updatedAt = tribe.updatedAt;
      await saveProfile(ownerProfile);

      sendJson(res, 200, await tribeStateFor(ownerProfile));
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/tribes/") && url.pathname.includes("/members/")) {
    try {
      const authed = await getAuthedUser(req);
      if (!authed) {
        sendJson(res, 401, { error: "Sign in before removing tribe members" });
        return;
      }

      const parts = url.pathname.split("/");
      const tribeId = decodeURIComponent(parts[3] || "");
      const memberId = decodeURIComponent(parts[5] || "");
      const ownerProfile = await getProfileByOwner(authed.userId);
      if (!ownerProfile) {
        sendJson(res, 404, { error: "Publish your profile before managing tribes" });
        return;
      }

      const tribes = normalizeTribesForProfile(ownerProfile);
      const tribeIndex = tribes.findIndex((tribe) => tribe.tribeId === tribeId && tribe.ownerId === authed.userId);
      if (tribeIndex < 0) {
        sendJson(res, 403, { error: "Only the tribe owner can remove members" });
        return;
      }

      const tribe = tribes[tribeIndex];
      if (!memberId || memberId === tribe.ownerId) {
        sendJson(res, 400, { error: "The tribe owner cannot be removed" });
        return;
      }

      tribe.memberIds = tribe.memberIds.filter((id) => id !== memberId);
      tribe.updatedAt = new Date().toISOString();
      tribes[tribeIndex] = tribe;
      ownerProfile.tribes = tribes;
      ownerProfile.updatedAt = tribe.updatedAt;
      await saveProfile(ownerProfile);

      sendJson(res, 200, await tribeStateFor(ownerProfile));
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/tribes/")) {
    try {
      const authed = await getAuthedUser(req);
      if (!authed) {
        sendJson(res, 401, { error: "Sign in before deleting tribes" });
        return;
      }

      const tribeId = decodeURIComponent(url.pathname.split("/")[3] || "");
      const ownerProfile = await getProfileByOwner(authed.userId);
      if (!ownerProfile) {
        sendJson(res, 404, { error: "Publish your profile before deleting tribes" });
        return;
      }

      const tribes = normalizeTribesForProfile(ownerProfile);
      const tribe = tribes.find((item) => item.tribeId === tribeId && item.ownerId === authed.userId);
      if (!tribe) {
        sendJson(res, 403, { error: "Only the tribe owner can delete this tribe" });
        return;
      }

      ownerProfile.tribes = tribes.filter((item) => item.tribeId !== tribeId);
      ownerProfile.tribeJoinRequests = (Array.isArray(ownerProfile.tribeJoinRequests) ? ownerProfile.tribeJoinRequests : []).filter(
        (request) => request.tribeId !== tribeId
      );
      ownerProfile.updatedAt = new Date().toISOString();
      await saveProfile(ownerProfile);

      const profiles = await listProfiles();
      for (const profile of profiles) {
        if (profile.ownerUserId === ownerProfile.ownerUserId) continue;
        const invites = Array.isArray(profile.tribeInvites) ? profile.tribeInvites : [];
        const nextInvites = invites.filter((invite) => invite.tribeId !== tribeId);
        if (nextInvites.length !== invites.length) {
          profile.tribeInvites = nextInvites;
          profile.updatedAt = new Date().toISOString();
          await saveProfile(profile);
        }
      }

      sendJson(res, 200, await tribeStateFor(ownerProfile));
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
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
    const publicProfile = publicProfilePayload(profile);
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
        friends: existingProfile ? existingProfile.friends || [] : Array.isArray(incoming.friends) ? incoming.friends : [],
        friendRequests: existingProfile ? existingProfile.friendRequests || [] : [],
        sentFriendRequests: existingProfile ? existingProfile.sentFriendRequests || [] : [],
        adminNotifications: existingProfile ? existingProfile.adminNotifications || [] : [],
        tribes: existingProfile ? existingProfile.tribes || [] : Array.isArray(incoming.tribes) ? incoming.tribes : [],
        tribeInvites: existingProfile ? existingProfile.tribeInvites || [] : [],
        tribeJoinRequests: existingProfile ? existingProfile.tribeJoinRequests || [] : [],
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

  if (req.method === "GET" && (url.pathname.startsWith("/u/") || url.pathname === "/reset-password")) {
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
