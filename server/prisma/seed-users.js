require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ── Dummy Users — Multi-Tier Verification ─────────────────────────────────────
const USERS = [
  {
    name: 'Aryan Mehta',
    email: 'aryan@test.com',
    role: 'STUDENT',
    college: 'IIT Bombay',
    headline: 'Full Stack Engineer | Distributed Systems Enthusiast',
    bio: 'Building scalable microservices with Node.js and Go. Passionate about system design and performance optimization. GitHub contributor to several high-traffic libraries.',
    github: 'github.com/aryanmehta',
    skills: [
      { name: 'JavaScript', level: 'Advanced', isVerified: true, source: 'GITHUB', score: 9, url: 'github.com/aryanmehta/node-dist-lock' },
      { name: 'Node.js', level: 'Advanced', isVerified: true, source: 'GITHUB', score: 8, url: 'github.com/aryanmehta/express-router-core' },
      { name: 'React', level: 'Intermediate', isVerified: true, source: 'GITHUB', score: 7, url: 'github.com/aryanmehta/nexus-ui' },
      { name: 'System Design', level: 'Beginner', isVerified: false, source: 'MANUAL' },
    ],
  },
  {
    name: 'Priya Sharma',
    email: 'priya@test.com',
    role: 'ALUMNI',
    college: 'NIT Trichy',
    headline: 'Senior SDE @ Flipkart | AI/ML Architect',
    bio: 'Lead Engineer in the recommendation systems team. Expert in Python, TensorFlow, and large-scale data processing pipelines. Graduated 2021.',
    github: 'github.com/priyasharma-ml',
    linkedin: 'linkedin.com/in/priyasharma',
    skills: [
      { name: 'Python', level: 'Advanced', isVerified: true, source: 'GITHUB', score: 10, url: 'github.com/priyasharma-ml/nlp-pipelines' },
      { name: 'Machine Learning', level: 'Advanced', isVerified: true, source: 'CREDENTIAL', url: 'credly.com/certs/ml-architect-001' },
      { name: 'TensorFlow', level: 'Advanced', isVerified: true, source: 'CREDENTIAL', url: 'coursera.org/verify/tf-specialization' },
      { name: 'AWS/Azure', level: 'Intermediate', isVerified: true, source: 'CREDENTIAL', url: 'aws.amazon.com/certs/solutions-architect' },
    ],
  },
  {
    name: 'Rohan Verma',
    email: 'rohan@test.com',
    role: 'STUDENT',
    college: 'BITS Pilani',
    headline: 'Cloud Infrastructure & DevOps Specialist',
    bio: 'Managing hybrid cloud environments. Kubernetes expert and Terraform advocate. Currently automating everything at a high-growth fintech startup.',
    github: 'github.com/rohan-infra',
    skills: [
      { name: 'Docker', level: 'Advanced', isVerified: true, source: 'GITHUB', score: 9, url: 'github.com/rohan-infra/k8s-config' },
      { name: 'Terraform', level: 'Advanced', isVerified: true, source: 'GITHUB', score: 8, url: 'github.com/rohan-infra/terraform-aws-modules' },
      { name: 'Kubernetes', level: 'Advanced', isVerified: true, source: 'CREDENTIAL', url: 'credly.com/certs/cka-rohan' },
      { name: 'Linux Administration', level: 'Advanced', isVerified: false, source: 'MANUAL' },
    ],
  },
  {
    name: 'Ananya Iyer',
    email: 'ananya@test.com',
    role: 'ALUMNI',
    college: 'IIT Madras',
    headline: 'Frontend Architect @ Razorpay | Design Systems Expert',
    bio: 'Focused on building accessible, high-performance web applications. Creator of the OpenScale UI library. Mentor for aspiring frontend engineers.',
    github: 'github.com/ananya-ui',
    linkedin: 'linkedin.com/in/ananyaiyer',
    skills: [
      { name: 'TypeScript', level: 'Advanced', isVerified: true, source: 'GITHUB', score: 10, url: 'github.com/ananya-ui/scale-design-system' },
      { name: 'React', level: 'Advanced', isVerified: true, source: 'GITHUB', score: 9, url: 'github.com/ananya-ui/react-perf-tools' },
      { name: 'Web Performance', level: 'Advanced', isVerified: true, source: 'CREDENTIAL', url: 'linkedin.com/learning/web-performance-certs' },
      { name: 'Tailwind CSS', level: 'Advanced', isVerified: true, source: 'GITHUB', score: 9, url: 'github.com/ananya-ui/tailwind-plugin-grid' },
    ],
  },
  {
    name: 'Karan Patel',
    email: 'karan@test.com',
    role: 'STUDENT',
    college: 'NIT Warangal',
    headline: 'Mobile App Developer | React Native | Flutter',
    bio: 'Building cross-platform apps with a focus on buttery-smooth animations and offline-first architecture. 2x Hackathon winner.',
    github: 'github.com/karan-native',
    skills: [
      { name: 'React Native', level: 'Advanced', isVerified: true, source: 'GITHUB', score: 9, url: 'github.com/karan-native/chat-crypto-app' },
      { name: 'JavaScript', level: 'Advanced', isVerified: true, source: 'GITHUB', score: 8, url: 'github.com/karan-native/js-core-utils' },
      { name: 'Mobile UI/UX', level: 'Intermediate', isVerified: false, source: 'MANUAL' },
      { name: 'Firebase', level: 'Intermediate', isVerified: true, source: 'CREDENTIAL', url: 'coursera.org/verify/firebase-apps' },
    ],
  },
  {
    name: 'Sneha Reddy',
    email: 'sneha@test.com',
    role: 'ALUMNI',
    college: 'IIIT Hyderabad',
    headline: 'Cybersecurity Analyst @ Microsoft | Security Operations',
    bio: 'Securing global infrastructure. Expert in penetration testing, incident response, and security automation. Certified Ethical Hacker.',
    github: 'github.com/sneha-security',
    linkedin: 'linkedin.com/in/snehareddy-sec',
    skills: [
      { name: 'Python', level: 'Advanced', isVerified: true, source: 'GITHUB', score: 8, url: 'github.com/sneha-security/vuln-scanner' },
      { name: 'Linux Administration', level: 'Advanced', isVerified: true, source: 'CREDENTIAL', url: 'credly.com/certs/comptia-linux-plus' },
      { name: 'Security Compliance', level: 'Intermediate', isVerified: true, source: 'CREDENTIAL', url: 'credly.com/certs/ceh-v12' },
      { name: 'Go', level: 'Beginner', isVerified: true, source: 'GITHUB', score: 6, url: 'github.com/sneha-security/go-log-parser' },
    ],
  },
  {
    name: 'Dev Joshi',
    email: 'dev@test.com',
    role: 'STUDENT',
    college: 'IIT Delhi',
    headline: 'Data Engineer | Spark | Big Data Pipelines',
    bio: 'Processing petabytes of data with Apache Spark and Flink. Optimizing ETL pipelines for low-latency analytics. Researching streaming data architectures.',
    github: 'github.com/dev-bigdata',
    skills: [
      { name: 'Python', level: 'Advanced', isVerified: true, source: 'GITHUB', score: 9, url: 'github.com/dev-bigdata/spark-streaming-demo' },
      { name: 'Data Engineering', level: 'Advanced', isVerified: true, source: 'CREDENTIAL', url: 'credly.com/certs/gcp-data-engineer' },
      { name: 'PostgreSQL', level: 'Advanced', isVerified: true, source: 'GITHUB', score: 8, url: 'github.com/dev-bigdata/sql-query-optimizer' },
      { name: 'Docker', level: 'Intermediate', isVerified: false, source: 'MANUAL' },
    ],
  },
  {
    name: 'Meera Nair',
    email: 'meera@test.com',
    role: 'ALUMNI',
    college: 'VIT Vellore',
    headline: 'Product Manager @ Swiggy | Technical PM',
    bio: 'Bridging the gap between engineering and business. Former Full Stack dev turned PM. Expertise in data-driven product roadmap planning.',
    linkedin: 'linkedin.com/in/meeranair-pm',
    skills: [
      { name: 'React', level: 'Advanced', isVerified: true, source: 'CREDENTIAL', url: 'linkedin.com/learning/react-legacy' },
      { name: 'Node.js', level: 'Intermediate', isVerified: true, source: 'CREDENTIAL', url: 'linkedin.com/learning/node-architecture' },
      { name: 'System Design', level: 'Advanced', isVerified: true, source: 'CREDENTIAL', url: 'coursera.org/verify/system-design' },
    ],
  },
];

