require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ── Dummy users ───────────────────────────────────────────────────────────────
const USERS = [
  {
    name: 'Aryan Mehta',
    email: 'aryan@test.com',
    role: 'STUDENT',
    college: 'IIT Bombay',
    headline: 'Full Stack Dev | React + Node.js enthusiast',
    bio: 'Building scalable web apps. Love open source and hackathons. Currently exploring system design.',
    github: 'github.com/aryanmehta',
    skills: [
      { name: 'JavaScript', level: 'Advanced',      isVerified: true,  calculatedScore: 9 },
      { name: 'React',      level: 'Advanced',      isVerified: true,  calculatedScore: 8 },
      { name: 'Node.js',    level: 'Intermediate',  isVerified: true,  calculatedScore: 7 },
      { name: 'PostgreSQL', level: 'Intermediate',  isVerified: false, calculatedScore: null },
      { name: 'Docker',     level: 'Beginner',      isVerified: false, calculatedScore: null },
    ],
  },
  {
    name: 'Priya Sharma',
    email: 'priya@test.com',
    role: 'ALUMNI',
    college: 'NIT Trichy',
    headline: 'SDE @ Flipkart | Python & ML',
    bio: 'Graduated 2023. Working on recommendation systems. Passionate about making ML accessible to everyone.',
    github: 'github.com/priyasharma',
    linkedin: 'linkedin.com/in/priyasharma',
    skills: [
      { name: 'Python',           level: 'Advanced',     isVerified: true,  calculatedScore: 9 },
      { name: 'Machine Learning', level: 'Advanced',     isVerified: true,  calculatedScore: 8 },
      { name: 'TensorFlow',       level: 'Intermediate', isVerified: true,  calculatedScore: 7 },
      { name: 'SQL',              level: 'Intermediate', isVerified: false, calculatedScore: null },
      { name: 'Docker',           level: 'Intermediate', isVerified: true,  calculatedScore: 6 },
    ],
  },
  {
    name: 'Rohan Verma',
    email: 'rohan@test.com',
    role: 'STUDENT',
    college: 'BITS Pilani',
    headline: 'Backend Dev | Go & Rust explorer',
    bio: 'Third year CSE. Building a distributed key-value store for fun. Love low-level systems.',
    github: 'github.com/rohanverma',
    skills: [
      { name: 'Go',         level: 'Intermediate', isVerified: true,  calculatedScore: 7 },
      { name: 'Rust',       level: 'Beginner',     isVerified: true,  calculatedScore: 5 },
      { name: 'Linux',      level: 'Advanced',     isVerified: true,  calculatedScore: 8 },
      { name: 'Docker',     level: 'Advanced',     isVerified: true,  calculatedScore: 9 },
      { name: 'PostgreSQL', level: 'Intermediate', isVerified: false, calculatedScore: null },
    ],
  },
  {
    name: 'Ananya Iyer',
    email: 'ananya@test.com',
    role: 'ALUMNI',
    college: 'IIT Madras',
    headline: 'Frontend Engineer @ Razorpay | Design Systems',
    bio: 'IIT Madras 2022. Building design systems and accessible UIs. Mentor for women in tech.',
    github: 'github.com/ananyaiyer',
    linkedin: 'linkedin.com/in/ananyaiyer',
    skills: [
      { name: 'JavaScript',  level: 'Advanced',     isVerified: true,  calculatedScore: 9 },
      { name: 'TypeScript',  level: 'Advanced',     isVerified: true,  calculatedScore: 9 },
      { name: 'React',       level: 'Advanced',     isVerified: true,  calculatedScore: 10 },
      { name: 'CSS',         level: 'Advanced',     isVerified: false, calculatedScore: null },
      { name: 'Figma',       level: 'Intermediate', isVerified: false, calculatedScore: null },
    ],
  },
  {
    name: 'Karan Patel',
    email: 'karan@test.com',
    role: 'STUDENT',
    college: 'NIT Warangal',
    headline: 'Android Dev | Kotlin | Open source contributor',
    bio: 'Building Android apps since 2021. Google Summer of Code 2024 contributor. Coffee-fueled coder.',
    github: 'github.com/karanpatel',
    skills: [
      { name: 'Kotlin',       level: 'Advanced',     isVerified: true,  calculatedScore: 8 },
      { name: 'Java',         level: 'Intermediate', isVerified: true,  calculatedScore: 7 },
      { name: 'Android',      level: 'Advanced',     isVerified: false, calculatedScore: null },
      { name: 'React Native', level: 'Beginner',     isVerified: false, calculatedScore: null },
    ],
  },
  {
    name: 'Sneha Reddy',
    email: 'sneha@test.com',
    role: 'ALUMNI',
    college: 'IIIT Hyderabad',
    headline: 'DevOps @ Microsoft | Kubernetes | CI/CD',
    bio: 'IIIT-H 2021. Running 200+ microservices in production. AMA about infra, scaling, and burnout recovery.',
    github: 'github.com/snehareddy',
    linkedin: 'linkedin.com/in/snehareddy',
    skills: [
      { name: 'Kubernetes', level: 'Advanced',     isVerified: true,  calculatedScore: 9 },
      { name: 'Docker',     level: 'Advanced',     isVerified: true,  calculatedScore: 10 },
      { name: 'AWS',        level: 'Advanced',     isVerified: true,  calculatedScore: 8 },
      { name: 'Python',     level: 'Intermediate', isVerified: true,  calculatedScore: 7 },
      { name: 'Linux',      level: 'Advanced',     isVerified: false, calculatedScore: null },
    ],
  },
  {
    name: 'Dev Joshi',
    email: 'dev@test.com',
    role: 'STUDENT',
    college: 'IIT Delhi',
    headline: 'ML Researcher | NLP | Transformers',
    bio: 'Final year. Research intern at AI4Bharat. Obsessed with making LLMs understand Indian languages.',
    github: 'github.com/devjoshi',
    skills: [
      { name: 'Python',           level: 'Advanced',     isVerified: true,  calculatedScore: 9 },
      { name: 'Machine Learning', level: 'Advanced',     isVerified: true,  calculatedScore: 9 },
      { name: 'TensorFlow',       level: 'Advanced',     isVerified: true,  calculatedScore: 8 },
      { name: 'PyTorch',          level: 'Intermediate', isVerified: true,  calculatedScore: 7 },
      { name: 'SQL',              level: 'Beginner',     isVerified: false, calculatedScore: null },
    ],
  },
  {
    name: 'Meera Nair',
    email: 'meera@test.com',
    role: 'ALUMNI',
    college: 'VIT Vellore',
    headline: 'Fullstack @ Swiggy | React Native | Node',
    bio: 'VIT 2022. Shipping features used by 10M+ users daily. Side project: building a local food discovery app.',
    github: 'github.com/meeranair',
    linkedin: 'linkedin.com/in/meeranair',
    skills: [
      { name: 'React Native', level: 'Advanced',     isVerified: true,  calculatedScore: 9 },
      { name: 'JavaScript',   level: 'Advanced',     isVerified: true,  calculatedScore: 8 },
      { name: 'Node.js',      level: 'Advanced',     isVerified: true,  calculatedScore: 8 },
      { name: 'MongoDB',      level: 'Intermediate', isVerified: false, calculatedScore: null },
      { name: 'AWS',          level: 'Intermediate', isVerified: false, calculatedScore: null },
    ],
  },
  {
    name: 'Aditya Kulkarni',
    email: 'aditya@test.com',
    role: 'STUDENT',
    college: 'COEP Technological University',
    headline: 'Web3 Dev | Solidity | DeFi protocols',
    bio: 'Building on Ethereum. Hackathon addict — 8 wins so far. Looking for co-founders for a DeFi project.',
    github: 'github.com/adityakulkarni',
    skills: [
      { name: 'JavaScript', level: 'Advanced',     isVerified: true,  calculatedScore: 8 },
      { name: 'React',      level: 'Intermediate', isVerified: true,  calculatedScore: 6 },
      { name: 'Node.js',    level: 'Intermediate', isVerified: false, calculatedScore: null },
      { name: 'Python',     level: 'Beginner',     isVerified: false, calculatedScore: null },
    ],
  },
  {
    name: 'Tanvi Singh',
    email: 'tanvi@test.com',
    role: 'ALUMNI',
    college: 'Jadavpur University',
    headline: 'Security Engineer @ Zerodha | VAPT | Bug Bounty',
    bio: 'Jadavpur 2020. Bug bounty hunter in free time. Found critical vulns in 3 unicorns. OSCP certified.',
    github: 'github.com/tanvisingh',
    linkedin: 'linkedin.com/in/tanvisingh',
    skills: [
      { name: 'Python',    level: 'Advanced',     isVerified: true,  calculatedScore: 8 },
      { name: 'Linux',     level: 'Advanced',     isVerified: true,  calculatedScore: 9 },
      { name: 'Docker',    level: 'Intermediate', isVerified: true,  calculatedScore: 7 },
      { name: 'Go',        level: 'Beginner',     isVerified: false, calculatedScore: null },
    ],
  },
  {
    name: 'Rahul Gupta',
    email: 'rahul@test.com',
    role: 'STUDENT',
    college: 'IIT Kanpur',
    headline: 'Systems Programmer | C++ | OS internals',
    bio: 'Writing a toy OS kernel for fun. Interested in compilers and garbage collectors. Competitive programmer.',
    github: 'github.com/rahulgupta',
    skills: [
      { name: 'C++',    level: 'Advanced',     isVerified: true,  calculatedScore: 10 },
      { name: 'C',      level: 'Advanced',     isVerified: true,  calculatedScore: 9 },
      { name: 'Python', level: 'Intermediate', isVerified: false, calculatedScore: null },
      { name: 'Linux',  level: 'Advanced',     isVerified: true,  calculatedScore: 8 },
    ],
  },
  {
    name: 'Ishaan Kapoor',
    email: 'ishaan@test.com',
    role: 'ALUMNI',
    college: 'Delhi Technological University',
    headline: 'Cloud Architect @ Infosys | AWS Solutions Architect',
    bio: 'DTU 2019. Helping enterprises migrate to cloud. AWS Solutions Architect Professional certified.',
    github: 'github.com/ishaankapoor',
    linkedin: 'linkedin.com/in/ishaankapoor',
    skills: [
      { name: 'AWS',        level: 'Advanced',     isVerified: true,  calculatedScore: 10 },
      { name: 'Terraform',  level: 'Advanced',     isVerified: true,  calculatedScore: 9 },
      { name: 'Docker',     level: 'Advanced',     isVerified: true,  calculatedScore: 8 },
      { name: 'Kubernetes', level: 'Intermediate', isVerified: true,  calculatedScore: 7 },
      { name: 'Python',     level: 'Intermediate', isVerified: false, calculatedScore: null },
    ],
  },
];

