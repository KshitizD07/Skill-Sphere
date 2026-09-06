# 📋 Master Command Execution Playbook & Technical Deep-Dive
### *Every Command Run Across Containerization, CI/CD Pipelines, and AWS Cloud Deployment*

---

## 📌 Overview
This document provides an exhaustive, command-by-command reference of **every single command** executed, configured, or required across the three pillars of the SkillSphere deployment:
1. **Containerization & Docker Orchestration**
2. **Database Migrations & CI/CD Pipelines**
3. **Cloud Infrastructure (AWS EC2, Linux Sysadmin & Cost Optimization)**

For each command, you will find:
- **Where & When it is run** (Local Terminal, EC2 SSH, GitHub Actions Runner, or Container Shell).
- **The Technical "Why"**: What happens under the hood at the operating system and container engine level.
- **Consequences of Skipping**: What breaks if you don't run it.
- **Expected Output & Verification**: How to confirm success.

---

# 🐳 Section 1: Containerization & Docker Commands

---

### Command 1.1: Build Docker Images Locally
```bash
docker compose build
```
- **Where it runs**: Local developer machine or remote EC2 terminal (inside `~/Skill-Sphere`).
- **The Technical "Why"**:
  - Reads `docker-compose.yml`.
  - For each service with a `build:` key (`server` and `client`), Docker reads their respective `Dockerfile`s.
  - Assembles the immutable filesystem layers: base OS (`node:22-alpine` / `nginx:alpine`), installs dependencies (`npm ci`), copies source code, compiles assets (Vite frontend and Prisma client).
- **Under the Hood**:
  - Checks the local layer cache. If `package.json` hasn't changed, reuses cached dependency layers.
  - Tags the resulting images locally.
- **Consequence of Skipping**: If you modified application code or dependencies and run `docker compose up -d` without building, Docker will run the *stale* previous image.
- **Verification**: Run `docker images` to see newly created image IDs and timestamps.

---

### Command 1.2: Launch the Multi-Container Application in Detached Mode
```bash
docker compose up -d
```
- **Where it runs**: Local machine or AWS EC2 instance.
- **The Technical "Why"**:
  - Reads `docker-compose.yml` to define the desired state of the system.
  - Automatically creates the private bridge network (`skillsphere_default`).
  - Creates and attaches the persistent volume (`postgres_data`).
  - Evaluates `depends_on` conditions and starts containers in strict order:
    1. Starts `skillsphere-db` (PostgreSQL) and `skillsphere-redis`.
    2. Waits for their `healthcheck` commands to pass (`pg_isready` and `redis-cli ping`).
    3. Starts `skillsphere-server` (executing `npm run db:deploy && npm start`).
    4. Starts `skillsphere-client` (Nginx reverse proxy on port 80).
  - The `-d` (detached) flag releases your terminal prompt, running all processes as background daemons.
- **Consequence of Skipping `-d`**: Your terminal remains attached to the stdout/stderr stream of the containers. If you close your terminal or press `Ctrl+C`, all containers will receive `SIGINT` and shut down immediately.
- **Verification**:
  ```bash
  docker ps
  ```
  All 4 containers (`skillsphere-client`, `skillsphere-server`, `skillsphere-db`, `skillsphere-redis`) should show status `Up` with `(healthy)`.

---

### Command 1.3: Inspect All Running Containers and Health Status
```bash
docker ps
```
- **Where it runs**: Host terminal (Local or EC2).
- **The Technical "Why"**:
  - Queries the Docker daemon (`dockerd`) through the UNIX domain socket `/var/run/docker.sock`.
  - Displays: Container ID, Image Name, Command executed, Creation time, Status (e.g., `Up 2 hours (healthy)`), and Port mappings (e.g., `0.0.0.0:80->80/tcp`).
- **Variations**:
  ```bash
  docker ps -a
  ```
  The `-a` (all) flag shows **stopped, crashed, or exited** containers. If a container crashes on boot (e.g., exit code 1 or 137), `docker ps` will show nothing, but `docker ps -a` reveals the exact exit status.

---

### Command 1.4: Real-Time Container Resource Monitoring
```bash
docker stats
```
- **Where it runs**: Host terminal (EC2).
- **The Technical "Why"**:
  - Reads Linux kernel `cgroups` (control groups) memory and CPU accounting files.
  - Streams live metrics for every running container:
    - **CPU %**: Percentage of vCPU consumed.
    - **MEM USAGE / LIMIT**: Exact megabytes used vs maximum host RAM.
    - **MEM %**: Percentage of server RAM consumed.
    - **NET I/O**: Network bandwidth in and out.
    - **BLOCK I/O**: Disk read and write activity.
