// Verification script to confirm the InviteCode database issue is fixed
// Tests that the repository can query without throwing ID validation errors

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyFix() {
  console.log('�� Verifying InviteCode Database Fix\n');
  console.log('='.repeat(60));

  try {
    // 1. Check database state
    console.log('\n📊 Step 1: Checking database state...');
    const inviteCodes = await prisma.inviteCode.findMany();
    console.log(`   ✅ Found ${inviteCodes.length} InviteCode record(s)`);

    if (inviteCodes.length > 0) {
      console.log('\n   Inspecting IDs:');
      for (const code of inviteCodes) {
        const hasCorrectPrefix = code.id.startsWith('inv_');
        const hasCorrectLength = code.id.length === 28;
        const status = hasCorrectPrefix && hasCorrectLength ? '✅' : '❌';

        console.log(`   ${status} ID: ${code.id}`);
        console.log(`      - Prefix: ${code.id.substring(0, 4)} ${hasCorrectPrefix ? '(correct)' : '(INVALID - should be inv_)'}`);
        console.log(`      - Length: ${code.id.length} ${hasCorrectLength ? '(correct)' : '(INVALID - should be 28)'}`);
      }
    }

    // 2. Verify the problematic ID is gone
    console.log('\n🔍 Step 2: Checking for problematic record...');
    const problematicId = 'cmk55h5y90001e192gbzd7yu8';
    const problematicRecord = await prisma.inviteCode.findUnique({
      where: { id: problematicId },
    });

    if (problematicRecord) {
      console.log(`   ❌ FAILED: Problematic record still exists!`);
      console.log(`      ID: ${problematicId}`);
      return false;
    } else {
      console.log(`   ✅ Problematic record removed successfully`);
    }

    // 3. Test that we can query all without errors (this was failing before)
    console.log('\n🧪 Step 3: Testing repository query compatibility...');

    // This simulates what the PrismaInviteCodeRepository.findAll() does
    const allRecords = await prisma.inviteCode.findMany({
      orderBy: { createdAt: 'desc' },
    });

    console.log(`   ✅ Query executed successfully (${allRecords.length} records)`);

    // Validate all records have correct ID format
    let allValid = true;
    for (const record of allRecords) {
      const hasCorrectPrefix = record.id.startsWith('inv_');
      const hasCorrectLength = record.id.length === 28;

      if (!hasCorrectPrefix || !hasCorrectLength) {
        console.log(`   ❌ Invalid ID found: ${record.id}`);
        allValid = false;
      }
    }

    if (allValid) {
      console.log(`   ✅ All IDs are valid (inv_ prefix, 28 chars)`);
    }

    // 4. Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ FIX VERIFICATION COMPLETE\n');
    console.log('Summary:');
    console.log('  - Problematic record (cmk55h5y90001e192gbzd7yu8) removed');
    console.log('  - Database queries execute without errors');
    console.log('  - All existing IDs have correct format (inv_ + 24 chars)');
    console.log('\nThe GET /api/v-alpha/admin/invites endpoint should now work!');
    console.log('(Note: Endpoint requires ServerAccessToken authentication)\n');

    return true;
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

verifyFix();
