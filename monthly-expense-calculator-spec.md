# Monthly Expense Calculator — Complete Build & Design Specification

Single source of truth for building this app end-to-end: architecture, data, API, and a premium,
production-grade UI system. Follow it exactly. Where something is genuinely not covered, stop and
ask — do not assume.

---

## PART A — ARCHITECTURE & DATA

### A.1 Non-Negotiable Rules

1. No new library, pattern, or architectural decision outside this document without asking first.
2. No silent change to a data model field name, type, or API route shape.
3. All money is stored as an **integer in paisa** (PKR × 100). Never `float`/`double` for currency.
4. All timestamps are `timestamptz`, stored in **UTC**. Conversion to Pakistan Standard Time
   (UTC+5, fixed, no DST) happens only at the presentation layer.
5. A "month" is a **user-controlled billing cycle**, not a calendar month — it starts when the
   previous one is explicitly ended. Never assume calendar-month boundaries.
6. All authoritative totals (budget, used, remaining) are computed **server-side**. Clients display,
   never independently recompute.

### A.2 Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Backend | NestJS | TypeScript |
| ORM | Prisma | PostgreSQL provider |
| Database | PostgreSQL on Neon | Pooled URL for app, direct URL for migrations |
| Web | React JS (Vite SPA) | Not Next.js |
| Mobile | React Native via Expo (managed), EAS Build | |
| API style | REST (JSON) | No GraphQL/tRPC |
| Auth | `@nestjs/passport` + `passport-jwt` | Access token 15 min, Refresh token 30 days (httpOnly cookie on web, SecureStore on mobile) |
| Password hashing | bcrypt, 10 salt rounds | |
| State/data | Redux Toolkit + RTK Query | Shared via `packages/api-client` |
| Offline (mobile only) | WatermelonDB (SQLite) | Web is online-only, no offline layer |
| Styling — web | Tailwind CSS + shadcn/ui | |
| Styling — mobile | NativeWind | |
| Icons | `lucide-react` (web), `lucide-react-native` (mobile) | |
| Fonts | Inter (web, self-hosted woff2), system font (mobile, keeps APK small) | |
| Monorepo | Turborepo + npm workspaces | |
| Validation | Zod in `packages/validation`, shared by backend + frontend | |
| Email | Brevo API, custom version-controlled HTML templates | |
| Error monitoring | Sentry (node/react/expo) | |
| Backend hosting | Render (free tier) | |
| Web hosting | Vercel | |
| Mobile distribution | Direct APK via `eas build --profile preview` | Play Store possible later, same project |

### A.3 Monorepo Structure

```
expense-tracker/
├── apps/
│   ├── web/                    # React JS (Vite), Vercel
│   ├── mobile/                 # React Native + Expo
│   └── api/                    # NestJS backend, Render
├── packages/
│   ├── database/                # Prisma schema + client (@repo/database)
│   ├── shared-types/             # TS interfaces (@repo/shared-types)
│   ├── validation/               # Zod schemas (@repo/validation)
│   ├── api-client/               # RTK Query base + endpoints (@repo/api-client)
│   └── config/                   # ESLint, TS, Tailwind preset (@repo/config)
├── turbo.json
├── package.json
├── .env.example
└── README.md
```

`apps/web` and `apps/mobile` always call the backend through `@repo/api-client` — never hand-written
`fetch`/`axios` calls. `packages/validation` is the single definition of every request/response shape.

### A.4 Environment Variables

**`apps/api/.env`**
```
DATABASE_URL=              # Neon pooled connection string
DIRECT_URL=                # Neon direct connection string — required by Prisma for migrations,
                            # since the pooled connection can break schema-change operations
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
SENTRY_DSN_API=             # from a Sentry.io project created for the backend
CORS_ORIGIN_WEB=            # your Vercel URL
```

**`apps/web/.env`**
```
VITE_API_BASE_URL=
VITE_SENTRY_DSN_WEB=        # from a separate Sentry.io project for the web app
```

**`apps/mobile/.env`**
```
EXPO_PUBLIC_API_BASE_URL=   # your deployed backend URL, e.g. https://your-app.onrender.com
EXPO_PUBLIC_SENTRY_DSN_MOBILE=   # from a third Sentry.io project for mobile
```

(You need 3 separate projects on sentry.io — API, web, mobile — each gives its own DSN.)

