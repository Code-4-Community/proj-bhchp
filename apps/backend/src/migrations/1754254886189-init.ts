import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1754254886189 implements MigrationInterface {
  name = 'Init1754254886189';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const disciplineEnum =
      `('MD/Medical Student/Pre-Med', 'Medical NP/PA', ` +
      `'Psychiatry or Psychiatric NP/PA', 'Public Health', 'RN', 'Social Work', 'Other')`;

    // Legacy discipline enum values used by application, admins, and discipline
    await queryRunner.query(
      `CREATE TYPE "public"."application_discipline_enum" AS ENUM${disciplineEnum}`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."admins_discipline_enum" AS ENUM${disciplineEnum}`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."discipline_name_enum" AS ENUM${disciplineEnum}`,
    );

    // AppStatus
    await queryRunner.query(
      `CREATE TYPE "public"."application_appstatus_enum" AS ENUM(` +
        `'App submitted', 'In review', 'Forms sent', 'Accepted', ` +
        `'No Availability', 'Declined', 'Active', 'Inactive')`,
    );

    // ExperienceType
    await queryRunner.query(
      `CREATE TYPE "public"."application_experiencetype_enum" AS ENUM(` +
        `'BS', 'MS', 'PhD', 'MD', 'MD PhD', 'RN', 'NP', 'PA', 'Other')`,
    );

    // InterestArea
    await queryRunner.query(
      `CREATE TYPE "public"."application_interest_enum" AS ENUM(` +
        `'Women''s Health', 'Medical Respite/Inpatient', 'Street Medicine', ` +
        `'Addiction Medicine', 'Primary Care', 'Behavioral Health', ` +
        `'Veterans Services', 'Family and Youth Services', ` +
        `'Hep C Care', 'HIV Services', 'Case Management', 'Dental')`,
    );

    // ApplicantType
    await queryRunner.query(
      `CREATE TYPE "public"."application_applicanttype_enum" AS ENUM(` +
        `'Learner', 'Volunteer')`,
    );

    // School
    await queryRunner.query(
      `CREATE TYPE "public"."learner_info_school_enum" AS ENUM(` +
        `'Harvard Medical School', 'Johns Hopkins', 'Stanford Medicine', ` +
        `'Mayo Clinic', 'Other')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."learner_info_school_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."application_applicanttype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."application_interest_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."application_experiencetype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."application_appstatus_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."discipline_name_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."admins_discipline_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."application_discipline_enum"`,
    );
  }
}
