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


# 🔴 REMAINING WORK

## 1. 💳 Complete Subscription/Payment System

Abhi **sirf UI hai**, real payment system nahi.

Banana hai:

### School side
`Upgrade Plan` →
**Choose Payment Method**

- JazzCash
- Easypaisa
- Bank Transfer

Phir:

**Payment Order → Pending → Payment verification → Paid → Automatic plan activation**

Database mein proper `Payment`/`Subscription` records.

---

## 2. 🔐 Payment Security

Payment system mein:

- Backend amount verification
- School/order matching
- Transaction/reference ID
- Gateway response verification
- Duplicate payment protection
- Failed payment handling
- Pending payment handling
- Already-paid order protection
- Webhook/callback verification
- Frontend se fake `plan=lite` bhejne par rejection

**Frontend ko payment successful declare karne ki permission nahi hogi.**

---

# 3. 👑 CEO Payment Management

CEO panel mein **Payments** section add karna hai.

CEO ko dikhna chahiye:

- Payment ID
- School
- School email
- Plan
- Amount
- Payment method
- Transaction/reference ID
- Date/time
- Status
- Pending / Paid / Failed
- Payment details
- or password change system bhi bnana h abhi CEO login hardcoded h! isko sahi krna h hardcoded nhi rakhna!

### Important:

**JazzCash/Easypaisa successful payment → automatic activation.**

CEO ko manually 30–40 payments approve nahi karne padenge.

CEO sirf **Bank Transfer / exceptional pending payments** manually verify karega.

---

# 4. 🔔 CEO Notifications

CEO Dashboard mein notification system:

- New payment received
- Payment failed
- Payment pending
- School registered
- School trial expiring
- School expired
- School blocked

Later notification bell bana sakte hain.

---

# 5. 📊 CEO Dashboard ko Proper Admin Panel banana

Current dashboard basic admin functionality rakhta hai.

Isko eventually:

### Overview
- Revenue
- Active subscriptions
- Trial schools
- Expired schools
- New registrations
- Payments
- Growth charts

### Schools
- Search
- Filter
- Plan filter
- Status filter
- School details
- Subscription details
- Student count
- Expiry
- Block/unblock
- Delete
- Extend
- Change plan

### Payments
- All payments
- Pending
- Successful
- Failed
- Refunds later

### Login Logs
Already present — later filtering/search/export improve kar sakte hain.

---

# 6. 🧾 Invoices / Receipts

Payment successful hone ke baad:

**Invoice generate**

Example:

```text
Vends EduCore
Invoice #VEN-000123

School: ABC School
Plan: Lite Edition
Amount: PKR 4,999
Payment: JazzCash
Transaction: XXXXX
Date: XX/XX/2026
Status: PAID
```

School ko invoice/receipt milni chahiye.

---

# 7. 🔄 Subscription Lifecycle

Proper rules implement karne hain:

```text
Free Trial
   ↓
Upgrade
   ↓
Pro-Plan
   ↓
Renew
   ↓
Expiry
   ↓
Expired
```

Aur:

- Upgrade
- Renewal
- Expiry
- Grace period (agar rakhna ho)
- Downgrade
- Cancel
- Reactivation

clear rules ke saath.

---

# 8. 🏫 Remaining School Modules

### Finance

- ❌ Fees & Finance
- ❌ Fee collection
- ❌ Outstanding fees
- ❌ Payroll & HR

### Operations

- ❌ Library
- ❌ Inventory
- ❌ Transport

### Extra

- ❌ AI Insights
- ❌ SMS reminders
- ❌ Notifications system
- ❌ Enrollment charts / Boys-Girls analytics

---

# 9. 📝 Test Generator

`TestGenerator.jsx` already exists.

Lekin isko verify/complete karna hoga:

- export
- Save test

**Status ke mutabiq page exist karta hai, lekin complete production feature ke taur par verify karna baaki hai.**

---

# 10. 📄 Result Card Generator

Page/route already exists.

Verify/complete krna h abhi ye complete nhi h yani isko :

- export
- Save result

---

# 11. 📱 Responsive UI

Desktop chal raha hai, lekin production SaaS ke liye verify karna hai:

- Laptop
- Tablet
- Mobile

**Sidebar mobile behavior** bhi.

---

# 12. 🛡️ Authentication/Security Hardening

Current basic security hai, lekin production-level ke liye:

- Proper JWT/session strategy
- Protected API routes
- Role-based authorization
- CEO-only endpoints
- School-only endpoints
- Password hashing verification
- Rate limiting
- Login brute-force protection
- Input sanitization
- CORS hardening
- Environment secrets
- API error handling

Ye particularly important hai kyunki ab real schools ka data hoga.

---

# 13. 🗄️ Database/Data Integrity

Ensure:

- Har school ka data strictly `schoolId` se isolated ho
- Deleted school ka related data properly delete ho
- Duplicate emails ka rule
- Duplicate attendance record protection
- Student counts accurate
- Subscription records consistent

---

# 14. 📈 Analytics

Dashboard mein eventually:

- Boys/Girls
- Grade distribution
- Attendance percentage
- Student growth
- Teacher count
- Fee collection
- Outstanding fees
- Exam performance

---

# 15. 📩 SMS System

Parents ko:

- Attendance alert
- Fee reminder
- Result notification
- Important school notification

SMS provider connect karna hoga.

**Ye usually free nahi hota**, isliye provider/cost later decide karenge.

---

# 16. 🤖 AI Insight

Tumhari planned feature:

> Attendance drop detect karna.

Example:

```text
Grade 8 attendance
Last month: 94%
This month: 81%

⚠ Attendance dropped by 13%.

Possible concern:
Grade 8 attendance has declined significantly.
```

Baad mein AI se actual insight generation kar sakte hain.

---

# 17. 🔔 Notifications System

School ke liye:

- New notification
- Attendance alerts
- Fee alerts
- Exam notifications
- Result published
- System announcements

CEO ke liye:

- New school
- Payment
- Expiry
- Failed payment
- System alerts

---

# 18. 🧪 Complete Testing

Har module:

**Create → Read → Update → Delete → Error cases → Refresh → Logout → Login → Production**

test karna hai.

Especially:

- School A cannot see School B data
- Blocked school cannot login
- Expired school cannot use protected functionality
- Student limit cannot bypass
- Fake payment cannot activate plan

---




## Agent Behavior
When given a task, inspect the repository first and determine the correct files yourself.

Do not blindly follow assumptions about filenames or architecture.

Do not stop after changing the frontend if backend/database work is required.

Do not stop after changing the backend if frontend integration is required.

After implementation, verify the complete flow.