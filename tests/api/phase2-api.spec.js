const { expect, test } = require("@playwright/test");

function uniqueUser(testInfo, label) {
  const id = `${Date.now().toString(36)}${testInfo.workerIndex}${Math.random().toString(36).slice(2, 8)}`;
  const handle = `${label}_${id}`.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 24);
  return {
    email: `${label}-${id}@example.com`,
    password: "TestPass123!",
    handle,
    name: `${label} User`,
  };
}

const authHeaders = (token) => ({ Authorization: `Bearer ${token}` });

async function json(response, expectedStatus) {
  expect(response.status()).toBe(expectedStatus);
  return response.json();
}

async function signUp(request, testInfo, label) {
  const user = uniqueUser(testInfo, label);
  const signup = await json(
    await request.post("/api/signup", {
      data: { email: user.email, password: user.password },
    }),
    201
  );
  const me = await json(await request.get("/api/me", { headers: authHeaders(signup.token) }), 200);
  return { ...user, token: signup.token, userId: me.userId };
}

async function publishProfile(request, user, overrides = {}) {
  const payload = {
    name: user.name,
    handle: user.handle,
    bio: `${user.name} automated API profile.`,
    location: "API Test Lab",
    theme: "black",
    socialLinks: {},
    friends: [],
    friendRequests: [],
    sentFriendRequests: [],
    ...overrides,
  };

  const published = await json(
    await request.put(`/api/profiles/${user.handle}`, {
      headers: authHeaders(user.token),
      data: payload,
    }),
    200
  );

  expect(published.handle).toBe(user.handle);
  expect(published.url).toBe(`/u/${user.handle}`);
  return published;
}

async function getMyProfile(request, user) {
  return json(await request.get("/api/my-profile", { headers: authHeaders(user.token) }), 200);
}

async function sendFriendRequest(request, sender, targetHandle) {
  return json(
    await request.post("/api/friend-requests", {
      headers: authHeaders(sender.token),
      data: { target: targetHandle },
    }),
    200
  );
}

async function acceptFirstFriendRequest(request, receiver) {
  const receiverProfile = await getMyProfile(request, receiver);
  expect(receiverProfile.friendRequests.length).toBeGreaterThan(0);
  const friendRequest = receiverProfile.friendRequests[0];
  return json(
    await request.post(`/api/friend-requests/${friendRequest.id}/accept`, {
      headers: authHeaders(receiver.token),
    }),
    200
  );
}

async function makeFriends(request, sender, receiver) {
  const result = await sendFriendRequest(request, sender, receiver.handle);
  expect(result.status).toBe("sent");
  await acceptFirstFriendRequest(request, receiver);
}

function findTribe(state, name) {
  return state.tribes.find((tribe) => tribe.name === name);
}

test("auth and profile APIs protect private routes and publish public profiles", async ({ request }, testInfo) => {
  await json(await request.get("/api/me"), 401);

  const user = await signUp(request, testInfo, "auth");

  await json(
    await request.post("/api/signup", {
      data: { email: user.email, password: user.password },
    }),
    409
  );

  await json(
    await request.post("/api/login", {
      data: { email: user.email, password: "wrong-password" },
    }),
    401
  );

  const login = await json(
    await request.post("/api/login", {
      data: { email: user.email, password: user.password },
    }),
    200
  );
  expect(login.token).toBeTruthy();

  const onboarding = await json(
    await request.patch("/api/me/onboarding", {
      headers: authHeaders(user.token),
      data: { action: "skip" },
    }),
    200
  );
  expect(onboarding.onboardingSkipped).toBe(true);

  await json(await request.get("/api/my-profile", { headers: authHeaders(user.token) }), 404);
  await json(
    await request.put(`/api/profiles/${user.handle}`, {
      data: { handle: user.handle, name: user.name },
    }),
    401
  );

  await publishProfile(request, user);

  const publicProfile = await json(await request.get(`/api/profiles/${user.handle}`), 200);
  expect(publicProfile.name).toBe(user.name);
  expect(publicProfile.handle).toBe(user.handle);

  const me = await json(await request.get("/api/me", { headers: authHeaders(user.token) }), 200);
  expect(me.profileHandle).toBe(user.handle);
  expect(me.needsOnboarding).toBe(false);
});

test("friend request APIs send, accept, and remove friends", async ({ request }, testInfo) => {
  const sender = await signUp(request, testInfo, "frienda");
  const receiver = await signUp(request, testInfo, "friendb");
  await publishProfile(request, sender);
  await publishProfile(request, receiver);

  const sent = await sendFriendRequest(request, sender, receiver.handle);
  expect(sent.targetHandle).toBe(receiver.handle);
  expect(sent.status).toBe("sent");

  const receiverBeforeAccept = await getMyProfile(request, receiver);
  expect(receiverBeforeAccept.friendRequests).toHaveLength(1);
  expect(receiverBeforeAccept.friendRequests[0].fromHandle).toBe(sender.handle);

  const accepted = await acceptFirstFriendRequest(request, receiver);
  expect(accepted.friends.some((friend) => friend.handle === sender.handle)).toBe(true);
  expect(accepted.friendRequests).toHaveLength(0);

  const senderAfterAccept = await getMyProfile(request, sender);
  expect(senderAfterAccept.friends.some((friend) => friend.handle === receiver.handle)).toBe(true);
  expect(senderAfterAccept.sentFriendRequests).toHaveLength(0);

  const removed = await json(
    await request.delete(`/api/friends/${sender.handle}`, {
      headers: authHeaders(receiver.token),
    }),
    200
  );
  expect(removed.friends.some((friend) => friend.handle === sender.handle)).toBe(false);

  const senderAfterRemove = await getMyProfile(request, sender);
  expect(senderAfterRemove.friends.some((friend) => friend.handle === receiver.handle)).toBe(false);
});

