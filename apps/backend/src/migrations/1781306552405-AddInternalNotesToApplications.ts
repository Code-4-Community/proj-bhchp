import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInternalNotesToApplications1781306552405
  implements MigrationInterface
{
  name = 'AddInternalNotesToApplications1781306552405';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "application" ADD "internalNotes" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "application" DROP COLUMN "internalNotes"`,
    );
  }
}
