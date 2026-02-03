-- CreateTable
CREATE TABLE "fuehrungsrhythmus_templates" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "beschreibung" VARCHAR(500),
    "createdBy" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" VARCHAR(100),

    CONSTRAINT "fuehrungsrhythmus_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuehrungsrhythmus_eintraege" (
    "id" TEXT NOT NULL,
    "fuehrungsrhythmus_template_id" TEXT NOT NULL,
    "titel" VARCHAR(100) NOT NULL,
    "intervall_minuten" INTEGER NOT NULL,
    "offset_minuten" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fuehrungsrhythmus_eintraege_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fuehrungsrhythmus_templates_isDeleted_idx" ON "fuehrungsrhythmus_templates"("isDeleted");

-- CreateIndex
CREATE INDEX "fuehrungsrhythmus_templates_createdBy_idx" ON "fuehrungsrhythmus_templates"("createdBy");

-- CreateIndex
CREATE INDEX "fuehrungsrhythmus_eintraege_fuehrungsrhythmus_template_id_idx" ON "fuehrungsrhythmus_eintraege"("fuehrungsrhythmus_template_id");

-- AddForeignKey
ALTER TABLE "fuehrungsrhythmus_templates" ADD CONSTRAINT "fuehrungsrhythmus_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuehrungsrhythmus_templates" ADD CONSTRAINT "fuehrungsrhythmus_templates_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuehrungsrhythmus_eintraege" ADD CONSTRAINT "fuehrungsrhythmus_eintraege_fuehrungsrhythmus_template_id_fkey" FOREIGN KEY ("fuehrungsrhythmus_template_id") REFERENCES "fuehrungsrhythmus_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