// ── Sample Posts — Realistic technical discourse ──────────────────────────────
const POSTS = [
  { userEmail: 'aryan@test.com', content: 'Just benchmarked the new SkillSphere Nexus matching engine. The move from a basic filter to an Antifragile weighted strategy reduced squad formation latency by 40%. #SystemDesign #Optimization' },
  { userEmail: 'priya@test.com', content: 'Tip for engineers: When building AI pipelines, observability is more important than the model architecture itself. If you can\'t trace why a recommendation failed, you can\'t fix it. Use OpenTelemetry! 🚀' },
  { userEmail: 'ananya@test.com', content: 'Hot take: TypeScript interfaces are better than Types for API responses, but Types are better for complex unions and utilities. Change my mind. #TypeScript #CleanCode' },
  { userEmail: 'rohan@test.com', content: 'Successfully migrated our legacy staging environment to a full GitOps workflow using ArgoCD. The "drift detection" alone has saved us hours of debugging "it works on my machine" issues.' },
  { userEmail: 'sneha@test.com', content: 'If you aren\'t signing your commits and rotating your API keys every 90 days, you aren\'t doing security. A simple GitHub action can automate 90% of your security posture. Don\'t be the weak link!' },
  { userEmail: 'dev@test.com', content: 'Interesting find today: Postgres window functions are significantly faster than multiple self-joins for complex time-series analysis. If you\'re processing logs in SQL, check out PARTITION BY.' },
  { userEmail: 'karan@test.com', content: 'Finally achieved 60fps on our complex list view in React Native. The secret? moving from FlatList to FlashList and offloading expensive calculations to a JSI module. Native-like speed is possible!' },
  { userEmail: 'priya@test.com', content: 'I\'ll be hosting a 30-min mock interview session for students interested in AI/ML roles next weekend. Drop a comment if you want a slot! Priority to those with verified GitHub modules.' },
  { userEmail: 'aryan@test.com', content: 'Highly recommend the "Campus Proximity" strategy on Nexus if you\'re looking for a hackathon squad. Building with people from your own college makes the coordination 10x easier.' },
  { userEmail: 'meera@test.com', content: 'Great to see so many alumni giving back to the network. As a PM, I look for "Proof of Work" (GitHub/Certs) over just resumes. SkillSphere makes that so much clearer. #ProductManagement' },
];

