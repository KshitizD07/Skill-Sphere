# 📋 Master Command Execution Playbook: End-to-End Chronological Timeline
### *Every Single Command from Fresh Machine to Production Cloud Deployment (Step-by-Step with Technical Explanations)*

---

## 📌 How This Document is Structured
Unlike fragmented tutorials, this guide is arranged in the **exact chronological sequence** that an engineer executes from day zero:
1. **Phase 0:** Local Workstation Pre-Requisites & SSH Security
2. **Phase 1:** Fresh Linux Server Provisioning & Environment Hardening (Git, Swap, Utilities)
3. **Phase 2:** Official Docker Engine, Buildx & Docker Compose Installation
4. **Phase 3:** Codebase Deployment & Environment Variable Configuration
5. **Phase 4:** Docker Registry Authentication & Image Publishing (Docker Hub)
6. **Phase 5:** Database Migration Diagnostics & Production Synchronization (The Prisma Post-Mortem)
7. **Phase 6:** Multi-Container Orchestration, Startup & Live Operational Monitoring
8. **Phase 7:** Custom Domain DNS, Reverse Proxy & Let's Encrypt SSL/TLS Automation
9. **Phase 8:** Maintenance, Image Pruning & Zero-Cost (₹0) Shutdown Sequence

---

# 🚀 Phase 0: Local Workstation Pre-Requisites & SSH Security

*Before touching AWS or running server commands, you must configure local credentials and establish a secure shell connection.*

### Step 0.1: Secure the SSH Private Key Permissions
#### On Linux / macOS:
```bash
chmod 400 skillsphere-key.pem
```
#### On Windows (PowerShell):
```powershell
icacls skillsphere-key.pem /inheritance:r
icacls skillsphere-key.pem /grant:r "$($env:USERNAME):(R)"
```
- **Why it's run:** OpenSSH strictly enforces the principle of least privilege. If your private key (`.pem`) is readable by other users or background services on your OS, SSH client intentionally halts and refuses to connect (`Permissions 0644 are too open`).
- **Technical Mechanism:** `chmod 400` grants read-only permission (`4`) to the file owner and zero permissions (`00`) to group and others. The Windows `icacls` command removes inherited permissions and grants read access exclusively to your active Windows username.
- **Consequence if skipped:** Any attempt to connect to EC2 fails immediately with `UNPROTECTED PRIVATE KEY FILE! Permission denied (publickey)`.

---

### Step 0.2: Connect to the AWS EC2 Instance via SSH
```bash
ssh -i skillsphere-key.pem ubuntu@13.233.25.42
```
- **Why it's run:** Opens an encrypted, remote administrative terminal session into your cloud virtual machine.
- **Technical Mechanism:**
  - `-i skillsphere-key.pem`: Uses RSA asymmetric cryptography to authenticate against the server's public key stored in `/home/ubuntu/.ssh/authorized_keys`.
  - `ubuntu`: The default non-root administrative user for official Ubuntu cloud images.
  - `13.233.25.42`: The AWS EC2 public IPv4 address.
- **Under the Hood:** Traffic passes through AWS VPC Security Group Inbound Rule allowing Port 22 (TCP) from your local IP.

---

# 🛠️ Phase 1: Fresh Linux Server Provisioning & Environment Hardening

*Once logged into a fresh Ubuntu 24.04/22.04 LTS instance, you must configure the operating system.*

### Step 1.1: Update Package Lists and Upgrade System Packages
```bash
sudo apt update && sudo apt upgrade -y
```
- **Why it's run:** Fresh cloud images have outdated package indices and unpatched security vulnerabilities.
- **Technical Mechanism:**
  - `sudo apt update`: Downloads the latest package index manifests from Ubuntu's repository mirrors (synchronizes version numbers and dependencies).
  - `&&`: Guarantees the upgrade only executes if the update completes successfully (exit code 0).
  - `sudo apt upgrade -y`: Installs the newest security patches and kernel updates. The `-y` flag automatically answers "yes" to prompts.

---

