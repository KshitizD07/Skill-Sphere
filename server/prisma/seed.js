import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const JOB_ROLES = [
  {
    title: 'Frontend Engineer',
    description: 'Expertise in building scalable, accessible, and performant web interfaces.',
    skills: [
      { name: 'React', importance: 'Required' },
      { name: 'TypeScript', importance: 'Required' },
      { name: 'Tailwind CSS', importance: 'Required' },
      { name: 'Next.js', importance: 'Required' },
      { name: 'State Management (Zustand/Redux)', importance: 'Nice to have' },
      { name: 'Testing (Jest/Cypress)', importance: 'Nice to have' },
      { name: 'Web Performance', importance: 'Nice to have' },
    ],
  },
  {
    title: 'Backend Engineer',
    description: 'Specializing in distributed systems, API design, and database architecture.',
    skills: [
      { name: 'Node.js', importance: 'Required' },
      { name: 'PostgreSQL', importance: 'Required' },
      { name: 'Express', importance: 'Required' },
      { name: 'Redis', importance: 'Required' },
      { name: 'System Design', importance: 'Required' },
      { name: 'Docker', importance: 'Nice to have' },
      { name: 'gRPC/GraphQL', importance: 'Nice to have' },
    ],
  },
  {
    title: 'Full Stack Engineer',
    description: 'Versatile engineer capable of handling end-to-end product delivery.',
    skills: [
      { name: 'JavaScript', importance: 'Required' },
      { name: 'React', importance: 'Required' },
      { name: 'Node.js', importance: 'Required' },
      { name: 'PostgreSQL', importance: 'Required' },
      { name: 'Git & CI/CD', importance: 'Required' },
      { name: 'Cloud Deployment', importance: 'Nice to have' },
    ],
  },
  {
    title: 'DevOps & Infrastructure',
    description: 'Managing cloud infrastructure, security, and deployment pipelines.',
    skills: [
      { name: 'Docker', importance: 'Required' },
      { name: 'Kubernetes', importance: 'Required' },
      { name: 'AWS/Azure', importance: 'Required' },
      { name: 'Terraform', importance: 'Required' },
      { name: 'Linux Administration', importance: 'Required' },
      { name: 'CI/CD Pipelines', importance: 'Required' },
      { name: 'Security Compliance', importance: 'Nice to have' },
    ],
  },
  {
    title: 'AI/ML Engineer',
    description: 'Building and deploying intelligent models and data processing pipelines.',
    skills: [
      { name: 'Python', importance: 'Required' },
      { name: 'PyTorch/TensorFlow', importance: 'Required' },
      { name: 'Machine Learning', importance: 'Required' },
      { name: 'Data Engineering', importance: 'Required' },
      { name: 'NLP/LLMs', importance: 'Nice to have' },
      { name: 'MLOps', importance: 'Nice to have' },
    ],
  },
  {
    title: 'Mobile Developer',
    description: 'Creating high-quality native or cross-platform mobile experiences.',
    skills: [
      { name: 'React Native', importance: 'Required' },
      { name: 'Swift/Kotlin', importance: 'Required' },
      { name: 'Mobile UI/UX', importance: 'Required' },
      { name: 'Firebase', importance: 'Nice to have' },
      { name: 'App Store Deployment', importance: 'Nice to have' },
    ],
  },
  {
    title: 'Data Analyst',
    description: 'Transforms raw business data into actionable dashboards, statistical insights, and executive reports.',
    skills: [
      { name: 'SQL', importance: 'Required' },
      { name: 'Excel', importance: 'Required' },
      { name: 'Power BI', importance: 'Required' },
      { name: 'Tableau', importance: 'Required' },
      { name: 'Python', importance: 'Required' },
      { name: 'Pandas', importance: 'Required' },
      { name: 'Data Visualization', importance: 'Nice to have' },
      { name: 'Statistics', importance: 'Nice to have' },
    ],
  },
  {
    title: 'UI/UX & Product Designer',
    description: 'Designs intuitive user experiences, design systems, interactive prototypes, and accessible interfaces.',
    skills: [
      { name: 'Figma', importance: 'Required' },
      { name: 'UI/UX Design', importance: 'Required' },
      { name: 'Wireframing', importance: 'Required' },
      { name: 'Design Systems', importance: 'Required' },
      { name: 'User Research', importance: 'Nice to have' },
      { name: 'Prototyping', importance: 'Nice to have' },
    ],
  },
];

