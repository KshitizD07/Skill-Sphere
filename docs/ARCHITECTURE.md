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
| 5.5.1 | [Quality Control & Account Purge Lifecycle](#551-proof-of-work-quality-control--account-purge-lifecycle) |
| 5.6 | [Request Processing Flow](#56-request-processing-flow) |
| 5.7 | [Data Flow](#57-data-flow) |
| 5.8 | [N.E.X.U.S. Engine Architecture](#58-nexus-engine-architecture) |
| 5.9 | [AI Roadmap & Verification Architecture](#59-ai-roadmap--verification-architecture) |
| 5.10 | [Real-Time Communication](#510-real-time-communication) |
| 5.11 | [Deployment Architecture](#511-deployment-architecture) |
| 5.12 | [Background Jobs](#512-background-jobs) |
| 5.13 | [Future Scalability](#513-future-scalability) |

---

## 5.1 High-Level System Architecture

SkillSphere is a **decoupled, full-stack platform** supporting dual deployment topologies (Vercel/Railway PaaS split-host or AWS EC2 containerized Docker Compose with Nginx). A WebSocket layer runs co-located with the Express HTTP server. All persistent state lives in a managed PostgreSQL database (via Prisma ORM), with Redis/in-memory cache serving as an acceleration and rate-limit store.

```mermaid
graph TB
    subgraph CLIENT["🖥️  Client Tier  —  Vercel / Nginx"]
        direction TB
        BROWSER["React 19 SPA\nVite + Feature-Sliced Design"]
        WS_CLIENT["Socket.io-client\nWebSocket Connection"]
    end

    subgraph SERVER["⚙️  Server Tier  —  Railway / AWS EC2"]
        direction TB
        HTTP["Express.js HTTP Server\nPort :5001"]
        WS_SERVER["Socket.io Server\nBidirectional Events"]
        CRON["node-cron Scheduler\n4 Active Cron Jobs"]

        subgraph SERVICES["Business Logic Layer"]
            AUTH_SVC["Auth Service\nJWT · OTP · Bcrypt · Guest"]
            MATCH_SVC["Match Orchestrator\nN.E.X.U.S. Engine"]
            AI_SVC["AI Service\nGemini 2.5 Flash"]
            VERIFY_SVC["Verify Service\nGitHub · LeetCode · Gemini"]
            PORT_SVC["Portfolio Service\nGitHub Sync & Showcase"]
            SQUAD_SVC["Squad Service\nGatekeeper & Slots"]
            SEARCH_SVC["Search Service\nRanker & tsvector"]
            FEEDBACK_SVC["Feedback Service\nInbox & Contributor Leads"]
            SKILL_SVC["Skill Service"]
            EMAIL_SVC["Email Service\nResend · SMTP"]
        end

        subgraph MIDDLEWARE["Middleware Chain"]
            HELMET["Helmet\nSecurity Headers"]
            CORS_MW["CORS Whitelist"]
            GZIP["Gzip Compression"]
            RATELIMIT["Rate Limiters\nGlobal · Auth · AI · Verify · Sync"]
            AUTH_MW["JWT Auth Guard (httpOnly)"]
            ZOD["Zod Schema Validator"]
        end
    end

    subgraph DATA["🗄️  Data Tier"]
        POSTGRES[("PostgreSQL 16\nPrisma ORM (28 Models)")]
        REDIS[("Redis / Cache\nCache · Rate Limits")]
    end

    subgraph EXTERNAL["🌐  External APIs"]
        GEMINI["Google Gemini\n2.5 Flash"]
        GITHUB_API["GitHub REST API\nRepo · Git Trees · Languages"]
        LEETCODE_API["LeetCode GraphQL\nDSA Problem Stats"]
        RESEND["Resend / SMTP\nTransactional Email"]
    end

    BROWSER -- "REST  HTTPS + Cookies" --> HTTP
    WS_CLIENT -- "WSS  Persistent" --> WS_SERVER
    HTTP --> MIDDLEWARE --> SERVICES
    WS_SERVER --> SERVICES
    CRON --> SERVICES
    SERVICES --> POSTGRES
    SERVICES --> REDIS
    AI_SVC --> GEMINI
    VERIFY_SVC --> GITHUB_API
    VERIFY_SVC --> GEMINI
    VERIFY_SVC --> LEETCODE_API
    PORT_SVC --> GITHUB_API
    EMAIL_SVC --> RESEND
```

---

## 5.2 Backend Component Architecture

The backend follows a **layered, service-oriented design**. Routes are thin controllers that delegate all business logic to dedicated service classes. Repositories (Prisma queries) are co-located with services, not separated into a DAO layer.

```mermaid
graph TB
    subgraph ENTRY["Entry Point Lifecycle — server.js & app.js"]
        BOOT["server.js\nRequired ENV check · DB test · PM2 signal"]
        APP_CONF["app.js\nHelmet · CORS · Gzip · Cookie & Body Parser"]
        ROUTE_MOUNT["Route Registration\n15 Route Modules"]
        SOCKET_INIT["Socket.io Init\n socket.js"]
        JOB_INIT["Cron Scheduler\n setupJobs() & startSelfPing()"]
        HEALTH["/health & /ping\nDB + Cache probe"]
    end

    subgraph ROUTES["Routes Layer — /routes/*.js (15 Modules)"]
        R_AUTH["auth.js\n/api/auth"]
        R_USERS["users.js\n/api/users"]
        R_SKILLS["skills.js\n/api/skills"]
        R_VERIFY["verify.js\n/api/verify"]
        R_SQUADS["squads.js\n/api/squads"]
        R_POSTS["posts.js\n/api/posts"]
        R_ACT["activity.js\n/api/activity"]
        R_AI["ai.js\n/api/ai"]
        R_CHAT["chat.js\n/api/chat"]
        R_NOTIF["notifications.js\n/api/notifications"]
        R_ANTI["antifragile.js\n/api/antifragile"]
        R_PORT["portfolio.js\n/api/portfolio"]
        R_ADMIN["admin.js\n/api/admin"]
        R_SEARCH["search.js\n/api/search"]
        R_FEED["feedback.js\n/api/feedback"]
    end

    subgraph SVC["Services Layer — /services/*.js"]
        SVC_AI["aiService.js\ngenerateRoadmap()"]
        SVC_MATCH["matchOrchestrator.js\nmatchCandidatesForSlot()"]
        SVC_CONSENSUS["consensusEngine.js\ncheckConsensus()"]
        SVC_REG["strategyRegistry.js\ngetActiveStrategies()"]
        SVC_LOG["decisionLogger.js\nlogDecision()"]
        SVC_GATE["gatekeeper.js\ncheckEligibility()"]
        SVC_VERIFY["verifyService.js\nverifySkill()"]
        SVC_LEET["leetcodeService.js\nverifyLeetCodeSkill()"]
        SVC_PORT["githubPortfolioService.js\nsyncUserRepos()"]
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

    subgraph JOBS["Scheduled Jobs — /jobs/*.js"]
        J_SQUAD["squadMaintenance.js\nDaily 00:00 UTC"]
        J_PRUNE["userPruning.js\nDaily 01:00 UTC"]
        J_EVOLVE["strategyEvolution.js\nWeekly Sunday"]
        J_PING["keepAlive.js\nEvery 10 mins"]
    end

    subgraph UTILS["Utilities — /utils/*.js"]
        CACHE["cache.js\nRedis or MemoryStore"]
        LOGGER["logger.js\nWinston + Daily-Rotate"]
        ERR["errorHandler.js\nApiError · asyncHandler"]
    end

    subgraph MW["Middleware — /middleware/*.js"]
        AUTH_MID["auth.js\nauthenticateToken() · requireRole()"]
        RATE_MID["rateLimiter.js\nmakeLimiter() factory"]
        VAL_MID["validate.js"]
    end

    BOOT --> APP_CONF --> ROUTE_MOUNT --> ROUTES
    BOOT --> SOCKET_INIT
    BOOT --> JOB_INIT --> JOBS
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
    JOBS --> SVC
    JOBS --> CACHE
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
        APP_JSX["App.jsx\nReact Router v6\n18 Protected/Public Routes · Lazy Loaded"]
        PROVIDERS["Providers\nAuthContext · SocketContext · Toast"]
    end

    subgraph FEATURES["src/features/  —  13 Feature-Sliced Modules"]
        F_AUTH["auth/\nAuthPage · Login · Register · OTP"]
        F_PROFILE["profile/\nMyProfile · UserProfile · LeetCodeCard · RecruiterDossier"]
        F_SKILLS["skills/\nSkillVerifier · SkillCard · BatchVerifierModal"]
        F_SQUADS["squads/\nMissionBoard · SquadDetail · SquadManage · MyApplications"]
        F_PORT["portfolio/\nGitHubProjectsSummary · ProjectSelectionModal"]
        F_CHAT["chat/\nChatInterface · MessageList · Socket consumer"]
        F_FEED["feed/\nFeedCard · CreatePostModal · CommentSection"]
        F_NETWORK["network/\nNetwork · UserCard · FilterBar"]
        F_SEARCH["search/\nSearchOverlay · SearchResultItem"]
        F_FEEDBACK["feedback/\nFeedbackModal · FeedbackDrawer"]
        F_NOTIF["notifications/\nNotificationItem · NotificationBell"]
        F_ROADMAP["roadmap/\nRoadmapView · RoadmapGenerator"]
        F_ADMIN["admin/\nAdminDashboard · AntifragileAdmin · StrategyControls"]
    end

    subgraph PAGES["src/pages/  —  Route Pages"]
        PG_LAND["Landing.jsx"]
        PG_DASH["Dashboard.jsx"]
        PG_FEED["GlobalFeed.jsx"]
        PG_ROAD["Roadmap.jsx"]
        PG_NOTIF["NotificationsPage.jsx"]
        PG_SEARCH["Search.jsx"]
        PG_FEEDBACK["FeedbackPage.jsx"]
        PG_VERIFY["SkillVerifierPage.jsx"]
        PG_CHAT["ChatInterface.jsx"]
        PG_404["NotFound.jsx"]
    end

    subgraph SHARED["src/shared/  —  Cross-cutting"]
        NAVBAR["Navbar.jsx\nResponsive · Nexus Portal animation"]
        PROTECTED["ProtectedRoute.jsx\nSession & GitHub Account Quality Gate"]
        UI_COMP["Common UI Components\nButtons · Modals · Loaders · Toast"]
    end

    subgraph SERVICES["src/services/  —  API Services"]
        AUTH_API["authService.js"]
        USER_API["userService.js"]
        SQUAD_API["squadService.js"]
        FEED_API["feedService.js"]
        AI_API["aiService.js"]
    end

    subgraph CONFIG["src/config/"]
        SOCKET_CFG["socket.js\nSocket.io-client connection singleton"]
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

PostgreSQL 16 managed via **Prisma ORM**. The schema contains **28 models** partitioned across eight logical domains: Core Identity, Skills & GitHub Repositories, Career Roadmaps, Social Feed & Moderation, Squad/Mission System, Antifragile Matching Engine (N.E.X.U.S.), Chat & Messaging, and Community Feedback.

```mermaid
erDiagram
    USER {
        uuid    id           PK
        string  email        UK
        string  password
        string  name
        enum    role
        string  guestPersona
        string  college
        string  headline
        string  bio
        string  avatar
        string  github
        string  linkedin
        string  leetcodeUsername
        int     leetcodeDSAScore
        string  leetcodeDSALevel
        int     leetcodeTotalPoints
        json    leetcodeLanguages
        datetime leetcodeSyncedAt
        boolean isActive
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
        boolean showLevel
        datetime verifiedAt
    }

    GITHUBREPO {
        uuid     id              PK
        uuid     userId          FK
        string   repoName
        string   fullName
        string   primaryLanguage
        string[] techStack
        int      stars
        int      forks
        string   url
        enum     repoType
        boolean  isSelected
        int      mergedPrs
        datetime repoUpdatedAt
    }

    ROADMAP {
        uuid     id             PK
        uuid     userId         FK
        string   targetRole
        string   targetSkill
        string   content
        string[] completedItems
        float    progress
        string   shareToken     UK
        datetime generatedAt
        datetime updatedAt
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
        datetime createdAt
    }

    COMMENTLIKE {
        uuid     id        PK
        uuid     commentId FK
        uuid     userId    FK
        datetime createdAt
    }

    CONTENTREPORT {
        uuid     id              PK
        uuid     reporterId      FK
        uuid     targetUserId
        uuid     targetPostId
        uuid     targetCommentId
        string   reason
        enum     status
        string   resolution
        datetime reportedAt
    }

    ACTIVITYLOG {
        uuid     id        PK
        uuid     userId    FK
        string   action
        string   details
        datetime createdAt
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
        string   roleDescription
        string[] preferredSkills
        string   requiredSkill
        int      minScore
        boolean  requireVerified
        enum     status
        string   filledBy
    }

    SQUADAPPLICATION {
        uuid     id              PK
        uuid     squadId         FK
        uuid     userId          FK
        uuid     slotId          FK
        string   message
        enum     status
        int      matchScore
        uuid     matchDecisionId FK
        datetime appliedAt
    }

    MATCHSTRATEGY {
        uuid     id             PK
        string   name           UK
        string   displayName
        string   description
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
        string[] alternativesShown
        boolean  wasConsensus
        boolean  wasRandom
        int      consensusCount
        json     strategyVotes
        json     activeStrategies
    }

    MATCHOUTCOME {
        uuid     id             PK
        uuid     decisionId     FK
        boolean  accepted
        datetime acceptedAt
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
        datetime windowEnd
        float    acceptanceRate
        float    retention30dRate
        int      rankInWindow
    }

    STRATEGYPROMOTION {
        uuid     id          PK
        uuid     strategyId  FK
        enum     fromState
        enum     toState
        string   reason
        json     metrics
        datetime triggeredAt
    }

    SYSTEMCONFIG {
        uuid     id                     PK
        int      maxActiveStrategies
        int      maxShadowStrategies
        float    minRandomnessRate
        int      minConsensusStrategies
        int      influenceDecayDays
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
        datetime createdAt
    }

    INAPPNOTIFICATION {
        uuid     id           PK
        uuid     userId       FK
        string   type
        string   title
        string   message
        boolean  isRead
        string   actionUrl
        string   senderAvatar
        datetime createdAt
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

    FOLLOW {
        uuid     id          PK
        uuid     followerId  FK
        uuid     followingId FK
        datetime createdAt
    }

    PLATFORMFEEDBACK {
        uuid     id                 PK
        uuid     userId
        string   userName
        string   userEmail
        string   category
        int      rating
        string   feedback
        boolean  wantsToContribute
        string[] contributorAreas
        string   status
        string   adminResponse
        datetime createdAt
    }

    USER             ||--o{ SKILL                : "possesses"
    USER             ||--o{ GITHUBREPO           : "syncs"
    USER             ||--o{ POST                 : "creates"
    USER             ||--o{ LIKE                 : "gives"
    USER             ||--o{ COMMENT              : "writes"
    USER             ||--o{ COMMENTLIKE          : "likes comment"
    USER             ||--o{ CONTENTREPORT        : "files report"
    USER             ||--o{ ACTIVITYLOG          : "generates"
    USER             ||--o{ SQUAD                : "leads"
    USER             ||--o{ SQUADAPPLICATION     : "submits"
    USER             ||--o{ MATCHDECISION        : "selected by"
    USER             ||--o{ ROADMAP              : "generates"
    USER             ||--o{ MESSAGE              : "sends"
    USER             }o--o{ CONVERSATION         : "participates in"
    USER             ||--o{ INAPPNOTIFICATION    : "receives"
    USER             ||--o{ FOLLOW               : "follows / followed by"
    POST             ||--o{ LIKE                 : "has"
    POST             ||--o{ COMMENT              : "has"
    COMMENT          ||--o{ COMMENT              : "replies to"
    COMMENT          ||--o{ COMMENTLIKE          : "receives likes"
    SQUAD            ||--|{ SQUADSLOT            : "has"
    SQUAD            ||--o{ SQUADAPPLICATION     : "receives"
    SQUAD            ||--o{ MATCHDECISION        : "triggers"
    SQUADSLOT        ||--o{ SQUADAPPLICATION     : "targeted by"
    MATCHDECISION    ||--o| MATCHOUTCOME         : "produces"
    MATCHDECISION    ||--o| SQUADAPPLICATION     : "links"
    MATCHSTRATEGY    ||--o{ MATCHDECISION        : "votes in"
    MATCHSTRATEGY    ||--o{ STRATEGYPERFORMANCE  : "tracked by"
    MATCHSTRATEGY    ||--o{ STRATEGYPROMOTION    : "audits changes"
    JOBROLE          ||--|{ JOBROLESKILL         : "requires"
    CONVERSATION     ||--|{ MESSAGE              : "contains"
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

    rect rgb(30, 50, 60)
        Note over User,DB: GUEST EXPLORATION LOGIN
        User->>Client: Clicks "Explore as Student / Professional"
        Client->>Auth: POST /api/auth/guest { role: "STUDENT" | "PROFESSIONAL" }
        Auth->>DB: Find or create seeded guest persona user
        Auth->>Auth: jwt.sign payload with 24h expiration
        Auth-->>Client: Set-Cookie ss_token + 200 user object
    end
```

### 5.5.1 Proof-of-Work Quality Control & Account Purge Lifecycle

SkillSphere enforces an uncompromising **Proof-of-Work Quality Gate**: accounts that do not link a valid GitHub account are restricted from accessing protected platform routes and automatically purged. This prevents ghost profiles and ensures all network participants possess verifiable engineering artifacts.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Browser as React Client (App.jsx)
    participant API as Express API (/api/users/me)
    participant Cron as Cron Job (userPruning.js)
    participant DB as PostgreSQL

    rect rgb(60, 30, 30)
        Note over User,DB: PATHWAY A — REAL-TIME ROUTE PURGE INTERCEPTOR
        User->>Browser: Navigates to protected route (/dashboard, /nexus, /grid)
        Browser->>Browser: Evaluates Gate: hasGithub || isSystemOrAdmin
        alt GitHub account NOT linked (github == null / empty)
            Browser->>Browser: Warns: Quality Control: GitHub account not linked
            Browser->>API: DELETE /api/users/me (Hard delete request)
            API->>DB: prisma.user.delete({ where: { id: req.user.userId } })
            DB-->>API: User record and cascade relations purged
            API-->>Browser: 200 OK
            Browser->>Browser: Wipe localStorage (user_data, ss_token)
            Browser->>User: Redirect to /auth?reason=github_required
        else GitHub account linked
            Browser->>User: Renders protected page
        end
    end

    rect rgb(50, 40, 20)
        Note over Cron,DB: PATHWAY B — SCHEDULED BACKGROUND SWEEPER
        Cron->>Cron: Scheduled at 01:00 UTC daily & on startup
        Cron->>DB: DELETE FROM "User" WHERE (github IS NULL OR github = '') AND createdAt < (NOW() - 24h)
        DB-->>Cron: Returns count of pruned accounts
        Cron->>Cron: Winston logs: "removed accounts missing GitHub link"
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

This diagram traces how data travels through the system for the primary platform operations: authentication & guest access, squad recruitment, feed discussions, GitHub AI code audit, LeetCode DSA verification, portfolio showcase synchronization, AI career roadmap generation, and unified search.

```mermaid
flowchart LR
    subgraph INPUT["User Actions"]
        A1["Register / Login / Guest Mode"]
        A2["Apply to Squad"]
        A3["Post to Feed / Threaded Comment"]
        A4["Verify Skill via GitHub Repo"]
        A5["Sync LeetCode DSA Profile"]
        A6["Sync & Select Showcase Repos"]
        A7["Request AI Career Roadmap"]
        A8["Unified Multi-Entity Search"]
    end

    subgraph PROCESSING["Processing Layer"]
        direction TB
        P1["Auth Service\nOTP validate · JWT mint · Guest"]
        P2["Gatekeeper & Match Orchestrator\nParallel strategy execution"]
        P3["Feed Service\nPrisma CRUD · Likes · Replies"]
        P4["Verify Service\n8-File categorized AST · Gemini score"]
        P5["LeetCode Service\nGraphQL fetch · DSA point formula"]
        P6["Portfolio Service\nGitHub repos sync · Top 3+3 showcase"]
        P7["AI Service\nGemini 2.5 Flash roadmap & progress"]
        P8["Search Service\ntsvector query & relevance ranker"]
    end

    subgraph STORAGE["Storage Tier"]
        direction TB
        DB1[("PostgreSQL\nUser · Skill · Post · Feedback")]
        DB2[("PostgreSQL\nSquad · Application · Decision")]
        DB3[("Redis / Cache\nRate limit counters & search cache")]
    end

    subgraph OUTPUT["Responses"]
        O1["JWT Cookie plus User JSON"]
        O2["Match Decision & Recommended Candidate"]
        O3["Post / Comment Object plus Activity Log"]
        O4["Skill Score (1-10) plus Level Badge"]
        O5["LeetCode DSA Score & Language Counts"]
        O6["Curated Showcase Repos (Max 6)"]
        O7["Interactive Markdown Roadmap"]
        O8["Ranked Users, Squads & Posts JSON"]
    end

    subgraph REALTIME["Real-Time Side-Effects"]
        RT1["Socket.io NOTIFICATION emit\nto receiver room"]
        RT2["InAppNotification persisted\nPrisma write"]
    end

    A1 --> P1 --> DB1 --> O1
    A2 --> P2 --> DB2 --> O2
    P2 --> RT1 & RT2
    A3 --> P3 --> DB1 --> O3
    A4 --> P4 --> DB1 --> O4
    O4 --> RT1 & RT2
    A5 --> P5 --> DB1 --> O5
    A6 --> P6 --> DB1 --> O6
    A7 --> P7 --> DB1 --> O7
    A8 --> P8 --> DB3 & DB1 --> O8
    P1 --> DB3
    P4 --> DB3
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

![N.E.X.U.S. Engine Architecture Diagram](./assets/nexus_engine_architecture.jpg)

---

## 5.9 AI Roadmap & Verification Architecture

The AI Roadmap feature pipelines user skill data and target role selection into a **context-aware Gemini 2.5 Flash prompt**, returning a structured personalised Markdown learning plan with interactive milestone tracking. Skill verification uses multi-source validation: GitHub categorized AST inspection with prompt injection defense, and LeetCode algorithmic problem evaluation.

```mermaid
flowchart TD
    subgraph TRIGGER["Entry Points"]
        T1["Dashboard: Target role & skill selection"]
        T2["Verify: Submit public GitHub repo URL"]
        T3["LeetCode: Submit LeetCode username"]
    end

    subgraph ROADMAP["AI Roadmap Flow — aiService.js"]
        R1["POST /api/ai/roadmap\naiLimiter 20 req per hr"]
        R2["Load user existing skills & calculate gap"]
        R3["Classify proficiency level\n0=Beginner · 1-4=Beginner\n5-7=Intermediate · 8-10=Advanced"]
        R4["Build context instruction\nAnalogy mapping from existing skills"]
        R5["Call Gemini 2.5 Flash\nStructured Markdown with milestones"]
        R6["Persist Roadmap record\nProgress tracking & shareToken"]
    end

    subgraph VERIFY_GH["GitHub Deep Code Audit — verifyService.js"]
        V1["POST /api/verify/skill\nverifyLimiter 20 req per hr"]
        V2["Anti-Cheat & Ownership Validation\nReject forks & archived repos"]
        V3["GitHub API: Fetch recursive git tree"]
        V4["Categorized Multi-File Sampling (Max 8 files, ~3500 chars)\n• Manifests (Max 2) · Backend (Max 3)\n• Frontend (Max 3) · Schemas (Max 2)\n• General Source (Max 4)"]
        V5["Prompt Injection Defense\nWrap in <user_repository_code> tags\nStrict system instruction to ignore inner text"]
        V6["Call Gemini 2.5 Flash\nJSON score (1-10), level & qualitative evidence"]
        V7["Multi-Skill Auto-Discovery\nScan repo for secondary profile skills"]
        V8["Upsert Skill (isVerified=true) & Invalidate Cache"]
    end

    subgraph VERIFY_LC["LeetCode Verification — leetcodeService.js"]
        L1["POST /api/verify/leetcode-profile-sync"]
        L2["Fetch stats from LeetCode GraphQL"]
        L3["DSA Points Formula:\n(Easy*1) + (Medium*3) + (Hard*5)"]
        L4["Map to score 1-10 & language breakdown"]
        L5["Update User leetcodeDSAScore & points"]
    end

    subgraph EXTERNAL["External Services"]
        GEMINI_API["Google Generative AI\ngemini-2.5-flash"]
        GH_API["GitHub REST API\nrepos, git trees, contents"]
        LC_API["LeetCode GraphQL API"]
    end

    T1 --> R1 --> R2 --> R3 --> R4 --> R5
    R5 --> GEMINI_API --> R6
    T2 --> V1 --> V2 --> V3 --> V4 --> V5 --> V6
    V6 --> GEMINI_API --> V7 --> V8
    V3 --> GH_API
    T3 --> L1 --> L2 --> LC_API --> L3 --> L4 --> L5
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

SkillSphere supports **two production deployment topologies**: a managed **PaaS Split-Host** configuration (ideal for continuous frontend CD and serverless scaling) and a self-hosted **Containerized IaaS** configuration on AWS EC2 using Docker Compose (ideal for total systems control, cost containment, and engineering portfolio demonstrations).

### 5.11.1 Topology A: Managed PaaS Split-Host (Vercel + Railway)

In this configuration, the React SPA is deployed to **Vercel** (global CDN edge), and the Node.js API runs on **Railway** with PM2 cluster mode across available CPU cores.

```mermaid
graph TB
    subgraph INTERNET["Internet"]
        USER_BROWSER["User Browser"]
    end

    subgraph VERCEL["Vercel — Frontend CDN Edge"]
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

    subgraph DB_TIER["Managed Data Tier"]
        PG[("PostgreSQL 16\nManaged e.g. Supabase\nDATABASE_URL + DIRECT_URL")]
        REDIS_PROD[("Redis — Optional\ne.g. Upstash\nRate limits and session cache")]
    end

    subgraph EXTERNAL_SVC["External Services"]
        RESEND_PROD["Resend\nTransactional OTP email"]
        GEMINI_PROD["Google Gemini 2.5 Flash\nRoadmap and verification"]
        GITHUB_PROD["GitHub REST API\nSkill verification"]
        LEETCODE_PROD["LeetCode GraphQL\nDSA scoring"]
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
    W1 & W2 & WN --> LEETCODE_PROD
    HEALTH_EP --> PG
```

### 5.11.2 Topology B: Containerized IaaS (AWS EC2 + Docker Compose + Nginx)

In this configuration (detailed in [`cloud_deployment.md`](file:///C:/Users/kshit/cs/skillsphere/cloud_deployment.md) and [`containerization.md`](file:///C:/Users/kshit/cs/skillsphere/containerization.md)), the entire application stack runs inside an isolated Docker bridge network on an **AWS EC2 `t2.micro`** instance (1 vCPU, 1 GB RAM, Ubuntu 24.04 LTS) backed by an Elastic Block Store (EBS) persistent volume and a 2 GB Linux Swap file.

```mermaid
flowchart TD
    User(("🌐 End User Browser\nhttp://<EC2-Public-IP>"))

    subgraph AWSCloud ["Amazon Web Services (AWS) — ap-south-1 (Mumbai)"]
        subgraph VPC ["Virtual Private Cloud (VPC)"]
            subgraph SecurityGroup ["Security Group Firewall"]
                Port22["Port 22 (SSH) — Restricted to Admin IP"]
                Port80["Port 80 (HTTP) — Open to World"]
                Port443["Port 443 (HTTPS) — Open to World"]
            end

            subgraph EC2Instance ["AWS EC2 Instance: t2.micro (1 vCPU, 1GB RAM)"]
                OS["Ubuntu 24.04 LTS + Docker Engine"]
                SWAP["2 GB Linux Swap File\n(Guards against OOM crashes)"]

                subgraph BridgeNetwork ["Docker Bridge Network (docker_default)"]
                    Nginx["skillsphere-client (:80)\nNginx Reverse Proxy · Serves SPA"]
                    Express["skillsphere-server (:5001)\nNode.js 22 Express · WebSockets"]
                    DB_CONT[("skillsphere-db (:5432)\nPostgreSQL 16 Alpine")]
                    REDIS_CONT[("skillsphere-redis (:6379)\nRedis 7 Alpine")]
                end
            end

            EBS[("💾 Amazon EBS Volume (gp3, 30 GiB)\nPersists OS + Docker Images + postgres_data")]
        end
    end

    User -->|HTTP Requests| Port80
    Port80 --> Nginx
    Nginx -->|Static Assets /| Nginx
    Nginx -->|Proxy /api/*| Express
    Nginx -->|Proxy /socket.io/*| Express
    Express -->|Internal TCP| DB_CONT
    Express -->|Internal TCP| REDIS_CONT
    DB_CONT -.->|Named Volume: postgres_data| EBS
```

### 5.11.3 Topology Comparison Matrix

| Architectural Feature | Topology A: PaaS (Vercel + Railway) | Topology B: IaaS (AWS EC2 + Docker Compose) |
|:---|:---|:---|
| **Target Audience** | Rapid feature prototyping, global edge CDN | Systems engineering interviews, cost predictability |
| **Reverse Proxy** | Managed by Vercel & Railway routers | Custom Nginx reverse proxy container (`client/nginx.conf`) |
| **CORS Constraint** | Requires cross-origin cookies (`SameSite=None`) | Same-origin proxy on port 80 bypasses CORS entirely |
| **Database Host** | Managed PostgreSQL (Supabase / Neon) | Containerized PostgreSQL 16 Alpine mounted on EBS |
| **Cache & Queue** | Managed Redis (Upstash) / In-memory fallback | Containerized Redis 7 Alpine on bridge network |
| **Resource Overhead** | Managed serverless instances | Hard-limited to 1 vCPU, 1 GB RAM + 2 GB Swap file |
| **Monthly Cost** | Free tiers / usage-based | **₹0 / month** under AWS Free Tier (750h EC2 + 30GB EBS) |

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

SkillSphere uses **node-cron** for scheduled maintenance and self-healing automation. All 4 background jobs run in-process alongside the main server, initialized on startup via `setupJobs()` in `server/jobs/squadMaintenance.js`.

```mermaid
flowchart TD
    subgraph SCHEDULER["node-cron Scheduler — setupJobs() in server.js"]
        BOOT["Server boot: setupJobs() & startSelfPing()"]
        CRON1["Cron: 0 0 * * *\nDaily at 00:00 UTC"]
        CRON2["Cron: 0 1 * * *\nDaily at 01:00 UTC + Startup"]
        CRON3["Cron: 0 0 * * 0\nWeekly Sunday 00:00 UTC"]
        CRON4["Cron: */10 * * * *\nEvery 10 min + 5m ping"]
    end

    subgraph JOB1["Job 1 — squadMaintenance.js"]
        E1["expireStaleSquads():\nUPDATE status=ARCHIVED WHERE expiresAt < NOW()"]
        F1["closeFulfilledSquads():\nUPDATE status=FULL WHERE currentMembers >= maxMembers"]
    end

    subgraph JOB2["Job 2 — userPruning.js"]
        U1["pruneUnlinkedAccounts():\nFind users WHERE github IS NULL/empty AND createdAt < (NOW() - 24h)"]
        U2["DELETE stale unverified accounts"]
    end

    subgraph JOB3["Job 3 — strategyEvolution.js"]
        EV1["Fetch 30d MatchDecisions & MatchOutcomes"]
        EV2["Calculate acceptanceRate & retention30dRate"]
        EV3["Create StrategyPerformance records & update ranks"]
        EV4["Auto-Promote SHADOW (>70% acc, >60% ret) to ACTIVE"]
        EV5["Auto-Demote ACTIVE (<40% acc) to SHADOW"]
        EV6["Re-weight influenceLevel (Top=HIGH, Bottom=LOW)"]
    end

    subgraph JOB4["Job 4 — keepAlive.js & startSelfPing"]
        P1["HTTP GET /ping\nPrevents cold starts on PaaS free-tiers"]
    end

    subgraph FUTURE["Planned v3.0 Scalability"]
        PJ1["Worker Process Separation via BullMQ on Redis"]
        PJ2["Dedicated Queue Node for Gemini AI Tasks"]
    end

    BOOT --> CRON1 & CRON2 & CRON3 & CRON4
    CRON1 --> JOB1
    CRON2 --> JOB2
    CRON3 --> JOB3
    CRON4 --> JOB4
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
