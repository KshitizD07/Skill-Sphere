// ============================================================================
// ANTIFRAGILE N.E.X.U.S. SEED FILE
// ============================================================================
//
// Purpose: Initialize the antifragile matching system with:
// - System configuration
// - Initial strategies
// - Sample data for testing
//
// Run with: node server/seed-antifragile.js
//
// ============================================================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n============================================');
  console.log('🌱 SEEDING ANTIFRAGILE N.E.X.U.S. SYSTEM');
  console.log('============================================\n');

  try {
    // ========================================
    // STEP 1: Create System Configuration
    // ========================================
    console.log('⚙️  Creating system configuration...');
    
    // Check if config already exists
    const existingConfig = await prisma.systemConfig.findFirst();
    
    if (existingConfig) {
      console.log('   ℹ️  System config already exists, skipping');
    } else {
      await prisma.systemConfig.create({
        data: {
          maxActiveStrategies: 5,
          maxShadowStrategies: 3,
          minRandomnessRate: 0.10,  // 10%
          maxRandomnessRate: 0.30,  // 30%
          minConsensusStrategies: 2,
          influenceDecayDays: 30,
          performanceWindowDays: 7,
          promotionWindowCount: 3,
          demotionWindowCount: 3
        }
      });
      console.log('   ✅ System config created');
    }

    // ========================================
    // STEP 2: Create Initial Strategies
    // ========================================
    console.log('\n🧠 Creating initial strategies...');

    // Strategy 1: Verified Skills Matcher
    const strategy1 = await createStrategy({
      name: 'verified_skills_v1',
      displayName: 'Verified Skills Matcher',
      description: 'Prioritizes candidates with verified GitHub skills matching the required role',
      version: '1.0.0',
      state: 'ACTIVE', // Start as active
      influenceLevel: 'MEDIUM',
      config: {
        verifiedBonus: 0.3,
        minScoreThreshold: 0,
        exactMatchBonus: 0.2
      }
    });

    // Strategy 2: Activity Score Matcher
    const strategy2 = await createStrategy({
      name: 'activity_score_v1',
      displayName: 'Activity Score Matcher',
      description: 'Prioritizes candidates with recent platform activity and engagement',
      version: '1.0.0',
      state: 'ACTIVE', // Start as active
      influenceLevel: 'MEDIUM',
      config: {
        recentDays: 30,
        skillUpdateWeight: 2.0,
        verificationWeight: 3.0,
        postWeight: 1.0,
        applicationWeight: 1.5
      }
    });

    // Strategy 3: College Proximity (SHADOW - testing)
    const strategy3 = await createStrategy({
      name: 'college_proximity_v1',
      displayName: 'College Proximity Matcher',
      description: 'Prefers candidates from the same college as squad leader',
      version: '1.0.0',
      state: 'SHADOW', // Start in shadow mode
      influenceLevel: 'MEDIUM',
      config: {
        sameCollegeBonus: 5.0,
        nearbyCollegeBonus: 2.0
      }
    });

    console.log('   ✅ All initial strategies created');

    // ========================================
    // STEP 3: Summary
    // ========================================
    console.log('\n============================================');
    console.log('✅ SEEDING COMPLETE');
    console.log('============================================');
    console.log('\nInitialized:');
    console.log('  • System Configuration');
    console.log('  • 2 Active Strategies');
    console.log('  • 1 Shadow Strategy');
    console.log('\nNext steps:');
    console.log('  1. Start the server: npm start');
    console.log('  2. Access admin dashboard: /antifragile');
    console.log('  3. Make some matches to see system in action');
    console.log('============================================\n');

  } catch (error) {
    console.error('\n❌ SEEDING FAILED:', error);
    throw error;
  }
}

// ============================================================================
// HELPER: Create or update strategy
// ============================================================================
async function createStrategy(data) {
  const existing = await prisma.matchStrategy.findUnique({
    where: { name: data.name }
  });

  if (existing) {
    console.log(`   ℹ️  Strategy "${data.name}" already exists, updating...`);
    return await prisma.matchStrategy.update({
      where: { name: data.name },
      data: {
        displayName: data.displayName,
        description: data.description,
        version: data.version,
        config: data.config
      }
    });
  }

  console.log(`   ➕ Creating strategy: ${data.displayName}`);
  return await prisma.matchStrategy.create({
    data: {
      name: data.name,
      displayName: data.displayName,
      description: data.description,
      version: data.version,
      state: data.state,
      influenceLevel: data.influenceLevel,
      config: data.config,
      activatedAt: data.state === 'ACTIVE' ? new Date() : null
    }
  });
}

// ============================================================================
// RUN SEED
// ============================================================================
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });