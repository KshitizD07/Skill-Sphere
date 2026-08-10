# SkillSphere — API Reference Manual

Welcome to the **SkillSphere API Reference Manual**. This document details all available REST API endpoints exposed by the backend services of SkillSphere.

---

## 1. Global Specifications & Protocols

### 1.1 Base URL
All API requests must be prefixed with the `/api` route.
* **Development**: `http://localhost:5001/api`
* **Production**: `https://<your-backend-domain>/api`

### 1.2 Authentication
Authentication on SkillSphere is stateful and secured using JSON Web Tokens (JWT) stored in a secure, `httpOnly` cookie named `ss_token`.
* **Cookie Name**: `ss_token`
* **Session Lifetime**: 7 Days (configurable via `JWT_EXPIRES_IN`)
* **Transport security**: In production environments, cookies are set with `Secure; SameSite=None` flags to restrict cross-site transmission.

### 1.3 Rate Limiting
Rate limiting is enforced at the IP level using `express-rate-limit`:
* **Global API Limit**: Max 500 requests per 15 minutes.
* **Authentication Routes**: Max 10 registration/login requests per 15 minutes.
* **Skill Verification**: Max 20 verification requests per hour.
* **AI Roadmap Generation**: Max 20 roadmap requests per hour.
* **Squad Creation**: Max 5 squad creations per hour.
* **Squad Application**: Max 20 applications per hour.

### 1.4 Global Error Schema
When a request fails, the API returns a standard JSON error payload:
```json
{
  "error": "ERROR_CODE",
  "message": "Detailed description of the error."
}
```
Common HTTP status codes used:
* `400 Bad Request`: Schema validation error or invalid payload formats.
* `401 Unauthorized`: Missing or invalid `ss_token` session cookie.
* `403 Forbidden`: Insufficient permissions or role restrictions.
* `404 Not Found`: Resource does not exist.
* `409 Conflict`: Unique constraint violation (e.g., email already registered).
* `429 Too Many Requests`: Rate limit exceeded.

---

## 2. API Domain Reference

---

### 🔐 2.1 Authentication Domain (`/api/auth`)

#### `POST /api/auth/send-otp`
* **Auth Required**: No
* **Rate Limit Category**: Authentication
* **Description**: Dispatches a 6-digit OTP to the user's email address to start registration or password recovery.
* **Request Body**:
  ```json
  {
    "email": "student@college.edu"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Verification code sent to your email"
  }
  ```

#### `POST /api/auth/register`
* **Auth Required**: No
* **Rate Limit Category**: Authentication
* **Description**: Submits registration credentials, verifies the OTP code, registers the user, and sets the secure `ss_token` session cookie.
* **Request Body**:
  ```json
  {
    "email": "student@college.edu",
    "password": "Password123!",
    "name": "Jane Doe",
    "role": "STUDENT", 
    "college": "State University",
    "otp": "123456"
  }
  ```
  *(Note: `role` must be one of `STUDENT`, `ALUMNI`, or `GUEST`. `guestPersona` is optional if role is GUEST)*.
* **Success Response (`201 Created`)**:
  ```json
  {
    "user": {
      "id": "usr_9f1a2...",
      "name": "Jane Doe",
      "email": "student@college.edu",
      "role": "STUDENT",
      "college": "State University",
      "github": null,
      "guestPersona": null
    }
  }
  ```

#### `POST /api/auth/login`
* **Auth Required**: No
* **Rate Limit Category**: Authentication
* **Description**: Validates user credentials, creates a session, and sets the `ss_token` cookie.
* **Request Body**:
  ```json
  {
    "email": "student@college.edu",
    "password": "Password123!"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "user": {
      "id": "usr_9f1a2...",
      "name": "Jane Doe",
      "email": "student@college.edu",
      "role": "STUDENT",
      "college": "State University",
      "avatar": "https://...",
      "headline": "Aspiring React Developer",
      "github": "janedoe",
      "guestPersona": null
    }
  }
  ```

#### `GET /api/auth/verify`
* **Auth Required**: Yes
* **Description**: Validates current session cookie and returns matching user metadata.
* **Success Response (`200 OK`)**:
  ```json
  {
    "valid": true,
    "user": {
      "id": "usr_9f1a2...",
      "name": "Jane Doe",
      "email": "student@college.edu",
      "role": "STUDENT",
      "college": "State University",
      "avatar": "https://...",
      "headline": "Aspiring React Developer",
      "github": "janedoe",
      "guestPersona": null
    }
  }
  ```

#### `POST /api/auth/logout`
* **Auth Required**: Yes (degrades gracefully if expired)
* **Description**: Purges the `ss_token` cookie and invalidates the session.
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true
  }
  ```

---

### 👤 2.2 Profile Management Domain (`/api/users`)

#### `GET /api/users/me`
* **Auth Required**: Yes
* **Description**: Fetches the authenticated user's complete profile, including verified skills.
* **Success Response (`200 OK`)**:
  ```json
  {
    "id": "usr_9f1a2...",
    "name": "Jane Doe",
    "email": "student@college.edu",
    "role": "STUDENT",
    "college": "State University",
    "headline": "Aspiring React Developer",
    "bio": "Passionate software engineering student...",
    "avatar": "https://...",
    "github": "janedoe",
    "linkedin": "linkedin.com/in/janedoe",
    "createdAt": "2026-07-24T10:14:34Z",
    "skills": [
      {
        "id": "sk_8a2d3...",
        "name": "React",
        "level": "Intermediate",
        "isVerified": true,
        "calculatedScore": 7,
        "showLevel": true,
        "verificationUrl": "https://github.com/janedoe/my-react-app",
        "verificationSource": "GITHUB"
      }
    ]
  }
  ```

#### `PATCH /api/users/me`
* **Auth Required**: Yes
* **Description**: Updates profile details for the authenticated user.
* **Request Body**:
  ```json
  {
    "name": "Jane A. Doe",
    "headline": "Full-Stack Dev @ College",
    "bio": "Interested in distributed systems...",
    "avatar": "https://...",
    "github": "janedoe",
    "linkedin": "linkedin.com/in/janedoe",
    "college": "State University"
  }
  ```
* **Success Response (`200 OK`)**: Returns the updated user profile object.

#### `POST /api/users/me/skills`
* **Auth Required**: Yes
* **Description**: Replaces all unverified skills on the user's profile with a new set.
* **Request Body**:
  ```json
  {
    "skillIds": ["React", "Node.js", "PostgreSQL"]
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "count": 3
  }
  ```

#### `DELETE /api/users/me`
* **Auth Required**: Yes
* **Description**: Permanently purges the authenticated user's account, skills, applications, squad memberships, and notifications via database cascading. Clears the `ss_token` session cookie.
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Account deleted"
  }
  ```

