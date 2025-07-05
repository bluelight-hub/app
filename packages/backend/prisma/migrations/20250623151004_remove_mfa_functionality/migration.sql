-- DropForeignKey
ALTER TABLE "MfaSecret" DROP CONSTRAINT "MfaSecret_userId_fkey";

-- DropForeignKey
ALTER TABLE "WebAuthnCredential" DROP CONSTRAINT "WebAuthnCredential_userId_fkey";

-- DropTable
DROP TABLE "MfaSecret";

-- DropTable
DROP TABLE "WebAuthnCredential";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "isMfaEnabled";