- **Why this was crucial in the chat**: On an AWS `t2.micro` instance with only 1 GB RAM, `docker stats` allows you to verify that PostgreSQL (~45 MB), Redis (~15 MB), Express (~85 MB), and Nginx (~12 MB) fit comfortably within memory limits without risking OOM crashes.
- **How to Exit**: Press `Ctrl + C`.

---

### Command 1.5: Stream Container Logs for Debugging
```bash
# Follow all services simultaneously:
docker compose logs -f

# Follow the backend API server logs specifically:
docker compose logs -f server

# View the last 100 log lines of PostgreSQL:
docker compose logs --tail=100 db
```
- **Where it runs**: Host terminal (EC2).
- **The Technical "Why"**:
  - Attaches to the stdout and stderr streams of the container processes (Node.js, PostgreSQL, Redis, Nginx).
  - The `-f` (follow) flag keeps the stream open, outputting new logs in real time as HTTP requests or database queries hit the system.
- **Why this was crucial in the chat**:
  Running `docker compose logs -f server` revealed the exact error messages:
  1. `Prisma Error P2022: The column User.guestPersona does not exist in the current database.`
  2. `CORS: origin http://13.233.25.42 not in whitelist`
  It also confirmed what was functioning correctly:
  `Database connected`, `Redis connected`, and `SkillSphere API running`.

---

### Command 1.6: Execute an Interactive Shell Inside a Running Container
```bash
docker exec -it skillsphere-server sh
```
- **Where it runs**: Host terminal (EC2).
- **The Technical "Why"**:
  - `docker exec`: Tells the Docker daemon to create a new process inside the existing namespaces of a running container.
  - `-i` (interactive): Keeps standard input (`stdin`) open.
  - `-t` (tty): Allocates a pseudo-terminal so you can type commands interactively.
  - `sh`: Launches the Alpine Linux POSIX shell (`/bin/sh`). (Alpine uses `sh`, not `bash`).
- **Why you run this**:
  - Inspect files inside the container: `ls -la /app`
  - Verify container file permissions and users: `whoami` (returns `node`).
  - Test internal network connectivity: `ping db` or `nc -zv db 5432`.
- **How to Exit**: Type `exit` and hit Enter.

---

### Command 1.7: Stop the Multi-Container Stack Gracefully
```bash
docker compose down
```
- **Where it runs**: Host terminal (inside `~/Skill-Sphere` on EC2).
- **The Technical "Why"**:
  - Sends a standard Unix `SIGTERM` (terminate) signal to the main process (PID 1) of every container.
  - Gives containers a 10-second grace period to close active database connections, flush memory buffers to disk, and close network sockets.
  - If a container does not stop within 10 seconds, sends `SIGKILL`.
  - Removes the stopped container instances and the bridge network (`skillsphere_default`).
  - **Preserves all named volumes (`postgres_data`)!**
- **The Danger Zone (`-v` flag)**:
  ```bash
  # ⚠️ NEVER RUN THIS IN PRODUCTION:
  docker compose down -v
  ```
  Adding `-v` (or `--volumes`) tells Docker to delete all named volumes, **permanently erasing your PostgreSQL database!**

---

# 🔄 Section 2: Database Migrations & CI/CD Pipeline Commands

---

### Command 2.1: Inspect Existing Prisma Migrations in the Repository
```bash
ls prisma/migrations
```
- **Where it runs**: Terminal inside the `server/` directory.
- **The Technical "Why"**:
  - Lists the directories inside `prisma/migrations/`.
  - Each directory represents a committed database migration timestamped by year, month, day, and name (e.g., `20260516130323_add_user_guest_persona`).
- **Why this was crucial in the chat**: To verify whether the code change adding `guestPersona` had an associated migration folder committed to Git or if it only existed locally.

---

### Command 2.2: Search for the Missing Column Across Migration SQL Files
```bash
grep -R "guestPersona" prisma/migrations
```
- **Where it runs**: Terminal inside the `server/` directory.
- **The Technical "Why"**:
  - `grep`: Global Regular Expression Print search tool.
  - `-R` (recursive): Searches through all subdirectories and `.sql` files inside `prisma/migrations/`.
  - `"guestPersona"`: The column name that PostgreSQL reported missing (`Prisma Error P2022`).
