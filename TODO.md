# Eventas — build milestones

Status: **complete locally**. Deployment intentionally skipped per project owner request.

## M0 — Foundations ✅
- [x] Next.js 16 + React 19 + TypeScript strict, Tailwind 4
- [x] ESLint, Prettier, Vitest, Testing Library, jest-axe, Playwright
- [x] `.env.example`; `.env.local` untracked; no secrets in source
- [x] Groq key verified against the live models endpoint
- [x] Git repository initialized on `main`

## M1 — Design system + shell ✅
- [x] Bone/ink/clay/sage/gold tokens, Fraunces + Inter, focus rings
- [x] Accessible UI primitives: buttons, cards, fields, badges, progress ring
- [x] Responsive app shell, skip link, mobile navigation, reduced motion
- [x] Editorial landing page with three event paths and live preview

## M2 — Domain packs + engine ✅
- [x] Shared `DomainPack` contract with wedding, birthday, community packs
- [x] Exact budget allocator with priorities, guest scaling, cost index, floors, contingency
- [x] Relative timeline generator with overdue handling, leap-day safety
- [x] Vendor checklists, idea builder, plan assembly
- [x] Pack-invariant, budget, timeline, and edge-case tests

## M3 — Onboarding ✅
- [x] Five-step wizard with event-type-aware copy and options
- [x] Live budget/countdown/per-guest preview
- [x] Validation, error summary, focus management, draft restore
- [x] Three sample briefs, one per event type

## M4 — Overview + budget ✅
- [x] Countdown, budget health, next three moves, AI insight card
- [x] Accessible allocation chart and editable budget table
- [x] Actual-spend tracking, overspend warnings, reset to suggested
- [x] Validated AI rebalance proposal with explicit Apply/Cancel
- [x] Markdown export

## M5 — Timeline + vendors ✅
- [x] Phase-grouped tasks, status controls, filters, add-task form
- [x] Vendor pipeline, quotes, notes, budget-fit warnings
- [x] Category-specific questions, red flags, copy-to-clipboard
- [x] Mobile layout verified at 390 px

## M6 — AI + ideas ✅
- [x] Server-only Groq adapter with JSON mode and streaming
- [x] Zod validation of every AI response, deterministic fallback
- [x] Response cache, per-IP + daily rate limits, timeouts, abort handling
- [x] Prompt-injection boundaries for plan data and user goals
- [x] Six personalized idea cards with save/hide
- [x] Streaming assistant with quick prompts, stop, safe Markdown, `aria-live`
- [x] Full Demo mode without a key

## M7 — Hardening ✅
- [x] CSP and security headers
- [x] Error boundary, 404, loading states, empty states
- [x] No raw HTML, no dynamic `innerHTML`, schema-validated local storage
- [x] axe audit on landing, onboarding, dashboard, assistant
- [x] AA contrast fixes, 44 px targets, keyboard flow, reduced motion

## M8 — Tests + CI ✅
- [x] 56 Vitest tests; 90% statement / 93% line coverage on `lib/`
- [x] Coverage thresholds enforced (85% statements/lines/functions)
- [x] API tests for 200/400/429 and safe fallback
- [x] 5 Playwright journeys including persistence, wizard, assistant, axe
- [x] GitHub Actions CI for lint, typecheck, coverage, build, and e2e

## M9 — Documentation + submission prep ✅ (deployment skipped)
- [x] README: vertical, approach/logic, architecture, assumptions, testing, security, accessibility, evaluation map
- [x] `npm run verify` passes locally
- [x] `.env.local` ignored; `.env.example` committed
- [x] Repository size checked before commit
- [ ] **Owner action:** create the public GitHub repository and push `main`
- [ ] **Owner action:** confirm the repository has exactly one branch
- [ ] **Owner action:** rotate the Groq key shared in chat after submission

## Deliberately out of scope
- Real vendor marketplace, availability, or booking
- Payments, authentication, cloud sync, uploads
- Vercel or any hosted deployment (per request)
