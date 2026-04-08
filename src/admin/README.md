# Admin Dashboard

**Purpose:** Platform management and quality control.

**Key Features:**
- **Verification Queue:** Manual approval of artisan credentials to maintain quality
- **User Management:** View and manage all platform users
- **Statistics:** Platform-wide metrics (users, jobs, reviews)
- **Content Moderation:** Review and manage user-generated content

**Pages:**
- `/admin` — Admin dashboard (protected, admin role required)

**Access Control:**
- Admin status checked via `user_roles` table (server-side)
- `has_role()` security definer function prevents RLS recursion
- Non-admin users are redirected away

**Admin Capabilities:**
- Approve pending artisan accounts
- View platform statistics
- Monitor bookings and reviews
- Delete fake accounts (future)
- Manage reviews (future)
