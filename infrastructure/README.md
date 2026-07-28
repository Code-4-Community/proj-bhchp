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

Run everything below in PowerShell.

### Preflight (run once)

Everything in this guide (except the one-off ECR push in Step 2.5) runs as a single AWS identity, using a profile named `bhchp-deploy`. Set that up first:

```powershell
cd C:\Users\School\Github\proj-bhchp\infrastructure
$Region = "us-east-1"

# One-time: enter the Access Key ID / Secret Access Key for the AWS identity
# you will use for every command in this guide.
aws configure --profile bhchp-deploy

# Make this the active identity for the rest of this terminal session.
$env:AWS_PROFILE = "bhchp-deploy"

aws --version
aws sts get-caller-identity
```

If `aws sts get-caller-identity` fails, stop and fix AWS login before continuing.

Important: `$env:AWS_PROFILE` only lasts for this terminal window. If you close and reopen the terminal, re-run `cd C:\Users\School\Github\proj-bhchp\infrastructure` and `$env:AWS_PROFILE = "bhchp-deploy"` before continuing with any step below.

### 0) Create your parameter files

Copy the skeletons into [infrastructure/params](params) and fill in values. Run these commands from the infrastructure directory.

```powershell
Copy-Item -Path "params-skeletons/01-s3-bucket.json" -Destination "params/01-s3-bucket.json"
Copy-Item -Path "params-skeletons/03-cognito.json" -Destination "params/03-cognito.json"
Copy-Item -Path "params-skeletons/04-rds-postgres.json" -Destination "params/04-rds-postgres.json"
Copy-Item -Path "params-skeletons/05-ecs-fargate.json" -Destination "params/05-ecs-fargate.json"
Copy-Item -Path "params-skeletons/06-dns-acm.json" -Destination "params/06-dns-acm.json"
Copy-Item -Path "params-skeletons/07-amplify-app.json" -Destination "params/07-amplify-app.json"
```

Open each file in [infrastructure/params](params) and fill values before creating stacks.

Security note for Zoom/screen-share sessions: two fields are secrets and should not be typed into a visible editor while your screen is shared:
- `DBPassword` in [infrastructure/params/04-rds-postgres.json](params/04-rds-postgres.json) — filled in with hidden input in Step 4 below.
- `OAuthToken` (GitHub PAT) in [infrastructure/params/07-amplify-app.json](params/07-amplify-app.json) — filled in with hidden input in Step 6 below.

Fill in every other value in these files now. Leave `DBPassword` and `OAuthToken` blank for now.

### 1) S3 bucket (01)

Before creating this stack, open [infrastructure/params/01-s3-bucket.json](params/01-s3-bucket.json):
- `Name` — optional. The default `bhchp-bucket` is fine to keep unless you need a different bucket name.

Create the bucket used by the backend (and referenced by the frontend).

```powershell
aws cloudformation create-stack --region us-east-1 --stack-name bhchp-s3 --template-body "file://./01-s3-bucket.yml" --parameters "file://./params/01-s3-bucket.json"

aws cloudformation wait stack-create-complete --region us-east-1 --stack-name bhchp-s3

$BucketName = aws cloudformation describe-stacks --region us-east-1 --stack-name bhchp-s3 --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text
Write-Host "BucketName=$BucketName"
```

Outputs to reuse:
- `BucketName` → set ECS `BhchpAwsBucketName`
- `BucketName` → set Amplify `ViteS3BucketAddr` to `${BucketName}.s3.us-east-1.amazonaws.com/`

#### 1.5) S3 Bucket setup
In the AWS Console:
- Open `S3`.
- Open the bucket named by `BucketName` from Step 1.
- Click `Create folder` three times and create:
- cover-letters
- resumes
- syllabus
Use these EXACT names.

Then upload a file named `Confidentiality_Form.pdf` (EXACT name) at bucket root.
TODO: Confirm final confidentiality form file and location with client.

### 2) ECR repository (02)

Use this if you want a managed ECR repo for the backend image.