### Step 1.2: Install Git and Essential System Utilities
```bash
sudo apt install -y git curl wget ca-certificates gnupg lsb-release htop
```
- **Why it's run:** Installs foundational CLI tools needed to download keys, clone repositories, and inspect system performance.
- **Technical Mechanism:**
  - `git`: Version control tool required to clone and pull the SkillSphere codebase.
  - `curl` & `wget`: Command-line HTTP transfer utilities needed to download Docker GPG keys and test web endpoints.
  - `ca-certificates`: Contains SSL/TLS Root Certificate Authorities so `apt` and `curl` can securely verify HTTPS sites.
  - `gnupg`: GNU Privacy Guard tool required to decrypt and dearmor official package signing keys.
  - `lsb-release`: Utility that reports the Ubuntu distribution codename (e.g., `noble`, `jammy`) for automated repository configuration.
  - `htop`: Real-time interactive CPU, memory, and process monitor.

---

### Step 1.3: Create and Activate 2 GB of Linux SWAP Space
```bash
# 1. Allocate a 2GB contiguous empty file on the EBS disk
sudo fallocate -l 2G /swapfile

# 2. Lock file permissions exclusively to root
sudo chmod 600 /swapfile

# 3. Format the file as a Linux swap filesystem
sudo mkswap /swapfile

# 4. Activate the swap file in the running Linux kernel
sudo swapon /swapfile

# 5. Make the swap configuration permanent across system reboots
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 6. Verify that swap is recognized and active
free -h
```
- **Why it's run:** AWS Free Tier `t2.micro` instances have only **1 GB of physical RAM**. Running Node.js, PostgreSQL, Redis, and Nginx simultaneously consumes ~450–600 MB. A temporary memory spike during a database migration or heavy API call will exhaust physical RAM.
- **Under the Hood:** Without Swap, the Linux kernel invokes the **OOM (Out Of Memory) Killer**, instantly terminating the process with the highest memory score (usually PostgreSQL or Node.js), causing unexpected downtime. Swap allocates 2 GB of the fast EBS SSD as virtual overflow memory, guaranteeing stability.

---

# 🐳 Phase 2: Installing Official Docker Engine, Buildx & Docker Compose

*Never use the outdated `docker.io` package from Ubuntu's default repository. Always install the official, current Docker suite.*

### Step 2.1: Prepare Keyring Directory for Cryptographic Keys
```bash
sudo install -m 0755 -d /etc/apt/keyrings
```
- **Why it's run:** Modern Debian/Ubuntu systems store third-party package signing keys in `/etc/apt/keyrings` with strict permissions.
- **Technical Mechanism:** `-m 0755` sets directory permissions so root can read/write/execute, and all other users can read/execute.

---

### Step 2.2: Download and Dearmor Docker's Official GPG Key
```bash
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```
- **Why it's run:** Ensures that all Docker binaries downloaded by your server are cryptographically signed by Docker Inc. and have not been intercepted or tampered with.
- **Technical Mechanism:**
  - `curl -fsSL`: Downloads Docker's ASCII-armored public key (`-f` fail silently on HTTP errors, `-s` silent mode, `-S` show error if fails, `-L` follow redirects).
  - `gpg --dearmor`: Converts the ASCII key into binary format recognized by the APT package manager and saves it to `/etc/apt/keyrings/docker.gpg`.
  - `chmod a+r`: Grants read access to all users (`a+r`) so APT can read the keyring.

---

### Step 2.3: Add Docker's Official Repository to APT Sources
```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```
- **Why it's run:** Directs APT to Docker's official distribution servers for your specific CPU architecture (x86_64/amd64) and Ubuntu version.
- **Technical Mechanism:**
  - `dpkg --print-architecture`: Dynamically evaluates to `amd64`.
  - `lsb_release -cs`: Dynamically outputs your Ubuntu version code (e.g. `noble` for 24.04, `jammy` for 22.04).
  - `sudo tee /etc/apt/sources.list.d/docker.list`: Writes the formatted configuration file into APT sources.

---

### Step 2.4: Install Docker Engine, CLI, Buildx, and Compose Plugin
```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```
- **Why it's run:** Installs the complete modern Docker virtualization stack.
- **Component Breakdown:**
  - `docker-ce`: Docker Community Edition daemon (`dockerd`) that manages containers, networks, and volumes.
  - `docker-ce-cli`: The terminal client (`docker`) used to issue commands.
  - `containerd.io`: The industry-standard core container runtime managing the complete container lifecycle.
  - `docker-buildx-plugin`: Extended build utility powered by Moby BuildKit (supports parallelized builds and multi-platform compilation).
  - `docker-compose-plugin`: Official V2 Compose implementation (`docker compose`, replacing the old Python-based `docker-compose`).

