import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1754254886189 implements MigrationInterface {
  name = 'Init1754254886189';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."commit_length_enum" AS ENUM('Semester', 'Month', 'Year')`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."site_enum" AS ENUM('Downtown Campus', 'North Campus', 'West Campus', 'East Campus')`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."app_status_enum" AS ENUM('App submitted', 'in review', 'forms sent', 'accepted', 'rejected')`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."school_enum" AS ENUM('Harvard Medical School', 'Johns Hopkins', 'Stanford Medicine', 'Mayo Clinic', 'Other')`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."experience_type_enum" AS ENUM('BS', 'MS', 'PhD', 'MD', 'MD PhD', 'RN', 'NP', 'PA', 'Other')`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."interest_area_enum" AS ENUM('Nursing', 'HarmReduction', 'WomensHealth')`,
    );

    await queryRunner.query(
      `CREATE TABLE "admin" (
                "id" SERIAL NOT NULL, 
                "name" character varying NOT NULL, 
                "email" character varying NOT NULL UNIQUE, 
                CONSTRAINT "PK_admin_id" PRIMARY KEY ("id")
            )`,
    );

    await queryRunner.query(
      `CREATE TABLE "discipline" (
                "id" SERIAL NOT NULL, 
                "name" character varying NOT NULL, 
                "admin_ids" integer[] NOT NULL DEFAULT '{}', 
                CONSTRAINT "PK_discipline_id" PRIMARY KEY ("id")
            )`,
    );

    await queryRunner.query(
      `CREATE TABLE "application" (
                "appId" SERIAL NOT NULL, 
                "phone" character varying NOT NULL, 
                "school" "public"."school_enum" NOT NULL, 
                "daysAvailable" character varying NOT NULL, 
                "weeklyHours" integer NOT NULL, 
                "experienceType" "public"."experience_type_enum" NOT NULL, 
                "interest" "public"."interest_area_enum" NOT NULL, 
                "license" character varying, 
                "appStatus" "public"."app_status_enum" NOT NULL DEFAULT 'App submitted', 
                "isInternational" boolean NOT NULL DEFAULT false, 
                "isLearner" boolean NOT NULL DEFAULT false, 
                "referredEmail" character varying, 
                "referred" boolean NOT NULL DEFAULT false, 
                CONSTRAINT "PK_application_appId" PRIMARY KEY ("appId")
            )`,
    );

    await queryRunner.query(
      `CREATE TABLE "learner" (
                "id" SERIAL NOT NULL, 
                "app_id" integer NOT NULL, 
                "name" character varying NOT NULL, 
                "startDate" DATE NOT NULL, 
                "endDate" DATE NOT NULL, 
                CONSTRAINT "PK_learner_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_learner_app_id" FOREIGN KEY ("app_id") REFERENCES "application"("appId") ON DELETE CASCADE
            )`,
    );
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "learner"`);
    await queryRunner.query(`DROP TABLE "application"`);
    await queryRunner.query(`DROP TABLE "discipline"`);
    await queryRunner.query(`DROP TABLE "admin"`);
    await queryRunner.query(`DROP TYPE "public"."interest_area_enum"`);
    await queryRunner.query(`DROP TYPE "public"."experience_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."school_enum"`);
    await queryRunner.query(`DROP TYPE "public"."app_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."site_enum"`);
    await queryRunner.query(`DROP TYPE "public"."commit_length_enum"`);
  }
}
