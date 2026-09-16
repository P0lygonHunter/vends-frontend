# VORTEX Agent Instructions

You are the coding agent for the Vends EduCore project.

## Core Rule
Before changing anything, inspect the existing project yourself. Do not ask the user to provide files that already exist in the workspace.

## Workflow
1. Understand the user's requested feature/fix.
2. Inspect all relevant frontend and backend files.
3. Trace related models, routes, controllers, APIs and components.
4. Identify dependencies and existing behavior.
5. Make the required changes.
6. Run appropriate tests/checks.
7. Fix errors caused by your changes.
8. Report exactly what was changed.

## Project Rules
- Use the existing architecture and coding style.
- Do not unnecessarily rewrite working code.
- Do not create duplicate systems.
- Real data must come from MongoDB/API, not hardcoded fake data.
- Frontend and backend must remain correctly connected.
- Preserve existing working functionality.
- Handle loading, error and empty states properly.
- Validate user input.
- Keep authentication and authorization intact.
- Never expose secrets or API keys.

---

# ✅ COMPLETED (do not re-do)

- **CEO auth:** DB-backed CEO password (`CeoConfig`), password change, email change, scrypt hash, env fallback
- **Payment system (manual verify):**
  - Models: `Payment`, `PaymentMethod`, `Invoice`
  - School: submit payment (pending) + list payments + list invoices + receipt view
  - CEO: payment methods CRUD, payments list, approve → plan activate + invoice, reject
- **Invoices / Receipts:** auto-generate on approve (`VEN-000001` style), school can view/print
- **CEO panel sections:** Payments, Pay Methods, Security (password + email)
- Login logs, schools list, block/unblock, extend trial, basic revenue stats

---

# 🔴 REMAINING WORK

## 1. 💰 CEO Pricing Settings (HIGH — next)

Backend `GET/PATCH /admin/pricing` already exists.

Still needed:
- CEO UI to set Lite / ZK (and trial) prices (e.g. 3000, 4000, any amount)
- School Subscription page must load prices from API (not hardcoded `PKR 4,999` / `14,999`)
- Payment amount must always come from server Pricing (already true on create payment)

---

## 2. 🔐 Payment Security polish

Already have: server-side amount, txn ID, pending flow, duplicate pending guard, frontend cannot mark paid.

Still needed / improve:
- Stronger anti-fraud checks
- Optional gateway webhooks (JazzCash / EasyPaisa auto-verify) — today CEO **manual approve**
- Rate limits on payment submit
- Clearer failed / rejected UX

**Note:** Full automatic JazzCash/EasyPaisa activation needs official merchant APIs + webhooks (not just UI).

---

## 3. 🔔 CEO Notifications

CEO Dashboard notifications:
- New payment (pending)
- Payment approved / rejected
- New school registered
- Trial expiring
- School expired
- School blocked

Start with in-app list / badge; later notification bell.

---

## 4. 📊 CEO Dashboard upgrades

Improve admin panel:
- Search / filter schools (plan, status, expiry)
- Payments filters (pending / paid / rejected)
- Stronger overview stats + simple charts later
- Login logs search/export later

---

## 5. 🔄 Subscription Lifecycle rules

Clear product rules for:
- Upgrade
- Renewal
- Expiry behaviour
- Optional grace period
- Downgrade / cancel / reactivation

(Manual upgrade path exists; lifecycle rules not fully productized.)

---

## 6. 🏫 Remaining School Modules

### Finance
- Fees & Finance polish
- Fee collection / outstanding
- Payroll & HR (later)

### Operations
- Library
- Inventory
- Transport

### Extra
- AI Insights
- SMS reminders
- School notifications system
- Enrollment charts / Boys-Girls analytics

---

## 7. 📝 Test Generator

Page exists — verify/complete:
- Export
- Save test
- Production-ready flow

---

## 8. 📄 Result Card Generator

Page exists — verify/complete:
- Export
- Save result
- Production-ready flow

---

## 9. 📱 Responsive UI

- Laptop / tablet / mobile
- Sidebar mobile behavior

---

## 10. 🛡️ Auth / Security hardening

Partial done (JWT roles, CEO routes, password hashing, basic rate limit on CEO login).

Still improve:
- Broader rate limiting
- Brute-force protection on school login
- Input sanitization
- CORS / secrets review
- Consistent API error handling

---

## 11. 🗄️ Database / Data Integrity

- Strict `schoolId` isolation checks
- Cascade / cleanup on school delete
- Duplicate protections
- Accurate student counts
- Subscription record consistency

---

## 12. 📈 Analytics

- Boys/Girls, grade distribution
- Attendance %
- Growth, fees, exam performance

---

## 13. 📩 SMS System

Provider + cost decision later:
- Attendance / fee / result alerts

---

## 14. 🤖 AI Insight

Attendance drop detection and similar insights (later).

---

## 15. 🔔 School Notifications System

In-app notifications for schools (attendance, fees, exams, announcements).

---

## 16. 🧪 Complete Testing

Full CRUD + isolation + blocked/expired/limit + fake payment cannot activate plan.

---

## Agent Behavior
When given a task, inspect the repository first and determine the correct files yourself.

Do not blindly follow assumptions about filenames or architecture.

Do not stop after changing the frontend if backend/database work is required.

Do not stop after changing the backend if frontend integration is required.

After implementation, verify the complete flow.