---

### Step 2.5: Enable Docker Daemon and Grant Non-Root User Permissions
```bash
# 1. Ensure Docker starts automatically on system boot
sudo systemctl enable --now docker

# 2. Add the 'ubuntu' user to the 'docker' Unix group
sudo usermod -aG docker ubuntu
```
- **Why it's run:** By default, the Docker daemon socket (`/var/run/docker.sock`) is owned by `root:docker`. Adding `ubuntu` to the `docker` group allows running all Docker commands without typing `sudo`.
- **Under the Hood:**
  - `systemctl enable --now`: Creates a systemd symlink ensuring Docker boots on system restart, and immediately starts the service.
  - `usermod -aG`: Appends (`-a`) the user to the supplementary group (`-G`).
- **Required Action:** You must refresh your user session. Either run:
  ```bash
  newgrp docker
  ```
  Or disconnect and reconnect to SSH:
  ```bash
  exit
  ssh -i skillsphere-key.pem ubuntu@13.233.25.42
  ```

---

### Step 2.6: Verify Docker Installation
```bash
docker --version
docker compose version
docker ps
```
- **Why it's run:** Confirms that the Docker daemon is active, Compose V2 is recognized, and you can communicate with `/var/run/docker.sock` without permission errors.

---

# 📦 Phase 3: Codebase Deployment & Environment Configuration

### Step 3.1: Clone the Application Repository
```bash
git clone https://github.com/KshitizD07/Skill-Sphere.git ~/Skill-Sphere
cd ~/Skill-Sphere
```
- **Why it's run:** Downloads your application code, Dockerfiles, and `docker-compose.yml` to the EC2 instance's home directory.

---

### Step 3.2: Configure Production Environment Variables (`.env`)
```bash
nano server/.env
```
Add the production configuration:
```env
PORT=5001
NODE_ENV=production

# Whitelist both EC2 Public IP and your future domain to fix CORS errors
ALLOWED_ORIGINS=http://13.233.25.42,http://localhost:5173,http://skillsphere.xyz,https://skillsphere.xyz

# Internal Docker bridge network connection strings
DATABASE_URL=postgresql://postgres:password@db:5432/skillsphere?schema=public
DIRECT_URL=postgresql://postgres:password@db:5432/skillsphere?schema=public
REDIS_URL=redis://redis:6379

JWT_SECRET=super_secure_production_secret_key_12345
```
- **Why it's run:** Passes secrets, ports, and connection strings securely at runtime.
- **The CORS Whitelist Fix:** The chat log recorded: `CORS: origin http://13.233.25.42 not in whitelist`. Adding your EC2 public IP to `ALLOWED_ORIGINS` ensures Express returns the HTTP header `Access-Control-Allow-Origin: http://13.233.25.42`, allowing web browsers to process API responses.

---

# 🏷️ Phase 4: Docker Registry Authentication & Image Publishing (Docker Hub)

*Using a container registry eliminates the need to build images directly on the limited resources of an EC2 instance.*

### Step 4.1: Log in to Docker Hub from the CLI
```bash
docker login -u your_dockerhub_username
```
- **Where it runs:** Local developer machine (or handled automatically in GitHub Actions via `secrets.DOCKERHUB_TOKEN`).
- **Technical Mechanism:** Prompts for your Docker Hub Personal Access Token (PAT). Authenticates with `https://index.docker.io/v1/` and stores an encrypted auth token in `~/.docker/config.json`.
- **Consequence if skipped:** Any attempt to push images to Docker Hub fails with `denied: requested access to the resource is denied`.

---

### Step 4.2: Build and Tag Images for the Registry
```bash
# Build & tag backend image
docker build -t yourusername/skillsphere-server:latest -t yourusername/skillsphere-server:v1.0.0 ./server

# Build & tag frontend image with build arguments
docker build \
  --build-arg VITE_API_URL=/api \
  --build-arg VITE_SOCKET_URL=/ \
  -t yourusername/skillsphere-client:latest \
  -t yourusername/skillsphere-client:v1.0.0 ./client
```
- **Why it's run:** Compiles the application into immutable image layers and tags them with your Docker Hub repository namespace.
- **Under the Hood:**
  - Multi-tagging with `:latest` and `:v1.0.0` (or Git commit SHA) ensures immutability.
  - `--build-arg` bakes the relative proxy paths (`/api`) into the static React JavaScript bundle during the Vite build stage.