### A.5 Database Schema (Prisma, exact)

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id                  String   @id @default(uuid())
  email               String?  @unique
  passwordHash        String?
  isGuest             Boolean  @default(true)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  months              Month[]
  todos               Todo[]
  sharedMemberships   SharedExpenseMember[]
  ownedSharedExpenses SharedExpense[] @relation("SharedExpenseOwner")

  @@index([email])
}

model Category {
  id        String   @id @default(uuid())
  name      String
  isDefault Boolean  @default(false)
  ownerId   String?
  createdAt DateTime @default(now())

  expenses  Expense[]

  @@unique([ownerId, name])
}

model Month {
  id              String    @id @default(uuid())
  userId          String?
  sharedExpenseId String?
  label           String
  budget          Int                       // paisa
  startAt         DateTime
  endAt           DateTime?
  isCurrent       Boolean   @default(false)
  notified80      Boolean   @default(false)
  notified100     Boolean   @default(false)
  createdAt       DateTime  @default(now())

  user            User?          @relation(fields: [userId], references: [id])
  sharedExpense   SharedExpense? @relation(fields: [sharedExpenseId], references: [id])
  expenses        Expense[]

  @@index([userId])
  @@index([sharedExpenseId])
}

model Expense {
  id              String   @id @default(uuid())
  monthId         String
  categoryId      String?
  content         String
  amount          Int                       // paisa
  occurredAt      DateTime
  createdByUserId String
  syncStatus      String   @default("synced")  // "pending" | "synced" | "conflict"
  clientId        String?  @unique
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  month           Month     @relation(fields: [monthId], references: [id])
  category        Category? @relation(fields: [categoryId], references: [id])

  @@index([monthId])
}

model Todo {
  id        String   @id @default(uuid())
  userId    String
  content   String
  price     Int?                          // paisa, nullable until filled
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User @relation(fields: [userId], references: [id])

  @@index([userId])
}

model SharedExpense {
  id        String   @id @default(uuid())
  code      String   @unique               // 8-char uppercase alphanumeric
  ownerId   String
  name      String
  createdAt DateTime @default(now())

  owner     User @relation("SharedExpenseOwner", fields: [ownerId], references: [id])
  members   SharedExpenseMember[]
  months    Month[]
}

model SharedExpenseMember {
  id              String   @id @default(uuid())
  sharedExpenseId String
  userId          String
  joinedAt        DateTime @default(now())

  sharedExpense   SharedExpense @relation(fields: [sharedExpenseId], references: [id])
  user            User          @relation(fields: [userId], references: [id])

  @@unique([sharedExpenseId, userId])
}
```

Seed default categories (`isDefault: true`, `ownerId: null`): Food, Transport, Utilities, Rent,
Shopping, Health, Entertainment, Other.

### A.6 Timezone & Month-Boundary Algorithm

- Pakistan Standard Time = fixed UTC+5, no daylight saving.
- A month starts at `startAt` (UTC), has no end until **End Month** is pressed, which sets `endAt =
  now()` server-side and immediately creates the next month with `startAt = previous endAt` (no gap),
  `isCurrent = true`; the previous month's `isCurrent` becomes `false`.
- All UI date/time display converts stored UTC to PKT using a fixed +5:00 offset — never the device's
  own timezone.
- The expense entry date/time field defaults to "now" converted to PKT for display, is user-editable,
  and on submit the frontend converts the chosen PKT wall-clock time back to a UTC instant.

### A.7 Auth Flows (exact contracts)

- **Guest**: `POST /auth/guest` `{ guestId: uuid }` → creates `User` with that id, `isGuest: true`.
- **Signup**: `POST /auth/signup` `{ email, password }` → new `User`, `isGuest: false`.
- **Guest → Account upgrade**: user confirms a modal ("Your data will be saved to this account") →
  `POST /auth/upgrade-guest` (auth'd as guest) `{ email, password }` → updates the **same** `User.id`
  in place (sets email/passwordHash/isGuest:false) — no new row, no data copy, since all foreign keys
  already point at that id.
- **Login**: `POST /auth/login` `{ email, password }`. Rate limited: 5 attempts / email / 15 min → 429.
- **Refresh**: `POST /auth/refresh` `{ refreshToken }` → rotates and returns a new pair.
- **Logout**: `POST /auth/logout` → revokes the given refresh token.

### A.8 Sync Protocol (mobile only, exact conflict rule)

- Every offline-created record gets a client-generated `clientId` (UUID v4) as an idempotency key.
- On reconnect, batch push via `POST /sync/push`; backend upserts by `clientId` (retry-safe).
- **Conflict rule: last-write-wins by `updatedAt`.** No merge UI in v1.
- Pull changes since last sync via `GET /sync/pull?since=<ISO timestamp>`.
- Web has no offline mode — always calls the API directly, shows a network error toast on failure.
- Any record with `syncStatus !== "synced"` shows a small pending-sync icon in the mobile UI.

### A.9 Data Retention (exact algorithm)

- Daily NestJS Cron job (`@nestjs/schedule`, 00:00 UTC): for each user/shared-expense, keep the
  current active month plus the 3 most recently ended months; **hard delete** (expenses first, then
  the month row, in a transaction) anything beyond that. No soft-delete, no recovery.

### A.10 REST API Contract

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/guest` | Create/resume guest session |
| POST | `/auth/signup` | Fresh signup |
| POST | `/auth/upgrade-guest` | Convert guest to full account (in place) |
| POST | `/auth/login` | Login |
| POST | `/auth/refresh` | Rotate token pair |
| POST | `/auth/logout` | Revoke refresh token |
| GET | `/months?context=personal\|shared&sharedExpenseId=` | List months |
| GET | `/months/:id` | One month + its expenses + computed totals |
| PATCH | `/months/:id` | Edit label/budget |
| DELETE | `/months/:id` | Delete month (cascades expenses) |
| POST | `/months/:id/set-current` | Mark as current |
| POST | `/months/end-current` | End active month, body: `{ budget }` for next month, returns summary |
| GET | `/months/:id/export-csv` | Stream CSV |
| POST | `/expenses` | Create expense |
| PATCH | `/expenses/:id` | Edit a cell |
| DELETE | `/expenses/:id` | Delete |
| GET / POST | `/categories` | List / create custom category |
| GET / POST | `/todos` | List / create |
| PATCH / DELETE | `/todos/:id` | Edit / delete one |
| DELETE | `/todos` | Delete all |
| POST | `/todos/:id/promote` | Add one todo to current month |
| POST | `/todos/promote-all` | Add all todos to current month |
| POST | `/shared-expenses` | Create, returns join code |
| POST | `/shared-expenses/join` | Join via `{ code }` |
| GET | `/shared-expenses/mine` | List memberships |
| POST | `/sync/push` / GET `/sync/pull` | Mobile offline sync |

