# SkillSphere

> **Connect. Learn. Build.**  
> A next-generation platform bridging students and alumni through verified skill profiles, intelligent squad matching, and AI-powered learning roadmaps.

🌐 **Live Demo:** [https://skill-sphere-v1.vercel.app/](https://skill-sphere-v1.vercel.app/)

*Note: This project was built utilizing an agentic AI workflow.*

---

## 🌟 Overview

SkillSphere is designed to replace generic resume claims with verified proof-of-work. By integrating GitHub repository analysis, multi-tiered verification, and an Antifragile consensus matching engine, SkillSphere connects motivated learners with mentors, teammates, and real-world project squads.

---

## 🚀 Key Features

* 🌐 **Live Platform Access:** Test the live deployment at [skill-sphere-v1.vercel.app](https://skill-sphere-v1.vercel.app/).
* 🔒 **Secure Authentication & Quality Control:**
  * JWT-based authentication stored in `httpOnly` secure cookies.
  * One-Time Password (OTP) verification for registration and password resets.
  * **Mandatory GitHub Verification:** Linking GitHub is required for full access. Includes client-side enforcement and a background pruning job (`userPruning.js`) that automatically deletes unlinked accounts after a 24-hour grace period.
* 🧠 **Antifragile N.E.X.U.S. Matching Engine:**
  * Multi-strategy matching algorithms (Verified Skills, Experience Depth, College Proximity).
  * Dynamic consensus engine that promotes top-performing strategies over time based on feedback loops.
  * Admin dashboard for strategy management and system health monitoring.
* 👥 **Squads & Project Missions:**
  * Create or join specialized project squads with skill-gated roles.
  * Automated background job (`squadMaintenance.js`) to expire stale squads and close fulfilled teams.
* 🤖 **AI-Powered Career Roadmaps:**
  * Dynamically generates personalized learning paths based on current skills and target career roles using Google Gemini AI.
* 💬 **Real-Time Communication:**
  * Instant messaging and live notifications powered by Socket.io.
* 📰 **Global Technical Feed & Network:**
  * Community feed for technical discourse, posts, likes, nested comments, and peer discovery.

---

## 🔑 Demo Credentials (For Testing)

If you'd like to test the live platform without creating a new account, you can use any of the seeded demo accounts:

* **Email:** `aryan@test.com` (or `priya@test.com`, `rohan@test.com`, `ananya@test.com`)
* **Password:** `test1234`
* **OAuth:** You can also sign in directly using Google or GitHub.

---

## 🏛️ Architecture & System Design

SkillSphere is built on a modern, decoupled full-stack architecture:

* **Backend (Service-Oriented):** Node.js & Express.js with Prisma ORM and PostgreSQL. Business logic is modularized into dedicated services (Auth, Squads, Antifragile Engine, AI Roadmaps, GitHub Portfolio). Routine cleanup and maintenance are managed via `node-cron`.
* **Frontend (Feature-Sliced Design):** Built with React 19 and Vite. Organized by feature domains (`features/profile`, `features/squads`, `features/chat`, `features/auth`, etc.) for maximum modularity and scalability.

---

## 📚 Documentation

For in-depth architectural specs and API details, explore our documentation:

* 📄 **[System Design Specification](docs/system_design.md)** — Architectural overview, system flows, and security spec.
* 🏗️ **[System Architecture](docs/ARCHITECTURE.md)** — Structural diagrams, N.E.X.U.S. state machine, and database sequence diagrams.
* 🔌 **[API Reference Manual](docs/API_REFERENCE.md)** — Complete endpoint listing, schemas, and payload examples.
* 🎯 **[Key Features Breakdown](docs/Features.md)** — Detailed analysis of N.E.X.U.S., Squads, and AI Roadmaps.
* 📋 **[Product Requirements](docs/Product_Requirements.md)** — Product specifications and target audience.

---

## 🛠️ Tech Stack

### Frontend (Client)
* **Framework:** React 19 & Vite
* **Architecture:** Feature-Sliced Design (FSD)
* **Styling:** Tailwind CSS & Framer Motion
* **API & WebSockets:** Axios & Socket.io-client
* **Routing:** React Router DOM

### Backend (Server)
* **Runtime & Framework:** Node.js (ES Modules) & Express.js
* **Database:** PostgreSQL with Prisma ORM
* **Authentication:** JWT in `httpOnly` Cookies, OTP Email Verification
* **Real-Time:** Socket.io
* **Background Jobs:** Node-cron
* **AI Integration:** `@google/generative-ai` (Google Gemini)
* **Validation & Logging:** Zod & Winston

---

## 📦 Getting Started

### Prerequisites
* **Node.js:** v18 or higher
* **Database:** PostgreSQL (local or hosted, e.g. Supabase / Railway)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/KshitizD07/Skill-Sphere.git
   cd Skill-Sphere
   ```

2. **Install dependencies:**
   ```bash
   # Client dependencies
   cd client
   npm install

   # Server dependencies
   cd ../server
   npm install
   ```

3. **Configure Environment Variables:**
   Create `.env` in the `server` directory:
   ```env
   PORT=5001
   DATABASE_URL="postgresql://user:password@localhost:5432/skillsphere"
   JWT_SECRET="your_jwt_secret"
   GOOGLE_API_KEY="your_google_gemini_api_key"
   FRONTEND_URL="http://localhost:5173"
   ```

4. **Initialize Database & Seed Data:**
   ```bash
   cd server
   npx prisma db push
   npm run db:seed
   ```

5. **Run Locally:**
   ```bash
   # Terminal 1: Backend
   cd server
   npm run dev

   # Terminal 2: Frontend
   cd client
   npm run dev
   ```

---

## 📄 License

Copyright (c) 2026 Kshitiz Dixit. All rights reserved.

This project is **proprietary**. All rights are reserved by the author. See the [LICENSE](LICENSE) file for legal text regarding usage and restrictions.

---

*SkillSphere — Connect. Learn. Build.*
