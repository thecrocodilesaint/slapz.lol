# slapz.lol Specialist Agents

This folder contains reusable specialist instructions for Codex. Use them when you want Codex to act like a focused expert for a specific kind of slapz.lol work.

## Available Agents

| Agent | Use For |
| --- | --- |
| `product-manager-agent.md` | Feature specs, user stories, acceptance criteria, edge cases, roadmap planning |
| `frontend-ui-agent.md` | Dashboard, Bio editor, public profile, buttons, cards, dropdowns, layout, animations |
| `backend-api-agent.md` | Node.js APIs, auth, sessions, profiles, persistence, validation |
| `security-agent.md` | Admin protection, authorization, data leaks, sessions, uploads, privacy |
| `mobile-agent.md` | Phone/tablet layouts, no horizontal scroll, mobile sidebar, mobile games |
| `qa-agent.md` | Test plans, regression checks, bug reproduction, release validation |
| `games-agent.md` | Snake, Click Rush, Wordle, Crossy Road-style game, scores, leaderboards |
| `tribes-agent.md` | Slappers/Friends, tribes, invites, join requests, member management, tribe chats |
| `brand-agent.md` | Tone, logo usage, landing copy, onboarding copy, badge names, empty states |
| `devops-agent.md` | Render, Supabase, storage, domains, SSL, env vars, logs, backups |

## Recommended Workflow

For a bigger feature, use agents in this order:

1. Product Manager
2. Frontend UI and/or Backend API
3. Security
4. Mobile
5. QA
6. DevOps

## Example Prompts

Product requirements:

```text
Use agents/product-manager-agent.md to write a spec for profile badges.
```

Frontend UI:

```text
Use agents/frontend-ui-agent.md to fix the Settings controls so they do not overlap.
```

Backend API:

```text
Use agents/backend-api-agent.md to add an endpoint for saving profile privacy.
```

Security:

```text
Use agents/security-agent.md to audit the owner panel permissions.
```

Mobile:

```text
Use agents/mobile-agent.md to make the Bio editor work on 390px screens.
```

QA:

```text
Use agents/qa-agent.md to create a test checklist for password reset.
```

Games:

```text
Use agents/games-agent.md to fix Crossy Road difficulty scaling.
```

Tribes:

```text
Use agents/tribes-agent.md to improve tribe join request approvals.
```

Brand:

```text
Use agents/brand-agent.md to rewrite onboarding copy in a slapz.lol voice.
```

DevOps:

```text
Use agents/devops-agent.md to check the Render and Supabase setup.
```

## Standard Output Format

Each agent should return only:

1. Files changed
2. Summary
3. How to test
4. Assumptions

