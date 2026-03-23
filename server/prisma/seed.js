require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JOB_ROLES = [
  {
    title: 'Frontend Developer',
    skills: ['JavaScript', 'React', 'TypeScript', 'CSS', 'HTML', 'Tailwind CSS', 'Next.js'],
  },
  {
    title: 'Backend Developer',
    skills: ['Node.js', 'Python', 'Express', 'PostgreSQL', 'REST APIs', 'Docker', 'Redis'],
  },
  {
    title: 'Full Stack Developer',
    skills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL', 'TypeScript', 'Docker', 'Git'],
  },
  {
    title: 'Data Scientist',
    skills: ['Python', 'Machine Learning', 'Pandas', 'NumPy', 'SQL', 'TensorFlow', 'Statistics'],
  },
  {
    title: 'Mobile Developer',
    skills: ['React Native', 'JavaScript', 'TypeScript', 'Flutter', 'Dart', 'iOS', 'Android'],
  },
  {
    title: 'DevOps Engineer',
    skills: ['Docker', 'Kubernetes', 'AWS', 'Linux', 'CI/CD', 'Terraform', 'Python'],
  },
  {
    title: 'UI/UX Designer',
    skills: ['Figma', 'UI Design', 'User Research', 'Prototyping', 'CSS', 'Design Systems'],
  },
  {
    title: 'Machine Learning Engineer',
    skills: ['Python', 'TensorFlow', 'PyTorch', 'Machine Learning', 'Docker', 'SQL', 'Statistics'],
  },
  {
    title: 'Cloud Architect',
    skills: ['AWS', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'Linux', 'Python'],
  },
  {
    title: 'Cybersecurity Engineer',
    skills: ['Linux', 'Python', 'Networking', 'Security Auditing', 'Docker', 'Cryptography'],
  },
];

const INITIAL_STRATEGIES = [
  {
    name:        'verified_skills_v1',
    displayName: 'Verified Skills Matcher',
    description: 'Prioritises candidates with GitHub-verified skills matching the slot requirement.',
    version:     '1.0.0',
    state:       'ACTIVE',
    influenceLevel: 'HIGH',
    config: { minVerifiedScore: 5, verificationBonus: 2 },
  },
  {
    name:        'activity_score_v1',
    displayName: 'Activity Score Matcher',
    description: 'Weights recent platform activity — posts, verifications, squad participation.',
    version:     '1.0.0',
    state:       'ACTIVE',
    influenceLevel: 'MEDIUM',
    config: { activityWindowDays: 30, activityWeight: 0.3 },
  },
  {
    name:        'campus_proximity_v1',
    displayName: 'Campus Proximity Matcher',
    description: 'Boosts candidates from the same college as the squad leader.',
    version:     '1.0.0',
    state:       'SHADOW',
    influenceLevel: 'LOW',
    config: { sameCollegeBonus: 1.5 },
  },
];

async function main() {
  console.log('🌱 Seeding database...\n');

  // ── Job roles + skills ────────────────────────────────────────────────────
  for (const roleData of JOB_ROLES) {
    const role = await prisma.jobRole.upsert({
      where:  { title: roleData.title },
      update: {},
      create: { title: roleData.title },
    });

    // Delete existing skills for clean seed
    await prisma.jobRoleSkill.deleteMany({ where: { jobRoleId: role.id } });

    await prisma.jobRoleSkill.createMany({
      data: roleData.skills.map((name, i) => ({
        jobRoleId:  role.id,
        skillName:  name,
        importance: i < 4 ? 'Required' : 'Nice to have',
      })),
    });

    console.log(`  ✓ ${role.title} (${roleData.skills.length} skills)`);
  }

  // ── Antifragile strategies ────────────────────────────────────────────────
  console.log('\n📊 Seeding matching strategies...');
  for (const s of INITIAL_STRATEGIES) {
    await prisma.matchStrategy.upsert({
      where:  { name: s.name },
      update: { state: s.state, influenceLevel: s.influenceLevel },
      create: { ...s, activatedAt: s.state === 'ACTIVE' ? new Date() : null },
    });
    console.log(`  ✓ ${s.displayName} [${s.state}]`);
  }

  // ── System config ─────────────────────────────────────────────────────────
  console.log('\n⚙️  Seeding system config...');
  const existing = await prisma.systemConfig.count();
  if (!existing) {
    await prisma.systemConfig.create({ data: {} });
    console.log('  ✓ SystemConfig created with defaults');
  } else {
    console.log('  ✓ SystemConfig already exists');
  }

  console.log('\n✅ Seed complete!');
  console.log(`   ${JOB_ROLES.length} job roles`);
  console.log(`   ${JOB_ROLES.reduce((a, r) => a + r.skills.length, 0)} role skills`);
  console.log(`   ${INITIAL_STRATEGIES.length} matching strategies\n`);
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());