- **Interpretation of Results**:
  - If output returns: `prisma/migrations/20260516130323_add_user_guest_persona/migration.sql: ALTER TABLE "User" ADD COLUMN "guestPersona" ...`
    -> The migration **exists**! It just hasn't been applied to the production database yet.
  - If output returns **nothing**:
    -> The migration was **never generated**! The developer modified `schema.prisma` or ran `prisma db push` locally, but never created a migration file.

---

### Command 2.3: Generate a New Migration in Development
```bash
npx prisma migrate dev --name add_user_guest_persona
```
- **Where it runs**: **Local development machine only!** (Inside `server/`).
- **The Technical "Why"**:
  - Compares your current `schema.prisma` against the existing migration history and local development database.
  - Detects the schema difference (e.g., added field `guestPersona String?`).
  - Generates a new timestamped folder: `prisma/migrations/<timestamp>_add_user_guest_persona/migration.sql`.
  - Applies that SQL script to your local PostgreSQL database.
  - Records the migration checksum into PostgreSQL's internal `_prisma_migrations` metadata table.
  - Automatically runs `prisma generate` to update the local TypeScript/JavaScript Prisma Client in `node_modules/@prisma/client`.
- **Consequence of Skipping**: If you don't run `migrate dev`, no SQL migration file is created. Production will fail to update its schema!

---

### Command 2.4: Apply Pending Migrations in Production & CI/CD
```bash
npx prisma migrate deploy
```
- **Where it runs**: Production server (EC2), inside the container on startup, or in a CI/CD job.
- **The Technical "Why"**:
  - Connects to the database specified by `DATABASE_URL`.
  - Reads the `_prisma_migrations` table in PostgreSQL to find which migrations have already been applied.
  - Reads the local `prisma/migrations/` directory inside the container image.
  - Executes **only the pending, unapplied SQL migration files** in strict chronological order.
  - Marks each executed migration as applied with an exact execution duration and sha256 checksum.
  - **Never prompts for interactive input** (unlike `migrate dev`, making it completely safe for automated headless scripts).
- **How SkillSphere automates this**:
  In `docker-compose.yml`:
  ```yaml
  command: sh -c "npm run db:deploy && npm start"
  ```
  Where `npm run db:deploy` is defined in `package.json` as `prisma migrate deploy`.

---

### Command 2.5: The Anti-Pattern Command (What Caused the Bug)
```bash
# ⚠️ FOR PROTOTYPING ONLY - NEVER USE FOR CODE HEADED TO PRODUCTION:
npx prisma db push
```
- **The Technical "Why"**:
  - Directly forces the current `schema.prisma` onto the database without creating a migration file in `prisma/migrations/`.
  - Makes local development *feel* like it's working because your local database now has the column.
- **Why this caused the production crash**:
  Because no migration file was generated, Git had nothing to commit. When production ran `prisma migrate deploy`, it had no record of the new column, resulting in `Prisma Error P2022`.

---

### Command 2.6: Generate Prisma Client Types
```bash
npm run db:generate
# (Which executes: npx prisma generate)
```
- **Where it runs**: Inside `server/Dockerfile` during image build, or locally after modifying schema.
- **The Technical "Why"**:
  - Reads `schema.prisma`.
  - Reads your models (`User`, `Skill`, `Course`, `Message`).
  - Generates tailored TypeScript definition files, validation types, and runtime JavaScript query methods directly into `node_modules/@prisma/client`.
- **Consequence of Skipping**: Node.js crashes with `TypeError: prisma.user.findFirst is not a function` or TypeScript compiler errors.

---

### Command 2.7: Git Version Control Commands for Migrations
```bash
# Check modified files and new migration directories
git status

# Stage the new migration files and schema
git add prisma/schema.prisma prisma/migrations/

# Commit with a clear semantic message
git commit -m "fix(db): add missing user guestPersona migration"

# Push to GitHub to trigger CI/CD pipeline
git push origin main
```
- **Where it runs**: Local developer terminal.
- **The Technical "Why"**: Commits the generated SQL migration file into Git so GitHub Actions and production servers can access it.

---

### Command 2.8: CI Test & Lint Commands (Executed on GitHub Runners)
```bash
# 1. Clean deterministic dependency installation
npm ci

# 2. Code quality & syntax validation
npm run lint

# 3. Automated unit and integration test suite execution
npm test
```
- **Where it runs**: GitHub Actions runner virtual machine (`ubuntu-latest`).
- **The Technical "Why"**:
  - `npm ci`: Ensures dependencies match `package-lock.json` with 100% cryptographic parity.
  - `npm run lint`: ESLint scans for syntax errors, unhandled promises, and illegal imports before code can be packaged into an image.
  - `npm test`: Runs Jest test suites. If any test fails, GitHub Actions terminates the job immediately with exit code 1 and aborts deployment.

