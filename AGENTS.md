# slapz.lol Codex Agent Guide

## Project Overview

slapz.lol is a dark neon glassmorphism public profile platform built around creator-style bio pages, profile media, music, friends/slappers, tribes, tribe chats, mini-games, leaderboards, mobile responsive UI, and an owner/admin panel.

The app uses a Node.js backend with local JSON fallback storage and optional Supabase support.

## General Coding Rules

- Make minimal safe changes.
- Reuse existing components, styles, APIs, state, and storage patterns.
- Preserve the dark neon/glass/star visual theme.
- Keep desktop, tablet, and mobile layouts working.
- Do not break auth, dashboard, Bio, public profile routes, Settings, Slappers/Friends, Tribes, Tribe Chats, Games, Leaderboards, or Owner/Admin panel.
- Do not expose secrets, tokens, password hashes, private emails, admin data, or private user data.
- Enforce permissions on the backend when security or ownership matters.
- Keep changes scoped to the requested task.
- Include a practical way to test every change.

## Response Format

All specialist agents should return only:

1. Files changed
2. Summary
3. How to test
4. Assumptions

## Specialist Agent Files

Specialist agent instructions live in the `agents/` folder:

- `agents/product-manager-agent.md`
- `agents/frontend-ui-agent.md`
- `agents/backend-api-agent.md`
- `agents/security-agent.md`
- `agents/mobile-agent.md`
- `agents/qa-agent.md`
- `agents/games-agent.md`
- `agents/tribes-agent.md`
- `agents/brand-agent.md`
- `agents/devops-agent.md`

## How To Use An Agent

Ask Codex to use one or more agent files in your prompt.

Examples:

```text
Use agents/frontend-ui-agent.md to fix the mobile sidebar layout.
```

```text
Use agents/security-agent.md and agents/backend-api-agent.md to review the owner panel permissions.
```

```text
Use agents/product-manager-agent.md to turn this idea into clear requirements.
```

Recommended workflow:

Product Manager -> Frontend/Backend -> Security -> Mobile -> QA -> DevOps