// ── Sample posts ──────────────────────────────────────────────────────────────
const POSTS = [
  { userEmail: 'aryan@test.com',   content: 'Just shipped a real-time collaborative code editor using WebSockets + React. The diff-sync algorithm was the hardest part. Happy to share the repo if anyone\'s interested! #buildinpublic' },
  { userEmail: 'priya@test.com',   content: 'Tip for juniors: Don\'t skip data structures. I was asked to implement a trie from scratch in my Flipkart interview. Spent 2 years avoiding it, 2 hours regretting it 😅' },
  { userEmail: 'sneha@test.com',   content: 'Our Kubernetes cluster hit 1000 pods today. 18 months ago we were running everything on a single EC2. The journey from chaos to GitOps has been wild. Thread incoming 🧵' },
  { userEmail: 'ananya@test.com',  content: 'Hot take: Most React performance problems I see in code reviews aren\'t solved by useMemo or useCallback — they\'re solved by better component architecture. Stop optimizing, start restructuring.' },
  { userEmail: 'dev@test.com',     content: 'Our multilingual NLP model now supports 12 Indian languages with 91% accuracy on the IndicGLUE benchmark. The key insight: shared subword tokenizer trained on all languages simultaneously.' },
  { userEmail: 'rohan@test.com',   content: 'Day 47 of building a distributed KV store in Rust. Finally got Raft consensus working correctly. The hardest bug: leader election during network partition. Sleep is overrated anyway.' },
  { userEmail: 'meera@test.com',   content: 'Pushed a feature to prod at 11pm, woke up to 0 Sentry errors. This is the way. Also shoutout to the QA team — you are the real heroes.' },
  { userEmail: 'aditya@test.com',  content: 'Won ETHIndia 2024! Built a decentralized skill verification system — ironically similar to what SkillSphere is doing but on-chain. Great minds think alike 👀' },
  { userEmail: 'ishaan@test.com',  content: 'AWS bill went from $45k/month to $12k after rightsizing + reserved instances + Savings Plans. The cloud isn\'t expensive — running it without observability is.' },
  { userEmail: 'karan@test.com',   content: 'My GSoC project got merged into the main Android repo! 3 months of work, 47 PR iterations, and one very patient mentor. If you\'re a student — apply to GSoC, it changes everything.' },
];

