# SkillSphere Community Feedback & Enhancement Master Plan

> **Version:** 2.1.0  
> **Status:** Approved / Ready for Implementation  
> **Scope:** UI Consistency, Role & Verification Expansion, Feedback Loop Closure, Squad Bug Fixes, and Official System Account Security.

---

## 1. Executive Feedback Synthesis & Problem Catalog

This master plan synthesizes user testing reviews, community feedback submissions, and bug reports across the platform.

### Feedback Stream 1: Navigation, Density & Orientation
- **User Signal:** Users sometimes skip the onboarding modal and landing page, then feel disoriented on the Dashboard because of data density.
- **Diagnosis:** The 5-step modal is auto-dismissed and forgotten. We need a persistent "Getting Started" checklist zero-state and clear visual hierarchy on the Dashboard.

### Feedback Stream 2: Skill Inventory & Role Expansion (Data Analytics)
- **User Signal:** *"It would be great to see more roles added to the Skill Inventory (e.g. Data Analyst, skills like Excel, Power BI, Tableau, SQL, Pandas)."*
- **Diagnosis:** Platform seeds and constants were tailored exclusively for SWE roles (Frontend, Backend, AI/ML, DevOps, Mobile). Data Analytics, UI/UX, and Cybersecurity paths must be first-class citizens in seed catalogs, skill verification, and roadmap prompts.

### Feedback Stream 3: Layout & Vertical Spacing Inconsistency
- **User Signal:** *"Dashboard and Feedback have tidy spacing, but pages like Insights (Global Feed) and Network have noticeably different top padding, making content appear lower on the page."*
- **Diagnosis:** Pages have mixed wrapper styles: `pt-16` vs `pt-20`, `p-4 md:p-8` vs `p-4 md:p-10`, and some use full-bleed hero banners while others place items directly below headers.

### Feedback Stream 4: Metadata & Form Label Typography
- **User Signal:** *"The font used for metadata and form labels could also be slightly easier to read."*
- **Diagnosis:** `tailwind.config.js` maps `font-syne` to *Playfair Display* (serif). Using serif in small uppercase tracking (`text-[9px]` or `text-[10px] uppercase`) reduces readability for data-dense labels.

### Feedback Stream 5: Highlighting Verification (Core Differentiator)
- **User Signal:** *"GitHub-based skill verification and proof-of-work profiles make SkillSphere more meaningful than a traditional resume platform."*
- **Diagnosis:** Verification badges should be visually celebrated with glowing accents, tamper-proof shields, and direct repository proof metrics (commit counts, PRs, AST depth).

### Feedback Stream 6: Nexus Squads Pending Application Count Bug
- **User Signal:** *"Squads show '1 Pending Review' even after the leader has accepted or rejected the candidate."*
- **Diagnosis:** `squadService.js` and `MyApplications.jsx` use `_count.applications` which counts **all lifetime applications** regardless of status (`PENDING`, `ACCEPTED`, `REJECTED`).

### Feedback Stream 7: Feedback Loop Closure & Official Platform Updates
- **User Signal:** When users submit suggestions on `/feedback`, they should receive a direct response and status update. The platform should also broadcast official changelogs and platform co-creation squads on the network.

---

## 2. Comprehensive Implementation Blueprint

```mermaid
flowchart TD
    subgraph Track 1: Bug Fixes & UX Polish
        A1[1. Fix Squad Pending Application Count] --> A2[2. Standardize Page Wrappers & Paddings]
        A2 --> A3[3. Refine Label Typography to Sans-Serif]
    end

    subgraph Track 2: Role, Skill & Verification Expansion
        B1[4. Expand Roles: Data Analyst, BI, UI/UX in DB Seed] --> B2[5. Add File Types .ipynb, .sql to GitHub Verifier]
        B2 --> B3[6. Glow Badges & Proof-Gated Visuals]
    end

    subgraph Track 3: Feedback Loop & Official Account
        C1[7. Direct Feedback Status & In-App Notification System] --> C2[8. SkillSphere Official System Account & Secure Admin Switcher]
        C2 --> C3[9. Official Platform Posts & Co-Creation Squads]
    end
```

