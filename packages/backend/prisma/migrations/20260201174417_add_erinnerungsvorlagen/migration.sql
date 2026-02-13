-- CreateTable
CREATE TABLE "erinnerungsvorlagen" (
    "id" TEXT NOT NULL,
    "titel" VARCHAR(100) NOT NULL,
    "beschreibung" VARCHAR(500),
    "minuten" INTEGER NOT NULL,
    "createdBy" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" VARCHAR(100),

    CONSTRAINT "erinnerungsvorlagen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "erinnerungsvorlagen_isDeleted_idx" ON "erinnerungsvorlagen"("isDeleted");

-- CreateIndex
CREATE INDEX "erinnerungsvorlagen_createdBy_idx" ON "erinnerungsvorlagen"("createdBy");

-- AddForeignKey
ALTER TABLE "erinnerungsvorlagen" ADD CONSTRAINT "erinnerungsvorlagen_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "erinnerungsvorlagen" ADD CONSTRAINT "erinnerungsvorlagen_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
