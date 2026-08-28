# SkillSphere — Feature Implementation Roadmap

> **Purpose:** Each day, pick one feature from this file. Read its description and sub-features, then use the attached **Implementation Prompt** to drive a production-grade, end-to-end implementation session.
>
> **Stack reminder:** React 19 + Vite (FSD) · Node.js + Express · PostgreSQL + Prisma ORM · Socket.io · Google Gemini · JWT httpOnly Cookies · Zod · Winston · Tailwind CSS + Framer Motion

---

## Table of Contents

| # | Feature | Status |
|---|---------|--------|
| 1 | [Authentication & Session Management](#1-authentication--session-management) | 🟡 Partially Built |
| 2 | [User Profile & Portfolio](#2-user-profile--portfolio) | ✅ Done |
| 3 | [GitHub-Backed Skill Verification](#3-github-backed-skill-verification) | ✅ Done |
| 4 | [Global Feed (Posts, Likes, Comments)](#4-global-feed-posts-likes-comments) | ✅ Done |
| 5 | [Real-Time Direct Messaging (Chat)](#5-real-time-direct-messaging-chat) | ✅ Done |
| 6 | [In-App Notifications](#6-in-app-notifications) | ✅ Done |
| 7 | [Network Discovery (People You May Know)](#7-network-discovery-people-you-may-know) | ✅ Done |
| 8 | [Squad / Mission Board](#8-squad--mission-board) | ✅ Done |
| 9 | [N.E.X.U.S. Antifragile Matching Engine](#9-nexus-antifragile-matching-engine) | ✅ Done |
| 10 | [AI Career Roadmap](#10-ai-career-roadmap) | ✅ Done |
| 11 | [Admin Dashboard (Strategy Management)](#11-admin-dashboard-strategy-management) | ✅ Done |
| 12 | [Search & Discovery](#12-search--discovery) | ✅ Done |
| 13 | [Follow / Connection System](#13-follow--connection-system) | ✅ Done |
| 14 | [Recruiter Discovery Mode](#14-recruiter-discovery-mode) | 🔴 Not Built |
| 15 | [Activity Feed & Analytics](#15-activity-feed--analytics) | 🔴 Not Built |

---

## How to Use This File

1. Pick a feature for the day.
2. Read its **Description** and **Sub-features** to understand scope.
3. Copy the **Implementation Prompt** and paste it into a new conversation with the AI.
4. The AI will audit the current state, identify gaps, and implement everything production-grade.
5. Mark the feature ✅ when done.

---

## 1. Authentication & Session Management

**Description:** The full auth lifecycle — registration, login, session persistence, password reset, OAuth (Google/GitHub), GitHub account mandatory linking, and automated pruning of unverified accounts. The gateway to everything on SkillSphere.

**Sub-features:**
- Email + OTP registration flow (2-step)
- Login with JWT in httpOnly cookie
- Session persistence (`/auth/verify` on every page load)
- Forgot password → OTP → Reset flow
- Google OAuth login
- GitHub OAuth login
- Mandatory GitHub account linking after registration
- Automated account pruning (24hr grace period for unlinked accounts via cron)
- Self-service account deletion with double-confirmation + cascade purge
- Rate limiting on all auth endpoints

---

### 📋 Implementation Prompt — Feature 1

```
You are implementing the Authentication & Session Management feature for SkillSphere — a production-grade full-stack platform (React 19 + Node.js/Express + PostgreSQL + Prisma + Socket.io).

Start by thoroughly reading and understanding the existing implementation:
- Server: server/routes/auth.js, server/services/emailService.js, server/middleware/auth.js, server/jobs/ (pruning jobs)
- Client: client/src/features/auth/, client/src/app/ (AuthContext, ProtectedRoute)
- Schema: server/prisma/schema.prisma (User, OtpVerification, AllowedEmail models)

Then audit against these industry-standard requirements and implement any gaps:

BACKEND REQUIREMENTS:
1. POST /api/auth/send-otp — Rate-limit (5 per 10 min per IP). Validate email format with Zod. Check user doesn't already exist. Generate cryptographically secure 6-digit OTP. Store hashed OTP (bcrypt) in OtpVerification with 10-min expiry. Send beautifully formatted HTML email via emailService.
2. POST /api/auth/register — Validate full Zod schema. Verify OTP (hash-compare, expiry, used flag). Hash password (bcrypt rounds=12). Create user. Log ACCOUNT_CREATED activity. Mint 7-day JWT. Set httpOnly + Secure + SameSite=None cookie.
3. POST /api/auth/login — authLimiter (50 req/15min). Case-insensitive email lookup. bcrypt.compare. Log USER_LOGIN activity. Set cookie.
4. GET /api/auth/verify — Validate cookie JWT. Return fresh user object from DB (never from token alone).
5. POST /api/auth/logout — Clear ss_token cookie. Return 200.
6. POST /api/auth/forgot-password — Silent anti-enumeration (always 200). Send reset OTP.
7. POST /api/auth/reset-password — Verify OTP, hash new password, clear cookie (force re-login).
8. GET /api/auth/github/callback & GET /api/auth/google/callback — OAuth flows. Create user if not exists. Set cookie. Redirect to frontend.
9. POST /api/auth/link-github — Authenticated route. Link GitHub username to existing account. Invalidate pruning clock.
10. DELETE /api/auth/account — Authenticated. Require re-entry of password (double-confirm). Cascade delete all user data. Clear cookie.
11. Cron Job: userPruning.js — Run every hour. Delete users with role STUDENT/GUEST who registered >24hr ago and have no github field set.

FRONTEND REQUIREMENTS:
1. AuthContext — Wraps app. On mount, calls /auth/verify. Exposes { user, loading, login, logout, register }. Never stores token in localStorage.
2. Login Page — Email + password form. Zod client-side validation. "Forgot password?" link. Google OAuth button. GitHub OAuth button. Smooth Framer Motion entry animation.
3. Register Page — Multi-step form: Step 1 (email → send OTP), Step 2 (OTP entry + remaining fields). Show OTP countdown timer (10 min). Resend OTP button after 60s cooldown.
4. Forgot Password Page — Email → OTP → New password in 3 steps. Progress indicator.
5. GitHub Link Banner — Persistent banner on dashboard/profile for users without github linked. "Link GitHub to unlock full access" CTA.
6. Account Deletion — In profile settings: "Delete Account" button → modal with typed confirmation ("delete my account") → password re-entry → final DELETE call.
7. ProtectedRoute — Redirect to /login if no user. Redirect to /link-github if no github field.

SECURITY REQUIREMENTS:
- All passwords hashed with bcrypt (12 rounds minimum)
- OTPs stored as hashes, single-use, 10-min TTL
- JWT in httpOnly cookie only — never localStorage
- CSRF protection via SameSite cookie attribute
- Rate limiting on all auth endpoints
- Anti-enumeration on forgot-password

Implement everything end-to-end. Write clean, well-commented code. Use Winston for all server-side logging. Use Zod for all input validation. Ensure all error responses follow the { success: false, message: "..." } shape. Ensure all success responses follow { success: true, data: {...} } shape.
```

---

## 2. User Profile & Portfolio
> **Status: ✅ COMPLETED**

**Description:** Each user's dynamic professional identity — their photo, headline, bio, college, verified skill badges, GitHub stats, LeetCode sync, and project portfolio. The profile is the trust anchor of the platform.

**Sub-features:**
- View own profile & public profile of others
- Edit profile (name, headline, bio, avatar upload, college, role)
- Verified skill badges with confidence scores
- GitHub activity stats panel
- LeetCode stats sync
- Project portfolio section (manual + GitHub-imported)
- Profile completeness indicator
- View/Edit GitHub linked repositories

---

### 📋 Implementation Prompt — Feature 2

```
You are implementing the User Profile & Portfolio feature for SkillSphere — a production-grade platform.

Start by thoroughly reading the existing implementation:
- Server: server/routes/users.js, server/services/ (any profile-related services), server/prisma/schema.prisma (User, Skill, Portfolio models)
- Client: client/src/features/profile/, client/src/pages/MyProfile.jsx, client/src/services/userService.js

Then audit against these industry-standard requirements and implement any gaps:

BACKEND REQUIREMENTS:
1. GET /api/users/me — Return full authenticated user profile including skills (with verification status), skill count, verified count.
2. GET /api/users/:id — Public profile. Return user + public skills + project count. Never return password/email to non-owners.
3. PUT /api/users/me — Update name, headline, bio, college, role. Zod validation. Invalidate user cache. Log PROFILE_UPDATED activity.
4. POST /api/users/me/avatar — Multipart upload. Accept image (jpg/png/webp, max 5MB). Store to cloud (Cloudinary or local /uploads with static serve). Update user.avatar URL.
5. GET /api/users/:id/skills — List user's skills with isVerified, level, calculatedScore, verifiedAt, verificationUrl.
6. GET /api/users/me/github-stats — Fetch from GitHub API: public repos count, total stars, top languages, contribution streak. Cache for 1hr.
7. GET /api/users/me/leetcode — Fetch LeetCode stats (solved easy/medium/hard) via LeetCode public API. Cache for 1hr.
8. POST /api/users/me/portfolio — Add a portfolio project: { title, description, repoUrl, liveUrl, techStack[], thumbnailUrl }.
9. GET /api/users/:id/portfolio — List portfolio projects for user.
10. DELETE /api/users/me/portfolio/:projectId — Delete own project.
11. GET /api/users/me/completeness — Return profile completeness score (0-100) based on: avatar, headline, bio, college, github, 3+ skills, 1+ verified skill, 1+ portfolio project.

FRONTEND REQUIREMENTS:
1. MyProfile page — Hero section (avatar, name, role badge, headline, college, GitHub link). Stats row (skills count, verified count, repos, leetcode solved). Tabbed sections: Skills | Portfolio | GitHub Activity | LeetCode.
2. PublicProfile page (/profile/:id) — Same layout, read-only. Follow/Connect button. "Send Message" button linking to chat.
3. Edit Profile Modal/Drawer — In-place edit triggered by "Edit Profile" button. Avatar upload with preview crop. Live character counters on bio/headline.
4. Skill Badges — Color-coded by verification status (gold = GitHub verified, grey = unverified). Show score tooltip on hover. Clicking opens verification detail.
5. Profile Completeness Bar — Top of profile edit view. Animated progress bar (0-100%). Checklist of what's missing.
6. GitHub Activity Section — Show: top languages (pie/bar chart), public repos, stars, recent activity (last 5 events). Powered by GitHub API via backend.
7. LeetCode Stats — Donut chart of Easy/Medium/Hard. Total solved. Acceptance rate. Refresh button.
8. Portfolio Cards — Grid of project cards: thumbnail/icon, title, tech stack tags, GitHub + Live links, "Verified with SkillSphere" badge if repo was verified.

DESIGN REQUIREMENTS:
- Avatar: circular, fallback to initials avatar with gradient
- Skill badges: pill shape, icon + name + score
- Verified skills: distinct visual treatment (glow, checkmark, gold border)
- Responsive: mobile-first grid layout
- Animations: card entry with Framer Motion stagger
```

---

## 3. GitHub-Backed Skill Verification
> **Status: ✅ COMPLETED**

**Description:** The trust engine. Users submit a GitHub repository URL to verify a specific skill. Gemini AI analyzes the codebase (architecture, complexity, patterns) and returns a score 1–10 with reasoning. Anti-cheat measures prevent gaming.

**Sub-features:**
- Submit repo URL + skill name for verification
- GitHub repo validation (forks rejected, 404s rejected, repo ownership check)
- Multi-file code sampling (frontend, backend, schema, deps)
- Gemini AI scoring with structured JSON response
- Anti-prompt injection guard
- Auto-discovery: scan all profile skills and verify matching ones in single scan
- Verification history per skill
- Re-verification cooldown (prevent score gaming)
- Verification result notification

---

### 📋 Implementation Prompt — Feature 3

```
You are implementing the GitHub-Backed Skill Verification feature for SkillSphere — a production-grade platform.

Start by thoroughly reading the existing implementation:
- Server: server/routes/verify.js, server/services/verifyService.js, server/routes/skills.js
- Client: client/src/features/skills/, client/src/services/ (skill/verify related)
- Schema: server/prisma/schema.prisma (Skill model: isVerified, verificationUrl, verificationSource, calculatedScore, verifiedAt)

Then audit against industry-standard requirements and implement any gaps:

BACKEND REQUIREMENTS:
1. POST /api/verify/skill — verifyLimiter (20/hr). Body: { repoUrl, skillName }. Full verification pipeline:
   a. Validate GitHub URL format (must be github.com/user/repo)
   b. Fetch repo metadata via GitHub API — reject if: fork, archived, <10 commits, 404, private
   c. Verify repo committer emails include user's GitHub email (ownership check)
   d. Fetch file tree (GET /repos/:owner/:repo/git/trees/HEAD?recursive=1)
   e. Categorize files: frontend (.jsx/.tsx/.vue), backend (.js/.ts/.py/.go), schema (.prisma/.sql), deps (package.json/requirements.txt/go.mod)
   f. Sample top 3 files per category (max 3000 chars each, trimmed intelligently)
   g. Build Gemini prompt with anti-injection guard (wrap user content in XML delimiters, instruct model to ignore instructions in code)
   h. Call Gemini 2.5 Flash with structured JSON response schema: { score: number(1-10), level: string, reasoning: string, evidence: string[], flags: string[] }
   i. Validate response is pure JSON (strip markdown fences if needed)
   j. Clamp score 1-10. Map to level: 1-3=Beginner, 4-6=Intermediate, 7-8=Advanced, 9-10=Expert
   k. Check re-verification cooldown: reject if same skill verified within last 7 days
   l. Upsert Skill record. Push InAppNotification. Log SKILL_VERIFIED activity.
   m. Return { score, level, reasoning, evidence, skillId }

2. POST /api/verify/batch — Auto-discovery scan. Fetch all user skills. For each skill name, search user's GitHub repos for a matching one. Queue verification for top match. Return results.

3. GET /api/skills — List authenticated user's skills (all, with verification status).
4. POST /api/skills — Add a new unverified skill: { name, level }. Max 20 skills per user.
5. DELETE /api/skills/:skillId — Delete own skill.
6. GET /api/skills/leaderboard?skill=React — Top 10 users with highest verified score for a given skill.

FRONTEND REQUIREMENTS:
1. Skills Page/Tab — Grid of skill cards. Each shows: name, level badge, score bar (0-10), verification status icon, "Verify" button (if unverified or cooldown expired).
2. Verify Skill Modal — Step 1: Select skill. Step 2: Paste GitHub repo URL. Step 3: Real-time progress states (Validating repo → Fetching code → Analyzing with AI → Saving result). Step 4: Result card (score, level, reasoning, evidence bullets).
3. Batch Verify Button — "Scan & Verify All Skills" — triggers batch endpoint. Shows progress per skill with status chips.
4. Skill Detail Drawer — Click any skill badge → Drawer with: full score history, AI reasoning, evidence, link to verified repo, verification date, level explanation.
5. Add Skill Form — Type skill name (autocomplete from common tech list). Select level. Submit. Directs to verify flow.

SECURITY REQUIREMENTS:
- Anti-prompt injection: wrap all user-supplied code in XML-like delimiters in prompt
- Rate limit: 20 verifications per hour per user
- Ownership check: committer email must match GitHub account email
- Score cannot be manually overridden via API (server-authoritative only)
- Re-verification cooldown: 7 days minimum
```

---

## 4. Global Feed (Posts, Likes, Comments)
> **Status: ✅ COMPLETED**

**Description:** The technical community hub. Users share updates, projects, articles, and achievements. Others react with likes and engage with threaded comments. Think LinkedIn meets a developer forum.

**Sub-features:**
- Create post (text + optional images, they could be multiple)
- Edit & delete own post
- Like / unlike post (toggle, idempotent)
- Like count display (Instagram-style count) + "Liked by" modal (LinkedIn-style names list)
- Nested comments (threaded)
- Like a comment
- Delete own comment (soft-delete if has replies)
- Report post/comment (abuse flagging)
- Feed pagination (cursor-based infinite scroll)
- Share post (copy link)

---

### 📋 Implementation Prompt — Feature 4

```
You are implementing the Global Feed feature for SkillSphere — a production-grade platform.

Start by thoroughly reading the existing implementation:
- Server: server/routes/posts.js
- Client: client/src/pages/GlobalFeed.jsx, client/src/services/feedService.js
- Schema: server/prisma/schema.prisma (Post, Like, Comment models)

Then audit against these industry-standard requirements (modeled after LinkedIn/Instagram feed) and implement any gaps:

BACKEND REQUIREMENTS:
1. GET /api/posts?cursor=<id>&limit=10 — Cursor-based pagination. Return posts with: author (id, name, avatar, headline, role), likeCount, commentCount, isLikedByMe (bool), top 2 comments preview. Sort: newest first.

2. POST /api/posts — Body: { content (max 2000 chars), imageUrl? }. Zod validate. Create post. Log POSTED_CONTENT activity. Rate limit: 10 posts per hour.

3. PUT /api/posts/:id — Owner only. Edit content/image. Track editedAt timestamp. Cannot edit after 24hrs.

4. DELETE /api/posts/:id — Owner only (or ADMIN role). Cascade delete likes + comments. Log activity.

5. POST /api/posts/:id/like — Toggle like (idempotent):
   - If not liked → create Like → likeCount++
   - If liked → delete Like → likeCount--
   - Return { liked: bool, likeCount: number }
   - Push notification to post author (if not self-like)

6. GET /api/posts/:id/likes?cursor=<id>&limit=20 — Paginated list of who liked: { id, name, avatar, headline, role }. For the "liked by" modal.

7. POST /api/posts/:id/comments — Body: { content (max 500 chars), parentId? }. Create comment. Max 2 levels (parentId must be top-level comment). Push notification to post author + parent comment author.

8. GET /api/posts/:id/comments?cursor=<id>&limit=20 — Paginated top-level comments with nested replies. Each comment: { id, author, content, likeCount, isLikedByMe, createdAt, editedAt?, replies: [...] }.

9. POST /api/posts/:id/comments/:commentId/like — Toggle comment like.

10. DELETE /api/posts/:id/comments/:commentId — Owner or ADMIN. If has replies: soft-delete (replace content with "[deleted]", keep thread structure). If no replies: hard delete.

11. POST /api/posts/:id/report — Body: { reason: enum(SPAM|INAPPROPRIATE|MISINFORMATION|OTHER), detail? }. Store report. Alert admin if post gets 3+ reports.

FRONTEND REQUIREMENTS:
1. Feed Page — Infinite scroll (Intersection Observer). Skeleton loaders while fetching. "Back to top" floating button. "N new posts" toast notification on refresh.

2. Post Card — Author avatar + name + headline + time (relative: "2h ago"). Content with "See more/less" truncation. Image (lazy loaded, click to expand lightbox). Action bar: Like button (animated heart, count), Comment button (count), Share button (copy link toast).

3. Like Button — Filled heart (red) if liked, outline if not. Count next to it. On count click → "Liked by" modal with paginated user list (name + avatar + follow button).

4. Comment Section — Expandable below post. Top-level comments in chronological order. Each comment: avatar + name + content + time + Like (count) + Reply button + Delete (own only). Replies indented. "View N more replies" collapse toggle.

5. Comment Compose — Single-line input that expands on focus. Submit on Enter or button. Cancel on Escape.

6. Create Post Card — At top of feed. "What's on your mind, {name}?" placeholder. Opens Post Compose Modal on click.

7. Post Compose Modal — Rich textarea (2000 char limit with counter). Image upload preview. Post button. Cancel button.

8. Share Post — Copy link to clipboard. Toast "Link copied!".

9. Report Modal — Radio group (Spam, Inappropriate, Misinformation, Other). Optional text area. Submit.

PERFORMANCE REQUIREMENTS:
- Cursor-based pagination (NOT offset)
- Like count uses optimistic UI update (update immediately, revert on error)
- Images lazy-loaded
- Comments lazy-loaded (not fetched with initial post list)
```

---

## 5. Real-Time Direct Messaging (Chat)
> **Status: ✅ COMPLETED**

**Description:** Private 1:1 conversations between users. Messages delivered instantly via Socket.io. Read receipts, online presence, typing indicators — all the features users expect from a modern chat.

**Sub-features:**
- Start a new conversation with any user
- Send & receive messages in real time
- Message read receipts (✓ sent, ✓✓ read)
- Online/offline presence indicator
- Typing indicator ("Alice is typing...")
- Conversation list with last message preview + unread badge
- Delete message (own only, within 5 mins — soft-delete)
- Emoji support

---

### 📋 Implementation Prompt — Feature 5

```
You are implementing the Real-Time Direct Messaging (Chat) feature for SkillSphere — a production-grade platform.

Start by thoroughly reading the existing implementation:
- Server: server/routes/chat.js, server/socket.js
- Client: client/src/features/chat/, client/src/config/socket.js
- Schema: server/prisma/schema.prisma (Conversation, Message, ConversationParticipant models)

Then audit against industry-standard requirements (modeled after Messenger/WhatsApp Web) and implement any gaps:

BACKEND HTTP ROUTES:
1. GET /api/chat/conversations — List all conversations for auth user. Each: { id, otherUser: {id, name, avatar, isOnline}, lastMessage: {content, createdAt, isRead}, unreadCount }. Sort by updatedAt DESC.

2. GET /api/chat/conversations/:conversationId/messages?cursor=<id>&limit=30 — Cursor-based message history (newest first). Each message: { id, senderId, content, isRead, createdAt, deletedAt? }.

3. POST /api/chat/conversations — Start new conversation: { recipientId }. If exists, return existing. Return { conversationId }.

4. DELETE /api/chat/messages/:messageId — Soft-delete (set deletedAt). Only within 5 minutes of send. Show "This message was deleted" in UI.

5. PUT /api/chat/conversations/:id/read — Mark all messages in conversation as isRead=true where senderId != currentUser.

SOCKET.IO EVENTS:
1. SEND_MESSAGE: { conversationId, recipientId, content } → Create Message in DB → emit RECEIVE_MESSAGE to both rooms → emit NOTIFICATION to recipient.
2. TYPING_START: { conversationId, recipientId } → emit TYPING_START to recipient room.
3. TYPING_STOP: { conversationId, recipientId } → emit TYPING_STOP to recipient.
4. MESSAGE_READ: { conversationId } → mark messages read in DB → emit MESSAGES_READ to sender: { conversationId }.
5. USER_ONLINE: on connect → broadcast to conversation partners.
6. USER_OFFLINE: on disconnect → emit to conversation partners.
7. Maintain in-memory Map<userId, socketId> for presence tracking.

FRONTEND REQUIREMENTS:
1. Chat Layout — Two-panel: Conversation List (left) + Message Thread (right). Mobile: full-screen toggle.

2. Conversation List — Each item: avatar (with online indicator dot), name, last message snippet, timestamp, unread badge. "New Message" button. Search input.

3. Message Thread — Header: avatar + name + online status. Scrollable message area. Compose bar at bottom.

4. Message Bubbles — Own: right-aligned primary color. Others: left-aligned grey. Read receipt icon (✓ sent, ✓✓ read, blue ✓✓ seen). Deleted: italic "[Message deleted]".

5. Typing Indicator — Animated 3-dot bounce. Debounced: emit TYPING_STOP 2s after last keystroke.

6. Compose Bar — Expandable textarea. Emoji picker button. Send on Enter (Shift+Enter for newline). Character limit 2000.

7. New Conversation — "New Message" button → user search modal → select user → navigate to conversation.

8. Unread Count — Badge on Navbar chat icon with total unread. Per-conversation badge in sidebar.

PERFORMANCE:
- Messages paginated (load more on scroll to top)
- Optimistic message send
- Socket reconnection with exponential backoff
```

---

## 6. In-App Notifications
> **Status: ✅ COMPLETED**

**Description:** The real-time alert system. Every significant platform event — squad application, skill verified, message received, post liked — triggers an in-app notification delivered via Socket.io and persisted in the DB.

**Sub-features:**
- Real-time notification delivery via Socket.io
- Notification bell with unread badge count
- Notification dropdown/panel
- Mark as read (individual + mark all read)
- Notification types: message, squad_application, skill_verified, post_liked, comment_reply, squad_accepted/rejected, follow
- Notification action URLs (click → navigate to relevant page)
- Notification preferences (enable/disable per type)
- Paginated notification history

---

### 📋 Implementation Prompt — Feature 6

```
You are implementing the In-App Notifications feature for SkillSphere — a production-grade platform.

Start by thoroughly reading the existing implementation:
- Server: server/routes/notifications.js, server/utils/notify.js
- Client: client/src/shared/Navbar.jsx (notification bell area)
- Schema: server/prisma/schema.prisma (InAppNotification model)

Then audit against industry-standard requirements and implement all gaps:

BACKEND REQUIREMENTS:
1. GET /api/notifications?cursor=<id>&limit=20 — Paginated notification list for auth user. Each: { id, type, title, message, isRead, actionUrl, createdAt, metadata: {} }. Sorted newest first.

2. GET /api/notifications/unread-count — Return { count: number }. Cached per user for 30s.

3. PUT /api/notifications/:id/read — Mark single notification as read.

4. PUT /api/notifications/read-all — Mark all user's notifications as read.

5. DELETE /api/notifications/:id — Delete a notification (own only).

6. Notification types + content templates:
   - NEW_MESSAGE: "💬 {senderName} sent you a message", actionUrl: /chat/{conversationId}
   - SQUAD_APPLICATION_RECEIVED: "🎯 {applicantName} applied to {squadTitle}", actionUrl: /squads/{squadId}/applications
   - SQUAD_APPLICATION_ACCEPTED: "🎉 You were accepted to {squadTitle}!", actionUrl: /squads/{squadId}
   - SQUAD_APPLICATION_REJECTED: "❌ Your application to {squadTitle} was not accepted", actionUrl: /squads
   - SKILL_VERIFIED: "⭐ Your {skillName} skill was verified! Score: {score}/10", actionUrl: /profile
   - POST_LIKED: "❤️ {likerName} liked your post", actionUrl: /feed/{postId}
   - COMMENT_REPLY: "💬 {commenterName} replied to your comment", actionUrl: /feed/{postId}
   - MATCH_RECOMMENDED: "🤝 N.E.X.U.S. recommended you for a squad role", actionUrl: /squads
   - NEW_FOLLOWER: "👤 {name} started following you", actionUrl: /profile/{userId}

7. notify() utility in utils/notify.js:
   - createNotification(userId, type, data) → Prisma create InAppNotification
   - io.to(userId).emit('NOTIFICATION', notificationObject)
   - Must be callable from any service without circular deps

FRONTEND REQUIREMENTS:
1. Notification Bell (Navbar) — Bell icon. Red badge with unread count (cap at 99+). Polling fallback every 30s if socket disconnected.

2. Notification Dropdown — Opens on bell click. Max height with scroll. "Mark all read" button. "See all" link to full page. Empty state "You're all caught up!".

3. Notification Item — Icon/emoji based on type. Title in bold. Message text. Relative time. Unread items: blue left border + light background. Click → navigate to actionUrl + mark as read.

4. Notification Page (/notifications) — Full paginated list. Filter tabs: All | Unread | Squad | Social. Group by date (Today, Yesterday, This Week).

5. Notification Preferences (Profile Settings) — Toggle switches per notification type. Persist to user preferences in DB.

6. Real-time: On NOTIFICATION socket event → prepend to list → increment unread count → browser notification API if tab not focused.
```

---

## 7. Network Discovery (People You May Know)
> **Status: ✅ COMPLETED**

**Description:** Helps users discover other students, alumni, mentors, and recruiters on the platform. Filterable user directory powered by verified skills, college, and role. The "Browse People" feature.

**Sub-features:**
- User directory with search (name, skill, college)
- Filter by role (student, alumni, mentor, recruiter)
- Filter by verified skill
- Filter by college
- Sort by: Most recent, Most verified skills, Highest skill score
- User cards with key stats
- Pagination (infinite scroll)
- "Follow" button on each card
- "People You May Know" suggestion row

---

### 📋 Implementation Prompt — Feature 7

```
You are implementing the Network Discovery feature for SkillSphere — a production-grade platform.

Start by thoroughly reading the existing implementation:
- Server: server/routes/users.js (search/discovery endpoints)
- Client: client/src/features/network/, client/src/pages/Network.jsx
- Schema: server/prisma/schema.prisma (User, Skill models)

Then audit against industry-standard requirements and implement all gaps:

BACKEND REQUIREMENTS:
1. GET /api/users?search=<query>&role=<role>&skill=<skillName>&college=<college>&sort=<field>&cursor=<id>&limit=20 — Paginated user discovery:
   - Full-text search on name (ILIKE) and headline
   - Filter by role (STUDENT | ALUMNI | MENTOR | RECRUITER)
   - Filter by skill name (user must have that skill, optionally isVerified=true)
   - Filter by college
   - Sort: newest (createdAt DESC), most_skills, highest_score
   - Exclude self
   - Each result: { id, name, avatar, role, headline, college, verifiedSkillCount, topSkills, isFollowing }
   - Cache results 60s per unique query fingerprint

2. GET /api/users/suggested — "People You May Know" — 6 suggestions based on: same college, overlapping skills. Exclude already-following. Exclude self.

3. GET /api/users/:id — Full public profile.

FRONTEND REQUIREMENTS:
1. Network Page (/network) — Two sections:
   a. "People You May Know" — horizontal scrollable row of 6 suggestion cards. Refresh button.
   b. "Browse All" — full searchable/filterable directory with infinite scroll.

2. Search & Filter Bar — Text search (debounced 300ms). Role filter (pill toggles). Skill filter (autocomplete dropdown). College filter (text input). Sort dropdown. Active filters as removable chips.

3. User Card — Avatar (with online indicator). Name + role badge. Headline. College. Verified skill count + top 3 skill badges. "Follow" / "Following" button. "Message" button.

4. Suggestion Card (compact) — Avatar. Name + role. 2 matching skills highlighted ("Both know React"). "Follow" button.

5. Empty State — Illustration + "No users found". "Clear filters" button.

6. URL state sync — Filters reflected in URL query params. React Router + useState sync.

PERFORMANCE:
- Debounce search (300ms)
- Infinite scroll with Intersection Observer
- Suggested users cached 5 min client-side
```

---

## 8. Squad / Mission Board
> **Status: ✅ COMPLETED**

**Description:** The project team-building engine. Users create "squads" for hackathons, open-source, startups, and research. Each squad has roles/slots with skill requirements. Applicants apply, leaders review, N.E.X.U.S. recommends — teams form.

**Sub-features:**
- Create squad (title, desc, event type, visibility, expiry)
- Define squad slots/roles (role title, required skill, min score, requireVerified)
- Browse mission board (all open squads) with filters
- Apply to a squad slot (with gatekeeper eligibility check)
- Squad leader: review applications per slot
- Trigger N.E.X.U.S. match for a slot
- Accept/reject applications
- Squad detail page (members, slots, applications)
- Leave squad
- Automated squad expiry cron

---

### 📋 Implementation Prompt — Feature 8

```
You are implementing the Squad / Mission Board feature for SkillSphere — a production-grade platform.

Start by thoroughly reading the existing implementation:
- Server: server/routes/squads.js, server/services/squadService.js, server/services/gatekeeper.js, server/jobs/ (squadMaintenance)
- Client: client/src/features/squads/, client/src/pages/MissionBoard.jsx
- Schema: server/prisma/schema.prisma (Squad, SquadSlot, SquadApplication, SquadMember models)

Then audit against industry-standard requirements and implement all gaps:

BACKEND REQUIREMENTS:
1. POST /api/squads — Create squad. Body: { title, description, event (HACKATHON|OPEN_SOURCE|RESEARCH|STARTUP|PORTFOLIO), visibility (PUBLIC|INVITE_ONLY), maxMembers, expiresAt, slots: [{roleTitle, requiredSkill, minScore, requireVerified}] }. Max 3 active squads per user. Creator auto-joins as leader.

2. GET /api/squads?event=<>&status=<>&skill=<>&cursor=<>&limit=10 — Browse open squads. Filter by event type, status (OPEN|FULL|CLOSED), required skill. Each squad: { id, title, event, currentMembers, maxMembers, openSlots, leader: {name, avatar}, expiresAt }.

3. GET /api/squads/:id — Full squad detail: squad info + all slots (with applicants count, filled status) + current members + leader info.

4. PUT /api/squads/:id — Leader only. Edit title, description, expiry. Cannot edit slots once applications exist.

5. DELETE /api/squads/:id — Leader only. Soft-close: set status=CLOSED, notify all applicants.

6. POST /api/squads/:id/apply — Body: { slotId, message? }.
   Gatekeeper checks:
   a. Squad is OPEN
   b. Slot is OPEN (not filled)
   c. User not already member or applicant
   d. User meets skill requirements (has skill, meets minScore, isVerified if requireVerified=true)
   e. User has github linked
   Create SquadApplication (status=PENDING). Notify leader.

7. GET /api/squads/:id/applications — Leader only. List all applications grouped by slot. Each: { applicant: {full profile}, slotId, status, matchScore, message, appliedAt }.

8. PUT /api/squads/:id/applications/:appId — Leader only. Body: { status: ACCEPTED|REJECTED }.
   On ACCEPT: add user to SquadMember, update slot status if full, increment currentMembers, notify applicant.
   On REJECT: notify applicant.

9. DELETE /api/squads/:id/leave — Member leaves squad. Decrement currentMembers. Reopen slot. Cannot leave if you're leader.

10. Cron: squadMaintenance.js — Run daily. Set OPEN squads past expiresAt to EXPIRED. Notify leaders.

FRONTEND REQUIREMENTS:
1. Mission Board Page (/squads) — "Create Squad" CTA. Filter bar (event type pills, skill autocomplete, status toggle). Squad cards grid with infinite scroll.

2. Squad Card — Event type badge (color-coded). Title + description (truncated). Leader avatar + name. Members count progress bar (current/max). Open slots with required skills. "Expires in X days" warning if <3 days. "Apply" CTA or "Full" badge.

3. Squad Detail Page (/squads/:id) — Hero section (title, event badge, description). Leader card. Members section (avatar grid). Slots section (accordion: each slot with role, required skill, score, verify requirement, applicant count, "Apply" button if eligible).

4. Create Squad Form (multi-step modal) — Step 1: Basic info. Step 2: Add slots (dynamic slot builder). Step 3: Review + Submit.

5. Apply Modal — Show slot requirements. Message textarea (optional). Frontend gatekeeper pre-check (disable "Apply" if requirements not met, show why). Confirm + submit.

6. Applications Panel (Leader) — Tabs per slot. Each applicant card: avatar, name, skills (highlight matched skill), score, message. "View Profile" link. "Accept" / "Reject" buttons. "Run N.E.X.U.S." button.

DESIGN:
- Event type color system: HACKATHON=purple, OPEN_SOURCE=green, RESEARCH=blue, STARTUP=orange, PORTFOLIO=teal
- Slot status: Open (green) | Filled (grey) | Has Applications (amber)
- Expiry urgency: color shifts to red as deadline approaches
```

---

## 9. N.E.X.U.S. Antifragile Matching Engine
> **Status: ✅ COMPLETED**

**Description:** The core differentiator. Squad leaders trigger N.E.X.U.S. for a specific slot — multiple strategies vote in parallel (verified skills, activity score, college proximity), a consensus engine picks the winner or explores via weighted-random. Outcomes feed back to improve strategies over time.

**Sub-features:**
- Trigger match for a squad slot with candidate list
- Multi-strategy parallel execution (Promise.allSettled, 5s timeout)
- Consensus vs. weighted-random exploration path
- Full decision logging (strategy vote snapshot stored as JSON)
- Match outcome recording (accepted, leaderRating)
- Strategy evolution cron (promote/demote based on acceptance rate + retention)
- Admin: strategy state management (ACTIVE/SHADOW/DEPRECATED)
- Admin: decision history & performance analytics

---

### 📋 Implementation Prompt — Feature 9

```
You are implementing the N.E.X.U.S. Antifragile Matching Engine for SkillSphere — a production-grade platform.

Start by thoroughly reading the existing implementation:
- Server: server/routes/antifragile.js, server/services/matchOrchestrator.js, server/services/consensusEngine.js, server/services/strategyRegistry.js, server/services/decisionLogger.js, server/services/gatekeeper.js, server/strategies/
- Client: client/src/features/admin/ (strategy management)
- Schema: server/prisma/schema.prisma (MatchStrategy, MatchDecision, MatchOutcome, StrategyPerformance)

Then audit against industry-standard requirements and implement all gaps:

BACKEND REQUIREMENTS:
1. POST /api/antifragile/match — Leader only. Body: { squadId, slotId, candidateIds: [] }.
   Full pipeline:
   a. Load squad + slot context from DB
   b. Load candidate profiles with skills
   c. Fetch ACTIVE + SHADOW strategies via strategyRegistry
   d. Execute all strategies in parallel (Promise.allSettled, 5s timeout each per strategy)
   e. ACTIVE strategies vote; SHADOW strategies observe only
   f. Consensus: if >= minConsensusStrategies agree on same top candidate → CONSENSUS path (wasConsensus=true)
   g. No consensus → EXPLORATION: weighted-random selection (HIGH=2x, MEDIUM=1x, LOW=0.5x weight, capped at 2.0)
   h. Log MatchDecision: { squadId, slotId, selectedUserId, wasConsensus, wasRandom, strategyVotes JSON, activeStrategies list, executionTimeMs }
   i. Return { recommendedUserId, alternatives: [{userId, score, reason}], decisionId, explanation: { method, confidence }, meta }

2. POST /api/antifragile/outcome/:decisionId — Body: { accepted: bool, leaderRating: 1-5 }. Create MatchOutcome.

3. GET /api/antifragile/strategies — ADMIN only. All strategies with state, influenceLevel, stats.

4. PUT /api/antifragile/strategies/:id — ADMIN only. Update state or influenceLevel.

5. GET /api/antifragile/decisions?squadId=<>&limit=20 — LEADER (own squads) or ADMIN.

6. Cron: strategyEvolution.js — Run weekly:
   - Calculate 30-day performance per strategy
   - SHADOW → ACTIVE if acceptanceRate > 0.7 AND retention30dRate > 0.6
   - ACTIVE → SHADOW if acceptanceRate < 0.4
   - Adjust influenceLevel based on rank

STRATEGIES (server/strategies/):
1. verified_skills_v1.js — Score = user's skill score for required skill. isVerified: score*1.5 bonus. Reject below minScore.
2. activity_score_v1.js — Score = weighted sum of: posts (last 30d), squad applications, profile completeness, last login recency.
3. college_proximity_v1.js — Score = 100 if same college as squad leader, 50 if same city, 0 otherwise.

FRONTEND REQUIREMENTS:
1. "Run N.E.X.U.S." button in applications panel → Opens N.E.X.U.S. match modal.

2. N.E.X.U.S. Match Modal — Step 1: Select slot. Step 2: Select candidates. Step 3: "Run Match" button with dramatic loading animation.

3. Match Result Display — Animated reveal (the product's centerpiece!):
   - Recommended candidate: avatar, name, skills, reasoning
   - Method badge: "CONSENSUS ✓" (green) or "EXPLORATION ⟳" (amber)
   - Strategy vote breakdown table: strategy name | vote | score | confidence
   - Alternatives list (2nd, 3rd)
   - "Accept Recommendation" or "Override" buttons

4. Admin Dashboard (/admin) — Tabs:
   a. Strategies: table with state toggle, influence level, win rate sparkline
   b. Decision Log: expandable rows with full strategyVotes JSON
   c. Analytics: consensus rate, acceptance rate per strategy (Recharts)

DESIGN:
- N.E.X.U.S. branding: futuristic, blue/cyan color scheme
- Match reveal: Framer Motion card flip or particle burst
- Strategy states: ACTIVE=green, SHADOW=amber, DEPRECATED=red
```

---

## 10. AI Career Roadmap
> **Status: ✅ COMPLETED**

**Description:** The personalized learning GPS. Users select a target career role and a skill gap — Gemini generates a structured, week-by-week learning roadmap. Contextually aware: uses existing verified skills to skip redundant content.

**Sub-features:**
- Select target role from predefined list (Frontend Dev, Backend Dev, Data Engineer, DevOps, etc.)
- Skill gap analysis (compare current skills vs. role requirements)
- Generate personalized Markdown roadmap (Week 1–2, 3–4, 5–8 + Resources)
- Proficiency-aware: adapts content to user's existing skill levels
- Save / bookmark roadmap
- Regenerate with different parameters
- Share roadmap (public link with share token)
- Mark roadmap milestones as complete (progress tracking)

---

### 📋 Implementation Prompt — Feature 10

```
You are implementing the AI Career Roadmap feature for SkillSphere — a production-grade platform.

Start by thoroughly reading the existing implementation:
- Server: server/routes/ai.js, server/services/aiService.js
- Client: client/src/pages/Dashboard.jsx
- Schema: server/prisma/schema.prisma (JobRole, JobRoleSkill models, and any Roadmap model)

Then audit against industry-standard requirements and implement all gaps:

BACKEND REQUIREMENTS:
1. GET /api/ai/roles — List all job roles: { id, title, description, requiredSkills: [{skillName, importance}] }.

2. GET /api/ai/gap-analysis?roleId=<> — Authenticated. Compare user's verified skills vs role's required skills:
   Return: { role, missingSkills: [{skillName, importance, reason}], existingSkills: [{skillName, userScore, importance, gap}], overallReadiness: number }

3. POST /api/ai/roadmap — aiLimiter (20/hr). Body: { targetSkill, targetRole, currentLevel? }.
   Pipeline:
   a. Load user's verified skills from DB
   b. Classify proficiency: 0=Beginner, 1-4=Beginner+, 5-7=Intermediate, 8-10=Advanced
   c. Build context with existing skills as analogies
   d. Build anti-redundancy instructions
   e. Call Gemini 2.5 Flash (prompt below)
   f. Cache result per (userId, targetSkill, targetRole) for 24hrs
   g. Save Roadmap to DB: { userId, targetRole, targetSkill, content, generatedAt }
   h. Return { roadmapMarkdown, cacheHit: bool, generatedAt }

4. GET /api/ai/roadmaps — User's saved roadmaps with progress %.
5. GET /api/ai/roadmaps/:id — Full roadmap + progress items.
6. PUT /api/ai/roadmaps/:id/progress — Body: { completedItems: string[] }. Save + calculate %.
7. GET /api/ai/roadmaps/:id/share — Generate public share token.
8. GET /api/ai/roadmaps/shared/:token — Public, unauthenticated.

PROMPT ENGINEERING (in aiService.js):
"""
You are a senior engineering mentor creating a personalized learning roadmap.

STUDENT CONTEXT:
- Target Role: {targetRole}
- Skill to Learn: {targetSkill}
- Current Verified Skills: {existingSkillsWithLevels}

INSTRUCTIONS:
1. Skip topics the student already knows from their existing skill set
2. Use analogies to their known technologies where helpful
3. Structure: Overview → Week 1-2 → Week 3-4 → Week 5-8 → Resources
4. Be specific: name actual courses, books, projects to build
5. Include a "Quick Win" project at Week 2
6. Resources: 3 free + 2 paid with URLs

FORMAT: Return clean Markdown only. No preamble.
"""

FRONTEND REQUIREMENTS:
1. Dashboard Page — Two sections: Skill Gap Analysis + Roadmap Generator.

2. Skill Gap Analysis Card — Target role dropdown. Donut chart of readiness %. Color-coded skill list: green (have it), amber (partial gap), red (missing). "Generate Roadmap" CTA per missing skill.

3. Roadmap Generator — Role dropdown + skill autocomplete. "Generate" button with AI loading animation. Smooth slide-in on success.

4. Roadmap Display — Rendered Markdown (react-markdown + rehype-highlight). Sections as accordion panels. Milestone checkboxes. Progress bar at top. "Regenerate" and "Save" and "Share" buttons.

5. Saved Roadmaps (Profile or Dashboard tab) — Card per roadmap: role + skill, date, progress %, "Continue" link.

6. Public Share View (/roadmap/shared/:token) — Clean read-only view. SkillSphere branding. "Create your own" CTA.

DESIGN:
- AI generation: typewriter streaming text effect while generating
- Role selector: searchable dropdown with category groups
- Roadmap: beautiful typography, clear week demarcations, resource cards
```

---

## 11. Admin Dashboard (Strategy Management)
> **Status: ✅ COMPLETED**

**Description:** The control plane for admins. Monitor N.E.X.U.S. strategy health, manage strategy states, view decision logs, audit platform activity, and manage flagged content.

**Sub-features:**
- Platform overview stats (users, posts, squads, verifications today)
- N.E.X.U.S. strategy state management
- Strategy performance analytics (charts)
- User management (search, view, suspend, delete)
- Reported content review (posts, comments)
- System health check (DB, Redis, cron jobs)

---

### 📋 Implementation Prompt — Feature 11

```
You are implementing the Admin Dashboard for SkillSphere — a production-grade platform.

Start by thoroughly reading the existing implementation:
- Server: server/routes/antifragile.js (admin strategy routes), server/routes/users.js (admin user routes)
- Client: client/src/features/admin/
- Schema: server/prisma/schema.prisma (MatchStrategy, StrategyPerformance, InAppNotification, Post models)

Then audit against industry-standard requirements and implement all gaps:

BACKEND REQUIREMENTS (all require role=ADMIN middleware guard):
1. GET /api/admin/stats — { totalUsers, newUsersToday, totalPosts, newPostsToday, totalSquads, activeSquads, totalVerifications, avgSkillScore }.

2. GET /api/admin/users?search=<>&role=<>&cursor=<>&limit=20 — Admin user list. Each: { id, name, email, role, github, createdAt, isActive, verifiedSkillCount, postCount }.

3. PUT /api/admin/users/:id/suspend — Set isActive=false. Send notification email.

4. DELETE /api/admin/users/:id — Hard delete with full cascade.

5. GET /api/admin/reports?status=PENDING&cursor=<>&limit=20 — Content reports. Each: { id, content preview, reporter, reason, reportedAt, status }.

6. PUT /api/admin/reports/:id — Resolve: { action: DISMISS|REMOVE_CONTENT|SUSPEND_USER }.

7. GET /api/admin/health — DB connection status, Redis status, pending jobs count.

FRONTEND REQUIREMENTS:
1. Admin Layout (/admin) — Sidebar: Overview | Users | Reports | N.E.X.U.S. | Health. Protected: redirect non-admins.

2. Overview Tab — Stat cards. 7-day sparkline charts. "Needs attention" alerts.

3. Users Tab — Searchable/filterable table. Per-row actions: View Profile, Suspend, Delete (with confirmation modal).

4. Reports Tab — Report cards with content preview, reporter info, reason. Actions: Dismiss | Remove Post | Suspend User.

5. N.E.X.U.S. Tab — Strategy management + analytics (see Feature 9 admin views).

6. System Health Tab — Green/red indicators for DB, Cache, cron jobs. Last-run times. Error log tail (last 20 errors from Winston).
```

---

## 12. Search & Discovery
> **Status: ✅ COMPLETED**

**Description:** A unified search bar across all content types — users, squads, posts, skills. Fast, context-aware results organized by type.

**Sub-features:**
- Global search (users, squads, posts) in one query
- Autocomplete suggestions (debounced)
- Search results page with type tabs (All, People, Squads, Posts)
- Filters within search results
- Recent searches (stored in localStorage)
- Trending skills & squads

---

### 📋 Implementation Prompt — Feature 12

```
You are implementing the Search & Discovery feature for SkillSphere — a production-grade platform.

Start by reading all relevant parts of the codebase — schema, existing routes — to understand current state.

Then implement end-to-end:

BACKEND REQUIREMENTS:
1. GET /api/search?q=<query>&type=<all|users|squads|posts>&limit=10 — Unified search:
   - Users: ILIKE on name + headline + skill name match
   - Squads: ILIKE on title + description
   - Posts: full-text search on content (PostgreSQL tsvector)
   - Return each type as separate array
   - Relevance: boost exact matches, boost verified profiles

2. GET /api/search/suggestions?q=<query> — Autocomplete (max 5 results): user names + squad titles. Target <100ms. ILIKE with LIMIT 5.

3. GET /api/search/trending — Trending skills (most verified in last 7 days). Trending squads (most applications in last 7 days). Cache for 1hr.

FRONTEND REQUIREMENTS:
1. Global Search Bar (Navbar) — Expand on focus. Autocomplete dropdown as user types (debounced 200ms). Recent searches (localStorage). "Search" on Enter.

2. Search Results Page (/search?q=<>) — Tabs: All | People | Squads | Posts. URL-synced query. Matched text highlighted.

3. Result Cards — Use same card designs as Network (people), Mission Board (squads), Feed (posts) for consistency.

4. Trending Section — "Trending Skills" pill list. "Hot Squads" compact cards. Shown on /network or when search is empty.

5. Empty State — "No results for '{query}'" + suggestions to broaden search.

PERFORMANCE:
- Debounce autocomplete (200ms)
- PostgreSQL full-text indexes on searchable fields
- Autocomplete cached 30s per query
- PostgreSQL tsvector for post content search
```

---

## 13. Follow / Connection System
> **Status: ✅ COMPLETED**

**Description:** The social graph. Users can follow others (asymmetric, like Twitter/Instagram). Following gives you their posts in your personalized feed. Mutual follows = "Connected" status.

**Sub-features:**
- Follow / unfollow a user (toggle, idempotent)
- Follower count & Following count on profile (clickable)
- Followers list & Following list (paginated)
- "Connected" indicator for mutual follows
- Follow activity notification
- Personalized feed tab showing only followed users' posts
- Suggested follows based on shared skills/college

---

### 📋 Implementation Prompt — Feature 13

```
You are implementing the Follow / Connection System for SkillSphere — a production-grade platform.

Start by reading the existing schema and user routes. There is likely NO Follow model yet — you will need to add it.

SCHEMA CHANGES — add to server/prisma/schema.prisma:
model Follow {
  id          String   @id @default(uuid())
  followerId  String
  followingId String
  createdAt   DateTime @default(now())
  follower    User     @relation("UserFollowing", fields: [followerId], references: [id], onDelete: Cascade)
  following   User     @relation("UserFollowers", fields: [followingId], references: [id], onDelete: Cascade)
  @@unique([followerId, followingId])
  @@index([followerId])
  @@index([followingId])
}
Add "followers" and "following" relations to User model.
Run: npx prisma migrate dev --name add_follow_system

BACKEND REQUIREMENTS:
1. POST /api/users/:id/follow — Follow a user. Idempotent. Cannot follow self. Create Follow. Notify target. Return { following: true, followerCount: number }.

2. DELETE /api/users/:id/follow — Unfollow. Delete Follow. Return { following: false, followerCount: number }.

3. GET /api/users/:id/followers?cursor=<>&limit=20 — Paginated followers list: { id, name, avatar, headline, isFollowing (am I following them back?) }.

4. GET /api/users/:id/following?cursor=<>&limit=20 — Paginated following list.

5. GET /api/users/:id — Update to include followerCount, followingCount, isFollowedByMe, isFollowingMe, isMutual in profile response.

6. GET /api/feed/following — Posts from users the auth user follows. Cursor-paginated. (Personalized feed layer on top of Feature 4.)

FRONTEND REQUIREMENTS:
1. Follow Button — On all user cards. States: "Follow" (outlined) | "Following" (filled, hover shows "Unfollow"). Optimistic UI update.

2. Profile Page — Show followerCount + followingCount below name. Clickable → opens followers/following modal with paginated list.

3. Personalized Feed Tab — In Global Feed: "Following" tab alongside "All". Empty state: "Follow people to see their posts here" + suggested users.

4. "Connected" badge — If mutual follow, show "Connected ⇄" instead of Follow/Unfollow.

5. Suggested follows based on shared skills/college (reuse GET /api/users/suggested from Feature 7).

NOTIFICATION:
- Notify user when someone follows them: "👤 {name} started following you", actionUrl: /profile/{userId}
```

---

## 14. Recruiter Discovery Mode

**Description:** A specialized interface for recruiters to search the platform's talent by verified skills, not resumes. Think GitHub Jobs meets LinkedIn Recruiter, but with trust-anchored skill scores.

**Sub-features:**
- Recruiter role onboarding (company name, use case)
- Skill-based talent search (multi-skill, min score threshold, verified-only toggle)
- Candidate profile view (public, skills-focused)
- Shortlist / bookmark candidates with notes
- Export shortlist as CSV
- "Contact" button (sends intro message via chat, rate-limited)
- Opt-out privacy setting for candidates ("not open to recruiters")

---

### 📋 Implementation Prompt — Feature 14

```
You are implementing the Recruiter Discovery Mode for SkillSphere — a production-grade platform.

Start by reading existing user routes and schema to understand the current state. You will likely need to add a Shortlist model and recruiter-specific fields.

SCHEMA CHANGES:
model ShortlistEntry {
  id          String   @id @default(uuid())
  recruiterId String
  candidateId String
  note        String?
  savedAt     DateTime @default(now())
  recruiter   User     @relation("RecruiterShortlists", fields: [recruiterId], references: [id], onDelete: Cascade)
  candidate   User     @relation("CandidateShortlists", fields: [candidateId], references: [id], onDelete: Cascade)
  @@unique([recruiterId, candidateId])
}
Add isOpenToRecruiters Boolean field to User model (default true).

BACKEND REQUIREMENTS:
1. GET /api/recruiters/search?skills=React,Node&minScore=7&verifiedOnly=true&college=<>&cursor=<>&limit=20 — Recruiter-only endpoint:
   - User must have ALL specified skills (AND logic)
   - Each skill meets minScore if specified
   - isVerified=true for each if verifiedOnly=true
   - Filter out isOpenToRecruiters=false users
   - Filter out RECRUITER/ADMIN roles
   - Return: { id, name, avatar, headline, college, skills: [matching with scores], githubUrl, matchStrength }

2. POST /api/recruiters/shortlist — Body: { candidateId, note? }. Create ShortlistEntry.

3. GET /api/recruiters/shortlist — List recruiter's shortlisted candidates with full profiles.

4. DELETE /api/recruiters/shortlist/:candidateId — Remove from shortlist.

5. GET /api/recruiters/shortlist/export — Return CSV: name, email (if isOpenToRecruiters), skills, scores, github.

6. POST /api/recruiters/contact/:userId — Send intro message (create conversation). Rate limited: 10/day per recruiter.

7. PUT /api/users/me/recruiter-visibility — Body: { isOpenToRecruiters: bool }. Toggle opt-in/out.

FRONTEND REQUIREMENTS:
1. Recruiter Home (/recruit) — Protected: role=RECRUITER only. Skill-based search interface.

2. Search Interface — Multi-select skill input with score sliders. "Verified only" toggle. College filter. Sort by match strength. Results grid.

3. Candidate Card (Recruiter View) — Skill badges with scores. Match strength indicator. "Shortlist" bookmark icon (toggle). "Contact" button.

4. Shortlist Panel — All bookmarked candidates. Notes per candidate. "Export CSV" button. Remove button.

5. Recruiter Onboarding — On first login with role=RECRUITER: company name input, use case. Brief explainer.

6. Candidate Privacy Settings — In profile settings: "Open to Recruiters" toggle. When off: hidden from recruiter search results.

PRIVACY REQUIREMENTS:
- Email only visible in export if isOpenToRecruiters=true
- Recruiter identity shown to candidates they contact (no anonymous outreach)
- Rate limit contact: 10 per day per recruiter
```

---

## 15. Activity Feed & Analytics

**Description:** Every meaningful action on the platform is logged. Users can see their own activity timeline. Personal analytics power the N.E.X.U.S. activity_score strategy and show users how they're growing.

**Sub-features:**
- Activity timeline per user (posts, verifications, squad joins, follows, logins)
- Activity feed on public profile (public subset of events)
- Personal analytics dashboard (skill growth chart, post engagement, activity heatmap)
- N.E.X.U.S. activity score widget (breakdown of how the engine scores you)
- Platform-wide stats accessible to admins (from Feature 11)

---

### 📋 Implementation Prompt — Feature 15

```
You are implementing the Activity Feed & Analytics feature for SkillSphere — a production-grade platform.

Start by reading:
- Server: server/routes/activity.js, server/services/activityService.js
- Schema: server/prisma/schema.prisma (ActivityLog model if exists)

SCHEMA — ensure ActivityLog model exists:
model ActivityLog {
  id        String   @id @default(uuid())
  userId    String
  type      String   -- enum: ACCOUNT_CREATED, USER_LOGIN, PROFILE_UPDATED, SKILL_ADDED, SKILL_VERIFIED, POST_CREATED, POST_LIKED, COMMENT_CREATED, SQUAD_CREATED, SQUAD_JOINED, SQUAD_LEFT, FOLLOW_ADDED, ROADMAP_GENERATED
  metadata  Json     @default("{}")
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, createdAt])
  @@index([type, createdAt])
}

BACKEND REQUIREMENTS:
1. GET /api/activity/me?cursor=<>&limit=20 — Auth user's full activity log. Paginated.

2. GET /api/users/:id/activity — Public subset of user's activity (exclude logins, private events). Return: SKILL_VERIFIED, POST_CREATED, SQUAD_JOINED, SQUAD_CREATED, FOLLOW_ADDED, ROADMAP_GENERATED.

3. GET /api/activity/analytics/me — Personal analytics:
   - skillsAddedPerMonth: last 6 months
   - verificationSuccessRate: verified / total attempts
   - postEngagement: avg (likes + comments) per post
   - squadActivity: { squadsJoined, squadsLed, applicationsSubmitted }
   - activityScore: N.E.X.U.S. activity score breakdown { postsScore, squadScore, recencyScore, total }

4. activityService.js — logActivity(userId, type, metadata) utility callable from any service. Prisma create ActivityLog.

FRONTEND REQUIREMENTS:
1. Activity Timeline (Profile Tab) — Chronological list. Each item: color-coded icon + description + relative time. Grouped by date. "Load more" button.

2. Personal Analytics (Dashboard section) — 4 chart panels:
   a. Skill Growth: line chart of verified skill count per month (last 6 months)
   b. Post Engagement: bar chart of likes+comments per post (last 10 posts)
   c. Activity Heatmap: GitHub-style contribution heatmap (platform activity per day, last 12 months)
   d. Squad Activity: pie chart (squad leader vs. member vs. applicant breakdown)
   Charts: Recharts, themed to SkillSphere dark palette.

3. N.E.X.U.S. Activity Score Widget — Show current score (0-100). Breakdown: posts score + squad score + recency score. Progress bars per component. "Tips to improve" expandable section (e.g., "Post 3 more times this month to max your posts score").

DESIGN:
- Activity icons: color-coded (skill=gold, squad=purple, social=blue, system=grey)
- Heatmap: exactly like GitHub's contribution graph (green intensity = more activity)
- Analytics section collapses behind "View Analytics" toggle to keep dashboard clean
```

---

## Implementation Notes

> **Each day's session should follow this order:**
> 1. Read the feature description + sub-features to understand scope
> 2. Copy the Implementation Prompt into a fresh conversation
> 3. The AI will audit existing code first, then fill gaps
> 4. Review the output, test, and commit
> 5. Mark the feature ✅ in this file

> **Quality bar for every feature:**
> - Backend: Zod validation, Winston logging, rate limiting, proper HTTP status codes, consistent response shape `{ success: true, data: {...} }` / `{ success: false, message: "..." }`
> - Frontend: Loading states, error states, empty states, mobile responsive, Framer Motion animations
> - Security: Auth guards, ownership checks, input sanitization
> - At minimum: test happy path + one edge case per endpoint

> **Tech context reminder for each session:**
> Stack: React 19 + Vite + Tailwind + Framer Motion | Node.js + Express | PostgreSQL + Prisma ORM | Socket.io | Google Gemini 2.5 Flash | JWT httpOnly cookies | Zod | Winston
> Architecture: Feature-Sliced Design (client), Service-Oriented (server)
> Repo: C:\Users\kshit\cs\skillsphere

---

*SkillSphere Feature Implementation Roadmap — Created August 2026*
