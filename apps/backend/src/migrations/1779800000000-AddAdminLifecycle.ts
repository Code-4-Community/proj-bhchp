import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds account-lifecycle support for admins: an `isActive` flag on the users
 * table (the app-layer source of truth, enforced by the RolesGuard and mirrored
 * by enabling/disabling the Cognito user).
 */
export class AddAdminLifecycle1779800000000 implements MigrationInterface {
  name = 'AddAdminLifecycle1779800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isActive" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "isActive"`,
    );
  }
}
