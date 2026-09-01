# 🤖 Agent Prompt: Automatic Feature & Improvement Documentation Protocol

> **Usage Instruction for User**:  
> Copy and pass this prompt to the AI agent whenever you implement or fix a feature/improvement.  
> Example command to the agent:  
> *"Follow the instructions in `agents/prompt_feature_and_improvement.md` to document the [Feature Name] feature we just built/fixed."*

---

```markdown
<TASK_INSTRUCTION>
You are acting as the Lead Technical Writer & Software Architect for SkillSphere. Your task is to generate a comprehensive, dual-perspective documentation file inside `docs/Features_and_improvements/<Feature_Name>.md` for the feature/improvement we just discussed or implemented.

Follow the exact structure and formatting rules below.

---

### 📂 Directory & Output File Requirement
* **Target Directory**: `docs/Features_and_improvements/`
* **File Name Format**: `<Feature_Name_Snake_or_PascalCase>.md` (e.g., `Skill_Verification_System.md`, `Squad_Matchmaking_Engine.md`)

---

### 📄 Mandatory Specification Sections

Your generated document MUST contain all 4 of the following sections:

#### 📌 Section 0: Metadata & Executive Summary
- Document Title with Emoji, Location, Status, and Last Updated date.
- High-level overview: What the feature is, why it exists, and its core business/user value proposition.

#### 💡 Section 1: Non-Technical Explanation & Conceptual Data Flow
1. **Simple Analogy**: Explain how the feature works using a real-world, non-software analogy that a non-technical founder, product manager, or investor can instantly grasp.
2. **Plain-English Step-by-Step Flow**: A clear, 4–5 step breakdown free of heavy jargon.
3. **High-Level Mermaid Flowchart**: A clean, simple `flowchart LR` or `flowchart TD` showing the user journey and high-level decisions.

#### ⚙️ Section 2: Technical Deep Dive & System Architecture
1. **Domain Architecture**: File responsibilities, service boundaries, and route definitions.
2. **Protocol & Algorithm Breakdown**: Deep explanation of algorithms, data transformations, security guards, anti-cheat mechanisms, rate limits, and external API integrations.
3. **Database Schema Model**: Code block containing relevant Prisma models or SQL tables (`schema.prisma` snippets).
4. **Cache & State Management**: Explanation of Redis/Memory caching strategies, invalidation triggers, and reactive state updates.
5. **Technical Sequence Diagram**: A detailed `sequenceDiagram` in Mermaid tracing the exact step-by-step interactions between Candidate/User, Client UI, API routes, Services, External Services, Database, and Cache.

#### 🛠️ Section 3: Diagnostics, Root Cause Analysis & Resolved Issues
For every issue or bug identified and resolved during this session, provide a dedicated subsection using the exact 6-part framework:
1. **What was happening?**: Clear description of the symptom or UI failure.
2. **Why did it happen?**: Deep technical explanation of the root cause.
3. **Where was it located?**: Exact file paths and line numbers.
4. **How did it happen?**: Step-by-step trigger sequence leading to failure.
5. **How was it resolved?**: Step-by-step fix explanation including code diff snippets.
6. **Impact & Side Effect Analysis**: Risk level, regression potential, and data migration/cleanup instructions.

#### 📊 Section 4: Summary Table of Modified Files
A clean markdown matrix summarizing:
| File Path | Changes Made |
| :--- | :--- |
| `path/to/file` | Summary of modification |

---

### 🎨 Formatting & Style Guidelines
- Use GitHub Flavored Markdown alerts (`> [!NOTE]`, `> [!IMPORTANT]`, `> [!WARNING]`) where appropriate.
- Ensure all Mermaid diagrams are syntactically valid (quote labels containing special characters or parentheses).
- Always link file paths using GitHub markdown file links (`[filename](file:///path/to/file)`).
- Ensure the tone is authoritative, technical, transparent, and structured.
</TASK_INSTRUCTION>
```