async function main() {
  console.log('🌱 Seeding dummy users...\n');

  const password = await bcrypt.hash('test1234', 12);
  const created  = [];

  for (const u of USERS) {
    // Upsert user
    const user = await prisma.user.upsert({
      where:  { email: u.email },
      update: { name: u.name, role: u.role, college: u.college, headline: u.headline, bio: u.bio, github: u.github || null, linkedin: u.linkedin || null },
      create: {
        email: u.email, password, name: u.name, role: u.role,
        college: u.college, headline: u.headline, bio: u.bio,
        github: u.github || null, linkedin: u.linkedin || null,
      },
    });

    // Delete old skills and recreate
    await prisma.skill.deleteMany({ where: { userId: user.id } });
    await prisma.skill.createMany({
      data: u.skills.map((s) => ({
        userId:          user.id,
        name:            s.name,
        level:           s.level,
        isVerified:      s.isVerified,
        calculatedScore: s.calculatedScore,
        showLevel:       true,
        verifiedAt:      s.isVerified ? new Date() : null,
      })),
      skipDuplicates: true,
    });

    // Activity log
    await prisma.activityLog.create({
      data: { userId: user.id, action: 'ACCOUNT_CREATED', details: `Seeded user: ${u.role}` },
    }).catch(() => {});

    created.push(user);
    console.log(`  ✓ ${u.name} (${u.role}) — ${u.college} — ${u.skills.length} skills`);
  }

  // ── Posts ────────────────────────────────────────────────────────────────
  console.log('\n📝 Seeding posts...');
  for (const p of POSTS) {
    const author = created.find((u) => u.email === p.userEmail);
    if (!author) continue;

    await prisma.post.create({
      data: { userId: author.id, content: p.content },
    });
    console.log(`  ✓ Post by ${author.name}`);
  }

  console.log(`\n✅ Done!`);
  console.log(`   ${USERS.length} users seeded`);
  console.log(`   ${POSTS.length} posts seeded`);
  console.log(`\n🔑 All test accounts use password: test1234`);
  console.log('   Example: aryan@test.com / test1234\n');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());