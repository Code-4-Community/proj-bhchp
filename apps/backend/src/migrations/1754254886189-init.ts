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

    await queryRunner.query(
      `INSERT INTO "admin" ("name", "email") VALUES
      ('Alice Smith', 'alice@example.com'),
      ('Yumi Chow', 'yumi@example.com'),
      ('Hannah Brown', 'hannah@example.com'),
      ('Owen Prince', 'owen@example.com'),
      ('Alissa Hunt', 'alissa@example.com');`,
    );

    await queryRunner.query(
      `INSERT INTO "discipline" ("name", "admin_ids") VALUES
      ('Nursing', ARRAY[0]),
      ('HarmReduction', ARRAY[1]),
      ('WomensHealth', ARRAY[2]);`,
    );

    await queryRunner.query(
      `INSERT INTO "application" 
      ("phone", "school", "daysAvailable", "weeklyHours", "experienceType", "interest", "license", "appStatus", "isInternational", "isLearner", "referredEmail", "referred") VALUES
      ('123-456-7890', 'Harvard Medical School', 'Mon, Wed, Fri', 10, 'MD', 'Nursing', 'RN12345', 'App submitted', false, true, 'referrer@example.com', false),
      ('143-412-7491', 'Johns Hopkins', 'Tue, Thu', 15, 'PhD', 'HarmReduction', NULL, 'in review', true, false, NULL, false),
      ('555-555-5555', 'Stanford Medicine', 'Mon-Fri', 40, 'NP', 'WomensHealth', 'NP54321', 'forms sent', false, true, 'mentor@example.com', true),
      ('222-333-4444', 'Mayo Clinic', 'Sat, Sun', 8, 'BS', 'Nursing', NULL, 'accepted', false, false, NULL, false),
      ('777-888-9999', 'Other', 'Flexible', 20, 'PA', 'HarmReduction', 'PA99999', 'rejected', true, false, 'network@example.com', true);`,
    );

    await queryRunner.query(
      `INSERT INTO "learner" ("app_id", "name", "startDate", "endDate") VALUES
      (1, 'Alice Smith', '2024-09-01', '2024-12-15'),
      (2, 'Yumi Chow', '2024-10-01', '2025-03-01'),
      (3, 'Hannah Brown', '2024-11-15', '2025-05-30'),
      (4, 'Owen Prince', '2025-01-10', '2025-06-15'),
      (5, 'Alissa Hunt', '2025-02-01', '2025-08-01');`,
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
