import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds account-lifecycle support for admins:
 * - an `isActive` flag on the users table (the app-layer source of truth), and
 * - the `admin_reactivation_token` table backing the verified, email-based
 *   reactivation flow.
 */
export class AddAdminLifecycle1779800000000 implements MigrationInterface {
  name = 'AddAdminLifecycle1779800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isActive" boolean NOT NULL DEFAULT true`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "admin_reactivation_token" (
        "id" SERIAL NOT NULL,
        "email" character varying NOT NULL,
        "tokenHash" character varying NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "usedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_reactivation_token" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_admin_reactivation_token_email" ON "admin_reactivation_token" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_admin_reactivation_token_tokenHash" ON "admin_reactivation_token" ("tokenHash")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_admin_reactivation_token_tokenHash"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_admin_reactivation_token_email"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_reactivation_token"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "isActive"`,
    );
  }
}