async function main() {
  console.log('🌱 Seeding Professional Personas...\n');

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

    // Delete old skills and recreate with multi-tier source
    await prisma.skill.deleteMany({ where: { userId: user.id } });
    await prisma.skill.createMany({
      data: u.skills.map((s) => ({
        userId:          user.id,
        name:            s.name,
        level:           s.level,
        isVerified:      s.isVerified,
        verificationSource: s.source || 'MANUAL',
        verificationUrl: s.url || null,
        calculatedScore: s.score || null,
        showLevel:       true,
        verifiedAt:      s.isVerified ? new Date() : null,
      })),
      skipDuplicates: true,
    });

    created.push(user);
    console.log(`  ✓ ${u.name} (${u.role}) — ${u.skills.length} verified modules attached`);
  }

  // ── Posts ────────────────────────────────────────────────────────────────
  console.log('\n📝 Seeding Technical Activity Stream...');
  await prisma.post.deleteMany({}); // Clean posts for fresh seed
  for (const p of POSTS) {
    const author = created.find((u) => u.email === p.userEmail);
    if (!author) continue;

    await prisma.post.create({
      data: { userId: author.id, content: p.content },
    });
    console.log(`  ✓ Technical log from ${author.name}`);
  }

  console.log(`\n✅ Persona Seed Complete!`);
  console.log(`\n🔑 ALL ACCOUNTS: [password: test1234]`);
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());