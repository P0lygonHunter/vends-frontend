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
- **Payment system (manual verify):** models, school submit, CEO approve/reject, invoices
- **CEO Pricing:** CEO UI + public `/api/pricing` + Subscription page loads live prices
- **CEO Notifications:** live feed (pending payments, expiry, new schools, blocked)
- **CEO Dashboard upgrades:** school search/filters, payment status filters, log search, overview alert cards
- **CEO panel:** Payments, Pay Methods, Pricing, Security
- **School Settings:** login email change (password confirm), password autofill hardened
- **Payment security polish:** payment submit rate-limit, duplicate txn guard, server-side amount only
- **Days-left sync:** calendar-day formula for list + notifications
- **Mobile sidebar:** drawer + hamburger for school panel
- **School delete cascade:** related collections cleaned on delete
- **Subscription lifecycle UX:** Active/Expiring/Expired + Renew within 14 days
- **Test Generator / Result Card:** Save, Load, Export JSON + print
- Login logs, schools list, block/unblock, extend trial, revenue uses live pricing

---

# 🔴 REMAINING WORK

## 1. 🔐 Payment gateway auto-verify (later)

Manual CEO approve is live. Rate-limit + server amount + duplicate txn checks are in place.

Still later:
- Official JazzCash / EasyPaisa / bank **merchant API + webhooks** for automatic paid status
- Without gateway credentials, auto-verify cannot go live

**Note:** "Gateway auto-verify later" = payment apps themselves confirm the payment to our server; CEO will not need to Approve every JazzCash/EasyPaisa payment once integrated.

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