### A.11 Email Triggers (via Brevo)

1. **Budget threshold** — after each `POST /expenses`, if `used/budget` crosses 80% or 100% for the
   first time this month (tracked via `Month.notified80`/`notified100`), send once per threshold.
2. **Month-end summary** — sent inside `POST /months/end-current`: total spent, category breakdown,
   budget vs actual for the month just closed.
3. **Guest → account conversion confirmation** — sent immediately after `POST /auth/upgrade-guest`.

Templates are version-controlled HTML files in `apps/api/src/email/templates/`, not Brevo's visual
editor.

### A.12 Build Order

1. Monorepo scaffold + Prisma schema/migrations + seed categories.
2. Auth module end-to-end, tested via API client before any frontend work.
3. Personal expense CRUD (Months + Expenses) → Landing Page + Month View, web only.
4. Month-end flow (summary, budget prompt, rollover).
5. Port screens to mobile (online-only first).
6. Add WatermelonDB + sync endpoints, mobile offline behavior.
7. Shared Expense feature (schema already exists) — endpoints, join flow, Personal/Shared toggle.
8. ToDo page, both platforms.
9. Data retention cron job.
10. Email triggers + templates.
11. Sentry on all three apps.
12. CSV export.
13. Theme system polish pass.
14. EAS APK build (`preview` profile, `buildType: apk`) for direct install.

Do not start a step before the previous one is functional and manually tested.

### A.13 Guardrails — Do Not

