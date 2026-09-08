# SkillSphere — System Design Specification

This document provides the formal system design specification for SkillSphere, a peer-to-peer networking, mentoring, and squad-building platform. It describes the component models, architectural layouts, and data flows that govern the platform.

---

## 1. System Overview

SkillSphere addresses the friction in student-alumni networking and peer collaboration by anchoring user profiles to verifiable proof-of-work. The system enables:
* **Verified Skill Profiles**: Technical competencies are scored and validated via automated analysis of public GitHub repositories, rather than self-reported claims.
* **Intelligent Team Assembly (N.E.X.U.S.)**: Squad leaders recruit collaborators for target roles using a multi-strategy consensus engine.
* **AI-Guided Career Paths**: Custom structured learning roadmaps are dynamically built using current skill scoring.
* **Real-Time Communication**: Multi-channel interactions occur over instant messages, global feeds, and push notifications.

---

## 2. High-Level Architecture

SkillSphere utilizes a decoupled client-server architecture designed for high availability, separation of concerns, and ease of deployment.

```mermaid
graph TB
    subgraph Client ["Client Tier (React 19 SPA — Vite + FSD)"]
        direction TB
        UI["User Interface (13 Feature Slices)"]
        WS_C["Socket.io Client"]
        HTTP_C["Axios Client (withCredentials)"]
    end

    subgraph API ["Server Tier (Node.js 22 & Express)"]
        direction TB
        GATE["API Gateway & 15 Route Modules"]
        WS_S["Socket.io Server (User Rooms)"]
        CRON["node-cron (4 Active Jobs)"]
        
        subgraph SVC ["Service Layer"]
            AUTH_S["Auth Service"]
            NEXUS_S["N.E.X.U.S. Engine"]
            VERIFY_S["Verification Service"]
            LEET_S["LeetCode Service"]
            PORT_S["Portfolio Service"]
            AI_S["AI Service"]
            SQUAD_S["Squad Service"]
            SEARCH_S["Search Service"]
            FEEDBACK_S["Feedback Service"]
        end
    end

    subgraph DATA ["Storage Tier"]
        DB[(PostgreSQL 16 Database — 28 Models)]
        CACHE[(Redis / Memory Cache)]
    end

    subgraph EXT ["External Services"]
        GH["GitHub REST API"]
        GEMINI["Gemini 2.5 Flash API"]
        LEET["LeetCode GraphQL API"]
        SMTP["Resend / SMTP Email"]
    end

    %% Client communication
    UI --> HTTP_C
    UI --> WS_C
    HTTP_C <-->|HTTPS REST + Cookies| GATE
    WS_C <-->|WSS Bidirectional| WS_S

    %% Internal routing
    GATE --> SVC
    WS_S --> SVC
    CRON -->|Scheduled Maintenance & Evolution| DB
    CRON --> CACHE

    %% Service dependencies
    SVC <-->|Prisma ORM| DB
    SVC <-->|Get/Set Cache (TTL 5m)| CACHE
    
    %% External integrations
    VERIFY_S -->|Fetch Repos & Git Trees| GH
    VERIFY_S -->|AST Code Audit| GEMINI
    LEET_S -->|DSA Submission Stats| LEET
    PORT_S -->|Sync & Showcase| GH
    AI_S -->|Career Roadmaps| GEMINI
    AUTH_S -->|Dispatch OTP| SMTP
```

---

## 3. Components

### 3.1 Authentication & Session Service
* **Responsibility**: Processes credentials, manages JWT token signatures, hashes passwords using `bcryptjs`, and handles OTP dispatching.
* **Session Strategy**: Stateless JWT session payload set directly on client requests via HTTP-Only, secure cookies.

### 3.2 N.E.X.U.S. Match Engine
* **Responsibility**: Orchestrates matching operations. Loads squad requirements, triggers dynamic scoring strategies (e.g. GitHub skill strength, college proximity, system activity) in parallel, and checks for consensus.
* **Consensus/Exploration Policy**: If strategies agree, the consensus candidate is recommended. If they disagree, it falls back to a weighted-random selection to maintain discovery diversity.

### 3.3 Skill Verification Engine
* **Responsibility**: Validates candidate capabilities. Performs GitHub project parsing, fetches source code trees, and forwards top files to the generative AI classifier for evaluation.

