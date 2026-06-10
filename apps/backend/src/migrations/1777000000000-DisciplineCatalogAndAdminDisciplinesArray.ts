import { MigrationInterface, QueryRunner } from 'typeorm';

export class DisciplineCatalogAndAdminDisciplinesArray1777000000000
  implements MigrationInterface
{
  name = 'DisciplineCatalogAndAdminDisciplinesArray1777000000000';

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

    await queryRunner.query(
      `ALTER TABLE "admin_info" ADD COLUMN IF NOT EXISTS "disciplines" text[] NOT NULL DEFAULT '{}'`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'admin_info'
            AND column_name = 'discipline'
        ) THEN
          UPDATE "admin_info"
          SET "disciplines" = ARRAY[
            lower(regexp_replace("discipline"::text, '[^a-zA-Z0-9]+', '-', 'g'))
          ]
          WHERE COALESCE(array_length("disciplines", 1), 0) = 0;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'admin_discipline_map'
        ) THEN
          UPDATE "admin_info" ai
          SET "disciplines" = sub.disciplines
          FROM (
            SELECT "adminEmail", array_agg("disciplineKey" ORDER BY "disciplineKey") AS disciplines
            FROM "admin_discipline_map"
            GROUP BY "adminEmail"
          ) sub
          WHERE sub."adminEmail" = ai."email";
        END IF;
      END $$;
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "admin_discipline_map"`);

    await queryRunner.query(`
      ALTER TABLE "application"
      ALTER COLUMN "discipline" TYPE character varying
      USING lower(regexp_replace("discipline"::text, '[^a-zA-Z0-9]+', '-', 'g'))
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE table_schema = 'public'
            AND table_name = 'application'
            AND constraint_name = 'FK_application_discipline_key'
        ) THEN
          ALTER TABLE "application"
          ADD CONSTRAINT "FK_application_discipline_key"
          FOREIGN KEY ("discipline") REFERENCES "discipline"("key");
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `ALTER TABLE "admin_info" DROP COLUMN IF EXISTS "discipline"`,
    );

    await queryRunner.query(
      `ALTER TABLE "discipline" DROP COLUMN IF EXISTS "name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "discipline" DROP COLUMN IF EXISTS "admin_emails"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_discipline_label"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_discipline_key"`);

    await queryRunner.query(
      `ALTER TABLE "application" DROP CONSTRAINT IF EXISTS "FK_application_discipline_key"`,
    );

    await queryRunner.query(`
      UPDATE "application" a
      SET "discipline" = d."label"
      FROM "discipline" d
      WHERE a."discipline" = d."key"
    `);

    await queryRunner.query(`
      ALTER TABLE "application"
      ALTER COLUMN "discipline" TYPE "public"."application_discipline_enum"
      USING "discipline"::"public"."application_discipline_enum"
    `);

    await queryRunner.query(
      `ALTER TABLE "admin_info" ADD COLUMN IF NOT EXISTS "discipline" "public"."admin_info_discipline_enum"`,
    );

    await queryRunner.query(`
      UPDATE "admin_info" ai
      SET "discipline" = (
        SELECT d."label"::"public"."admin_info_discipline_enum"
        FROM "discipline" d
        WHERE d."key" = ai."disciplines"[1]
      )
      WHERE COALESCE(array_length(ai."disciplines", 1), 0) > 0
    `);

    await queryRunner.query(
      `ALTER TABLE "admin_info" DROP COLUMN IF EXISTS "disciplines"`,
    );

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
  }
}
