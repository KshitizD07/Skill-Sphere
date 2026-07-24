# SkillSphere — System Architecture

> **Document Version:** 2.0  
> **Last Updated:** July 2026  
> **Author:** Kshitiz Dixit  
> **Status:** Production

---

## Table of Contents

| # | Section |
|---|---------|
| 5.1 | [High-Level System Architecture](#51-high-level-system-architecture) |
| 5.2 | [Backend Component Architecture](#52-backend-component-architecture) |
| 5.3 | [Frontend Architecture](#53-frontend-architecture) |
| 5.4 | [Database Architecture](#54-database-architecture) |
| 5.5 | [Authentication Flow](#55-authentication-flow) |
| 5.6 | [Request Processing Flow](#56-request-processing-flow) |
| 5.7 | [Data Flow](#57-data-flow) |
| 5.8 | [N.E.X.U.S. Engine Architecture](#58-nexus-engine-architecture) |
| 5.9 | [AI Roadmap Architecture](#59-ai-roadmap-architecture) |
| 5.10 | [Real-Time Communication](#510-real-time-communication) |
| 5.11 | [Deployment Architecture](#511-deployment-architecture) |
| 5.12 | [Background Jobs](#512-background-jobs) |
| 5.13 | [Future Scalability](#513-future-scalability) |

---

## 5.1 High-Level System Architecture

SkillSphere is a **decoupled, full-stack platform** running a React 19 SPA on Vercel against a Node.js/Express API deployed on Railway. A WebSocket layer runs co-located with the HTTP server. All persistent state lives in a managed PostgreSQL database, with Redis serving as an optional cache and rate-limit store.

```mermaid
graph TB
    subgraph CLIENT["🖥️  Client Tier  —  Vercel"]
        direction TB
        BROWSER["React 19 SPA\nVite + Feature-Sliced Design"]
        WS_CLIENT["Socket.io-client\nWebSocket Connection"]
    end

    subgraph SERVER["⚙️  Server Tier  —  Railway"]
        direction TB
        HTTP["Express.js HTTP Server\nPort :5001"]
        WS_SERVER["Socket.io Server\nBidirectional Events"]
        CRON["node-cron\nBackground Job Scheduler"]

        subgraph SERVICES["Business Logic Layer"]
            AUTH_SVC["Auth Service\nJWT · OTP · Bcrypt"]
            MATCH_SVC["Match Orchestrator\nN.E.X.U.S. Engine"]
            AI_SVC["AI Service\nGemini 2.5 Flash"]
            VERIFY_SVC["Verify Service\nGitHub · Gemini"]
            SQUAD_SVC["Squad Service\nGatekeeper"]
            SKILL_SVC["Skill Service"]
            EMAIL_SVC["Email Service\nResend · SMTP"]
        end

        subgraph MIDDLEWARE["Middleware Chain"]
            HELMET["Helmet\nSecurity Headers"]
            CORS_MW["CORS Whitelist"]
            GZIP["Gzip Compression"]
            RATELIMIT["Rate Limiter\nRedis-backed"]
            AUTH_MW["JWT Auth Guard"]
            ZOD["Zod Schema Validator"]
        end
    end

    subgraph DATA["🗄️  Data Tier"]
        POSTGRES[("PostgreSQL 15\nPrisma ORM")]
        REDIS[("Redis\nCache · Rate Limits")]
    end

    subgraph EXTERNAL["🌐  External APIs"]
        GEMINI["Google Gemini\n2.5 Flash"]
        GITHUB_API["GitHub REST API\nRepo · Language Analysis"]
        RESEND["Resend / SMTP\nTransactional Email"]
    end

    BROWSER -- "REST  HTTPS + Gzip" --> HTTP
    WS_CLIENT -- "WSS  Persistent" --> WS_SERVER
    HTTP --> MIDDLEWARE --> SERVICES
    WS_SERVER --> SERVICES
    CRON --> SERVICES
    SERVICES --> POSTGRES
    SERVICES --> REDIS
    AI_SVC --> GEMINI
    VERIFY_SVC --> GITHUB_API
    VERIFY_SVC --> GEMINI
    EMAIL_SVC --> RESEND
```

---

## 5.2 Backend Component Architecture

The backend follows a **layered, service-oriented design**. Routes are thin controllers that delegate all business logic to dedicated service classes. Repositories (Prisma queries) are co-located with services, not separated into a DAO layer.

```mermaid
graph TB
    subgraph ENTRY["Entry Point — index.js"]
        BOOT["Startup Validation\nRequired ENV check"]
        MWARE["Middleware Mount\nHelmet · CORS · Gzip · Morgan"]
        ROUTE_MOUNT["Route Registration\n11 Route Modules"]
        SOCKET_INIT["Socket.io Init\n socket.js"]
        JOB_INIT["Cron Scheduler\n setupJobs()"]
        HEALTH["/health\nDB + Cache probe"]
    end

    subgraph ROUTES["Routes Layer — /routes/*.js"]
        R_AUTH["auth.js\nPOST /auth/*"]
        R_USERS["users.js\nGET|PUT /users/*"]
        R_SKILLS["skills.js\n/skills"]
        R_VERIFY["verify.js\n/verify"]
        R_SQUADS["squads.js\n/squads"]
        R_POSTS["posts.js\n/posts"]
        R_AI["ai.js\n/ai/roadmap"]
        R_CHAT["chat.js\n/chat"]
        R_NOTIF["notifications.js\n/notifications"]
        R_ANTI["antifragile.js\n/antifragile"]
        R_ACT["activity.js\n/activity"]
    end

    subgraph SVC["Services Layer — /services/*.js"]
        SVC_AI["aiService.js\ngenerateRoadmap()"]
        SVC_MATCH["matchOrchestrator.js\nmatchCandidatesForSlot()"]
        SVC_CONSENSUS["consensusEngine.js\ncheckConsensus()"]
        SVC_REG["strategyRegistry.js\ngetActiveStrategies()"]
        SVC_LOG["decisionLogger.js\nlogDecision()"]
        SVC_GATE["gatekeeper.js\ncheckEligibility()"]
        SVC_VERIFY["verifyService.js\nverifySkill()"]
        SVC_SQUAD["squadService.js\ncreateFindJoin()"]
        SVC_SKILL["skillService.js"]
        SVC_EMAIL["emailService.js\nsendOtp()"]
        SVC_ACT["activityService.js"]

        subgraph STRATEGIES["Matching Strategies — /strategies/"]
            STR1["verified_skills_v1.js"]
            STR2["activity_score_v1.js"]
            STR3["college_proximity_v1.js"]
        end
    end

    subgraph UTILS["Utilities — /utils/*.js"]
        CACHE["cache.js\nRedis or MemoryStore"]
        LOGGER["logger.js\nWinston + Daily-Rotate"]
        ERR["errorHandler.js\nApiError · asyncHandler"]
        NOTIFY["notify.js\nIn-app notification push"]
    end

    subgraph MW["Middleware — /middleware/*.js"]
        AUTH_MID["auth.js\nauthenticateToken()"]
        RATE_MID["rateLimiter.js\nmakeLimiter() factory"]
    end

    ENTRY --> ROUTES
    ROUTES --> MW
    ROUTES --> SVC
    SVC_MATCH --> SVC_CONSENSUS
    SVC_MATCH --> SVC_REG
    SVC_MATCH --> SVC_LOG
    SVC_MATCH --> STRATEGIES
    SVC_GATE --> CACHE
    MW --> CACHE
    SVC --> LOGGER
    SVC --> ERR
```

---

## 5.3 Frontend Architecture

The client is a **Feature-Sliced Design (FSD)** React 19 application. Code is organised by business domain, not by technical type. Each feature folder owns its own components, hooks, and API calls.

```mermaid
graph TB
    subgraph ROOT["src/"]
        MAIN["main.jsx\nReact root · Providers"]
        API_JS["api.js\nAxios instance\nbaseURL · withCredentials"]
    end

    subgraph APP["src/app/"]
        APP_JSX["App.jsx\nReact Router v6\nRoute-level lazy loading"]
        PROVIDERS["Providers\nAuthContext · SocketContext"]
    end

    subgraph FEATURES["src/features/  —  Feature-Sliced Modules"]
        F_AUTH["auth/\nLogin · Register\nForgot · OTP forms"]
        F_PROFILE["profile/\nProfile view · Edit\nSkill badges"]
        F_SKILLS["skills/\nSkill cards · Verify flow\nGitHub repo submit"]
        F_SQUADS["squads/\nMission Board · Squad detail\nApply modal · Slot cards"]
        F_CHAT["chat/\nDM drawer\nSocket.io consumer"]
        F_NETWORK["network/\nUser directory\nFilter · Search"]
        F_ADMIN["admin/\nN.E.X.U.S. dashboard\nStrategy management"]
    end

    subgraph PAGES["src/pages/  —  Route Pages"]
        PG_LAND["LandingPage.jsx\nHero · 3D Feature Sphere"]
        PG_DASH["Dashboard.jsx\nSkill gap · AI roadmap"]
        PG_FEED["GlobalFeed.jsx\nPosts · Likes · Comments"]
        PG_PROF["MyProfile.jsx"]
        PG_NET["Network.jsx"]
        PG_MISS["MissionBoard.jsx"]
    end

    subgraph SHARED["src/shared/  —  Cross-cutting"]
        NAVBAR["Navbar.jsx\nResponsive · Hamburger\nNexus Portal animation"]
        PROTECTED["ProtectedRoute.jsx"]
        UI_COMP["Common UI Components\nButtons · Modals · Loaders"]
    end

    subgraph SERVICES["src/services/  —  API Calls"]
        AUTH_API["authService.js"]
        USER_API["userService.js"]
        SQUAD_API["squadService.js"]
        FEED_API["feedService.js"]
    end

    subgraph CONFIG["src/config/"]
        SOCKET_CFG["socket.js\nSocket.io-client setup"]
    end

    MAIN --> APP_JSX
    APP_JSX --> PAGES
    APP_JSX --> SHARED
    PAGES --> FEATURES
    FEATURES --> SERVICES
    SERVICES --> API_JS
    F_CHAT --> SOCKET_CFG
    FEATURES --> SHARED
```

---

## 5.4 Database Architecture

PostgreSQL 15 managed via **Prisma ORM**. The schema is partitioned into five logical domains: Identity, Skills, Social Feed, Squad/Mission System, and the Antifragile Matching Engine.

```mermaid
erDiagram
    USER {
        uuid    id           PK
        string  email        UK
        string  password
        string  name
        enum    role
        string  github
        string  college
        string  headline
        string  bio
        string  avatar
        datetime createdAt
    }

    SKILL {
        uuid    id              PK
        uuid    userId          FK
        string  name
        string  level
        boolean isVerified
        string  verificationUrl
        enum    verificationSource
        int     calculatedScore
        datetime verifiedAt
    }

    JOBROLE {
        uuid    id          PK
        string  title       UK
        string  description
    }

    JOBROLESKILL {
        uuid    id         PK
        uuid    jobRoleId  FK
        string  skillName
        string  importance
    }

    POST {
        uuid     id        PK
        uuid     userId    FK
        string   content
        string   imageUrl
        datetime createdAt
    }

    LIKE {
        uuid     id        PK
        uuid     postId    FK
        uuid     userId    FK
    }

    COMMENT {
        uuid     id       PK
        uuid     postId   FK
        uuid     userId   FK
        string   content
        uuid     parentId FK
    }

    SQUAD {
        uuid     id             PK
        string   title
        string   description
        string   event
        enum     visibility
        int      maxMembers
        int      currentMembers
        enum     status
        uuid     leaderId       FK
        datetime expiresAt
    }

    SQUADSLOT {
        uuid     id              PK
        uuid     squadId         FK
        string   roleTitle
        string   requiredSkill
        int      minScore
        boolean  requireVerified
        enum     status
    }

    SQUADAPPLICATION {
        uuid     id        PK
        uuid     squadId   FK
        uuid     userId    FK
        uuid     slotId    FK
        enum     status
        int      matchScore
    }

    MATCHSTRATEGY {
        uuid     id             PK
        string   name           UK
        enum     state
        enum     influenceLevel
        int      totalDecisions
        int      consensusWins
        int      soloWins
        json     config
    }

    MATCHDECISION {
        uuid     id               PK
        uuid     squadId          FK
        uuid     selectedUserId   FK
        boolean  wasConsensus
        boolean  wasRandom
        json     strategyVotes
        json     activeStrategies
    }

    MATCHOUTCOME {
        uuid     id             PK
        uuid     decisionId     FK
        boolean  accepted
        int      timeToDecision
        boolean  retention30d
        boolean  retention60d
        boolean  squadCompleted
        int      leaderRating
    }

    STRATEGYPERFORMANCE {
        uuid     id             PK
        uuid     strategyId     FK
        datetime windowStart
        float    acceptanceRate
        float    retention30dRate
        int      rankInWindow
    }

    CONVERSATION {
        uuid     id        PK
        datetime updatedAt
    }

    MESSAGE {
        uuid     id             PK
        uuid     conversationId FK
        uuid     senderId       FK
        string   content
        boolean  isRead
    }

    INAPPNOTIFICATION {
        uuid     id        PK
        uuid     userId    FK
        string   type
        string   title
        string   message
        boolean  isRead
        string   actionUrl
    }

    ALLOWEDEMAIL {
        uuid     id    PK
        string   email UK
    }

    OTPVERIFICATION {
        uuid     id        PK
        string   email
        string   otp
        datetime expiresAt
        boolean  used
    }

    USER         ||--o{ SKILL                : "possesses"
    USER         ||--o{ POST                 : "creates"
    USER         ||--o{ LIKE                 : "gives"
    USER         ||--o{ COMMENT              : "writes"
    USER         ||--o{ SQUAD                : "leads"
    USER         ||--o{ SQUADAPPLICATION     : "submits"
    USER         ||--o{ MATCHDECISION        : "selected by"
    USER         ||--o{ MESSAGE              : "sends"
    USER         }o--o{ CONVERSATION         : "participates in"
    USER         ||--o{ INAPPNOTIFICATION    : "receives"
    POST         ||--o{ LIKE                 : "has"
    POST         ||--o{ COMMENT              : "has"
    COMMENT      ||--o{ COMMENT              : "replies to"
    SQUAD        ||--|{ SQUADSLOT            : "has"
    SQUAD        ||--o{ SQUADAPPLICATION     : "receives"
    SQUAD        ||--o{ MATCHDECISION        : "triggers"
    SQUADSLOT    ||--o{ SQUADAPPLICATION     : "targeted by"
    MATCHDECISION ||--o| MATCHOUTCOME        : "produces"
    MATCHSTRATEGY ||--o{ MATCHDECISION       : "votes in"
    MATCHSTRATEGY ||--o{ STRATEGYPERFORMANCE : "tracked by"
    JOBROLE      ||--|{ JOBROLESKILL         : "requires"
    CONVERSATION ||--|{ MESSAGE              : "contains"
```

---

## 5.5 Authentication Flow

SkillSphere uses a **two-step OTP → JWT Cookie** model. Registration is gated behind email OTP verification. Session tokens are stored in `httpOnly` cookies that are never accessible to JavaScript, preventing XSS-based token theft.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Client as React Client
    participant Auth as /api/auth
    participant Email as Email Service
    participant DB as PostgreSQL

    rect rgb(20, 40, 80)
        Note over User,DB: REGISTRATION FLOW
        User->>Client: Fills form (email, name, role, password)
        Client->>Auth: POST /api/auth/send-otp
        Auth->>DB: Check email not already registered
        DB-->>Auth: Not found OK
        Auth->>Email: sendOtp() — generate 6-digit OTP, persist OtpVerification
        Email-->>User: OTP email delivered

        User->>Client: Enters OTP
        Client->>Auth: POST /api/auth/register with OTP
        Auth->>Auth: Zod schema validation
        Auth->>DB: verifyOtp() — check expiry + used flag
        DB-->>Auth: OTP valid
        Auth->>Auth: bcrypt.hash(password, 12)
        Auth->>DB: prisma.user.create()
        Auth->>DB: ActivityLog ACCOUNT_CREATED
        Auth->>Auth: jwt.sign payload 7d expiry
        Auth-->>Client: Set-Cookie ss_token httpOnly Secure SameSite=None
        Auth-->>Client: 201 user object
    end

    rect rgb(20, 60, 40)
        Note over User,DB: LOGIN FLOW
        User->>Client: Enters email and password
        Client->>Auth: POST /api/auth/login
        Auth->>Auth: Zod validate and authLimiter 50 req per 15 min
        Auth->>DB: findUser by email case-insensitive
        DB-->>Auth: User record
        Auth->>Auth: bcrypt.compare password vs hash
        Auth->>DB: ActivityLog USER_LOGIN
        Auth->>Auth: jwt.sign 7d
        Auth-->>Client: Set-Cookie ss_token
        Auth-->>Client: 200 user object
    end

    rect rgb(60, 20, 40)
        Note over User,DB: SESSION VERIFY — every page load
        Client->>Auth: GET /api/auth/verify — cookie auto-sent
        Auth->>Auth: authenticateToken() jwt.verify
        Auth->>DB: prisma.user.findUnique
        Auth-->>Client: 200 valid true plus user
    end

    rect rgb(40, 20, 60)
        Note over User,DB: PASSWORD RESET
        User->>Client: Forgot Password
        Client->>Auth: POST /api/auth/forgot-password
        Auth->>DB: Check user silently — anti-enumeration
        Auth->>Email: sendOtp()
        Email-->>User: Reset OTP

        User->>Client: Enters OTP and new password
        Client->>Auth: POST /api/auth/reset-password
        Auth->>DB: verifyOtp then bcrypt.hash then user.update
        Auth->>Auth: clearTokenCookie — force re-login
        Auth-->>Client: 200 success
    end
```

---

## 5.6 Request Processing Flow

Every inbound HTTP request passes through a deterministic **middleware chain** before reaching any business logic. This chain handles security hardening, rate limiting, authentication, and validation in that exact order.

```mermaid
flowchart TD
    REQ(["Inbound HTTP Request"])

    subgraph MW1["Layer 1 — Transport Security"]
        HELMET["Helmet — CSP HSTS XSS headers"]
        CORS_CHECK["CORS Origin Whitelist Check"]
        GZIP_DEC["Gzip Response Compression"]
        COOKIE_PARSE["Cookie Parser — reads ss_token"]
        BODY["Body Parser — JSON up to 10 MB"]
        MORGAN["Morgan Logger — HTTP to Winston"]
    end

    subgraph MW2["Layer 2 — Rate Limiting"]
        GLOBAL["apiLimiter — 100 req per 60s"]
        SPECIFIC{{"Route-specific limiter?"}}
        AUTH_LIM["authLimiter — 50 req per 15 min"]
        AI_LIM["aiLimiter — 20 req per hr"]
        VERIFY_LIM["verifyLimiter — 20 req per hr"]
        RL_CACHE["Redis or MemoryStore counter"]
        RL_OK{"Allowed?"}
        RATE_ERR(["429 Too Many Requests"])
    end

    subgraph MW3["Layer 3 — Authentication"]
        AUTH_GUARD{"Protected route?"}
        JWT_VERIFY["authenticateToken — jwt.verify cookie"]
        JWT_OK{"Valid token?"}
        AUTH_ERR(["401 Unauthorized"])
        ATTACH["Attach req.user userId email role"]
    end

    subgraph MW4["Layer 4 — Validation and Logic"]
        ZOD_PARSE["Zod Schema Validation"]
        ZOD_OK{"Valid schema?"}
        ZOD_ERR(["400 Bad Request"])
        HANDLER["Route Handler — delegate to Service"]
        SERVICE["Service Layer — Business Logic"]
        PRISMA["Prisma ORM — PostgreSQL Query"]
        RESPONSE(["2xx JSON Response Gzip compressed"])
    end

    subgraph ERR_HANDLER["Global Error Handler"]
        ERR_MW["errorMiddleware — ApiError to JSON"]
        ERR_RESP(["4xx or 5xx JSON Error"])
    end

    REQ --> HELMET --> CORS_CHECK --> GZIP_DEC --> COOKIE_PARSE --> BODY --> MORGAN
    MORGAN --> GLOBAL --> RL_CACHE --> RL_OK
    RL_OK -- "No" --> RATE_ERR
    RL_OK -- "Yes" --> SPECIFIC
    SPECIFIC -- "Yes" --> AUTH_LIM & AI_LIM & VERIFY_LIM --> AUTH_GUARD
    SPECIFIC -- "No" --> AUTH_GUARD
    AUTH_GUARD -- "Protected" --> JWT_VERIFY --> JWT_OK
    JWT_OK -- "Invalid" --> AUTH_ERR
    JWT_OK -- "Valid" --> ATTACH --> ZOD_PARSE
    AUTH_GUARD -- "Public" --> ZOD_PARSE
    ZOD_PARSE --> ZOD_OK
    ZOD_OK -- "Invalid" --> ZOD_ERR
    ZOD_OK -- "Valid" --> HANDLER --> SERVICE --> PRISMA --> RESPONSE
    SERVICE -. "throws ApiError" .-> ERR_MW --> ERR_RESP
```

---

## 5.7 Data Flow

This diagram traces how data travels through the system for the five primary platform operations: authentication, squad application, feed post, skill verification, and AI roadmap generation.

```mermaid
flowchart LR
    subgraph INPUT["User Actions"]
        A1["Register or Login"]
        A2["Apply to Squad"]
        A3["Post to Feed"]
        A4["Verify Skill via GitHub"]
        A5["Request AI Roadmap"]
    end

    subgraph PROCESSING["Processing Layer"]
        direction TB
        P1["Auth Service\nOTP validate then JWT mint"]
        P2["Gatekeeper Service\n6-phase eligibility check"]
        P2B["Match Orchestrator\nParallel strategy execution"]
        P3["Feed Controller\nPrisma CRUD"]
        P4["Verify Service\nGitHub API then Gemini score"]
        P5["AI Service\nGemini personalized prompt"]
    end

    subgraph STORAGE["Storage Layer"]
        direction TB
        DB1[("PostgreSQL\nUser Skill Post")]
        DB2[("PostgreSQL\nSquad Application Decision")]
        DB3[("Redis or Memory\nRate limit counters")]
    end

    subgraph OUTPUT["Responses"]
        O1["JWT Cookie plus User JSON"]
        O2["Match result Decision ID Alternatives"]
        O3["Post object plus Activity log"]
        O4["Skill score 0-10 plus Notification"]
        O5["Markdown Roadmap text"]
    end

    subgraph REALTIME["Real-Time Side-Effects"]
        RT1["Socket.io NOTIFICATION emit\nto receiver room"]
        RT2["InAppNotification persisted\nPrisma write"]
    end

    A1 --> P1 --> DB1 --> O1
    A2 --> P2 --> P2B --> DB2 --> O2
    P2B --> RT1 & RT2
    A3 --> P3 --> DB1 --> O3
    A4 --> P4 --> DB1 --> O4
    O4 --> RT1
    A5 --> P5 --> O5
    P2 --> DB3
    P1 --> DB3
```

---

## 5.8 N.E.X.U.S. Engine Architecture

The **Antifragile N.E.X.U.S. Engine** is the core differentiator of SkillSphere. It is an evolutionary multi-strategy matching system where algorithms compete, and poor performers are automatically demoted based on real-world retention and acceptance outcomes.

```mermaid
flowchart TD
    subgraph INPUT["Match Request"]
        TRIGGER["Squad Leader triggers match\nPOST /api/antifragile/match"]
        PARAMS["Inputs: squadId, slotId, candidates array"]
    end

    subgraph ORCHESTRATOR["Match Orchestrator — matchOrchestrator.js"]
        LOAD_CTX["1. Load Context\nSquad + Slot details\nCandidate profiles with skills"]

        subgraph REGISTRY["Strategy Registry — strategyRegistry.js"]
            ACTIVE["Fetch ACTIVE strategies\ninfluenceLevel HIGH MEDIUM LOW"]
            SHADOW["Fetch SHADOW strategies\nobserve-only no vote weight"]
            SYS_CFG["System Config\nminConsensus randomnessRate"]
        end

        subgraph EXEC["2. Parallel Strategy Execution — Promise.allSettled"]
            direction LR
            STR_VS["verified_skills_v1\nScore by GitHub-verified skills\nvs slot requiredSkill + minScore"]
            STR_AS["activity_score_v1\nScore by platform activity\npost squad login recency"]
            STR_CP["college_proximity_v1\nScore by college match\nwith squad leader"]
            TIMEOUT["5s timeout per strategy\nPromise.race guard"]
        end

        subgraph CONSENSUS["3. Consensus Engine — consensusEngine.js"]
            COUNT["Count votes per candidate\nActive strategies only"]
            CHECK{"Votes >= minConsensusStrategies\nfor same candidate?"}
            CONSENSUS_WIN["CONSENSUS PATH\nSelect agreed candidate\nwasConsensus = true"]
            RANDOM_PATH["EXPLORATION PATH\nWeighted-random selection\nweights capped at 2.0\nwasRandom = true"]
        end

        subgraph LOGGING["4. Decision Logger — decisionLogger.js"]
            LOG_DEC["Persist MatchDecision record\nstrategyVotes JSON snapshot\nactiveStrategies list"]
            AWAIT_OUT["Await MatchOutcome\nacceptedAt retention30d leaderRating"]
        end

        subgraph EVOLUTION["5. Strategy Evolution — Feedback Loop"]
            PERF["StrategyPerformance\nweekly acceptanceRate retention30dRate"]
            PROMOTE{"Performance\nabove threshold?"}
            DEMOTE_ACT["SHADOW to DEPRECATED\nLow acceptance or retention"]
            PROMOTE_ACT["SHADOW to ACTIVE\nHigh performance"]
            ADJUST["Adjust influenceLevel\nLOW MEDIUM HIGH"]
        end
    end

    subgraph OUTPUT["Match Result"]
        RESULT["recommendedUserId\nalternatives array\ndecisionId\nexplanation method confidence\nmeta executionTimeMs"]
    end

    TRIGGER --> PARAMS --> LOAD_CTX
    LOAD_CTX --> REGISTRY
    REGISTRY --> EXEC
    STR_VS & STR_AS & STR_CP --> TIMEOUT --> CONSENSUS
    COUNT --> CHECK
    CHECK -- "Yes" --> CONSENSUS_WIN
    CHECK -- "No" --> RANDOM_PATH
    CONSENSUS_WIN & RANDOM_PATH --> LOGGING
    LOG_DEC --> RESULT
    AWAIT_OUT --> PERF --> PROMOTE
    PROMOTE -- "Under-performs" --> DEMOTE_ACT
    PROMOTE -- "Excels" --> PROMOTE_ACT
    DEMOTE_ACT & PROMOTE_ACT --> ADJUST --> REGISTRY
```

### Visual Overview

![N.E.X.U.S. Engine Architecture Diagram](C:\Users\kshit\.gemini\antigravity-cli\brain\e8e30b91-a3f8-43ef-8aec-1930e161a4de\nexus_engine_architecture_1784868453174.jpg)

---

## 5.9 AI Roadmap Architecture

The AI Roadmap feature pipelines user skill data and target role selection into a **context-aware Gemini 2.5 Flash prompt**, returning a structured personalised Markdown learning plan. Skill verification also uses Gemini for repository code analysis.

```mermaid
flowchart TD
    subgraph TRIGGER["Entry Points"]
        T1["Dashboard: User selects target role and skill"]
        T2["Verify: User submits GitHub repo URL"]
    end

    subgraph ROADMAP["AI Roadmap Flow — aiService.js"]
        R1["POST /api/ai/roadmap\naiLimiter 20 req per hr"]
        R2["Load user existing skills from DB"]
        R3["Classify proficiency level\n0=Beginner 1-4=Beginner\n5-7=Intermediate 8-10=Advanced"]
        R4["Build context instruction\nExisting skills as analogies\nSkip redundant basics"]
        R5["Build personalized prompt\nTarget skill + role + score context"]
        R6["Call Gemini 2.5 Flash"]
        R7["Return Markdown roadmap\nWeeks 1-2 3-4 5-8 plus Resources"]
    end

    subgraph VERIFY_AI["AI Skill Verification Flow — verifyService.js"]
        V1["POST /api/verify\nverifyLimiter 20 req per hr"]
        V2["Parse and validate GitHub URL\nReject forks and 404s"]
        V3["GitHub API: fetch repo metadata and file tree"]
        V4["Filter source files\n.js .ts .py .java .go .rs\nExclude test and node_modules"]
        V5["Fetch top 3 file contents\nraw.githubusercontent.com\nup to 3000 chars each"]
        V6["Build scoring prompt\nArchitecture paradigms efficiency complexity"]
        V7["Call Gemini 2.5 Flash\nExpect JSON score and reasoning"]
        V8["Parse response\nClamp score 1-10\nMap to level label"]
        V9["Upsert Skill record\nverificationSource GITHUB"]
        V10["Push in-app notification\nand ActivityLog entry"]
    end

    subgraph EXTERNAL["External Services"]
        GEMINI_API["Google Generative AI\ngemini-2.5-flash"]
        GH_API["GitHub REST API\nrepos and git trees"]
    end

    T1 --> R1 --> R2 --> R3 --> R4 --> R5 --> R6
    R6 --> GEMINI_API --> R7
    T2 --> V1 --> V2 --> V3
    V3 --> GH_API --> V4 --> V5 --> V6 --> V7
    V7 --> GEMINI_API --> V8 --> V9 --> V10
```

---

## 5.10 Real-Time Communication

SkillSphere uses **Socket.io** co-located with the HTTP server on the same port. Authentication is enforced at the WebSocket handshake level using the same `ss_token` httpOnly cookie. Every connected user joins a private room keyed by their `userId`.

```mermaid
sequenceDiagram
    autonumber
    actor Alice
    participant AC as Alice Client
    participant SRV as Socket.io Server
    participant DB as PostgreSQL
    actor Bob

    rect rgb(20, 40, 80)
        Note over Alice,SRV: HANDSHAKE AND AUTH
        Alice->>AC: Opens SkillSphere while logged in
        AC->>SRV: WSS connect with cookie ss_token
        SRV->>SRV: io.use() middleware jwt.verify cookie
        SRV->>SRV: socket.join(alice.userId) — private room
        SRV-->>AC: Connection acknowledged
    end

    rect rgb(20, 60, 40)
        Note over Alice,DB: SEND MESSAGE
        Alice->>AC: Types message to Bob
        AC->>SRV: emit SEND_MESSAGE receiverId content
        SRV->>DB: findFirst Conversation where Alice and Bob both participate
        alt No existing conversation
            DB-->>SRV: null
            SRV->>DB: create Conversation with both participants
        end
        SRV->>DB: create Message with conversationId senderId content
        DB-->>SRV: Message record with sender details
        SRV->>DB: update Conversation.updatedAt
        SRV->>DB: create InAppNotification for Bob
        SRV->>SRV: io.to(bobId).emit NOTIFICATION
        SRV->>SRV: io.to(bobId).emit RECEIVE_MESSAGE
        SRV->>SRV: io.to(aliceId).emit RECEIVE_MESSAGE
    end

    rect rgb(60, 20, 40)
        Note over Bob,SRV: BOB RECEIVES
        SRV-->>Bob: RECEIVE_MESSAGE event
        SRV-->>Bob: NOTIFICATION event with title and actionUrl
        Bob->>Bob: Notification bell increments and chat updates live
    end

    rect rgb(40, 40, 20)
        Note over SRV: Other real-time events emitted via io.to(userId).emit
        Note over SRV: Squad accepted — NOTIFICATION
        Note over SRV: Skill verified — NOTIFICATION
        Note over SRV: Application status change — NOTIFICATION
    end
```

---

## 5.11 Deployment Architecture

SkillSphere's production topology follows a **split-host** deployment: the React SPA is deployed to **Vercel** (global CDN edge), and the Node.js API runs on **Railway** with PM2 cluster mode across all available CPU cores.

```mermaid
graph TB
    subgraph INTERNET["Internet"]
        USER_BROWSER["User Browser"]
    end

    subgraph VERCEL["Vercel — Frontend CDN"]
        EDGE["Global Edge Network\nStatic asset delivery"]
        SPA["React 19 SPA\nVite production build\nRoute-level code splitting\nLazy image loading"]
    end

    subgraph RAILWAY["Railway — Backend Platform"]
        subgraph PM2["PM2 Cluster Mode — instances: max"]
            W1["Worker 1\nNode.js"]
            W2["Worker 2\nNode.js"]
            WN["Worker N\none per CPU core"]
        end
        SHARED_PORT["Shared Port :5001\nHTTP plus WebSocket"]
        LOGS["Winston Logs\npm2-out.log pm2-err.log\nDaily rotation"]
        HEALTH_EP["/health endpoint\nDB and cache readiness probe\n200 OK or 503 degraded"]
    end

    subgraph DB_TIER["Data Tier"]
        PG[("PostgreSQL 15\nManaged e.g. Supabase\nDATABASE_URL + DIRECT_URL")]
        REDIS_PROD[("Redis — Optional\ne.g. Upstash\nRate limits and session cache")]
    end

    subgraph EXTERNAL_SVC["External Services"]
        RESEND_PROD["Resend\nTransactional OTP email"]
        GEMINI_PROD["Google Gemini 2.5 Flash\nRoadmap and verification"]
        GITHUB_PROD["GitHub REST API\nSkill verification"]
    end

    USER_BROWSER -- "HTTPS" --> VERCEL
    EDGE --> SPA
    SPA -- "HTTPS with Cookie" --> SHARED_PORT
    SPA -- "WSS persistent" --> SHARED_PORT
    SHARED_PORT --> W1 & W2 & WN
    W1 & W2 & WN --> PG
    W1 & W2 & WN --> REDIS_PROD
    W1 & W2 & WN --> RESEND_PROD
    W1 & W2 & WN --> GEMINI_PROD
    W1 & W2 & WN --> GITHUB_PROD
    HEALTH_EP --> PG
```

### Environment Variables Reference

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | ✅ | Prisma pooled connection string |
| `DIRECT_URL` | ✅ | Prisma direct connection for migrations |
| `JWT_SECRET` | ✅ | HMAC secret for token signing |
| `GOOGLE_API_KEY` | ✅ | Gemini AI for roadmap and verification |
| `REDIS_URL` | ⚠️ Optional | Redis cache (falls back to in-memory) |
| `RESEND_API_KEY` | ⚠️ Optional | Resend email (falls back to SMTP) |
| `SMTP_HOST / USER / PASS` | ⚠️ Optional | SMTP fallback for OTP delivery |
| `GITHUB_TOKEN` | ⚠️ Optional | Avoids GitHub API rate limits |
| `ALLOWED_ORIGINS` | ⚠️ Optional | Extra CORS origins comma-separated |
| `NODE_ENV` | ✅ | `production` enables secure cookies |
| `PORT` | ⚠️ Optional | Defaults to `5001` |

---

## 5.12 Background Jobs

SkillSphere uses **node-cron** for scheduled maintenance. All jobs run in-process alongside the main server. A dedicated worker process is planned for v3.0.

```mermaid
flowchart TD
    subgraph SCHEDULER["node-cron Scheduler — setupJobs()"]
        BOOT["Server start — setupJobs() called once"]
        CRON1["Cron: 0 0 * * *\nDaily at 00:00 UTC"]
    end

    subgraph JOB1["Job 1 — expireStaleSquads()"]
        E1["SELECT squads WHERE\nstatus = OPEN AND expiresAt < NOW()"]
        E2["UPDATE status = ARCHIVED\nbatch via updateMany()"]
        E3["Winston log count archived"]
    end

    subgraph JOB2["Job 2 — closeFulfilledSquads()"]
        F1["SELECT all OPEN squads\ncurrentMembers and maxMembers"]
        F2{"currentMembers >= maxMembers?"}
        F3["Collect IDs to close"]
        F4["UPDATE status = FULL via updateMany()"]
        F5["Winston log count closed"]
    end

    subgraph FUTURE["Planned Future Jobs"]
        PJ1["Strategy Evolution Job\nWeekly: recalculate StrategyPerformance\nPromote or demote strategies"]
        PJ2["GitHub Account Prune Job\nDaily: find users missing github\nfield after N days"]
        PJ3["MatchOutcome Updater\nWeekly: update retention30d\nfor accepted applications"]
    end

    BOOT --> CRON1
    CRON1 --> JOB1 & JOB2
    E1 --> E2 --> E3
    F1 --> F2
    F2 -- "Yes" --> F3 --> F4 --> F5
    F2 -- "No" --> F5
    CRON1 -.->|"Planned v3.0"| FUTURE
```

---

## 5.13 Future Scalability

This diagram illustrates the target production-hardened architecture planned for SkillSphere v3.0, incorporating horizontal API scaling, a dedicated Redis Pub/Sub layer for sockets, a message queue for background workers, and a full observability stack.

```mermaid
graph TB
    subgraph CDN["CDN and Edge Layer"]
        CF["Cloudflare or Vercel Edge\nDDoS protection\nTLS termination\nStatic asset caching"]
    end

    subgraph LB["Load Balancer"]
        NGINX["Nginx or Railway LB\nL7 routing\nHealth probe on /health"]
    end

    subgraph API_CLUSTER["API Cluster — Horizontal Scale"]
        direction LR
        API1["Node.js API\nInstance 1"]
        API2["Node.js API\nInstance 2"]
        APIN["Node.js API\nInstance N"]
    end

    subgraph SOCKET_CLUSTER["Socket.io Cluster"]
        direction LR
        WS1["Socket.io\nInstance 1"]
        WS2["Socket.io\nInstance 2"]
        REDIS_PUB[("Redis Pub/Sub\nSocket.io adapter\nCross-instance relay")]
    end

    subgraph WORKERS["Background Workers — Separate Process"]
        BW1["Strategy Evolution\nWeekly Cron"]
        BW2["Squad Maintenance\nDaily Cron"]
        BW3["Outcome Tracking\n30d and 60d retention"]
        MQ[("BullMQ on Redis\nJob persistence and retry")]
    end

    subgraph DB_HA["Data Tier — High Availability"]
        PG_PRIMARY[("PostgreSQL Primary\nWrite operations")]
        PG_REPLICA[("PostgreSQL Replica\nRead-only queries")]
        REDIS_HA[("Redis Cluster\nCache Rate limits Sessions Pub/Sub")]
        S3["Object Storage\nS3 or Cloudflare R2\nAvatars and media"]
    end

    subgraph OBS["Observability Stack"]
        PROM["Prometheus\nMetrics collection"]
        GRAF["Grafana\nDashboards"]
        SENTRY["Sentry\nError tracking"]
        WLOG["Winston to Loki\nCentralised log aggregation"]
    end

    CF --> NGINX
    NGINX --> API1 & API2 & APIN
    NGINX --> WS1 & WS2
    WS1 & WS2 <--> REDIS_PUB
    API1 & API2 & APIN --> PG_PRIMARY
    API1 & API2 & APIN --> PG_REPLICA
    API1 & API2 & APIN --> REDIS_HA
    MQ --> BW1 & BW2 & BW3
    BW1 & BW2 & BW3 --> PG_PRIMARY
    API1 & API2 & APIN --> S3
    API1 & API2 & APIN --> PROM --> GRAF
    API1 & API2 & APIN --> SENTRY
    API1 & API2 & APIN --> WLOG
```

### Scalability Milestones

| Phase | Target Users | Key Changes |
|-------|-------------|-------------|
| **v2.0 — Current** | ~1K | PM2 cluster, single DB, in-memory rate limit fallback |
| **v2.5 — Near-term** | ~10K | Redis required, PostgreSQL read replica, Docker Compose |
| **v3.0 — Mid-term** | ~100K | BullMQ workers, Redis Pub/Sub sockets, S3 media, observability |
| **v4.0 — Long-term** | 1M+ | Microservices split, Kafka event bus, CDN media pipeline |

---

*SkillSphere Architecture Document — © 2026 Kshitiz Dixit. All Rights Reserved.*