### 3.4 AI Roadmap Service
* **Responsibility**: Maps current verified skills against desired roles to construct structured learning markdown templates.

### 3.5 Real-Time Communication Hub
* **Responsibility**: Maintains active WebSocket connections for direct messages, feed activity hooks, and notification pushes.

---

## 4. Data Flow

### 4.1 Skill Verification Sequence
The diagram below details the sequence from a user submitting a GitHub URL to retrieving their AI-verified skill score.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Client as Client Application
    participant API as Server (Verify Service)
    participant GH as GitHub REST API
    participant AI as Gemini 2.5 Flash API
    participant DB as PostgreSQL Database
    participant Cache as Redis / Memory Cache

    User->>Client: Submit Repo URL & Skill Name
    Client->>API: POST /api/verify/skill { skillName, repoUrl }
    API->>API: Verify Ownership, Anti-Cheat (Reject forks/archived)
    API->>GH: Fetch Recursive Git Tree (/git/trees/{branch}?recursive=1)
    GH-->>API: Return Source Tree & File Paths
    API->>API: Sample up to 8 Categorized Files (~3,500 chars each across 5 pools)
    API->>API: Wrap code in <user_repository_code> (Prompt Injection Guard)
    API->>AI: Send Audit Prompt + Code + Unverified Profile Skills
    Note over AI: Evaluate structure, complexity,<br/>patterns & auto-discover secondary skills
    AI-->>API: Return JSON { score: 1-10, level, reasoning, discoveredSkills }
    API->>DB: Upsert Primary & Discovered Skills (isVerified=true)
    API->>Cache: Invalidate User Profile Cache (TTL 5m)
    API->>Client: Send Execution Outcome Response
    Client->>User: Render Verified Score Ring, Level Badge & Evidence
```

---

## 5. Authentication Flow

SkillSphere enforces stateless JWT sessions using HTTP-Only cookies. The login and token validation sequences are structured as follows:

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Client as Client Browser
    participant API as Express Router
    participant Auth as Auth Service
    participant DB as PostgreSQL
    
    %% Login Flow
    User->>Client: Input Credentials (email, password)
    Client->>API: POST /api/auth/login
    API->>Auth: authenticate(email, password)
    Auth->>DB: Query User Profile by Email
    DB-->>Auth: Return User Profile (with hashed password)
    Auth->>Auth: bcrypt.compare(input, hash)
    
    alt Credentials Invalid
        Auth-->>API: Throw Unauthorized Exception
        API-->>Client: 401 Unauthorized Response
    else Credentials Valid
        Auth->>Auth: Sign JWT Token (User Info, Role)
        Auth-->>API: Return Signed Token
        API->>API: Set httpOnly cookie 'ss_token'
        API-->>Client: 200 OK (User Profile JSON)
    end
    
    %% Token Validation Flow
    Note over Client, API: Subsequent request (e.g. GET /api/users/me)
    Client->>API: Send Request (Cookie: ss_token)
    API->>API: authenticateToken middleware
    API->>API: jwt.verify(ss_token, JWT_SECRET)
    alt Token Invalid / Expired
        API-->>Client: 401 Unauthorized Response
    else Token Valid
        API->>API: Mount payload on req.user
        API-->>Client: Processed Resource Response
    end
```

---

## 6. Database Interaction

SkillSphere accesses PostgreSQL via the Prisma Client. 

### 6.1 Data Model Diagram
```mermaid
erDiagram
    User ||--o{ Skill : "possesses"
    User ||--o{ GitHubRepo : "syncs"
    User ||--o{ Post : "creates"
    User ||--o{ Like : "gives"
    User ||--o{ Comment : "writes"
    User ||--o{ CommentLike : "likes comment"
    User ||--o{ Squad : "leads"
    User ||--o{ SquadApplication : "submits"
    User ||--o{ MatchDecision : "selected in"
    User ||--o{ Roadmap : "generates"
    User ||--o{ InAppNotification : "receives"
    User ||--o{ ActivityLog : "logs action"
    User ||--o{ ContentReport : "submits report"
    User ||--o{ Follow : "follows / followed by"
    User }o--o{ Conversation : "participates in"
    User ||--o{ Message : "sends"

    Squad ||--|{ SquadSlot : "contains"
    Squad ||--o{ SquadApplication : "receives"
    Squad ||--o{ MatchDecision : "triggers"
    SquadSlot ||--o{ SquadApplication : "targeted by"
    
    MatchDecision ||--o| MatchOutcome : "has outcome"
    MatchDecision ||--o| SquadApplication : "links to"
    MatchStrategy ||--o{ MatchDecision : "votes in"
    MatchStrategy ||--o{ StrategyPerformance : "tracked by"
    MatchStrategy ||--o{ StrategyPromotion : "logs evolution"

    Post ||--o{ Like : "has"
    Post ||--o{ Comment : "has"
    Comment ||--o{ Comment : "replies to"
    Comment ||--o{ CommentLike : "receives likes"

    Conversation ||--|{ Message : "contains"
    JobRole ||--|{ JobRoleSkill : "requires"
```

