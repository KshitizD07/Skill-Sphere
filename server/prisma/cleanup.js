require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function cleanup() {
  // Delete skill records with UUID-looking names (contain dashes) or bare numbers
  const result = await p.skill.deleteMany({
    where: {
      OR: [
        { name: { contains: '-' } },
        { name: { in: ['1','2','3','4','5','6','7','8','9','10'] } }
      ]
    }
  });
  console.log(`Cleaned ${result.count} bad skill records`);
  await p.$disconnect();
}

cleanup().catch(e => { console.error(e); process.exit(1); });