---

### Command 2.9: Pull Pre-Built Docker Images from Docker Hub
```bash
docker compose pull
```
- **Where it runs**: AWS EC2 instance terminal (via automated SSH in GitHub Actions).
- **The Technical "Why"**:
  - Connects to Docker Hub registry.
  - Downloads the latest pre-compiled image layers for `skillsphere-server` and `skillsphere-client`.
  - Only downloads layers that have changed since the last deployment, minimizing bandwidth and time.
- **Why this is superior to building on EC2**:
  Instead of consuming 100% of the EC2 instance's 1 vCPU and 1 GB RAM compiling Vite and installing npm packages (which frequently freezes the server), EC2 simply downloads the finished artifact in 5–10 seconds.

---

### Command 2.10: Recreate Containers with Zero Downtime
```bash
docker compose up -d --remove-orphans
```
- **Where it runs**: AWS EC2 instance terminal.
- **The Technical "Why"**:
  - Compares the newly pulled image hashes against the currently running containers.
  - Only recreates containers whose images have changed (`server` and `client`).
  - Leaves running dependencies (`db` and `redis`) untouched and running!
  - `--remove-orphans`: Cleans up any legacy containers defined in previous compose files that are no longer part of the stack.

---

### Command 2.11: Prune Dangling Docker Images
```bash
docker image prune -f
```
- **Where it runs**: AWS EC2 instance terminal.
- **The Technical "Why"**:
  - When a new `latest` image is pulled, the old image loses its tag and becomes an untagged "dangling" image (`<none>:<none>`).
  - `docker image prune -f`: Deletes these orphaned layers immediately without prompting for confirmation.
- **Consequence of Skipping**: Over several weeks of deployments, orphaned images will consume all 20 GB of your EBS disk volume, causing disk full errors (`No space left on device`).

---

# ☁️ Section 3: Cloud Deployment (AWS EC2, Linux Sysadmin & Cost Optimization) Commands

---

### Command 3.1: Secure SSH Private Key Permissions
#### On Linux / macOS:
```bash
chmod 400 skillsphere-key.pem
```
#### On Windows (PowerShell):
```powershell
icacls skillsphere-key.pem /inheritance:r
icacls skillsphere-key.pem /grant:r "$($env:USERNAME):(R)"
```
- **Where it runs**: Local developer workstation.
- **The Technical "Why"**:
  - `chmod 400`: Sets file permissions to read-only for the file owner (`4`), and zero permissions for group (`0`) and others (`0`).
  - OpenSSH clients enforce a strict security policy: if a private key file is readable by any other user or process on your computer, SSH refuses to use it and aborts with:
    `Permissions 0644 for 'skillsphere-key.pem' are too open. It is required that your private key files are NOT accessible by others.`

---

### Command 3.2: Connect to AWS EC2 via SSH
```bash
ssh -i skillsphere-key.pem ubuntu@13.233.25.42
```
- **Where it runs**: Local developer terminal.
- **The Technical "Why"**:
  - `ssh`: Secure Shell client application.
  - `-i skillsphere-key.pem`: Specifies the identity file (RSA private key) for cryptographic authentication.
  - `ubuntu`: The default administrative username for official Ubuntu AMIs on AWS.
  - `13.233.25.42`: The Public IPv4 address assigned to your EC2 instance by AWS.
- **Under the Hood**:
  - Uses public-key cryptography to perform a handshake against port 22 on the server.
  - If the Security Group allows port 22 from your IP, and your private key matches the public key in `/home/ubuntu/.ssh/authorized_keys`, you are granted a secure encrypted terminal session.

---

### Command 3.3: Update and Upgrade Linux System Packages
```bash
sudo apt update && sudo apt upgrade -y
```
- **Where it runs**: EC2 Ubuntu terminal.
- **The Technical "Why"**:
  - `sudo apt update`: Downloads the latest package index lists from Ubuntu's official repositories (synchronizes package names and version numbers).
  - `&&`: Logical AND operator (only executes the second command if the first succeeds).
  - `sudo apt upgrade -y`: Installs the newest versions of all currently installed system packages and security patches. The `-y` flag automatically answers "yes" to installation prompts.