---

### 🛡️ 2.3 Verification Domain (`/api/verify`)

#### `POST /api/verify/skill`
* **Auth Required**: Yes
* **Rate Limit Category**: Skill Verification (Max 20/hr)
* **Description**: Submits a GitHub repository for static analysis. The system parses source code files, scores implementation patterns using Gemini, and updates the skill status to verified if successful.
* **Request Body**:
  ```json
  {
    "userId": "usr_9f1a2...",
    "skillName": "React",
    "repoUrl": "https://github.com/janedoe/my-react-app",
    "showLevel": true
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "score": 8,
    "skill": {
      "name": "React",
      "calculatedScore": 8,
      "level": "Advanced"
    },
    "verifiedSkills": [
      { "skillName": "React", "score": 8 },
      { "skillName": "Node.js", "score": 7 },
      { "skillName": "Express", "score": 7 }
    ],
    "breakdown": {
      "reasoning": "Substantial Express routes and React component implementations found.",
      "filesAnalyzed": "package.json, server/app.js, client/src/App.jsx",
      "lastUpdate": "2026-08-10",
      "ownership": "Owner"
    }
  }
  ```

---

### 🤝 2.4 Squads & Missions Domain (`/api/squads`)

#### `GET /api/squads/feed`
* **Auth Required**: Yes
* **Description**: Lists active squads using paginated filters.
* **Query Parameters**:
  * `skill` (string, optional): Filter by required skill.
  * `maxScore` (number, optional): Max required score threshold.
  * `page` (number, optional): Page index (defaults to `1`).
  * `limit` (number, optional): Page size limit (defaults to `12`).
* **Success Response (`200 OK`)**:
  ```json
  {
    "squads": [
      {
        "id": "sqd_3b9e8...",
        "title": "React Hackathon Team",
        "description": "Building a marketplace application...",
        "event": "Innovate2026",
        "maxMembers": 4,
        "visibility": "PUBLIC",
        "slots": [
          {
            "id": "slt_4a2...",
            "requiredSkill": "React",
            "minScore": 5,
            "status": "OPEN"
          }
        ],
        "leader": {
          "id": "usr_9f1...",
          "name": "Jane Doe"
        }
      }
    ],
    "meta": {
      "total": 1,
      "page": 1,
      "totalPages": 1
    }
  }
  ```

#### `POST /api/squads`
* **Auth Required**: Yes
* **Rate Limit Category**: Squad Creation (Max 5/hr)
* **Description**: Creates a new squad, specifying collaboration slots.
* **Request Body**:
  ```json
  {
    "title": "AI Dev Squad",
    "description": "Collaborating on LLM API project...",
    "event": "Hack-AI-2026",
    "maxMembers": 3,
    "visibility": "PUBLIC",
    "slots": [
      {
        "requiredSkill": "Python",
        "minScore": 6
      }
    ]
  }
  ```
* **Success Response (`201 Created`)**: Returns the newly created squad object with generated IDs.

---

### 🤖 2.5 AI Roadmap Domain (`/api/ai`)

#### `POST /api/ai/generate-roadmap`
* **Auth Required**: Yes
* **Rate Limit Category**: AI Roadmap (Max 20/hr)
* **Description**: Compiles a personalized Markdown learning path based on the user's verified skills and target role.
* **Request Body**:
  ```json
  {
    "skill": "PostgreSQL",
    "role": "Backend Engineer"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "roadmap": "# Learning Roadmap: PostgreSQL to Backend Engineer\n\n## Weeks 1-2: Advanced Schemas...\n...",
    "targetSkill": "PostgreSQL",
    "targetRole": "Backend Engineer"
  }
  ```

---

### ⚡ 2.6 N.E.X.U.S. Engine Control Plane (`/api/antifragile`)
*(Admin exclusive management endpoints)*

#### `GET /api/antifragile/strategies`
* **Auth Required**: Yes (Admin only)
* **Description**: Lists all matching strategies registered on the consensus pool.
* **Success Response (`200 OK`)**:
  ```json
  [
    {
      "id": "str_1...",
      "name": "verified_skills_v1",
      "displayName": "Verified Skills Matcher",
      "state": "ACTIVE",
      "influenceLevel": "HIGH",
      "version": "1.0.0",
      "totalDecisions": 240,
      "consensusWins": 180
    }
  ]
  ```

#### `POST /api/antifragile/strategies/:id/promote`
* **Auth Required**: Yes (Admin only)
* **Description**: Promotes a strategy from `SHADOW` to `ACTIVE` mode.
* **Request Body**:
  ```json
  {
    "reason": "Promoting due to 88% acceptance rate in shadow observation"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "strategy": {
      "id": "str_1...",
      "state": "ACTIVE"
    }
  }
  ```
