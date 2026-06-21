# fun.lol

fun.lol is a customizable public profile platform. Users can sign up, build a public bio page, upload profile media, play background music, add friends, join tribes, chat with tribe members, and play mini-games from a private dashboard.

## Features

- Email/password signup and login
- Forgot password and reset password flow
- Public profile pages at `/u/:handle`
- Editable bio, handle, location, avatar, social links, theme, cursor, sparkle effects, background image/video, and music
- Profile view counts
- Private dashboard with Bio, Games, Tribes, and Settings sections
- Friends, friend requests, notifications, and auto-refreshing friend state
- Tribes with invites, join requests, owner controls, member management, and tribe chats
- Mini-games including Snake, Click Rush, Wordle, and Crossy Road-style gameplay
- Optional Supabase database/storage support
- Local JSON fallback for development
- Render-friendly Node.js hosting

## Tech Stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js HTTP server
- Local storage: JSON files in `data/`
- Optional production database: Supabase
- Optional media storage: Supabase Storage bucket `profile-media`
- Optional email providers: Resend or SendGrid

## Project Structure

```text
.
|-- index.html              # Main app, landing page, auth UI, dashboard UI
|-- styles.css              # Dark glass UI, responsive layout, animations
|-- script.js               # Frontend app logic
|-- server.js               # Node API/server
|-- supabase-schema.sql     # Supabase tables and indexes
|-- words-5.txt             # Wordle word list
|-- google8bc067013314ffaf.html
`-- data/                   # Local JSON data fallback
```

## Local Development

Install Node.js, then run:

```powershell
npm.cmd start
```

The app starts at:

```text
http://localhost:4174
```

No build step is required.

## Automated Phase 1 Smoke Tests

Phase 1 uses Playwright to test the core user journey:

- Landing page loads
- Login form opens
- New user signup works
- Onboarding Skip works
- Bio publishing works
- Public `/u/:handle` profile opens
- Mobile landing/auth screens do not overflow horizontally

Install the test dependency and browser once:

```powershell
npm install
npx playwright install chromium
```

Run the Phase 1 suite:

```powershell
npm run test:phase1
```

The tests start `server.js` automatically on port `4181` and use `.test-data/` so your real local `data/` files are not changed.

## Automated Phase 2 API Tests

Phase 2 tests the backend routes directly:

- Auth and duplicate-email handling
- Private route protection
- Profile publishing and public profile loading
- Onboarding status API
- Friend request send, accept, and remove flows
- Tribe create, join request, owner approval, owner rename, direct add member, remove member, and delete flows
- Tribe chat membership checks and timestamped message creation
- Snake high score saving

Run Phase 2:

```powershell
npm run test:phase2
```

On Windows PowerShell, use `npm.cmd` if script execution is blocked:

```powershell
npm.cmd run test:phase2
```

## Automated Phase 3 Responsive Visual Tests

Phase 3 captures screenshot baselines for the main responsive surfaces:

- Landing page
- Auth screen
- Dashboard home
- Bio editor
- Public profile

The suite runs at:

- `390px` mobile
- `768px` tablet
- `1440px` desktop

Create or refresh the approved visual baselines:

```powershell
npm run test:phase3:update
```

Compare the current UI against those baselines:

```powershell
npm run test:phase3
```

On Windows PowerShell, use:

```powershell
npm.cmd run test:phase3:update
npm.cmd run test:phase3
```

## Environment Variables

These are optional for local development, but needed for production features.

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | Server port. Render sets this automatically. |
| `SUPABASE_URL` | No | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Supabase service role key for server-side database/storage access. |
| `RESEND_API_KEY` | No | Resend API key for password reset emails. |
| `SENDGRID_API_KEY` | No | SendGrid API key for password reset emails. |
| `PASSWORD_RESET_FROM` | For email | Verified sender email, for example `fun.lol <noreply@yourdomain.com>`. |
| `EMAIL_FROM` | Alternative | Used if `PASSWORD_RESET_FROM` is not set. |

## Supabase Setup

If using Supabase, open the Supabase SQL Editor and run:

```text
supabase-schema.sql
```

This creates the app user, session, profile, password reset, and profile lookup tables/views.

The server also uses a private Supabase Storage bucket named:

```text
profile-media
```

The bucket is created automatically when media upload is used, as long as the Supabase service role key is configured.

## Forgot Password Emails

Password reset tokens are:

- Randomly generated
- Stored only as SHA-256 hashes
- Valid for 30 minutes
- Single-use
- Removed from active use after password reset

For local development, reset links are logged to the server console:

```text
[dev password reset] user@example.com: http://localhost:4174/reset-password?token=...
```

For production, configure either Resend or SendGrid.

Example Resend config on Render:

```text
RESEND_API_KEY=your_resend_api_key
PASSWORD_RESET_FROM=fun.lol <noreply@yourverifieddomain.com>
```

The `PASSWORD_RESET_FROM` address must be verified in your email provider.

## Render Deployment

Recommended Render settings:

```text
Build Command: npm install
Start Command: npm start
```

Add environment variables in Render under:

```text
Service > Environment
```

After changing environment variables, redeploy the service.

## Git Push Commands

From PowerShell:

```powershell
cd "C:\Users\yuvaa\Documents\Codex\2026-05-19\help-me-code-a-website-like"
git status
git add README.md index.html server.js
git commit -m "Add project README"
git push
```

## Notes

- Do not commit real API keys or secrets.
- Local files in `data/` are for development fallback data.
- Public profiles are viewable by anyone with the `/u/:handle` link.
- Private dashboard actions require login.
