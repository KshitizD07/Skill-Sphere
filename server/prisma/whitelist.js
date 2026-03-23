require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const [,, command, ...args] = process.argv;

const HELP = `
Usage:
  node prisma/whitelist.js add email@example.com "Optional name/note"
  node prisma/whitelist.js remove email@example.com
  node prisma/whitelist.js list
  node prisma/whitelist.js bulk emails.txt     (one email per line)

Examples:
  node prisma/whitelist.js add kshitiz@gmail.com "Kshitiz - founder"
  node prisma/whitelist.js add friend@iitb.ac.in "Test user"
  node prisma/whitelist.js list
  node prisma/whitelist.js remove old@gmail.com
`;

async function main() {
  switch (command) {

    case 'add': {
      const email = args[0]?.toLowerCase().trim();
      const note  = args[1] || null;
      if (!email) { console.error('Email required'); process.exit(1); }

      const result = await prisma.allowedEmail.upsert({
        where:  { email },
        update: { note },
        create: { email, note, addedBy: 'admin' },
      });
      console.log(`✓ Added: ${result.email}${note ? ` (${note})` : ''}`);
      break;
    }

    case 'remove': {
      const email = args[0]?.toLowerCase().trim();
      if (!email) { console.error('Email required'); process.exit(1); }

      await prisma.allowedEmail.delete({ where: { email } }).catch(() => {});
      console.log(`✓ Removed: ${email}`);
      break;
    }

    case 'list': {
      const rows = await prisma.allowedEmail.findMany({
        orderBy: { createdAt: 'asc' },
      });
      if (!rows.length) { console.log('No emails in whitelist yet.'); break; }
      console.log(`\n${rows.length} allowed email(s):\n`);
      rows.forEach(r => {
        const status = r.usedAt ? '✓ registered' : '○ pending';
        console.log(`  ${status}  ${r.email}${r.note ? `  — ${r.note}` : ''}`);
      });
      console.log('');
      break;
    }

    case 'bulk': {
      const file = args[0];
      if (!file) { console.error('File path required'); process.exit(1); }

      const fs    = require('fs');
      const lines = fs.readFileSync(file, 'utf8')
        .split('\n')
        .map(l => l.trim().toLowerCase())
        .filter(l => l && l.includes('@'));

      let added = 0;
      for (const email of lines) {
        await prisma.allowedEmail.upsert({
          where:  { email },
          update: {},
          create: { email, addedBy: 'bulk-import' },
        });
        added++;
      }
      console.log(`✓ Added ${added} emails from ${file}`);
      break;
    }

    default:
      console.log(HELP);
  }
}

main()
  .catch(e => { console.error('Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());