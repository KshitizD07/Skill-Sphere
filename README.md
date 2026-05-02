# SkillSphere

*Note: This project was built utilizing an agentic AI workflow.*

SkillSphere is a next-generation platform designed to bridge the gap between students and alumni by fostering skill-based networking, real-time collaboration, and community-driven learning. The platform intelligently matches users, verifies their skills, and provides dynamic learning roadmaps to help individuals achieve their career goals.

## 🚀 Key Features

* **Dynamic User Profiles & Skill Verification:** Users can build comprehensive profiles. Skills can be verified through integrations (e.g., GitHub API) to ensure authenticity.
* **Antifragile Nexus Engine:** A sophisticated, multi-strategy consensus engine that intelligently matches users for mentorship, collaboration, and networking based on verified skills and dynamic scoring algorithms.
* **Squads & Missions:** Users can form or join "Squads" to collaborate on specific projects, events, or learning missions.
* **AI-Powered Learning Roadmaps:** Generates customized learning paths and roadmaps based on a user's current verified skills and desired career roles.
* **Real-Time Communication:** Instant messaging and chat functionality powered by WebSockets.
* **Global Feed & Social Interactions:** Share updates, post content, and engage with the community through likes and nested comments.
* **In-App Notifications:** Real-time alerts for messages, squad applications, post interactions, and network updates.

## 🛠 Tech Stack

**Frontend (Client)**
* React 19 (Vite)
* Tailwind CSS & Framer Motion (Styling and Animations)
* React Three Fiber (3D visual elements)
* Socket.io-client (Real-time updates)
* React Router DOM (Navigation)

**Backend (Server)**
* Node.js (Full ES Modules architecture)
* Express.js (RESTful APIs)
* Prisma ORM (PostgreSQL database management)
* Socket.io (WebSocket server)
* Winston (Structured logging)
* Zod (Schema validation)
* Node-cron (Background task scheduling)

## 📦 Getting Started

### Prerequisites
* Node.js (v18 or higher)
* PostgreSQL database

### Installation

1. **Clone the repository**
2. **Install dependencies**
   ```bash
   # Install client dependencies
   cd client
   npm install

   # Install server dependencies
   cd ../server
   npm install
   ```
3. **Environment Setup**
   * Create a `.env` file in the `server` directory and configure the required variables:
     ```env
     DATABASE_URL="postgresql://user:password@localhost:5432/skillsphere"
     JWT_SECRET="your_jwt_secret"
     GOOGLE_API_KEY="your_ai_api_key"
     SMTP_HOST="your_smtp_host"
     # ... other configurations
     ```
4. **Database Initialization**
   ```bash
   cd server
   npx prisma db push
   ```
5. **Run the Application**
   ```bash
   # Terminal 1: Start the backend server
   cd server
   npm run dev

   # Terminal 2: Start the frontend client
   cd client
   npm run dev
   ```

## 🚧 Current Limitations & Future Work

While the core platform is fully functional, there are a few areas currently lacking that are slated for future updates:
* **Automated Testing:** Comprehensive unit, integration, and end-to-end test coverage needs to be implemented.
* **Deployment Infrastructure:** Lacks CI/CD pipelines, Docker containerization, and production-grade caching orchestration.
* **Mobile Optimization:** Certain complex UI components require further refinement for smaller mobile viewports.
* **Advanced Error Recovery:** Redis failovers and deeper rate-limiting strategies are not yet fully hardened for massive scale.

---
*SkillSphere — Connect. Learn. Build.*
