# Authentication System

**Purpose:** Secure entry and role assignment.

**Flow:**
1. User enters email or selects Google Auth.
2. System checks if user exists.
3. If new, user chooses "I am an Artisan" or "I am a Customer."
4. Artisan flow redirects to skill-tagging; Customer flow redirects to the search home.

**Design:** Minimalist forms centered in the viewport. Lavender focus rings on inputs.

**Pages:**
- `/auth` — Login / Signup / Password Reset
- `/reset-password` — Set new password after email link

**Security:**
- JWT-based authentication
- Email confirmation required
- Password reset via secure email link
- Google OAuth supported