```powershell
aws cloudformation create-stack --region us-east-1 --stack-name bhchp-ecr --template-body "file://./02-ecr.yml"

aws cloudformation wait stack-create-complete --region us-east-1 --stack-name bhchp-ecr

$RepositoryUri = aws cloudformation describe-stacks --region us-east-1 --stack-name bhchp-ecr --query "Stacks[0].Outputs[?OutputKey=='RepositoryUri'].OutputValue" --output text
Write-Host "RepositoryUri=$RepositoryUri"
```

Outputs to reuse:
- `RepositoryUri` → set ECS `ContainerImage` as `${RepositoryUri}:latest` (or your tag)

#### 2.5) ECR Image Push (granular owner split)

Simple rule for the rest of this guide: the Developer only builds and pushes the Docker image (below). Every other command, in every other step, is run by BHCHP IT on the machine that has the `bhchp-deploy` profile from Preflight.

**Who:** BHCHP IT does:

1. Create stack `bhchp-ecr` (Step 2) if not already created.
2. Share `RepositoryUri` with the Developer.
3. Apply the `02-ecr-push-user.yml` template to create a temporary IAM user with ECR push-only permissions:

```powershell
aws cloudformation create-stack --region us-east-1 --stack-name bhchp-ecr-push-user --template-body "file://./02-ecr-push-user.yml" --parameters ParameterKey=UserName,ParameterValue=bhchp-ecr-push-temp

aws cloudformation wait stack-create-complete --region us-east-1 --stack-name bhchp-ecr-push-user
```

4. Pipe the temporary credentials straight from the stack output into Parameter Store. This matters for a Zoom/screen-share session: the values are never printed to the terminal at any point, so nothing sensitive appears on screen.

```powershell
$AccessKeyId = aws cloudformation describe-stacks --region us-east-1 --stack-name bhchp-ecr-push-user --query "Stacks[0].Outputs[?OutputKey=='AccessKeyId'].OutputValue" --output text
$SecretAccessKey = aws cloudformation describe-stacks --region us-east-1 --stack-name bhchp-ecr-push-user --query "Stacks[0].Outputs[?OutputKey=='SecretAccessKey'].OutputValue" --output text

aws ssm put-parameter --region us-east-1 --name "/bhchp/ecr-push-temp/access-key-id" --type SecureString --overwrite --value $AccessKeyId
aws ssm put-parameter --region us-east-1 --name "/bhchp/ecr-push-temp/secret-access-key" --type SecureString --overwrite --value $SecretAccessKey

Remove-Variable AccessKeyId, SecretAccessKey
```

5. Tell the Developer the two parameter names above (`/bhchp/ecr-push-temp/access-key-id` and `/bhchp/ecr-push-temp/secret-access-key`). These names are not secret and are safe to send in chat/email; the values are encrypted in Parameter Store and only retrievable by an AWS identity with permission to read them (the `bhchp-deploy` identity from Preflight already has this). This IAM user only has ECR push permissions.
6. After the Developer confirms the image push is complete (below), delete the temporary user stack and the two parameters:

```powershell
aws cloudformation delete-stack --region us-east-1 --stack-name bhchp-ecr-push-user
aws ssm delete-parameter --region us-east-1 --name "/bhchp/ecr-push-temp/access-key-id"
aws ssm delete-parameter --region us-east-1 --name "/bhchp/ecr-push-temp/secret-access-key"
```

**Who:** Developer does:

1. Retrieve the credentials from Parameter Store using the `bhchp-deploy` profile (BHCHP IT will run this part with you, since it needs their profile), and write them into a temporary profile named `bhchp-ecr-push-temp`:

```powershell
$AccessKeyId = aws ssm get-parameter --region us-east-1 --name "/bhchp/ecr-push-temp/access-key-id" --with-decryption --query "Parameter.Value" --output text --profile bhchp-deploy
$SecretAccessKey = aws ssm get-parameter --region us-east-1 --name "/bhchp/ecr-push-temp/secret-access-key" --with-decryption --query "Parameter.Value" --output text --profile bhchp-deploy

aws configure set aws_access_key_id $AccessKeyId --profile bhchp-ecr-push-temp
aws configure set aws_secret_access_key $SecretAccessKey --profile bhchp-ecr-push-temp
aws configure set region us-east-1 --profile bhchp-ecr-push-temp
```

