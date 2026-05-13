import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowMultipleCandidateInfoPerEmail1777100000000
  implements MigrationInterface
{
  name = 'AllowMultipleCandidateInfoPerEmail1777100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "candidate_info" DROP CONSTRAINT "PK_49789311744921f9d181c9fc068"`,
    );
    await queryRunner.query(
      `ALTER TABLE "candidate_info" ADD CONSTRAINT "PK_candidate_info_appId" PRIMARY KEY ("appId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_candidate_info_email" ON "candidate_info" ("email")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_candidate_info_email"`);
    await queryRunner.query(
      `ALTER TABLE "candidate_info" DROP CONSTRAINT "PK_candidate_info_appId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "candidate_info" ADD CONSTRAINT "PK_49789311744921f9d181c9fc068" PRIMARY KEY ("email")`,
    );
  }
}