### 6.2 Key Operational Interactions
* **Daily Cleaning Cron**: A background process runs daily to identify and delete unverified `GUEST` or `STUDENT` profiles lacking a connected GitHub link.
* **Cached Reads**: User profiles and verified skills are cached inside an in-memory/Redis engine using a `300s` TTL. Updates to profiles immediately invalidate the cache.

---

## 7. External Services

* **GitHub REST API**: Used to inspect repository branches, verify code ownership, and fetch raw file streams.
* **Google Generative AI (Gemini 2.5 Flash)**:
  * Analyzes source code files for verification to generate a score (1–10) and qualitative review.
  * Formulates structured, milestone-based roadmaps containing analagous comparisons to existing skills.
* **Nodemailer SMTP Integration**: Dispatches OTPs to user mailboxes.

---

## 8. Scalability Considerations

* **Decoupling Heavy Computations (Message Queue)**: Move code verification and roadmap generation out of the HTTP cycle and into a background worker queue (e.g., BullMQ + Redis).
* **WebSocket Message Syncing (Redis Adapter)**: Implement the Socket.io Redis Adapter to propagate messages across multiple backend instances behind a load balancer.
* **Process Separation**: Partition the application deployment into an HTTP/WS Router node, a Cron Runner node, and a Background Queue Worker node.

---

## 9. Security Considerations

* **Stateless Token Protection**: Session cookies utilize the `HttpOnly` and `Secure` attributes, coupled with `SameSite=None` (where cross-origin is required) to prevent script-based exfiltration.
* **Zod Schema Enforcement**: Input validation is enforced at the entry routers to sanitize database queries.
* **Endpoint Protection & Rate Limits**: Rate-limit stores block denial-of-service attempts, specifically on AI roadmap generation, code verification, and authentication routes.

---

## 10. Future Architecture

To support growing traffic, the system should transition to the target state below:

```mermaid
graph TB
    subgraph Public ["Edge Layer"]
        LB[Load Balancer]
    end

    subgraph API_Nodes ["Web Tier"]
        API_1[Express Node 1]
        API_2[Express Node 2]
    end

    subgraph WS_Adapter ["WebSocket Synchronization"]
        REDIS_PUB[Redis Pub/Sub Adapter]
    end

    subgraph Queue_Cluster ["Asynchronous Work Tier"]
        BULL[BullMQ Queue Manager]
        WORKER_1[Gemini Worker Node 1]
        WORKER_2[Gemini Worker Node 2]
    end

    subgraph Data_Cluster ["Storage Tier"]
        DB_WRITE[(PostgreSQL Write Primary)]
        DB_READ[(PostgreSQL Read Replica)]
        REDIS_CACHE[(Redis Cluster Cache/Queue)]
    end

    %% Connections
    LB --> API_1
    LB --> API_2
    
    API_1 <--> REDIS_PUB
    API_2 <--> REDIS_PUB

    API_1 & API_2 -->|Enque Verify Jobs| BULL
    BULL --> REDIS_CACHE
    REDIS_CACHE --> WORKER_1 & WORKER_2
    
    WORKER_1 & WORKER_2 -->|Update Verification Status| DB_WRITE
    
    API_1 & API_2 -->|Read Profile| DB_READ
    API_1 & API_2 -->|Write Operations| DB_WRITE
```
* **Database Scaling**: Implement read/write replicas to offload read operations from the primary transactional database node.
* **Queue-Driven Verification**: Users receive a job ID (`202 Accepted`) on verification requests, poll or wait for WebSockets to return updates, and let workers process tasks at a controlled ingestion rate.
