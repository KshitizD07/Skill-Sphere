# SkillSphere

*Note: This project was built utilizing an agentic AI workflow.*

SkillSphere is a next-generation platform designed to bridge the gap between students and alumni by fostering skill-based networking, real-time collaboration, and community-driven learning. The platform intelligently matches users, verifies their skills, and provides dynamic learning roadmaps to help individuals achieve their career goals.

## 🚀 Key Features

*   **Secure Authentication & User Management:** Robust user authentication using JSON Web Tokens (JWTs) stored in secure, `httpOnly` cookies. Features include One-Time Password (OTP) verification for sign-up and password resets.
*   **Dynamic User Profiles & Skill Verification:** Users build comprehensive profiles, with a strong emphasis on quality. **A linked GitHub account is required**, and profiles without one are automatically pruned by a daily background job to maintain a high-quality network.
*   **Antifragile Nexus Engine:** A sophisticated, multi-strategy consensus engine that intelligently matches users. It uses a dynamic, data-driven feedback loop where different matching algorithms compete, and their success is tracked to promote the most effective strategies over time. This system is managed via a dedicated, admin-only API.
*   **Squads & Missions:** Users can form or join "Squads" to collaborate on specific projects, events, or learning missions. A daily background job handles maintenance of these squads.
*   **AI-Powered Learning Roadmaps:** Generates customized learning paths based on a user's current skills and desired career roles using the Google Generative AI API.
*   **Real-Time Communication & Notifications:** Instant messaging and global notifications are powered by a WebSocket server using Socket.io, providing immediate feedback for all user interactions.
*   **Global Feed & Social Interactions:** A central feed for users to share updates, post content, and engage with the community through likes and nested comments.

## 🏛️ Architecture

The SkillSphere platform is built on a modern, decoupled, full-stack architecture that emphasizes separation of concerns and scalability.

*   **Backend (Service-Oriented):** The Node.js server is designed with a service-oriented approach. Core business logic is encapsulated into distinct modules (e.g., Auth, Squads, Antifragile Engine). It exposes a comprehensive RESTful API for the client and handles real-time communication via a WebSocket layer. A background job scheduler (`node-cron`) manages routine database maintenance tasks.
*   **Frontend (Feature-Sliced):** The React client is structured using a **feature-sliced design**. Instead of grouping files by type (e.g., `components`, `hooks`), the codebase is organized by feature (e.g., `profile`, `chat`, `squads`). This makes the application highly modular, scalable, and easier for developers to navigate.

## 📚 Documentation

For deep-dives into the platform design, technical details, and APIs, refer to the following guides:
*   **[System Design Specification](file:///C:/Users/kshit/cs/skillsphere/docs/system_design.md)**: Follows industry standards to details system overview, high-level layouts, components, flows, external services, security, and future plans.
*   **[System Architecture](file:///C:/Users/kshit/cs/skillsphere/docs/ARCHITECTURE.md)**: Details structural layout, state machines, sequence diagrams, and N.E.X.U.S. Engine architecture.
*   **[API Reference Manual](file:///C:/Users/kshit/cs/skillsphere/docs/API_REFERENCE.md)**: Lists all public and admin endpoints, query params, schemas, and verification rules.
*   **[Key Features](file:///C:/Users/kshit/cs/skillsphere/docs/Features.md)**: Detailed breakdown of N.E.X.U.S., Squads, Verification, and AI roadmap generation.
*   **[Product Requirements](file:///C:/Users/kshit/cs/skillsphere/docs/Product_Requirements.md)**: Product specs, constraints, and target users.

## 🛠 Tech Stack

**Frontend (Client)**
*   **Framework:** React 19 (with Hooks) & Vite
*   **Architecture:** Feature-Sliced Design
*   **Styling:** Tailwind CSS & Framer Motion
*   **3D Elements:** React Three Fiber
*   **API Communication:** Axios
*   **Real-Time:** Socket.io-client
*   **Navigation:** React Router DOM

**Backend (Server)**
*   **Framework:** Node.js (ES Modules) with Express.js
*   **Architecture:** Service-Oriented
*   **Database:** PostgreSQL with Prisma ORM
*   **Authentication:** JWTs in `httpOnly` Cookies, OTPs
*   **Real-Time:** Socket.io
*   **Schema Validation:** Zod
*   **Background Jobs:** Node-cron
*   **Logging:** Winston
*   **AI:** `@google/generative-ai`

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
*   **Advanced Error Recovery:** Redis failovers and deeper rate-limiting strategies are not yet fully hardened for massive scale.

## 📄 License

Copyright (c) 2026 Kshitiz Dixit. All rights reserved.

This project is **proprietary**. All rights are reserved by the author. See the [LICENSE](LICENSE) file for the full legal text regarding usage, restrictions, and permissions.

---
*SkillSphere — Connect. Learn. Build.*
