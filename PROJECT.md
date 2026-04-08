# GOYA — Project Overview

GOYA is basically a platform that connects people to local artisans (like plumbers, electricians, etc).

Customers can:

* search for artisans
* book them
* leave reviews

Artisans can:

* create and manage their profile
* upload their work (portfolio)
* receive and respond to job requests

---

## Tech Stack

### Frontend

* React 18 + Vite
* TypeScript
* Tailwind CSS + shadcn/ui (for UI components)
* React Router (for navigation)
* TanStack Query (for fetching and caching data)
* Recharts (for charts)
* React Hook Form + Zod (for forms and validation)


### Backend

* Edge Functions (TypeScript + Deno)
* PostgreSQL (database)
* Auth (handles login/signup with JWT)
* Bucket Storage (for images like profile pics and portfolio)
* Realtime Subscription (for chat and live updates)

---

## Project Structure (simple idea)

```
goya_artisan/
├── src/
│   ├── api/          # Deno setup
│   ├── components/   # Reusable UI stuff
│   ├── hooks/        # Custom hooks (like auth)
│   ├── pages/        # Main pages (routes)
│   └── index.css     # Global styles
├── supabase/
│   ├── functions/    # Backend functions
│   ├── migrations/   # Database changes
│ 
├── public/
├── package.json
├── vite.config.ts

---

## Main Features

* Artisans can sign up and set their location (GPS)
* Separate dashboards for customers and artisans
* Real-time chat between users
* Job flow system (pending → accepted → in progress → done)
* Upload photos of past work
* Ratings and reviews (stars)
* Find artisans near you (location-based search)
* Admin panel to manage users, reviews, and analytics
* Different roles (customer, artisan, admin)

---

## Currency

All prices are in **GHS (Ghana Cedis)**.

---

## Run the project locally

npm install
npm run dev

Serverless Backend on our System runs 24/7 with cold start