---

### Step 4.3: Push Images to Docker Hub
```bash
docker push yourusername/skillsphere-server:latest
docker push yourusername/skillsphere-server:v1.0.0
docker push yourusername/skillsphere-client:latest
docker push yourusername/skillsphere-client:v1.0.0
```
- **Why it's run:** Uploads compressed filesystem layers to Docker Hub's global content delivery network so cloud servers can download them.

---

# 🔍 Phase 5: Database Migration Diagnostics & Production Synchronization

*This is the exact investigation sequence conducted in the chat to resolve Prisma Error P2022.*

### Step 5.1: Inspect Existing Committed Migrations
```bash
ls server/prisma/migrations
```
- **Why it's run:** Displays all migration directories tracked in Git.
- **Chat Context:** Determines whether a migration directory (e.g., `20260516130323_add_user_guest_persona`) exists in the repository.

---

### Step 5.2: Search for the Missing Column Across Migration Files
```bash
grep -R "guestPersona" server/prisma/migrations
```
- **Why it's run:** Scans all `.sql` files inside the migrations folder for references to `guestPersona`.
- **Diagnostic Result:**
  - If output returns `ALTER TABLE "User" ADD COLUMN "guestPersona" ...`, the migration file exists in the repo and only needs to be deployed.
  - If output is **empty**, the migration was **never generated**. The developer edited `schema.prisma` or ran `prisma db push` locally, leaving production with no record of the column.

---

### Step 5.3: (Local Fix) Generate the Missing Migration File
```bash
# Run inside server/ on your LOCAL machine:
npx prisma migrate dev --name add_user_guest_persona
```
- **Why it's run:** Inspects local changes in `schema.prisma`, generates a timestamped `.sql` migration file, records it in local PostgreSQL, and regenerates Prisma Client types.

---

### Step 5.4: (Local Fix) Commit and Push Migration to GitHub
```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "fix(db): add missing user guestPersona migration"
git push origin main
```
- **Why it's run:** Pushes the migration SQL file to the remote repository so it can be deployed to production.

---

### Step 5.5: Pull Updated Migrations onto EC2
```bash
cd ~/Skill-Sphere
git pull origin main
```
- **Why it's run:** Updates the EC2 local repository with the new migration files.

---

### Step 5.6: Apply Pending Migrations to Production Database
```bash
# Executed automatically on container boot, or manually via:
docker exec -it skillsphere-server npx prisma migrate deploy
```
- **Why it's run:** Reads PostgreSQL's `_prisma_migrations` table, finds all pending `.sql` files, and applies them sequentially without prompting.
- **Under the Hood:** Executes `ALTER TABLE "User" ADD COLUMN "guestPersona" TEXT;`. PostgreSQL now has the column, completely resolving Error `P2022`!

---

# 🚢 Phase 6: Multi-Container Orchestration, Startup & Monitoring

### Step 6.1: Pull Pre-Built Images from Docker Hub
```bash
docker compose pull
```
- **Why it's run:** Downloads pre-compiled images from Docker Hub directly to EC2.
- **Why this matters:** Avoids compiling code on EC2, keeping memory and CPU usage near zero and preventing server crashes.

---

### Step 6.2: Launch Application Stack in Detached Mode
```bash
docker compose up -d
```
- **Why it's run:** Creates the network, attaches the `postgres_data` volume, runs database healthchecks, executes `npm run db:deploy`, and boots Express and Nginx in the background.

---

### Step 6.3: Verify All Containers are Running and Healthy
```bash
docker ps
```
- **Expected Output:**
  ```
  CONTAINER ID   IMAGE                 STATUS                   PORTS
  1a2b3c4d5e6f   skillsphere-client    Up 5 minutes             0.0.0.0:80->80/tcp
  2b3c4d5e6f7a   skillsphere-server    Up 5 minutes             0.0.0.0:5001->5001/tcp
  3c4d5e6f7a8b   postgres:16-alpine    Up 5 minutes (healthy)   0.0.0.0:5432->5432/tcp
  4d5e6f7a8b9c   redis:7-alpine        Up 5 minutes (healthy)   0.0.0.0:6379->6379/tcp
  ```

---