2. Confirm the profile is authenticated as the temporary user before pushing:

```powershell
aws sts get-caller-identity --profile bhchp-ecr-push-temp
```

3. Build and push the image from your machine using that profile.

```powershell
cd C:\Users\School\Github\proj-bhchp

$Region = "us-east-1"
$RepositoryUri = "<paste RepositoryUri from BHCHP IT>"
$RegistryUri = ($RepositoryUri -split "/")[0]

docker build -t bhchp-backend -f apps/backend/Dockerfile .

aws ecr get-login-password --region $Region --profile bhchp-ecr-push-temp | docker login --username AWS --password-stdin $RegistryUri

docker tag bhchp-backend:latest "$RepositoryUri:latest"
docker push "$RepositoryUri:latest"
```

4. Once the push succeeds, tell BHCHP IT so they can delete the temporary user stack and parameters (step 6 above).

**Who:** BHCHP IT does:

Switch back to the main deploy identity before continuing to Step 3 below:

```powershell
$env:AWS_PROFILE = "bhchp-deploy"
```

Edit [infrastructure/params/05-ecs-fargate.json](params/05-ecs-fargate.json) and replace the placeholder value for `ContainerImage` with:

```json
"ContainerImage": "$RepositoryUri:latest"
```

Use the actual value from the ECR push step above.

```powershell
cd C:\Users\School\Github\proj-bhchp\infrastructure
```

### 3) Cognito user pool + client (03)

**Who:** BHCHP IT

Before creating this stack, open [infrastructure/params/03-cognito.json](params/03-cognito.json):
- `CognitoRegion` — set to `us-east-1`. (The skeleton default, `us-east-2`, does not match the region used throughout this guide.)
- `UserPoolName`, `FrontendClientName`, `FrontendRefreshTokenValidityDays` — optional, defaults are fine to keep.

```powershell
aws cloudformation create-stack --region us-east-1 --stack-name bhchp-cognito --template-body "file://./03-cognito.yml" --parameters "file://./params/03-cognito.json"

aws cloudformation wait stack-create-complete --region us-east-1 --stack-name bhchp-cognito

$CognitoUserPoolId = aws cloudformation describe-stacks --region us-east-1 --stack-name bhchp-cognito --query "Stacks[0].Outputs[?OutputKey=='CognitoUserPoolId'].OutputValue" --output text
$ViteCognitoAppClientId = aws cloudformation describe-stacks --region us-east-1 --stack-name bhchp-cognito --query "Stacks[0].Outputs[?OutputKey=='ViteCognitoAppClientId'].OutputValue" --output text
$CognitoRegion = aws cloudformation describe-stacks --region us-east-1 --stack-name bhchp-cognito --query "Stacks[0].Outputs[?OutputKey=='CognitoRegion'].OutputValue" --output text

Write-Host "CognitoUserPoolId=$CognitoUserPoolId"
Write-Host "ViteCognitoAppClientId=$ViteCognitoAppClientId"
Write-Host "CognitoRegion=$CognitoRegion"
```

Outputs to reuse:
- `CognitoUserPoolId` → set ECS `CognitoUserPoolId` and Amplify `ViteCognitoUserPoolId`
- `ViteCognitoAppClientId` → set ECS `CognitoAppClientId` and `ViteCognitoAppClientId`
- `CognitoRegion` → set ECS `CognitoRegion` and Amplify `ViteCognitoRegion`

#### 3.5) Cognito first admin

**Who:** BHCHP IT

Use the same email address that you want the app to recognize as the first admin. For this setup, use `nie.sa@northeastern.edu` unless you explicitly change the seed email.

In the AWS Console:
- Open `Cognito`.
- Click `User pools`.
- Open the BHCHP pool.
- Click `Users`.
- Click `Create user`.
- Set `Invitation message` to `Don't send an invitation`.
- Set `Email address` to the admin email (`nie.sa@northeastern.edu` for this setup).
- Check `Mark email address as verified`.
- Click `Create user`.

