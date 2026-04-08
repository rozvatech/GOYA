# Artisan Dashboard

**Purpose:** Managing the craft business.

**Key Features:**
- **Job Queue:** Incoming requests from customers.
- **Status Toggle:** "Available for hire" vs. "In the workshop" (Busy).
- **Portfolio Manager:** Drag-and-drop image upload for past work.
- **Earnings View:** Summary of completed job values.

**Pages:**
- `/artisan/:userId` — Public artisan profile page

**Database Tables:**
- `artisan_profiles` — Bio, skills, service category, experience, availability, ratings
- `portfolio_photos` — Images linked to artisan profile

**RLS Policies:**
- Artisan profiles are publicly viewable
- Only the artisan can update their own profile
- Portfolio managed by the owning artisan