const INITIAL_STRATEGIES = [
  {
    name:        'verified_skills_v1',
    displayName: 'Verified Skills Matcher',
    description: 'Prioritizes candidates with high-confidence verification scores from GitHub or Credentials.',
    version:     '1.0.0',
    state:       'ACTIVE',
    influenceLevel: 'HIGH',
    config: { minVerifiedScore: 6, verificationBonus: 2.5 },
  },
  {
    name:        'experience_depth_v1',
    displayName: 'Professional Depth Matcher',
    description: 'Weights candidates based on their role seniority and depth of their bio/headline.',
    version:     '1.0.0',
    state:       'ACTIVE',
    influenceLevel: 'MEDIUM',
    config: { seniorityBonus: 1.2, bioLengthThreshold: 100 },
  },
  {
    name:        'cross_domain_v1',
    displayName: 'Cross-Domain Synergy',
    description: 'Finds candidates with overlapping skills that bridge frontend and backend gaps.',
    version:     '1.0.0',
    state:       'SHADOW',
    influenceLevel: 'LOW',
    config: { synergyMultiplier: 1.5 },
  },
];

async function main() {
  console.log('🌱 Seeding Industry-Standard Data...\n');

  // ── Job roles + skills ────────────────────────────────────────────────────
  for (const roleData of JOB_ROLES) {
    const role = await prisma.jobRole.upsert({
      where:  { title: roleData.title },
      update: { description: roleData.description },
      create: { title: roleData.title, description: roleData.description },
    });

    // Delete existing skills for clean seed
    await prisma.jobRoleSkill.deleteMany({ where: { jobRoleId: role.id } });

    await prisma.jobRoleSkill.createMany({
      data: roleData.skills.map((s) => ({
        jobRoleId:  role.id,
        skillName:  s.name,
        importance: s.importance,
      })),
    });

    console.log(`  ✓ ${role.title} (${roleData.skills.length} technical modules)`);
  }

  // ── Antifragile strategies ────────────────────────────────────────────────
  console.log('\n📊 Seeding Matching Strategies...');
  for (const s of INITIAL_STRATEGIES) {
    await prisma.matchStrategy.upsert({
      where:  { name: s.name },
      update: { state: s.state, influenceLevel: s.influenceLevel, description: s.description },
      create: { ...s, activatedAt: s.state === 'ACTIVE' ? new Date() : null },
    });
    console.log(`  ✓ ${s.displayName} [${s.state}]`);
  }

  // ── System config ─────────────────────────────────────────────────────────
  console.log('\n⚙️  Seeding System Configuration...');
  const existing = await prisma.systemConfig.count();
  if (!existing) {
    await prisma.systemConfig.create({ data: {
      maxActiveStrategies: 5,
      maxShadowStrategies: 3,
      minRandomnessRate: 0.15,
      maxRandomnessRate: 0.40,
    } });
    console.log('  ✓ SystemConfig initialized');
  }

  // ── Official Platform Account ─────────────────────────────────────────────
  console.log('\n👑 Seeding SkillSphere Official System Account...');
  const defaultMasterKey = process.env.OFFICIAL_ACCOUNT_PASSWORD || '#basileusKZ07';
  const hashedPassword = await bcrypt.hash(defaultMasterKey, 10);
  await prisma.user.upsert({
    where:  { email: 'official@skillsphere.com' },
    update: {
      name: 'SkillSphere',
      role: 'ADMIN',
      avatar: '/logo.jpg',
      headline: 'Official Platform Intelligence · Core Engineering & Dispatch',
      bio: 'The official platform system account for SkillSphere. Managing platform updates, core engineering squads, and network dispatches.',
      college: 'SkillSphere Core',
      isActive: true,
    },
    create: {
      email: 'official@skillsphere.com',
      name: 'SkillSphere',
      password: hashedPassword,
      role: 'ADMIN',
      avatar: '/logo.jpg',
      headline: 'Official Platform Intelligence · Core Engineering & Dispatch',
      bio: 'The official platform system account for SkillSphere. Managing platform updates, core engineering squads, and network dispatches.',
      college: 'SkillSphere Core',
      isActive: true,
    },
  });
  console.log('  ✓ SkillSphere Official account ready (official@skillsphere.com)');

  console.log('\n✅ Industry Seed Complete!');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());