This Cognito account must exist with the same email address before the app login flow can use it as the seeded admin account.

### 4) RDS Postgres (04)

**Who:** BHCHP IT does every step below, in order, in the same terminal session (the hidden-input password in step 7 is reused later, so don't close this terminal until Step 5 is done).

Create the database. Before you create the stack, do the following in [infrastructure/params/04-rds-postgres.json](params/04-rds-postgres.json):
1. Set `VpcId` to the VPC you want to deploy into. Find it in the AWS Console under `VPC` → `Your VPCs`.
2. Set `SubnetIds` to a comma-separated list of at least two **private** subnet IDs in that VPC. Find them in the AWS Console under `VPC` → `Subnets`.
3. Find your workstation's public IP address by running this in Bash:

```bash
curl -s https://checkip.amazonaws.com/ | grep -Eo '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+'
```

4. Set `AllowedCidr` to that IP address followed by `/32` (example: `203.0.113.10/32`) so your machine can reach the database for the migration step below.
5. Leave `ECSSecurityGroupId` blank for now.
6. Leave `PubliclyAccessible` as `false`.
7. Set the database password using hidden input, so it is never shown on screen (safe for Zoom), and write it straight into the params file:

```powershell
$SecureDbPassword = Read-Host -Prompt "Enter a new database password" -AsSecureString
$DbPasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureDbPassword))

$RdsParamsPath = "params/04-rds-postgres.json"
$RdsParams = Get-Content $RdsParamsPath | ConvertFrom-Json
($RdsParams | Where-Object { $_.ParameterKey -eq "DBPassword" }).ParameterValue = $DbPasswordPlain
$RdsParams | ConvertTo-Json -Depth 5 | Set-Content $RdsParamsPath

Remove-Variable SecureDbPassword
```

`$DbPasswordPlain` is kept in this terminal session on purpose — it is reused in Step 4.5 (`.env`) and Step 5 (ECS `DbPassword`).

Now create the stack:

```powershell
aws cloudformation create-stack --region us-east-1 --stack-name bhchp-rds --template-body "file://./04-rds-postgres.yml" --parameters "file://./params/04-rds-postgres.json"

aws cloudformation wait stack-create-complete --region us-east-1 --stack-name bhchp-rds

$DbEndpoint = aws cloudformation describe-stacks --region us-east-1 --stack-name bhchp-rds --query "Stacks[0].Outputs[?OutputKey=='DbEndpoint'].OutputValue" --output text
$DbPort = aws cloudformation describe-stacks --region us-east-1 --stack-name bhchp-rds --query "Stacks[0].Outputs[?OutputKey=='DbPort'].OutputValue" --output text

Write-Host "DbEndpoint=$DbEndpoint"
Write-Host "DbPort=$DbPort"
```

Outputs to reuse:
- `DbEndpoint` → set ECS `DbHost`
- `DbPort` → set ECS `DbPort`

#### 4.5) Migrate Schema to Postgres

**Who:** BHCHP IT, same terminal session as Step 4.

Run from repo root. This reuses `$DbEndpoint`, `$DbPort`, and `$DbPasswordPlain` from Step 4 above (same terminal session) to configure `.env` without ever displaying the password:

```powershell
cd C:\Users\School\Github\proj-bhchp
if (!(Test-Path ".env")) { Copy-Item "example.env" ".env" }

(Get-Content ".env") -replace "^NX_DB_HOST=.*", "NX_DB_HOST=$DbEndpoint" -replace "^NX_DB_PORT=.*", "NX_DB_PORT=$DbPort" -replace "^NX_DB_USERNAME=.*", "NX_DB_USERNAME=postgres" -replace "^NX_DB_PASSWORD=.*", "NX_DB_PASSWORD=$DbPasswordPlain" -replace "^NX_DB_DATABASE=.*", "NX_DB_DATABASE=bhchp" | Set-Content ".env"

yarn
yarn migration:run
```

Keep `$DbPasswordPlain` in this same terminal session — it's reused once more in Step 5.

Optional seed (creates the first admin account in the database):

```powershell
$env:FIRST_ADMIN_EMAIL = "nie.sa@northeastern.edu"
yarn seed
```

If you want to use a different admin email, replace the value above before running the command.

Return to infrastructure folder:

```powershell
cd C:\Users\School\Github\proj-bhchp\infrastructure
```


### 5) ECS Fargate backend (05)

**Who:** BHCHP IT

This uses the same `bhchp-deploy` identity from Preflight — no profile switch needed as long as you're in the same terminal session.

Before creating this stack, open [infrastructure/params/05-ecs-fargate.json](params/05-ecs-fargate.json) and fill in:
- `HealthCheckPath` → set to `/api/health` (matches the backend's health route).
- `VpcId` → the same VPC used for RDS in Step 4.
- `SubnetIds` → a comma-separated list of at least two **public** subnet IDs in that VPC (this stack uses `AssignPublicIp=ENABLED`, so these must be different from the private subnets used for RDS).
- `HostedZoneId` → your Route53 hosted zone ID for the API's domain. Find it in the AWS Console under `Route 53` → `Hosted zones`.
- `DomainName` → the full domain/subdomain for the API (example: `api.yourdomain.org`).
- `BhchpAwsSesSenderEmail` → the email address you verified in SES to send mail from.
- `BhchpAwsSesIdentityArn` → the ARN of that verified SES identity. Find it in the AWS Console under `SES` → `Verified identities`.
- `CognitoRegion` → set to `us-east-1` (the skeleton default, `us-east-2`, does not match the region used throughout this guide).
- Leave `AssignPublicIp`, `AllowedCidr`, `ClusterName`, `ServiceName`, `ContainerPort`, `Cpu`, `Memory`, `DbPort`, `DbName`, and `DbUsername` as their defaults.

Set the ECS database password using the same value you already entered in Step 4, reusing `$DbPasswordPlain` from this terminal session so it is never re-typed or shown on screen:

```powershell
$EcsParamsPath = "params/05-ecs-fargate.json"
$EcsParams = Get-Content $EcsParamsPath | ConvertFrom-Json
($EcsParams | Where-Object { $_.ParameterKey -eq "DbPassword" }).ParameterValue = $DbPasswordPlain
$EcsParams | ConvertTo-Json -Depth 5 | Set-Content $EcsParamsPath

Remove-Variable DbPasswordPlain
```

FYI: DNS is handled by the ECS stack and the public API domain it creates. You do not need to create a separate DNS record manually for the initial deployment. The ECS output will give you the public API domain to use later in the Amplify settings.

```powershell
# Required because this template creates IAM roles.
aws cloudformation create-stack --region us-east-1 --stack-name bhchp-ecs --template-body "file://./05-ecs-fargate.yml" --parameters "file://./params/05-ecs-fargate.json" --capabilities CAPABILITY_IAM

aws cloudformation wait stack-create-complete --region us-east-1 --stack-name bhchp-ecs

$ServiceSecurityGroupId = aws cloudformation describe-stacks --region us-east-1 --stack-name bhchp-ecs --query "Stacks[0].Outputs[?OutputKey=='ServiceSecurityGroupId'].OutputValue" --output text
$PublicApiDomain = aws cloudformation describe-stacks --region us-east-1 --stack-name bhchp-ecs --query "Stacks[0].Outputs[?OutputKey=='PublicApiDomain'].OutputValue" --output text

Write-Host "ServiceSecurityGroupId=$ServiceSecurityGroupId"
Write-Host "PublicApiDomain=$PublicApiDomain"
```

Make sure the ECS params include:
- `DbHost` and `DbPort` from the RDS outputs
- `BhchpAwsBucketName` from the S3 output
- `CognitoUserPoolId`, `CognitoRegion`, and both `CognitoAppClientId` + `ViteCognitoAppClientId` from the Cognito output

`PublicApiDomain` → set Amplify `ViteApiBaseUrl` as `https://{PublicApiDomain}` (used later in Step 6).

Now update RDS to allow the ECS service to reach it. This uses `$ServiceSecurityGroupId` captured above and edits the params file automatically — no manual file editing needed:

```powershell
$RdsParamsPath = "params/04-rds-postgres.json"
$RdsParams = Get-Content $RdsParamsPath | ConvertFrom-Json
($RdsParams | Where-Object { $_.ParameterKey -eq "ECSSecurityGroupId" }).ParameterValue = $ServiceSecurityGroupId
$RdsParams | ConvertTo-Json -Depth 5 | Set-Content $RdsParamsPath

aws cloudformation update-stack --region us-east-1 --stack-name bhchp-rds --template-body "file://./04-rds-postgres.yml" --parameters "file://./params/04-rds-postgres.json"

aws cloudformation wait stack-update-complete --region us-east-1 --stack-name bhchp-rds
```

### 6) Amplify frontend hosting (07)

**Who:** BHCHP IT

Before creating this stack, open [infrastructure/params/07-amplify-app.json](params/07-amplify-app.json) and fill in:
- `ViteAwsRegion` → set to `us-east-1` (the skeleton default, `us-east-2`, does not match the region used throughout this guide).
- `ViteCognitoRegion` → set to `us-east-1` for the same reason.
- Leave `AppName`, `RepositoryUrl`, and `BranchName` as their defaults unless you're deploying from a different repo/branch.

Set the GitHub PAT using hidden input, so it is never shown on screen (safe for Zoom), and write it straight into the params file:

```powershell
$SecureGitHubToken = Read-Host -Prompt "Enter the GitHub classic PAT" -AsSecureString
$GitHubTokenPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureGitHubToken))

$AmplifyParamsPath = "params/07-amplify-app.json"
$AmplifyParams = Get-Content $AmplifyParamsPath | ConvertFrom-Json
($AmplifyParams | Where-Object { $_.ParameterKey -eq "OAuthToken" }).ParameterValue = $GitHubTokenPlain
$AmplifyParams | ConvertTo-Json -Depth 5 | Set-Content $AmplifyParamsPath

Remove-Variable GitHubTokenPlain, SecureGitHubToken
```

```powershell
aws cloudformation create-stack --region us-east-1 --stack-name bhchp-amplify --template-body "file://./07-amplify-app.yml" --parameters "file://./params/07-amplify-app.json"

aws cloudformation wait stack-create-complete --region us-east-1 --stack-name bhchp-amplify

$AmplifyBranchUrl = aws cloudformation describe-stacks --region us-east-1 --stack-name bhchp-amplify --query "Stacks[0].Outputs[?OutputKey=='AmplifyBranchUrl'].OutputValue" --output text
Write-Host "AmplifyBranchUrl=$AmplifyBranchUrl"
```

Make sure the Amplify params include:
- `ViteApiBaseUrl` → `https://{PublicApiDomain}` from ECS
- `ViteCognitoUserPoolId`, `ViteCognitoAppClientId`, `ViteCognitoRegion` → from Cognito
- `ViteS3BucketAddr` → `${BucketName}.s3.us-east-1.amazonaws.com/` from S3

## Updating stacks

**Who:** BHCHP IT

Replace `create-stack` with `update-stack` once the stack exists.

## Optional: DNS + ACM helper (06)

**Who:** BHCHP IT

This stack is optional and not part of the numbered chronological sequence above. The ECS template (Step 5) already provisions an ACM certificate and Route53 record for the API, so most deployments never need this. Use it only if you want a standalone certificate/DNS record for another service, and run it whenever that need comes up.

If you do use it, open [infrastructure/params/06-dns-acm.json](params/06-dns-acm.json) and fill in:
- `HostedZoneId` → your Route53 hosted zone ID.
- `DomainName` → the domain/subdomain this record is for.
- `LoadBalancerDnsName` → the DNS name of the existing load balancer to point at.
- `LoadBalancerHostedZoneId` → that load balancer's hosted zone ID (found on the load balancer's page in the EC2 Console under `Load Balancers`).

```powershell
aws cloudformation create-stack --region us-east-1 --stack-name bhchp-dns-acm --template-body "file://./06-dns-acm.yml" --parameters "file://./params/06-dns-acm.json"

aws cloudformation wait stack-create-complete --region us-east-1 --stack-name bhchp-dns-acm
```