test("tribe APIs enforce membership, owner controls, and tribe chat scope", async ({ request }, testInfo) => {
  const owner = await signUp(request, testInfo, "owner");
  const member = await signUp(request, testInfo, "member");
  const outsider = await signUp(request, testInfo, "outside");
  await publishProfile(request, owner);
  await publishProfile(request, member);
  await publishProfile(request, outsider);

  const tribeName = `API Tribe ${Date.now().toString(36)}`;
  const createState = await json(
    await request.post("/api/tribes", {
      headers: authHeaders(owner.token),
      data: { name: tribeName, themeColor: "#66aaff" },
    }),
    201
  );
  const tribe = findTribe(createState, tribeName);
  expect(tribe).toBeTruthy();
  expect(tribe.isOwner).toBe(true);
  expect(tribe.members.some((item) => item.userId === owner.userId)).toBe(true);

  await json(
    await request.get(`/api/tribes/${tribe.tribeId}/messages`, {
      headers: authHeaders(outsider.token),
    }),
    403
  );

  const joinState = await json(
    await request.post(`/api/tribes/${tribe.tribeId}/join`, {
      headers: authHeaders(member.token),
    }),
    200
  );
  expect(joinState.status).toBe("requested");

  const ownerTribeState = await json(
    await request.get("/api/tribes", {
      headers: authHeaders(owner.token),
    }),
    200
  );
  const joinRequest = ownerTribeState.tribeJoinRequests.find((item) => item.requesterHandle === member.handle);
  expect(joinRequest).toBeTruthy();

  const acceptedJoin = await json(
    await request.post(`/api/tribe-join-requests/${joinRequest.id}/accept`, {
      headers: authHeaders(owner.token),
    }),
    200
  );
  const joinedTribe = acceptedJoin.tribes.find((item) => item.tribeId === tribe.tribeId);
  expect(joinedTribe.members.some((item) => item.userId === member.userId)).toBe(true);

  const messageText = `Hello from API ${Date.now()}`;
  const messageState = await json(
    await request.post(`/api/tribes/${tribe.tribeId}/messages`, {
      headers: authHeaders(member.token),
      data: { text: messageText },
    }),
    201
  );
  const lastMessage = messageState.messages.at(-1);
  expect(lastMessage.text).toBe(messageText);
  expect(lastMessage.senderHandle).toBe(member.handle);
  expect(lastMessage.createdAt).toBeTruthy();

  const ownerMessages = await json(
    await request.get(`/api/tribes/${tribe.tribeId}/messages`, {
      headers: authHeaders(owner.token),
    }),
    200
  );
  expect(ownerMessages.messages.some((message) => message.text === messageText)).toBe(true);

  await json(
    await request.patch(`/api/tribes/${tribe.tribeId}`, {
      headers: authHeaders(member.token),
      data: { name: "Member Rename Attempt", themeColor: "#ffffff" },
    }),
    403
  );

  const renamedState = await json(
    await request.patch(`/api/tribes/${tribe.tribeId}`, {
      headers: authHeaders(owner.token),
      data: { name: "Renamed API Tribe", themeColor: "#ff66aa" },
    }),
    200
  );
  expect(renamedState.tribes.find((item) => item.tribeId === tribe.tribeId).name).toBe("Renamed API Tribe");

  await makeFriends(request, owner, outsider);

  await json(
    await request.post(`/api/tribes/${tribe.tribeId}/members`, {
      headers: authHeaders(member.token),
      data: { friendHandles: [outsider.handle] },
    }),
    403
  );

  const addMemberState = await json(
    await request.post(`/api/tribes/${tribe.tribeId}/members`, {
      headers: authHeaders(owner.token),
      data: { friendHandles: [outsider.handle] },
    }),
    200
  );
  expect(addMemberState.addedCount).toBe(1);
  expect(addMemberState.tribes.find((item) => item.tribeId === tribe.tribeId).members.some((item) => item.userId === outsider.userId)).toBe(true);

  await json(
    await request.get(`/api/tribes/${tribe.tribeId}/messages`, {
      headers: authHeaders(outsider.token),
    }),
    200
  );

  const removedMemberState = await json(
    await request.delete(`/api/tribes/${tribe.tribeId}/members/${outsider.userId}`, {
      headers: authHeaders(owner.token),
    }),
    200
  );
  expect(removedMemberState.tribes.find((item) => item.tribeId === tribe.tribeId).members.some((item) => item.userId === outsider.userId)).toBe(false);

  await json(
    await request.get(`/api/tribes/${tribe.tribeId}/messages`, {
      headers: authHeaders(outsider.token),
    }),
    403
  );

  await json(
    await request.delete(`/api/tribes/${tribe.tribeId}`, {
      headers: authHeaders(owner.token),
    }),
    200
  );

  await json(
    await request.get(`/api/tribes/${tribe.tribeId}/messages`, {
      headers: authHeaders(member.token),
    }),
    404
  );
});

test("game score API keeps the highest snake score", async ({ request }, testInfo) => {
  const user = await signUp(request, testInfo, "score");

  const initialScore = await json(
    await request.get("/api/games/snake-score", {
      headers: authHeaders(user.token),
    }),
    200
  );
  expect(initialScore.highScore).toBe(0);

  const savedScore = await json(
    await request.put("/api/games/snake-score", {
      headers: authHeaders(user.token),
      data: { score: 42 },
    }),
    200
  );
  expect(savedScore.highScore).toBe(42);

  const lowerScore = await json(
    await request.put("/api/games/snake-score", {
      headers: authHeaders(user.token),
      data: { score: 7 },
    }),
    200
  );
  expect(lowerScore.highScore).toBe(42);
});
