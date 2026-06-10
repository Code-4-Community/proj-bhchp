# Infrastructure

This folder contains CloudFormation templates for infrastructure used by the app.

## RDS Postgres (private, cheapest practical config)

Template: `rds-postgres.yml`

### Prereqs

# Infrastructure

This folder contains CloudFormation templates for bringing up the full BHCHP stack.
The numbered filenames below match the recommended deployment order.

## File map (numbered)

- Templates: [infrastructure/01-s3-bucket.yml](01-s3-bucket.yml), [infrastructure/02-ecr.yml](02-ecr.yml), [infrastructure/03-cognito.yml](03-cognito.yml), [infrastructure/04-rds-postgres.yml](04-rds-postgres.yml), [infrastructure/05-ecs-fargate.yml](05-ecs-fargate.yml), [infrastructure/06-dns-acm.yml](06-dns-acm.yml), [infrastructure/07-amplify-app.yml](07-amplify-app.yml)
- Parameter templates: [infrastructure/params-skeletons/01-s3-bucket.json](params-skeletons/01-s3-bucket.json), [infrastructure/params-skeletons/03-cognito.json](params-skeletons/03-cognito.json), [infrastructure/params-skeletons/04-rds-postgres.json](params-skeletons/04-rds-postgres.json), [infrastructure/params-skeletons/05-ecs-fargate.json](params-skeletons/05-ecs-fargate.json), [infrastructure/params-skeletons/06-dns-acm.json](params-skeletons/06-dns-acm.json), [infrastructure/params-skeletons/07-amplify-app.json](params-skeletons/07-amplify-app.json)
- Filled parameters live in [infrastructure/params](params)

## Prereqs

- AWS CLI configured for the target account/region.
- A VPC with subnets (private for RDS, public for ECS if `AssignPublicIp=ENABLED`).
- A Route53 hosted zone and domain for the API (used by the ECS stack).
- A verified SES identity ARN for the backend email sender.
- A GitHub classic PAT for Amplify (repo or public_repo scope).

## Step-by-step bring-up (end-to-end)

### 0) Create your parameter files

Copy the skeletons into [infrastructure/params](params) and fill in values.

```bash
cp infrastructure/params-skeletons/01-s3-bucket.json infrastructure/params/01-s3-bucket.json
cp infrastructure/params-skeletons/03-cognito.json infrastructure/params/03-cognito.json
cp infrastructure/params-skeletons/04-rds-postgres.json infrastructure/params/04-rds-postgres.json
cp infrastructure/params-skeletons/05-ecs-fargate.json infrastructure/params/05-ecs-fargate.json
cp infrastructure/params-skeletons/06-dns-acm.json infrastructure/params/06-dns-acm.json
cp infrastructure/params-skeletons/07-amplify-app.json infrastructure/params/07-amplify-app.json
```

### 1) S3 bucket (01)

Create the bucket used by the backend (and referenced by the frontend).

```bash
aws cloudformation create-stack \
  --region us-east-2 \
  --stack-name bhchp-s3 \
  --template-body file://infrastructure/01-s3-bucket.yml \
  --parameters file://infrastructure/params/01-s3-bucket.json
```

Outputs to reuse:
- `BucketName` → set ECS `BhchpAwsBucketName`
- `BucketName` → set Amplify `ViteS3BucketAddr` to `${BucketName}.s3.us-east-2.amazonaws.com/`

#### 1.5) S3 Bucket setup
In the AWS console, create the following folders:
- cover-letters
- resumes
- syllabus
Use these EXACT names.

Then for the confidentiality form please upload the file with name "Confidentiality_Form.pdf" (EXACT)

### 2) ECR repository (02)

Use this if you want a managed ECR repo for the backend image.

```bash
aws cloudformation create-stack \
  --region us-east-2 \
  --stack-name bhchp-ecr \
  --template-body file://infrastructure/02-ecr.yml
```

Outputs to reuse:
- `RepositoryUri` → set ECS `ContainerImage` as `${RepositoryUri}:latest` (or your tag)

#### 2.5) ECR Image Push
Build the image by running

```bash
 docker build -t bhchp-backend -f apps/backend/Dockerfile .
```