---

### Module 1: Fix Nexus Pending Application Count Bug
- **Root Cause:** `SQUAD_SELECT` returns `_count: { select: { applications: true } }` (total lifetime count).
- **Backend Fix (`server/services/squadService.js`):**
  - In `getMySquads`, return pending applications filtered by `status: 'PENDING'`, or calculate `pendingCount` strictly for pending records.
- **Frontend Fix (`MyApplications.jsx` & `SquadDetail.jsx`):**
  - Calculate pending counters strictly using `squad.applications.filter(a => a.status === 'PENDING').length`.
  - Replace lifetime application count with active pending reviews.

---

### Module 2: Standardize Layout Wrappers & Vertical Spacing
- **Rule:** Unify all internal application pages with a consistent container paradigm:
  - **Mobile (`< md`):** `pt-16 px-4 pb-12` (clears 56px fixed top header with 8px breathing room).
  - **Desktop (`md+`):** `md:ml-64 p-6 md:p-8 max-w-7xl mx-auto` for standard grid views (`GlobalFeed.jsx`, `Network.jsx`, `Search.jsx`, `NotificationsPage.jsx`, `MyApplications.jsx`, `MissionBoard.jsx`, `SquadDetail.jsx`).
  - **Hero Header Pages:** `Dashboard.jsx` and `MyProfile.jsx` retain full-width hero banners with standardized inner padding `px-6 md:px-10 py-6 md:py-8`.

---

### Module 3: Form Label & Metadata Typography Refinement
- **Rule:** Reserve `font-syne` (Playfair Display serif) strictly for prominent display headers (`h1`, `h2`, hero metrics).
- **Update:** Switch all small form labels, field placeholders, uppercase tags, and metadata timestamps from `font-syne text-[9px]` to clean, highly legible sans-serif `font-outfit text-xs font-semibold text-text-muted` or `font-mono text-[10px] tracking-wide`.

---

### Module 4: Role & Skill Inventory Expansion (Data Analytics & Beyond)
- **Database Catalog Seeding (`seed.js` & `server/prisma/seed.js`):**
  - Add **Data Analyst**: Excel, SQL, Power BI, Tableau, Python, Pandas, Data Cleaning, Data Storytelling.
  - Add **Data Engineer**: Python, SQL, Apache Spark, Airflow, dbt, PostgreSQL, ETL Pipelines, AWS BigQuery.
  - Add **UI/UX & Product Designer**: Figma, Wireframing, User Research, Prototyping, Design Systems.
  - Add **Cybersecurity Analyst**: Linux, Network Security, Wireshark, SIEM, OWASP, Penetration Testing.
- **Dashboard Quick-Selects (`Dashboard.jsx`):**
  - Add `'Data Analyst'`, `'Data Engineer'`, and `'UI/UX Designer'` to `POPULAR_ROLES`.

---

### Module 5: GitHub Skill Verifier Support for Data & Analysis Repositories
- **Backend Analyzer (`server/services/verifyService.js`):**
  - Expand `validExts` to analyze `.ipynb` (Jupyter Notebooks), `.sql` (Database Queries), `.r`, `.dax` (Power BI), and data configuration manifests.
  - Add AST/heuristic detection for Pandas (`pd.read_csv`, `df.groupby()`), Matplotlib/Seaborn visualizers, SQL joins, and data analysis pipelines.
  - Expand `LANGUAGE_MAP` aliases for `Power BI`, `Tableau`, `Excel`, `Pandas`, `SQL`.

---

### Module 6: Verification Glow Badges & Proof-Gated Visuals
- **Skill Badges:** Add glowing amber shield indicators (`border-primary/40 bg-primary/10 shadow-[0_0_10px_rgba(194,159,93,0.15)]`) to verified skills across `UserProfile.jsx`, `MyProfile.jsx`, and `GlobalFeed.jsx`.
- **Proof Breakdown:** Clicking or hovering a verified skill displays commit count, verified repos, and AST verification source.
- **Squad Gating:** Display a prominent `"Proof-Gated"` badge on squad role slots requiring GitHub verification.