- **Consequence of Skipping**: Leaves the base operating system vulnerable to unpatched Linux kernel exploits.

---

### Command 3.4: Configure Docker's Official APT Repository & GPG Key
```bash
# 1. Install prerequisites
sudo apt install -y ca-certificates curl gnupg lsb-release

# 2. Create directory for trusted keyrings
sudo install -m 0755 -d /etc/apt/keyrings

# 3. Download and dearmor Docker's official GPG cryptographic key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 4. Add the Docker repository to APT sources
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 5. Install Docker Engine and plugins
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```
- **Where it runs**: EC2 Ubuntu terminal.
- **The Technical "Why"**:
  - Ubuntu's default repository includes an outdated version of Docker (`docker.io`).
  - This sequence adds Docker's official vendor repository.
  - The GPG key guarantees that every downloaded package is cryptographically verified and hasn't been tampered with.
  - Installs modern Docker Engine along with the official **Docker Compose V2 plugin** (`docker compose` rather than old python `docker-compose`).

---

### Command 3.5: Grant Non-Root Docker Access to the Ubuntu User
```bash
sudo usermod -aG docker ubuntu
```
- **Where it runs**: EC2 Ubuntu terminal.
- **The Technical "Why"**:
  - By default, the Docker daemon binds to a Unix socket owned by `root:docker`. Regular users must type `sudo docker`.
  - `usermod`: Modifies a Linux user account.
  - `-aG docker`: Appends (`-a`) the user to the supplementary group (`-G`) named `docker`.
  - `ubuntu`: The target user account.
- **Required Action After Running**: You must log out (`exit`) and reconnect via SSH for the Linux kernel to refresh your active user group tokens. You can then run all `docker` commands without `sudo`.

---

### Command 3.6: Create and Activate 2 GB of Linux SWAP Space
```bash
# 1. Allocate a 2 Gigabyte contiguous file
sudo fallocate -l 2G /swapfile

# 2. Lock permissions to root only
sudo chmod 600 /swapfile

# 3. Format the file as a Linux swap partition
sudo mkswap /swapfile

# 4. Activate the swap file in the running kernel
sudo swapon /swapfile

# 5. Append entry to /etc/fstab to persist across system reboots
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 6. Verify swap is active
free -h
```
- **Where it runs**: EC2 Ubuntu terminal.
- **The Technical "Why"**:
  - An AWS `t2.micro` has only **1 GB of RAM**. When running Node.js, PostgreSQL, Redis, and Nginx together, memory spikes can instantly consume 100% of physical RAM.
  - Without Swap space, the Linux kernel invokes the **OOM (Out Of Memory) Killer**, terminating whichever process has the highest memory footprint (usually PostgreSQL or Node.js), causing random downtime.
  - **Swap Space** dedicates 2 GB of the fast NVMe/SSD EBS volume as virtual overflow memory. When RAM is exhausted, inactive memory pages are swapped to disk, keeping your server 100% stable and crash-free.

---

### Command 3.7: Inspect RAM and Swap Utilization
```bash
free -h
```
- **Where it runs**: EC2 Ubuntu terminal.
- **The Technical "Why"**:
  - Queries `/proc/meminfo`.
  - The `-h` (human-readable) flag formats byte numbers into Megabytes (MiB) and Gigabytes (GiB).
- **Expected Healthy Output**:
  ```
                total        used        free      shared  buff/cache   available
  Mem:          957Mi       350Mi       120Mi       2.0Mi       485Mi       480Mi
  Swap:         2.0Gi        65Mi       1.93Gi
  ```
  This immediately tells you that you have 480 MiB of RAM available and 1.93 GiB of Swap reserve.

---

### Command 3.8: Inspect Disk Space Usage on the EBS Volume
```bash
df -h
```
- **Where it runs**: EC2 Ubuntu terminal.
- **The Technical "Why"**:
  - `df`: Disk Free.
  - Reports filesystem disk space usage for all mounted block devices.
  - Look for the root mount point `/` (e.g., `/dev/root` or `/dev/xvda1`):
    ```
    Filesystem      Size  Used Avail Use% Mounted on
    /dev/root        20G  6.8G   13G  35% /
    ```
  - Tells you immediately how much of your 20 GB EBS disk is consumed by Docker images, logs, and database records.

---

### Command 3.9: Interactive Process Viewer & CPU Load Monitor
```bash
htop
```
- **Where it runs**: EC2 Ubuntu terminal.
- **The Technical "Why"**:
  - Advanced ncurses-based real-time process monitor.
  - Visualizes:
    - Current load on vCPU core 0.
    - Exact breakdown of RAM (green = used, blue = buffers, orange = cached).
    - Swap usage meter.
    - Every running PID, user, memory %, CPU %, and command string.
