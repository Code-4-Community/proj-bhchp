import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowMultipleCandidateInfoPerEmail1777100000000
  implements MigrationInterface
{
  name = 'AllowMultipleCandidateInfoPerEmail1777100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "candidate_info" RENAME COLUMN "appId" TO "appIds"`,
    );
    await queryRunner.query(
      `ALTER TABLE "candidate_info" ALTER COLUMN "appIds" TYPE integer[] USING ARRAY["appIds"]`,
    );
    await queryRunner.query(
      `ALTER TABLE "candidate_info" ALTER COLUMN "appIds" SET DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "candidate_info" ALTER COLUMN "appIds" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "candidate_info" ALTER COLUMN "appIds" TYPE integer USING "appIds"[1]`,
    );
    await queryRunner.query(
      `ALTER TABLE "candidate_info" RENAME COLUMN "appIds" TO "appId"`,
    );
  }
}