### Step 6.4: Monitor Real-Time System and Container Logs
```bash
# Follow live server logs (confirms "Database connected", "SkillSphere API running")
docker compose logs -f server

# Stream live container CPU and RAM consumption
docker stats

# Check overall host memory and Swap usage
free -h

# Check available disk storage on the EBS volume
df -h
```

---

# 🔒 Phase 7: Custom Domain DNS, Reverse Proxy & Let's Encrypt SSL/TLS

*Convert `http://13.233.25.42` into `https://skillsphere.xyz` with an automated SSL certificate.*

### Step 7.1: Verify DNS Propagation from the Server
```bash
# Confirm your domain points to your EC2 IP
dig +short skillsphere.xyz
# or
nslookup skillsphere.xyz
```
- **Why it's run:** Confirms that your domain registrar's DNS A-Record has propagated to `13.233.25.42` before requesting an SSL certificate.

---

### Step 7.2: Install Certbot and the Nginx Automated Plugin
```bash
sudo apt install -y certbot python3-certbot-nginx
```
- **Why it's run:** Installs the Electronic Frontier Foundation’s official tool for automating Let's Encrypt certificates.

---

### Step 7.3: Request Certificate & Automatically Configure Nginx for HTTPS
```bash
sudo certbot --nginx -d skillsphere.xyz -d www.skillsphere.xyz
```
- **Why it's run:** 
  - Solves an automated ACME cryptographic challenge over Port 80 proving domain ownership.
  - Generates an RSA private key and public SSL certificate in `/etc/letsencrypt/live/skillsphere.xyz/`.
  - Configures Nginx with modern SSL ciphers, sets up Port 443 listening, and enables automatic 301 HTTP-to-HTTPS redirects.

---

### Step 7.4: Verify Automatic SSL Renewal Timer
```bash
# 1. Inspect the systemd timer status
sudo systemctl status certbot.timer

# 2. Perform a simulated test renewal
sudo certbot renew --dry-run
```
- **Why it's run:** Let's Encrypt certificates expire every 90 days. Certbot installs a background systemd timer that checks twice daily and automatically renews any certificate within 30 days of expiry. The dry run verifies this automated process works properly.

---

# 💰 Phase 8: Maintenance & Zero-Cost (₹0) Shutdown Sequence

*Leaving infrastructure running needlessly costs money. Follow this sequence when finishing an interview or development session.*

### Step 8.1: Clean Up Dangling Docker Images
```bash
docker image prune -f
```
- **Why it's run:** Removes untagged image layers (`<none>:<none>`) created when pulling updated builds, freeing up EBS disk space.

---

### Step 8.2: Stop Containers Gracefully
```bash
cd ~/Skill-Sphere
docker compose down
```
- **Why it's run:** Sends `SIGTERM` to containers, allowing PostgreSQL and Node to flush buffers and close connections cleanly.
- **Volume Safety:** Removes containers and networks, but **keeps `postgres_data` intact** on disk.

---

### Step 8.3: Verify All Containers are Stopped
```bash
docker ps
```
- **Expected Output:** Empty list (no running containers).

---

### Step 8.4: Shut Down the Cloud Virtual Machine
```bash
sudo shutdown now
# or
sudo poweroff
```
- **Why it's run:**
  - Powers off the EC2 instance.
  - Changes state in AWS Console from **Running** to **Stopped**.
  - **Halts all compute billing immediately (₹0 / hour).**
  - **Preserves all data:** The EBS volume, database contents, Git repository, and Docker images remain stored on disk.
- **Before an Interview:** Open the AWS Console, click **Start Instance**, wait 45 seconds, SSH in, run `docker compose up -d`, and the entire platform is live.

---

## 🧭 Complete Lifecycle Navigation
- [**`commands_playbook.md`**](file:///C:/Users/kshit/cs/skillsphere/commands_playbook.md) — Master Chronological Command Playbook (This document).
- [**`containerization.md`**](file:///C:/Users/kshit/cs/skillsphere/containerization.md) — Dockerfiles, Multi-Stage Builds, Nginx Reverse Proxy, and Compose Networking.
- [**`pipeline.md`**](file:///C:/Users/kshit/cs/skillsphere/pipeline.md) — GitHub Actions CI/CD, Docker Hub Automation, and Prisma Migration Mechanics.
- [**`cloud_deployment.md`**](file:///C:/Users/kshit/cs/skillsphere/cloud_deployment.md) — AWS Architecture, Security Groups, EBS Storage, and Interview Defense.
