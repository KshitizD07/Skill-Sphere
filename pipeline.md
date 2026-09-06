# 🚀 Master Guide: CI/CD Pipelines with GitHub Actions & Docker Hub
### *From Ground Zero to Automated Cloud Deployments (The SkillSphere Blueprint)*

---

## 📌 Table of Contents
1. [Introduction: What is CI/CD?](#1-introduction-what-is-cicd)
   - [The Manual Deployment Anti-Pattern](#the-manual-deployment-anti-pattern)
   - [Continuous Integration (CI) Explained](#continuous-integration-ci-explained)
   - [Continuous Delivery (CD) vs Continuous Deployment (CD)](#continuous-delivery-cd-vs-continuous-deployment-cd)
   - [End-to-End Pipeline Workflow Diagram](#end-to-end-pipeline-workflow-diagram)
2. [GitHub Actions Core Architecture](#2-github-actions-core-architecture)
   - [Workflows, Triggers, Jobs, and Runners](#workflows-triggers-jobs-and-runners)
   - [Job Dependencies (`needs`) & Concurrency](#job-dependencies-needs--concurrency)
   - [Runner Hardware: Why We Build on GitHub Instead of EC2](#runner-hardware-why-we-build-on-github-instead-of-ec2)
3. [Deep-Dive: SkillSphere CI Pipeline Analysis (`.github/workflows/ci.yml`)](#3-deep-dive-skillsphere-ci-pipeline-analysis-githubworkflowsciyml)
   - [Trigger Conditions (`on: push, pull_request, workflow_dispatch`)](#trigger-conditions)
   - [Job 1: Backend Testing & Linting](#job-1-backend-testing--linting)
   - [Job 2: Frontend Building & Testing](#job-2-frontend-building--testing)
   - [Job 3: Docker Image Compilation (`build-images`)](#job-3-docker-image-compilation-build-images)
   - [Docker Buildx, QEMU, and Multi-Platform Builds](#docker-buildx-qemu-and-multi-platform-builds)
4. [Container Registries: Docker Hub & Image Tagging](#4-container-registries-docker-hub--image-tagging)
   - [What is a Container Registry?](#what-is-a-container-registry)
   - [The Immutability Principle: Tagging by Commit SHA vs `:latest`](#the-immutability-principle-tagging-by-commit-sha-vs-latest)
   - [Configuring Docker Hub Credentials in GitHub Secrets](#configuring-docker-hub-credentials-in-github-secrets)
5. [Automated Continuous Deployment (CD) to AWS EC2](#5-automated-continuous-deployment-cd-to-aws-ec2)
   - [How GitHub Actions Communicates with EC2 (SSH Automation)](#how-github-actions-communicates-with-ec2-ssh-automation)
   - [Required Repository Secrets](#required-repository-secrets)
   - [Complete Production Deployment Workflow File](#complete-production-deployment-workflow-file)
   - [The Zero-Memory-Crash Deployment Script on EC2](#the-zero-memory-crash-deployment-script-on-ec2)
6. [Database Migrations in CI/CD: The Real-World Post-Mortem](#6-database-migrations-in-cicd-the-real-world-post-mortem)
   - [The Production Bug: Prisma Error P2022](#the-production-bug-prisma-error-p2022)
   - [Root Cause Analysis: `prisma db push` vs `prisma migrate dev`](#root-cause-analysis-prisma-db-push-vs-prisma-migrate-dev)
   - [The Three Prisma Commands Explained](#the-three-prisma-commands-explained)
   - [Investigating & Verifying Migrations in Git](#investigating--verifying-migrations-in-git)
   - [Automating `prisma migrate deploy` in the Pipeline](#automating-prisma-migrate-deploy-in-the-pipeline)
7. [Operational Best Practices & Rollback Strategy](#7-operational-best-practices--rollback-strategy)
   - [Instant Rollback to a Previous Image](#instant-rollback-to-a-previous-image)
   - [Pruning Dangling Images on the Server](#pruning-dangling-images-on-the-server)

---

## 1. Introduction: What is CI/CD?

### The Manual Deployment Anti-Pattern
Before CI/CD existed, software deployment was manual, slow, and terrifying:
1. A developer wrote code locally and pushed it to GitHub.
2. The developer opened an SSH terminal into the live production server (e.g., AWS EC2).
3. The developer ran `git pull origin main`.
4. The developer ran `npm install` and `npm run build` directly on the server.
5. If the server was a small Free-Tier instance (like an AWS `t2.micro` with 1 GB of RAM), running `npm run build` or `docker compose build` exhausted the RAM! The Linux Kernel **OOM (Out Of Memory) Killer** was invoked, killing the database and web server, bringing down the production site for everyone.
6. If a junior developer pushed a syntax error or a broken database migration, the production app crashed immediately with no automatic rollback.

### Continuous Integration (CI) Explained
**Continuous Integration** is the automated practice of integrating code changes from multiple developers into a central repository frequently. Every single pull request or push triggers an automated build and test sequence:
- **Linting**: Verifies code conforms to styling and syntax rules (ESLint).
- **Unit & Integration Tests**: Ensures changes do not break existing business logic (Jest).
- **Compilation Check**: Confirms that frontend assets (Vite/TypeScript) and backend code build without errors.
- **Result**: No broken code can ever be merged to `main` without automated approval.

### Continuous Delivery (CD) vs Continuous Deployment (CD)
- **Continuous Delivery**: Every validated build produces a deployable artifact (e.g., a Docker image pushed to Docker Hub). Deployment to production is ready at the click of a button.
- **Continuous Deployment**: The entire pipeline from code commit to production release is 100% automated. If tests pass and the Docker image builds, it is immediately and safely deployed to live cloud servers without human intervention.

---

### End-to-End Pipeline Workflow Diagram

```mermaid
flowchart TD
    subgraph DeveloperWorkstation ["Developer Workstation"]
        Dev["Developer writes code"] -->|git commit & push| GitHubRepo["GitHub Repository\n(branch: main)"]
    end

    subgraph GitHubActions ["GitHub Actions Cloud Runner (4 vCPU, 16GB RAM)"]
        GitHubRepo -->|Webhook Trigger| Trigger["Event: on: push main"]
        
        subgraph StageCI ["Continuous Integration (CI)"]
            Trigger --> JobBackend["Job: backend\n• Setup Node 22\n• npm ci\n• npm run lint\n• npm test"]
            Trigger --> JobFrontend["Job: frontend\n• Setup Node 22\n• npm ci\n• npm run lint\n• npm test\n• npm run build"]
        end

        subgraph StageBuildPush ["Docker Build & Release"]
            JobBackend & JobFrontend -->|needs: [backend, frontend]| JobDocker["Job: build-and-push\n• Docker Buildx\n• Build Server & Client Images\n• Tag with :latest & :sha"]
        end
    end

    subgraph Registry ["Docker Hub Container Registry"]
        JobDocker -->|Push Images| DockerHub["docker.io/yourusername/skillsphere-server\ndocker.io/yourusername/skillsphere-client"]
    end

    subgraph EC2Production ["AWS EC2 Production Server (1 vCPU, 1GB RAM)"]
        JobDocker -->|SSH Action| SSH["Run Deploy Commands"]
        SSH --> Pull["docker compose pull\n(Downloads pre-compiled images)"]
        DockerHub -.->|Streams layers| Pull
        Pull --> Up["docker compose up -d\n(Zero CPU build overhead!)"]
        Up --> Migrate["Container runs: npm run db:deploy\n(Applies Prisma migrations)"]
        Migrate --> LiveApp["🎉 SkillSphere is LIVE & Updated!"]
    end
```

---

## 2. GitHub Actions Core Architecture

GitHub Actions is an event-driven automation platform built directly into GitHub.

### Workflows, Triggers, Jobs, and Runners
- **Workflow**: An automated configurable process stored as a YAML file in the `.github/workflows/` directory of your repository.
- **Events (`on:`)**: Specific activities that trigger the workflow:
  - `push`: Triggered when commits are pushed to specified branches.
  - `pull_request`: Triggered when a PR is opened or updated against a branch.
  - `workflow_dispatch`: Enables a manual **"Run workflow"** button in GitHub's UI.
- **Jobs**: A set of steps executed on a fresh virtual runner. Jobs run in parallel by default unless ordered with `needs:`.
- **Runners**: Virtual machines hosted by GitHub (e.g., `ubuntu-latest`).
- **Steps & Actions**: Individual tasks within a job. An action (`uses:`) is a reusable unit of code from the GitHub Marketplace (e.g., `actions/checkout@v4`).

---

### Job Dependencies (`needs`) & Concurrency
By default, GitHub Actions executes all jobs concurrently. In SkillSphere's pipeline:
```mermaid
graph LR
    Push["git push"] --> BackendJob["Job: backend (lint + test)"]
    Push --> FrontendJob["Job: frontend (lint + test + build)"]
    BackendJob --> BuildImages["Job: build-images\n(needs: [backend, frontend])"]
    FrontendJob --> BuildImages
```
If **either** the backend tests or frontend build fail, GitHub halts execution immediately. The `build-images` job is **canceled**, preventing broken Docker images from ever being built or shipped.

---

### Runner Hardware: Why We Build on GitHub Instead of EC2
This is the single most important architectural insight for cloud engineers:

| Metric | GitHub Actions Runner (`ubuntu-latest`) | AWS EC2 Free Tier (`t2.micro`) |
| :--- | :--- | :--- |
| **vCPUs** | **4 vCPUs** | 1 vCPU (burstable) |
| **RAM** | **16 GB RAM** | 1 GB RAM |
| **Disk Storage** | 14 GB SSD | 8–30 GB EBS |
| **Cost** | **100% Free** (2,000 mins/mo for public/private repos) | Free Tier (750 hours/mo) |
| **Role** | Heavy compilation & Docker image building | Running pre-built containers with low resource load |

**Never build Docker images on a `t2.micro` EC2 instance!** Offload all CPU and RAM-heavy compilation to GitHub Actions runners. The EC2 instance should only ever do one thing: **download the finished image and run it.**

---

## 3. Deep-Dive: SkillSphere CI Pipeline Analysis (`.github/workflows/ci.yml`)

Let's examine the actual `.github/workflows/ci.yml` in SkillSphere:

```yaml
name: CI

on:
  push:
    branches:
      - master
      - main
      - develop
  pull_request:
    branches:
      - master
      - main
      - develop
  workflow_dispatch:

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: server/package-lock.json

      - name: Install Backend Dependencies
        working-directory: server
        run: npm ci

      - name: Lint Backend
        working-directory: server
        run: npm run lint

      - name: Test Backend
        working-directory: server
        run: npm test

  frontend:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: client/package-lock.json

      - name: Install Frontend Dependencies
        working-directory: client
        run: npm ci

      - name: Lint Frontend
        working-directory: client
        run: npm run lint

      - name: Test Frontend
        working-directory: client
        run: npm test

      - name: Build Frontend
        working-directory: client
        run: npm run build

  build-images:
    needs: [backend, frontend]
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build Backend Image
        uses: docker/build-push-action@v6
        with:
          context: ./server
          file: ./server/Dockerfile
          push: false
          tags: |
            backend:latest
            backend:${{ github.sha }}

      - name: Build Frontend Image
        uses: docker/build-push-action@v6
        with:
          context: ./client
          file: ./client/Dockerfile
          build-args: |
            VITE_API_URL=https://api.skillsphere.com
            VITE_SOCKET_URL=https://api.skillsphere.com
          push: false
          tags: |
            frontend:latest
            frontend:${{ github.sha }}
```

---

### Step-by-Step Anatomy of the Jobs

#### 1. `actions/checkout@v4`
Clones your GitHub repository into the runner’s virtual environment so that subsequent steps can access the files.

#### 2. `actions/setup-node@v4` with `cache: npm`
- Configures Node.js 22.
- Inspects `package-lock.json` and automatically restores npm cache from previous runs. If dependencies haven't changed, `npm ci` installs in **seconds** instead of minutes!

#### 3. `npm ci`
Performs an automated clean install strictly adhering to `package-lock.json`. If someone committed a package in `package.json` without updating the lockfile, the build intentionally crashes here to safeguard production.

#### 4. `npm run lint` & `npm test`
Runs ESLint to check for unhandled exceptions, unused variables, and code syntax errors. Then executes Jest test suites with `--runInBand` for backend and frontend.

#### 5. `docker/setup-buildx-action@v3` & `setup-qemu-action@v3`
- **Buildx**: Extended Docker tool powered by BuildKit, providing advanced features like scoped layer caching and multi-stage parallelization.
- **QEMU**: Hardware emulator enabling you to build ARM64 Docker images (for AWS Graviton or Apple Silicon) directly on x86_64 GitHub runners.

---

## 4. Container Registries: Docker Hub & Image Tagging

### What is a Container Registry?
A container registry is a cloud catalog for storing and distributing compiled Docker images. Just as GitHub stores your Git source code, **Docker Hub** (or AWS ECR, GitHub Packages) stores your production-ready container images.

```mermaid
graph LR
    GHA["GitHub Actions Runner"] -->|docker push| DHub["Docker Hub Registry\n(hub.docker.com)"]
    DHub -->|docker pull| EC2["AWS EC2 Host"]
```

---

### The Immutability Principle: Tagging by Commit SHA vs `:latest`

A common beginner pitfall is tagging images only as `:latest`:
```bash
docker tag backend youruser/skillsphere-server:latest
```

#### Why `:latest` alone is dangerous:
- `:latest` is mutable; every push overwrites the previous `:latest`.
- If you deploy a broken `:latest` to EC2, you cannot easily identify which commit broke production or immediately rollback to the previous version.

#### The Professional Tagging Strategy:
SkillSphere tags with **both**:
```yaml
tags: |
  yourusername/skillsphere-server:latest
  yourusername/skillsphere-server:${{ github.sha }}
```
- `github.sha` is the unique 40-character Git commit hash (e.g., `d2019f12d74c4e97883b...`).
- `:latest` points to the most recent release for easy pulling.
- `:${{ github.sha }}` is **immutable**! It links every running container directly to the exact Git commit that produced it, enabling instantaneous 5-second rollbacks if something fails!

---

### Configuring Docker Hub Credentials in GitHub Secrets
To allow GitHub Actions to push images to Docker Hub:
1. Go to [hub.docker.com](https://hub.docker.com) → Account Settings → **Security** → **New Access Token**.
2. Name it `github-actions` and give it `Read & Write` permissions. Copy the generated token.
3. In your GitHub repository:
   - Go to **Settings** → **Secrets and variables** → **Actions**.
   - Click **New repository secret**.
   - Add `DOCKERHUB_USERNAME`: Your Docker Hub handle.
   - Add `DOCKERHUB_TOKEN`: The access token you just generated.

---

## 5. Automated Continuous Deployment (CD) to AWS EC2

Now, let's connect the final piece of the puzzle: **Automating deployment to AWS EC2.**

### How GitHub Actions Communicates with EC2 (SSH Automation)
GitHub Actions runners run in GitHub's cloud. Your EC2 instance runs in AWS.
To deploy automatically, GitHub Actions uses an automated SSH client (such as `appleboy/ssh-action`) to authenticate into EC2 via an SSH private key and execute the deployment script.

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant GH as GitHub Actions (CI)
    participant DH as Docker Hub Registry
    participant EC2 as AWS EC2 Host

    Dev->>GH: git push origin main
    Note over GH: Runs Linters, Tests & Builds
    GH->>DH: Push server:latest & client:latest
    Note over GH: Build & Push Complete
    GH->>EC2: SSH Connection via Private Key
    Note over EC2: Authenticated as ubuntu
    EC2->>DH: docker compose pull
    DH-->>EC2: Stream updated image layers
    EC2->>EC2: docker compose up -d
    Note over EC2: Containers recreated gracefully
    EC2->>EC2: npm run db:deploy
    EC2-->>GH: Deployment Success (Exit code 0)
    GH-->>Dev: Workflow Successful (Green Checkmark)
```

---

### Required Repository Secrets

Add these secrets under GitHub **Settings → Secrets and variables → Actions**:

| Secret Name | Description | Example Value |
| :--- | :--- | :--- |
| `DOCKERHUB_USERNAME` | Docker Hub username | `kshitizd` |
| `DOCKERHUB_TOKEN` | Docker Hub Personal Access Token | `dckr_pat_...` |
| `EC2_HOST` | Public IPv4 address or Domain of EC2 | `13.233.25.42` |
| `EC2_USER` | Default Linux user for Ubuntu AMI | `ubuntu` |
| `EC2_SSH_KEY` | Entire contents of your `.pem` private key | `-----BEGIN RSA PRIVATE KEY-----...` |

---

### Complete Production Deployment Workflow File

Here is the complete production workflow (`.github/workflows/deploy.yml`):

```yaml
name: Production Deployment

on:
  push:
    branches:
      - main

jobs:
  ci-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node 22
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: server/package-lock.json

      - name: Run Backend Tests
        working-directory: server
        run: |
          npm ci
          npm run lint
          npm test

      - name: Run Frontend Tests & Build
        working-directory: client
        run: |
          npm ci
          npm run lint
          npm test
          npm run build

  build-and-push:
    needs: [ci-tests]
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build & Push Backend Image
        uses: docker/build-push-action@v6
        with:
          context: ./server
          file: ./server/Dockerfile
          push: true
          tags: |
            ${{ secrets.DOCKERHUB_USERNAME }}/skillsphere-server:latest
            ${{ secrets.DOCKERHUB_USERNAME }}/skillsphere-server:${{ github.sha }}

      - name: Build & Push Frontend Image
        uses: docker/build-push-action@v6
        with:
          context: ./client
          file: ./client/Dockerfile
          build-args: |
            VITE_API_URL=/api
            VITE_SOCKET_URL=/
          push: true
          tags: |
            ${{ secrets.DOCKERHUB_USERNAME }}/skillsphere-client:latest
            ${{ secrets.DOCKERHUB_USERNAME }}/skillsphere-client:${{ github.sha }}

  deploy-ec2:
    needs: [build-and-push]
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to AWS EC2 over SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            set -e
            cd ~/Skill-Sphere
            
            echo "Pulling latest code repository..."
            git pull origin main
            
            echo "Pulling pre-built Docker images from Docker Hub..."
            docker compose pull
            
            echo "Recreating running containers gracefully..."
            docker compose up -d --remove-orphans
            
            echo "Cleaning up dangling images to save EBS disk space..."
            docker image prune -f
            
            echo "Deployment successfully finished!"
```

---

### The Zero-Memory-Crash Deployment Script on EC2
Notice what happens on the EC2 machine in the SSH script:
```bash
docker compose pull
docker compose up -d --remove-orphans
```
Because the images were built on GitHub's 16GB runner and pushed to Docker Hub:
1. EC2 spends **0% CPU** compiling TypeScript or running Webpack/Vite.
2. EC2 simply streams down compressed image layers over AWS's high-speed network.
3. Docker replaces the running container with the new version in under **3 seconds**!

---

## 6. Database Migrations in CI/CD: The Real-World Post-Mortem

During the SkillSphere deployment session, the application encountered this exact production error:

```
PrismaClientKnownRequestError: 
Invalid `prisma.user.findFirst()` invocation:
The column `User.guestPersona` does not exist in the current database.
Error Code: P2022
```

### Why Login and OTP Failed
1. The backend code was updated to query:
   ```javascript
   prisma.user.findFirst({ where: { email } });
   ```
2. Prisma ORM compiled this JavaScript call into SQL:
   ```sql
   SELECT id, email, guestPersona, password FROM "User" WHERE email = '...';
   ```
3. PostgreSQL responded with an error:
   ```
   ERROR: column "guestPersona" does not exist in table "User"
   ```
4. Express caught the unhandled database error and returned HTTP 500, causing OTP and authentication to fail completely!

```mermaid
flowchart TD
    NodeApp["Node.js Express App\n(prisma.user.findFirst)"] -->|Generates SQL| SQL["SELECT id, email, guestPersona FROM User"]
    SQL -->|Queries| PG[("PostgreSQL Database")]
    PG -->|Table Schema lacks guestPersona| Err["💥 ERROR: P2022\nColumn does not exist!"]
    Err --> NodeApp
    NodeApp --> Crash["500 Internal Server Error (Login Fails)"]
```

---

### Root Cause Analysis: `prisma db push` vs `prisma migrate dev`

Why was the column present in the developer's local environment, but missing in production?

```mermaid
graph TD
    subgraph BadWorkflow ["❌ The Broken Local Workflow (prisma db push)"]
        S1["Edit schema.prisma (add guestPersona)"] --> S2["Run: npx prisma db push"]
        S2 --> S3["Local Postgres updated directly!"]
        S3 --> S4["No migration file created in prisma/migrations!"]
        S4 --> S5["Git commit & push (migration missing!)"]
    end

    subgraph ProdFailure ["Production Deployment Failure"]
        S5 --> P1["Production runs: prisma migrate deploy"]
        P1 --> P2["Only executes files in prisma/migrations"]
        P2 --> P3["Postgres column never created! App crashes!"]
    end
```

---

### The Three Prisma Commands Explained

| Command | Environment | What It Does | Generates Migration SQL File? |
| :--- | :--- | :--- | :--- |
| **`prisma db push`** | **Local Prototyping Only** | Synchronizes `schema.prisma` directly with the DB without tracking history. | ❌ **NO** (Bypasses migrations entirely) |
| **`prisma migrate dev`** | **Local Development** | Compares schema to DB, generates a timestamped `.sql` file in `prisma/migrations`, updates `_prisma_migrations` table, and applies changes. | ✅ **YES** (Must be committed to Git!) |
| **`prisma migrate deploy`** | **CI/CD & Production** | Reads `prisma/migrations` folder and executes all unapplied SQL migration files sequentially. Never prompts for input. | ➖ Applies existing SQL files |

---

### Investigating & Verifying Migrations in Git

To determine whether a database column has an active migration before deploying, run these two diagnostic commands inside the server directory:

```bash
# 1. List all migration directories
ls prisma/migrations

# 2. Search for the specific column name across all migration SQL files
grep -R "guestPersona" prisma/migrations
```

If `grep` returns **empty**, the migration file does **not** exist! You must generate it locally:
```bash
npx prisma migrate dev --name add_user_guest_persona
git add prisma/migrations
git commit -m "feat: add user guest persona migration"
git push origin main
```

---

### Automating `prisma migrate deploy` in the Pipeline

In SkillSphere's `docker-compose.yml`, migrations are automatically applied on container startup:
```yaml
server:
  command: sh -c "npm run db:deploy && npm start"
```
Where `npm run db:deploy` runs:
```bash
prisma migrate deploy
```
Now, whenever GitHub Actions deploys new code to EC2:
1. New Docker containers are pulled.
2. The server container launches `prisma migrate deploy`.
3. Prisma checks PostgreSQL’s `_prisma_migrations` tracking table.
4. Any new migration files (like `20260516130323_add_user_guest_persona`) are executed in milliseconds.
5. `npm start` launches the Express API server with database and code perfectly synchronized!

---

## 7. Operational Best Practices & Rollback Strategy

### Instant Rollback to a Previous Image
If a release causes unexpected bugs in production, you do not need to wait for a code hotfix:
1. Locate the previous working commit SHA on GitHub (e.g., `a1b2c3d`).
2. Update the image tag on EC2 or in your docker-compose:
   ```yaml
   image: yourusername/skillsphere-server:a1b2c3d
   ```
3. Run:
   ```bash
   docker compose up -d
   ```
Your application reverts to the known good version in **under 5 seconds**.

### Pruning Dangling Images on the Server
Every time GitHub Actions pushes and deploys a new image, the previous image becomes untagged (known as a **dangling image** or `<none>:<none>`). Over weeks of deployments, these dangling layers will slowly consume your EBS disk space.

Always include a prune step in your deployment script:
```bash
docker image prune -f
```
This frees up gigabytes of disk space while leaving your active images and database volumes completely untouched.

---

*Continue to `cloud_deployment.md` to learn how to provision AWS EC2, configure security firewalls, set up domains, and run at ₹0 cost.*
