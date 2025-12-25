/*
  Warnings:

  - Added the required column `person_nachname` to the `einsatz_rollen_besetzung` table without a default value. This is not possible if the table is not empty.
  - Added the required column `person_vorname` to the `einsatz_rollen_besetzung` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rollen_name` to the `einsatz_rollen_besetzung` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "einsatz_rollen_besetzung" ADD COLUMN     "person_nachname" VARCHAR(100) NOT NULL,
ADD COLUMN     "person_vorname" VARCHAR(100) NOT NULL,
ADD COLUMN     "rollen_name" VARCHAR(100) NOT NULL;