---

### Module 7: Direct Feedback Resolution & In-App Notification System
- **Database Schema (`PlatformFeedback`):**
  - Add `status` field: `PENDING` | `UNDER_REVIEW` | `PLANNED` | `SHIPPED` (default `PENDING`).
  - Add `adminResponse` (`String?`) field.
  - Add `respondedAt` (`DateTime?`) and `respondedBy` (`String?`) fields.
- **Admin Management Route (`/api/feedback/:id/respond`):**
  - Allows platform admins to update status and attach an official developer response note.
  - Automatically dispatches an in-app notification (`InAppNotification`) to the user:
    > *"SkillSphere Core Team replied to your feedback: [Response Note]"*
- **User Feedback Interface (`FeedbackPage.jsx`):**
  - Add a **"My Submissions"** tab showing the user's past feedback, live status pills, and direct answers from the engineering team.

---

### Module 8: "SkillSphere Official" System Account & Dual-Barrier Admin Access

#### 1. Account Identity & Attributes
- **Name:** `SkillSphere`
- **Email:** `official@skillsphere.com`
- **Avatar:** `/logo.jpg` (Official SkillSphere emblem)
- **Headline:** `Official Platform Intelligence · Core Engineering & Dispatch`
- **Role:** `ADMIN` / `SYSTEM`
- **Special Status:** Exempted from the mandatory GitHub account check in `App.jsx`.

#### 2. Visual Recognition
- Display an **Official Verified Gold Badge** (`<ShieldCheck className="text-primary" /> Official`) on all posts, squad missions, and comments published by this account.

#### 3. Dual-Barrier Security & Login Architecture
To ensure nobody can access or hijack the official account:
1. **Public Login Blocker:** Public login forms will reject direct login attempts to `official@skillsphere.com`.
2. **Barrier 1 (Admin Mode):** You must first log into your personal authorized account and unlock **Admin Mode** using your rolling admin passcode / whitelist.
3. **Barrier 2 (Secret Environment Key):** Inside the Admin Panel, a secure switch to the official account requires entering the dedicated master password configured in `.env`:
   ```env
   OFFICIAL_ACCOUNT_PASSWORD=#basileusKZ07
   ```
4. **Session Switcher:**
   - Entering the secret switches your active session token to the `SkillSphere` official account.
   - To return to your personal profile, simply click **Log Out**, which clears the session and returns you to standard login.

---

## 3. Step-by-Step Implementation Sequence

| Step | Action Item | Target Files |
| :---: | :--- | :--- |
| **1** | Fix Nexus Squad Pending Application Count bug | `squadService.js`, `MyApplications.jsx`, `SquadDetail.jsx` |
| **2** | Standardize page layout wrappers & vertical padding | `GlobalFeed.jsx`, `Network.jsx`, `Search.jsx`, `NotificationsPage.jsx` |
| **3** | Refine form label typography from serif to sans-serif | `Dashboard.jsx`, `SquadDetail.jsx`, `MyProfile.jsx`, `Network.jsx` |
| **4** | Seed Data Analyst, BI tools, and Designer roles | `seed.js`, `aiService.js`, `Dashboard.jsx` |
| **5** | Add Jupyter `.ipynb` & SQL support to GitHub Verifier | `verifyService.js` |
| **6** | Implement Feedback Status, Admin Response & Notifications | `schema.prisma`, `feedback.js`, `FeedbackPage.jsx`, `AdminDashboard.jsx` |
| **7** | Implement SkillSphere Official Account & Dual-Barrier Admin Switcher | `App.jsx`, `auth.js`, `admin.js`, `AdminDashboard.jsx`, `.env` |
| **8** | Add Official Badge to Global Feed & Nexus Squads | `GlobalFeed.jsx`, `MissionBoard.jsx`, `SquadDetail.jsx` |

---

*Document created and committed to the SkillSphere repository for milestone v2.1.*