- Use calendar months anywhere — months are user-controlled cycles (A.6).
- Store money as float/double — integer paisa only.
- Let the client compute authoritative totals.
- Use native `confirm()`/`alert()` — build the custom dialog (Part B).
- Soft-delete the retention cleanup — it's a hard delete by design.
- Add a merge-conflict UI for sync — last-write-wins only.
- Use AG Grid, React Data Grid, Handsontable, or any third-party spreadsheet library.
- Submit to the Play Store in this build — direct APK only, for now.
- Use GraphQL, tRPC, or Next.js for the web app (it's a Vite SPA).
- Create a new `User` row on guest upgrade — update the existing row in place.

---

## PART B — DESIGN SYSTEM (premium, market-ready UI)

The goal is a finance app that looks and feels like something from a funded fintech product (think
the polish of Copilot Money, Mercury, or YNAB) — confident, calm, a little bit editorial. Not a
generic admin-dashboard template, not default Bootstrap blue, not AI-generated boilerplate.

### B.1 Design Direction

- **Personality:** calm confidence, not playful, not corporate-cold. Money apps earn trust through
  restraint — generous whitespace, one strong accent color, quiet data-dense moments (the table)
  balanced against expressive moments (the stat callouts, the month-end summary).
- **One dominant color, used deliberately** — not sprinkled everywhere. Backgrounds stay neutral;
  color shows up only where it means something (money in/out, active states, alerts).
- **Numbers are the hero.** Every screen should make the current financial state legible at a glance
  before anything else competes for attention.

### B.2 Color System

Palette: **Deep Teal & Warm Ivory** — teal reads as trustworthy/financial without being the generic
"fintech blue," and warm ivory (not cold gray, not beige-default) keeps the light theme from feeling
sterile. Paired with a warm coral-red for expenses/alerts creates real semantic contrast (teal = safe/
positive, coral = spending/attention) instead of the usual green/red cliché.

**Light Mode**
| Token | Hex | Usage |
|---|---|---|
| `background` | `#FAFAF8` | Page background — warm off-white, not stark white |
| `surface` | `#FFFFFF` | Cards, inputs, table — pure white to lift off the warm background |
| `surface-raised` | `#F1F0EC` | Nested surfaces, table header, hover states |
| `primary` | `#0B4F4A` | Deep teal — primary buttons, active states, links, focus |
| `primary-hover` | `#083D39` | Hover/pressed state |
| `primary-soft` | `#0B4F4A` at 8% opacity | Active nav background, badges |
| `income-positive` | `#1F8A70` | Remaining budget (positive), success |
| `expense-alert` | `#C1543C` | Delete, over-budget, danger — warm coral-red, not stock red |
| `warning` | `#B8862E` | 80% threshold warning |
| `text-primary` | `#1C1B19` | Main text — warm near-black |
| `text-secondary` | `#6B6862` | Muted text, captions |
| `border` | `#E7E4DD` | Dividers, input borders |

**Dark Mode**
| Token | Hex | Usage |
|---|---|---|
| `background` | `#12130F` | Warm near-black, not blue-black |
| `surface` | `#1C1D18` | Cards, inputs |
| `surface-raised` | `#262720` | Table header, hover |
| `primary` | `#3ECFB2` | Bright teal for dark-bg contrast |
| `primary-hover` | `#5EDCC3` | Hover/pressed |
| `primary-soft` | `#3ECFB2` at 12% opacity | Active nav background |
| `income-positive` | `#4FBE9E` | Remaining (positive) |
| `expense-alert` | `#E8785F` | Delete, alerts |
| `warning` | `#E0AC55` | 80% threshold |
| `text-primary` | `#F3F1EC` | Main text |
| `text-secondary` | `#A6A398` | Muted text |
| `border` | `#33352C` | Dividers |

**Rules:**
- Never a hardcoded hex in a component — all colors are CSS variables in
  `packages/config/tailwind-preset.js`, swapped via a `.dark` class root toggle.
- `primary` covers ~60% of the accent usage (buttons, active states, links); `income-positive` and
  `expense-alert` are used only for their specific semantic meaning, never decoratively.
- No pure `#000000` or `#FFFFFF` text/background pairing anywhere.

### B.3 Typography

**Font pairing:** a serif display face for numbers and titles + a clean sans for everything else —
this single choice is what separates "premium fintech" from "generic dashboard template."

- **Display/numbers:** `Fraunces` (variable serif, distinctive without being decorative) — used only
  for: stat callout numbers, the month label in the top bar, and the month-end summary headline.
  Self-hosted woff2, loaded once, subset to numerals + basic Latin to keep it light.
- **Everything else:** `Inter` — body text, labels, buttons, table content, forms.
- **Mobile:** system font substitutes for both (San Francisco/Roboto) to keep the APK small — Fraunces
  is a web-only indulgence; on mobile, use system font at `700` weight for the same elements to
  preserve the visual hierarchy without the bundle cost.

| Element | Font | Web size | Mobile size | Weight |
|---|---|---|---|---|
| Stat callout numbers | Fraunces (web) / system (mobile) | 44px | 34px | 600 |
| Month label (top bar) | Fraunces (web) / system (mobile) | 26px | 20px | 600 |
| Page title | Inter | 24px | 20px | 700 |
| Section header | Inter | 17px | 15px | 600 |
| Body text | Inter | 15px | 14px | 400 |
| Table/list cell | Inter | 14px | 13px | 400, tabular-nums for amounts |
| Button label | Inter | 14px | 14px | 600 |
| Caption / muted | Inter | 12.5px | 11.5px | 400 |
| Stat callout label | Inter | 12px | 11px | 600, uppercase, letter-spacing 0.06em |

Line height: 1.5 for body text, 1.15 for display numbers, 1.3 for headings.

### B.4 Spacing, Grid, Radius

- Base unit **4px**; all spacing is a multiple of it (4/8/12/16/20/24/32/40/48/64).
- Page padding: **28px** web, **16px** mobile. Never less than **16px** from any screen edge.
- Card padding: **20px** web, **16px** mobile.
- Gap between major sections: **20px**. Gap between a header and its content: **12px**.
- Border radius: **16px** cards/modals, **10px** buttons/inputs, **full** pills and the FAB.
- Web grid: content max-width **1240px**, centered; right sidebar **272px** fixed; **32px** gutter.
- Breakpoints: mobile-web < 768px (sidebar → hamburger drawer), tablet 768–1023px (same drawer,
  wider content), desktop ≥ 1024px (fixed sidebar).

### B.5 Elevation

- Light mode cards: `0 1px 2px rgba(28,27,25,0.04), 0 4px 12px rgba(28,27,25,0.05)` — soft, diffused,
  not a hard drop shadow.
- Dark mode cards: no shadow — use a `1px solid var(--border)` outline instead, plus `surface-raised`
  for one level of visual lift.
- Modals: `0 20px 50px rgba(0,0,0,0.18)` light, `0 20px 50px rgba(0,0,0,0.6)` dark.
- Buttons and table rows stay flat — never shadowed; differentiate with color/border only.

### B.6 Motif — Icon-in-Circle + Ledger Rule

Two consistent, repeated devices carry the visual identity through every screen:

1. **Icon-in-circle**: every category icon, nav icon (active state), and dialog icon sits inside a
   circular tint of its semantic color at 10–12% opacity (32px web / 28px mobile diameter).
2. **The ledger rule**: every list/table row is separated by a single hairline (`1px solid border`)
   — no card wrapping, no zebra striping, no boxed rows for line-item data (expenses, todos, table
   rows). This is what makes the data views feel like a real financial ledger instead of a generic
   card-based list, and it's the throughline that ties Landing, Month View, and the Edit Table
   together visually.

**Never** use accent stripes, side bars, top borders on cards, or underlines beneath titles.

### B.7 Motion

- Standard transition: `160ms cubic-bezier(0.4, 0, 0.2, 1)` for hover, focus, color changes.
- Modal enter: fade + scale 96%→100%, `220ms` ease-out. Exit: `150ms` ease-in.
- Toast: slide-up + fade, `220ms` in / `160ms` out.
- Sidebar drawer: slide from right, `260ms` ease-out, backdrop fades in parallel.
- Row icon reveal on hover (web): `opacity 0→1`, `140ms`.
- Stat callout numbers animate with a brief count-up (~500ms) the first time a screen loads new data
  — the one deliberate "delight" moment in the app, used sparingly (not on every re-render).

### B.8 Components

**Buttons**
| Variant | Fill | Text | Border | Use |
|---|---|---|---|---|
| Primary | `primary` | white | none | Add Expense, End Month, Save, Join |
| Secondary | `surface` | `text-primary` | `1px solid border` | Cancel, secondary actions |
| Danger (inline trigger) | transparent | `expense-alert` | `1px solid expense-alert` | Delete icon buttons |
| Danger (confirmed, inside dialog) | `expense-alert` | white | none | The actual confirm-delete button |
| Ghost/icon | transparent | `text-secondary` (→ `primary` active) | none | Nav items, row icons |

Height 40px web / 44px mobile, radius 10px, icon 16px + 8px gap to label, disabled = 40% opacity.
Icon-only tap targets: minimum 44×44px regardless of icon size.

**Inputs**: 40px/44px height, `1px solid border` → `2px solid primary` on focus (custom, browser
outline removed), 10px radius, 12px horizontal padding, label 13px `text-secondary` above with 4px
gap, error state turns border `expense-alert` with 12px helper text below.

**Custom Confirm Dialog**: 360px centered card, icon-in-circle (semantic color) + title + one-line
description + Cancel/Delete button pair (Delete = filled danger, the one exception to danger staying
outlined). Backdrop `rgba(20,19,17,0.45)`, click-outside = Cancel, Enter confirms / Escape cancels.

**Undo Toast**: bottom-center, `surface` background, 10px radius, message + Undo text button
(`primary`) + a 2px progress line draining over 5s. One toast at a time; a new one replaces the
current immediately.

**Add-Loop Popup (ToDo)**: same modal shell, single input, Add submits and resets the input in place
(no close/reopen flicker, focus stays in the field), Cancel closes it.

**Ledger Row (table + lists)**: 44px height, `1px solid border` bottom hairline only (no vertical
lines, no zebra striping), icon-in-circle + content/category on the left, right-aligned tabular-nums
amount + muted time on the right, edit/delete icons fade in on hover/press on the right edge.

**Stat Callouts**: three equal cards, `surface` background, 16px radius, label (12px uppercase) above
a Fraunces/system-bold number below, color-coded per B.2, soft shadow (B.5), brief count-up animation
on load.

**Sidebar**: 272px fixed (desktop) / 280px right-drawer (mobile/tablet), `surface` background, items
= icon-in-circle + label, 8px gap between items, active item gets `primary-soft` background + primary
text/icon. Personal/Shared toggle is a pill segmented control living in the top bar, not the sidebar.

### B.9 Screen Layouts

**Auth (first launch):** centered column, max 360px. Icon-in-circle app mark at top. Sign Up / Log In
as stacked primary/secondary buttons, divider "or", Continue as Guest as a ghost button below.
Selecting Sign Up/Log In swaps the buttons for an inline form with a "Back" link.

**Landing Page:** top bar (month label in Fraunces/system-bold + End Month button) → stat callout row
→ entry form (date/time compact field + content field flex + price field + submit icon button,
stacked on mobile) → expense list using the Ledger Row pattern, newest first.

**Month View:** page title + Export CSV button in top bar → month cards (label, date range, used
total, hover-revealed edit/delete + "Use as current"), 12px gap between cards.

**Excel Edit View:** back + month label top bar + Export CSV → full Ledger-Row table (Date/Time,
Content, Category, Amount columns), inline cell editing, Tab/Enter/Arrow keyboard nav on web, active
cell gets a 2px primary inset border.

**ToDo Page:** top bar with title + Add / Add All to Current Month / Delete All actions → Ledger Rows
with editable content + price-with-placeholder, per-row Add-to-Month/Delete actions revealed on
hover/press. Empty state: icon-in-circle + muted "No tasks yet" + primary Add button.

**Settings:** stacked cards — Appearance (Light/Dark/System control), Shared Expense (create/join +
membership list with copyable codes), Account (email or guest-upgrade CTA, logout).

### B.10 Accessibility

- Visible focus ring everywhere on web: `2px solid primary`, `2px` offset — never removed without
  replacement.
- Icon-only buttons carry `aria-label` (web) / `accessibilityLabel` (RN) describing the action.
- Color never carries meaning alone — over-budget pairs `expense-alert` with an icon and explicit
  text, not color alone.
- Minimum 4.5:1 text contrast in both themes — palette in B.2 is chosen to satisfy this; do not
  lighten `text-secondary` further.
- Minimum 44×44px tap targets on mobile.

### B.11 Assets Needed

- App icon (1024×1024 source) — icon-in-circle mark using `primary` on `background`.
- Splash screen: same mark centered on `background`, per Expo splash spec.
- No stock photography/illustration — the design is carried entirely by typography, color, and the
  ledger/icon-circle motifs, keeping the bundle small.

---

## Appendix — Continuation Prompt

If a build session runs out of context, paste this into a new session along with this file:

```
I'm building a Monthly Expense Calculator app. The attached file
"monthly-expense-calculator-spec.md" is the single source of truth: Part A covers architecture,
database schema (Prisma), API contract, auth/sync/retention logic, and build order with guardrails.
Part B covers the full design system — colors, typography, spacing, components, and screen layouts.

Do not introduce any library, pattern, color, or architectural decision not in this document.
Ask me before assuming anything it doesn't cover.

Current build status: [FILL IN — e.g. "Monorepo scaffolded, Prisma migrated, auth module done and
tested. Next: Landing Page + Month View on web, per Part A.12 Build Order."]

Continue from that point, following the Build Order exactly, one step at a time, confirming each
step works before moving to the next.
```
