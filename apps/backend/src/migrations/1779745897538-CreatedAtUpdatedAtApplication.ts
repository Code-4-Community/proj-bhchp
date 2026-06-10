import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatedAtUpdatedAtApplication1779745897538
  implements MigrationInterface
{
  name = 'CreatedAtUpdatedAtApplication1779745897538';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "application" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "application" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "application" DROP COLUMN "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "application" DROP COLUMN "createdAt"`,
    );
  }
}
