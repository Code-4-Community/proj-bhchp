import { MigrationInterface, QueryRunner } from 'typeorm';

export class DisciplineCatalogAndMultiDisciplineAdmins1777000000000
  implements MigrationInterface
{
  name = 'DisciplineCatalogAndMultiDisciplineAdmins1777000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "discipline" ADD COLUMN IF NOT EXISTS "key" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "discipline" ADD COLUMN IF NOT EXISTS "label" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "discipline" ADD COLUMN IF NOT EXISTS "isActive" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "discipline" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "discipline" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );

    await queryRunner.query(`
      UPDATE "discipline"
      SET "label" = COALESCE("label", "name"::text),
          "key" = COALESCE(
            "key",
            lower(regexp_replace("name"::text, '[^a-zA-Z0-9]+', '-', 'g'))
          )
      WHERE "key" IS NULL OR "label" IS NULL
    `);

    await queryRunner.query(
      `ALTER TABLE "discipline" ALTER COLUMN "key" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "discipline" ALTER COLUMN "label" SET NOT NULL`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_discipline_key" ON "discipline" ("key")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_discipline_label" ON "discipline" ("label")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_discipline_map" (
        "adminEmail" character varying NOT NULL,
        "disciplineKey" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_discipline_map" PRIMARY KEY ("adminEmail", "disciplineKey"),
        CONSTRAINT "FK_admin_discipline_map_admin" FOREIGN KEY ("adminEmail") REFERENCES "admin_info"("email") ON DELETE CASCADE,
        CONSTRAINT "FK_admin_discipline_map_discipline" FOREIGN KEY ("disciplineKey") REFERENCES "discipline"("key")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "admin_discipline_map" ("adminEmail", "disciplineKey")
      SELECT ai."email", lower(regexp_replace(ai."discipline"::text, '[^a-zA-Z0-9]+', '-', 'g'))
      FROM "admin_info" ai
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      ALTER TABLE "application"
      ALTER COLUMN "discipline" TYPE character varying
      USING lower(regexp_replace("discipline"::text, '[^a-zA-Z0-9]+', '-', 'g'))
    `);

    await queryRunner.query(`
      ALTER TABLE "application"
      ADD CONSTRAINT "FK_application_discipline_key"
      FOREIGN KEY ("discipline") REFERENCES "discipline"("key")
    `);

    await queryRunner.query(
      `ALTER TABLE "admin_info" DROP COLUMN "discipline"`,
    );

    await queryRunner.query(
      `ALTER TABLE "discipline" DROP COLUMN IF EXISTS "name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "discipline" DROP COLUMN IF EXISTS "admin_emails"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "discipline" ADD COLUMN IF NOT EXISTS "admin_emails" character varying array NOT NULL DEFAULT '{}'`,
    );

    await queryRunner.query(
      `ALTER TABLE "discipline" ADD COLUMN IF NOT EXISTS "name" "public"."discipline_name_enum"`,
    );

    await queryRunner.query(`
      UPDATE "discipline"
      SET "name" = "label"::"public"."discipline_name_enum"
      WHERE "label"::text IN (
        'MD/Medical Student/Pre-Med',
        'Medical NP/PA',
        'Psychiatry or Psychiatric NP/PA',
        'Public Health',
        'RN',
        'Social Work',
        'Other'
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "discipline" DROP COLUMN IF EXISTS "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "discipline" DROP COLUMN IF EXISTS "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "discipline" DROP COLUMN IF EXISTS "isActive"`,
    );
    await queryRunner.query(
      `ALTER TABLE "discipline" DROP COLUMN IF EXISTS "label"`,
    );
    await queryRunner.query(
      `ALTER TABLE "discipline" DROP COLUMN IF EXISTS "key"`,
    );

    await queryRunner.query(
      `ALTER TABLE "application" DROP CONSTRAINT IF EXISTS "FK_application_discipline_key"`,
    );

    await queryRunner.query(`
      ALTER TABLE "application"
      ALTER COLUMN "discipline" TYPE "public"."application_discipline_enum"
      USING "discipline"::"public"."application_discipline_enum"
    `);

    await queryRunner.query(
      `ALTER TABLE "admin_info" ADD COLUMN "discipline" "public"."admin_info_discipline_enum"`,
    );

    await queryRunner.query(`
      UPDATE "admin_info" ai
      SET "discipline" = map."disciplineKey"::"public"."admin_info_discipline_enum"
      FROM "admin_discipline_map" map
      WHERE map."adminEmail" = ai."email"
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "admin_discipline_map"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_discipline_key"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_discipline_label"`);
  }
}
