import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds B-tree indexes to the columns the applications list endpoints filter on
 * (email, discipline, appStatus). These speed up the equality/IN lookups used by
 * findByEmail, findByDisciplines, and the count-by-status endpoints.
 *
 * Note: these do NOT accelerate `ILIKE '%term%'` free-text search — that would
 * require a pg_trgm GIN (or tsvector) index, tracked as a separate follow-up.
 */
export class AddApplicationIndexes1779800000000 implements MigrationInterface {
  name = 'AddApplicationIndexes1779800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_application_email" ON "application" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_application_discipline" ON "application" ("discipline")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_application_appStatus" ON "application" ("appStatus")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_application_appStatus"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_application_discipline"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_application_email"`,
    );
  }
}