Then follow the tagging and pushing instructions using the RepositoryUri
```bash
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin ${RepositoryUri}

docker tag bhchp-backend:latest ${RepositoryUri}/bhchp-backend:latest

docker push ${RepositoryUri}/bhchp-backend:latest
```

### 3) Cognito user pool + client (03)

```bash
aws cloudformation create-stack \
  --region us-east-2 \
  --stack-name bhchp-cognito \
  --template-body file://infrastructure/03-cognito.yml \
  --parameters file://infrastructure/params/03-cognito.json
```

Outputs to reuse:
- `CognitoUserPoolId` → set ECS `CognitoUserPoolId` and Amplify `ViteCognitoUserPoolId`
- `ViteCognitoAppClientId` → set ECS `CognitoAppClientId` and `ViteCognitoAppClientId`
- `CognitoRegion` → set ECS `CognitoRegion` and Amplify `ViteCognitoRegion`

#### 3.5) Cognito first admin
In the AWS Console, navigate to the Cognito console.

User pools -> bhchp-user-pool (or alternative name) -> Users

Press "Create Users" on the top right

Invitation message = Don't send an invitation
Email address = your email
CHECK Mark email address as verified

### 4) RDS Postgres (04)

Create the database. Leave `ECSSecurityGroupId` empty for now; you will update it after ECS is up.

```bash
aws cloudformation create-stack \
  --region us-east-2 \
  --stack-name bhchp-rds \
  --template-body file://infrastructure/04-rds-postgres.yml \
  --parameters file://infrastructure/params/04-rds-postgres.json
```

Outputs to reuse:
- `DbEndpoint` → set ECS `DbHost`
- `DbPort` → set ECS `DbPort`

#### 4.5) Migrate Schema to Postgres
Inside of the cloned BHCHP repository

TODO: WRITE


### 5) ECS Fargate backend (05)

```bash
aws cloudformation create-stack \
  --region us-east-2 \
  --stack-name bhchp-ecs \
  --template-body file://infrastructure/05-ecs-fargate.yml \
  --parameters file://infrastructure/params/05-ecs-fargate.json
```

Make sure the ECS params include:
- `DbHost` and `DbPort` from the RDS outputs
- `BhchpAwsBucketName` from the S3 output
- `CognitoUserPoolId`, `CognitoRegion`, and both `CognitoAppClientId` + `ViteCognitoAppClientId` from the Cognito output

Outputs to reuse:
- `ServiceSecurityGroupId` → update the RDS stack to allow ECS access
- `PublicApiDomain` → set Amplify `ViteApiBaseUrl` as `https://{PublicApiDomain}`

### 6) Update RDS to allow ECS access

Update your RDS params file with `ECSSecurityGroupId={ServiceSecurityGroupId}` and run:

```bash
aws cloudformation update-stack \
  --region us-east-2 \
  --stack-name bhchp-rds \
  --template-body file://infrastructure/04-rds-postgres.yml \
  --parameters file://infrastructure/params/04-rds-postgres.json
```

### 7) DNS + ACM helper (06, optional)

This stack is optional. The ECS template already provisions an ACM certificate and Route53 record.
Use this only if you want a standalone certificate/DNS record for another service.

```bash
aws cloudformation create-stack \
  --region us-east-2 \
  --stack-name bhchp-dns-acm \
  --template-body file://infrastructure/06-dns-acm.yml \
  --parameters file://infrastructure/params/06-dns-acm.json
```

### 8) Amplify frontend hosting (07)

```bash
aws cloudformation create-stack \
  --region us-east-2 \
  --stack-name bhchp-amplify \
  --template-body file://infrastructure/07-amplify-app.yml \
  --parameters file://infrastructure/params/07-amplify-app.json
```

Make sure the Amplify params include:
- `ViteApiBaseUrl` → `https://{PublicApiDomain}` from ECS
- `ViteCognitoUserPoolId`, `ViteCognitoAppClientId`, `ViteCognitoRegion` → from Cognito
- `ViteS3BucketAddr` → `${BucketName}.s3.us-east-2.amazonaws.com/` from S3

## Updating stacks

Replace `create-stack` with `update-stack` once the stack exists.
  --region us-east-2 \
