# BHCHP Handoff: Steps 1-2 Reinsertion Summary

This file captures only the reusable values produced in Step 1 and Step 2 of infra setup, plus the required Step 1.5 S3 inserts.
Use this to reinsert missing values without changing values that are already present.

## Scope

- Step 1: S3 bucket (01)
- Step 1.5: S3 bucket object/folder setup
- Step 2: ECR repository (02)

## Outputs to Reuse

### Step 1 Output: `BucketName`

Reuse in:
- `infrastructure/params/05-ecs-fargate.json`
  - `BhchpAwsBucketName = {BucketName}`
- `infrastructure/params/07-amplify-app.json`
  - `ViteS3BucketAddr = {BucketName}.s3.us-east-1.amazonaws.com/`

### Step 2 Output: `RepositoryUri`

Reuse in:
- `infrastructure/params/05-ecs-fargate.json`
  - `ContainerImage = {RepositoryUri}:latest`

## Required Inserts from Step 1.5 (S3)

In the bucket from Step 1 (`BucketName`):
- Create folders (exact names):
  - `cover-letters`
  - `resumes`
  - `syllabus`
- Upload file at bucket root (exact name):
  - `Confidentiality_Form.pdf`

## Quick Reinsertion Checklist

- [ ] `BhchpAwsBucketName` is set in `05-ecs-fargate.json`
- [ ] `ViteS3BucketAddr` is set in `07-amplify-app.json`
- [ ] `ContainerImage` is set in `05-ecs-fargate.json`
- [ ] S3 folders exist: `cover-letters`, `resumes`, `syllabus`
- [ ] `Confidentiality_Form.pdf` exists at S3 bucket root

## Source References

- `infrastructure/README.md` (Step 1 and Step 2 "Outputs to reuse")
- `infrastructure/README copy.md` (Step 1 and Step 2 "Outputs to reuse")
