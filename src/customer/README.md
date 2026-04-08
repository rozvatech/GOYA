# Customer Experience

**Purpose:** Finding and booking talent.

**Key Features:**
- **Search:** Find artisans by location, service type, rating, and availability
- **The Proposal:** A structured form to describe the job (Title, Description, Date, Budget)
- **Review Loop:** Post-completion prompt to rate the artisan

**Pages:**
- `/search` — Search and filter artisans
- `/booking/:artisanUserId` — Send a job proposal
- `/reviews` — Browse recent reviews

**Database Tables:**
- `jobs` — Job proposals with status tracking
- `reviews` — Star ratings and comments

**Search Filters:**
- Service category dropdown
- Text search on skills
- Results sorted by rating
