import { MigrationInterface, QueryRunner } from 'typeorm';

export class DesiredExperienceEnum1776500000000 implements MigrationInterface {
  name = 'DesiredExperienceEnum1776500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "application"
      ALTER COLUMN "desiredExperience"
      TYPE character varying
      USING "desiredExperience"::text;
    `);

    await queryRunner.query(`
      UPDATE "application"
      SET "desiredExperience" = CASE
        WHEN "desiredExperience" ILIKE '%practicum%' THEN 'Practicum'
        WHEN "desiredExperience" ILIKE '%shadow%' THEN 'Shadowing'
        WHEN "desiredExperience" ILIKE '%public health%' THEN 'Public Health Project'
        WHEN "desiredExperience" ILIKE '%volunteer%' OR "desiredExperience" ILIKE '%intern%' THEN 'Volunteer/Intern'
        ELSE 'Pre-Licensure Placement (NP/PA, Nursing, Behavioral Health, Psychiatry)'
      END
      WHERE "desiredExperience" IS NOT NULL;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'CHK_application_desiredExperience_allowed'
        ) THEN
          ALTER TABLE "application"
          ADD CONSTRAINT "CHK_application_desiredExperience_allowed"
          CHECK (
            "desiredExperience" IN (
              'Pre-Licensure Placement (NP/PA, Nursing, Behavioral Health, Psychiatry)',
              'Practicum',
              'Public Health Project',
              'Shadowing',
              'Volunteer/Intern'
            )
          );
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "application"
      DROP CONSTRAINT IF EXISTS "CHK_application_desiredExperience_allowed";
    `);
  }
}
