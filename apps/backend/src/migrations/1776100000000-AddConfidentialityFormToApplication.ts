import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConfidentialityFormToApplication1776100000000
  implements MigrationInterface
{
  name = 'AddConfidentialityFormToApplication1776100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "application" ADD "confidentialityForm" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "application" DROP COLUMN "confidentialityForm"`,
    );
  }
}
