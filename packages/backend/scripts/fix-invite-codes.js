// Simple script to delete all InviteCode records and related ServerAccessTokens
// This fixes the ID format mismatch between database and domain model

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixInviteCodes() {
  try {
    console.log('🔍 Checking for InviteCode records...\n');

    const inviteCodes = await prisma.inviteCode.findMany({
      select: {
        id: true,
        code: true,
        label: true,
        createdAt: true,
      },
    });

    console.log(`Found ${inviteCodes.length} InviteCode record(s):\n`);

    for (const code of inviteCodes) {
      console.log(`  - ID: ${code.id} (length: ${code.id.length})`);
      console.log(`    Code: ${code.code}`);
      console.log(`    Label: ${code.label || 'N/A'}`);
      console.log(`    Created: ${code.createdAt}`);
      console.log('');
    }

    if (inviteCodes.length === 0) {
      console.log('✅ No InviteCode records to delete.\n');
      return;
    }

    console.log('🗑️  Deleting all InviteCode records (and related ServerAccessTokens)...\n');

    // First delete related ServerAccessTokens (due to foreign key)
    const deletedTokens = await prisma.serverAccessToken.deleteMany({
      where: {
        inviteCodeId: {
          in: inviteCodes.map((c) => c.id),
        },
      },
    });

    console.log(`   Deleted ${deletedTokens.count} ServerAccessToken(s)`);

    // Then delete InviteCodes
    const deletedCodes = await prisma.inviteCode.deleteMany();

    console.log(`   Deleted ${deletedCodes.count} InviteCode(s)\n`);

    console.log('✅ All InviteCode records deleted successfully!\n');
    console.log('📝 Next steps:');
    console.log('   1. Restart the backend server');
    console.log('   2. Create new InviteCode via Admin API');
    console.log('   3. New codes will use the correct inv_ prefix format\n');
  } catch (error) {
    console.error('❌ Error fixing InviteCodes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixInviteCodes();