- **How to Exit**: Press `q` or `F10`.

---

### Command 3.10: View Systemd Service Logs for the Docker Daemon
```bash
sudo journalctl -u docker.service -n 50 --no-pager
```
- **Where it runs**: EC2 Ubuntu terminal.
- **The Technical "Why"**:
  - `journalctl`: Queries the systemd system journal.
  - `-u docker.service`: Filters exclusively for events generated by the Docker background daemon.
  - `-n 50`: Shows the most recent 50 lines.
  - `--no-pager`: Outputs directly to the terminal without opening `less` or `more`.
- **When to use**: If Docker refuses to start, or if a container crashes due to an engine-level error (e.g., storage driver failure or network interface conflict).

---

### Command 3.11: Install Free SSL Certificate with Let's Encrypt & Certbot
```bash
# 1. Install Certbot and the Nginx automated plugin
sudo apt install -y certbot python3-certbot-nginx

# 2. Request certificate, complete challenge, and auto-configure Nginx
sudo certbot --nginx -d skillsphere.xyz -d www.skillsphere.xyz
```
- **Where it runs**: EC2 Ubuntu terminal (after pointing domain DNS A-records to EC2 IP).
- **The Technical "Why"**:
  - Connects to the Let's Encrypt ACME API.
  - Performs an automated HTTP-01 challenge verifying you own the domain.
  - Generates a 2048-bit RSA private key and signed public SSL/TLS certificate.
  - Automatically updates `/etc/nginx/conf.d/` with SSL cipher configurations and enables Port 443.
  - Installs a systemd timer that automatically checks and renews certificates before expiration.

---

### Command 3.12: Gracefully Shut Down the EC2 Server (Zero-Cost Operation)
```bash
# Step 1: Cleanly shut down containers
cd ~/Skill-Sphere
docker compose down

# Step 2: Power off the server
sudo shutdown now
# or
sudo poweroff
```
- **Where it runs**: EC2 Ubuntu terminal.
- **The Technical "Why"**:
  - `docker compose down`: Flushes all database caches to the EBS volume and unmounts networks cleanly.
  - `sudo shutdown now`: Sends ACPI power-off signal to the virtual machine.
  - Broadcasts shutdown messages to all logged-in terminals, unmounts all filesystems safely, and transitions the EC2 instance state in AWS from **Running** to **Stopped**.
- **The Financial Impact**:
  - Compute charges immediately halt (**₹0 / hour**).
  - Your EBS volume, database data, and Docker images remain stored on disk.
  - You can boot it back up in 45 seconds before any interview by clicking **Start Instance** in the AWS Console!

---

## 🎯 Quick Master Reference Table

| Category | Command | When to Run | Primary Purpose |
| :--- | :--- | :--- | :--- |
| **Docker** | `docker compose up -d` | Deploy/Start | Boots all 4 containers in background with healthchecks |
| **Docker** | `docker compose down` | Shutdown | Gracefully stops containers; **preserves database volume** |
| **Docker** | `docker ps` | Health Check | Verifies running containers, ports, and health status |
| **Docker** | `docker compose logs -f server` | Debugging | Streams backend logs in real-time (Prisma, CORS, Express) |
| **Docker** | `docker stats` | Monitoring | Live CPU, RAM, and network usage per container |
| **Prisma** | `npx prisma migrate dev` | **Local Only** | Creates new `.sql` migration file and updates schema |
| **Prisma** | `npx prisma migrate deploy` | **Prod Only** | Applies pending migration files to production database |
| **Prisma** | `grep -R "col" prisma/migrations` | Verification | Confirms whether a column migration exists in Git |
| **Linux/AWS** | `ssh -i key.pem ubuntu@IP` | Remote Access | Secure shell connection to EC2 |
| **Linux/AWS** | `free -h` & `df -h` | Monitoring | Inspects available RAM/Swap and EBS disk space |
| **Linux/AWS** | `sudo fallocate -l 2G /swapfile` | Setup | Configures 2GB Swap to prevent low-memory crashes |
| **Linux/AWS** | `docker image prune -f` | Maintenance | Cleans dangling images to save EBS disk space |
| **Linux/AWS** | `sudo shutdown now` | Cost Control | Halts EC2 instance cleanly to ensure **₹0 compute billing** |
