# Infrastructure

This folder contains CloudFormation templates for infrastructure used by the app.

## RDS Postgres (private, cheapest practical config)

Template: `rds-postgres.yml`

### Prereqs

- AWS CLI configured with access to your AWS account.
- A VPC with at least two private subnets in different AZs.
- (Optional) An ECS service security group ID to allow access from Fargate.

### Deploy (example)

```bash
aws cloudformation deploy \
  --region us-east-2 \
  --stack-name bhchp-rds \
  --template-file infrastructure/rds-postgres.yml \
  --parameter-overrides \
    VpcId=vpc-xxxx \
    SubnetIds=subnet-aaa,subnet-bbb \
    DBPassword=YOUR_STRONG_PASSWORD \
    ECSSecurityGroupId=sg-ecs \
    AllowedCidr="" \
    PubliclyAccessible=false
```

### Outputs

- `DbEndpoint` - the RDS hostname to use in `NX_DB_HOST`
- `DbPort` - usually `5432`
- `DbSecurityGroupId` - SG attached to the DB instance

### Notes

- `PubliclyAccessible` is set to `false` by default for a private DB.
- Keep `AllowedCidr` empty to avoid public ingress; use `ECSSecurityGroupId` for ECS access.
- For local testing, you can set `AllowedCidr` to your VPC CIDR or a VPN CIDR.
- Pass secrets at deploy time (do not commit them). For production, consider storing credentials in AWS Secrets Manager.

## ECS Fargate (cheapest practical config)

Template: `ecs-fargate.yml`

### Prereqs

- AWS CLI configured with access to your AWS account.
- An ECR repository or public image URI for the backend container.
- VPC and subnets (public subnets if `AssignPublicIp=ENABLED`).
- A verified SES identity ARN that is authorized to send the configured email address.

### Deploy (example)

```bash
aws cloudformation deploy \
  --region us-east-2 \
  --stack-name bhchp-ecs \
  --template-file infrastructure/ecs-fargate.yml \
  --parameter-overrides \
    VpcId=vpc-xxxx \
    SubnetIds=subnet-aaa,subnet-bbb \
    ContainerImage=123456789012.dkr.ecr.us-east-2.amazonaws.com/bhchp-backend:latest \
    DbHost=your-db.cluster-xxxx.us-east-2.rds.amazonaws.com \
    DbName=bhchp \
    DbUsername=postgres \
    DbPassword=YOUR_STRONG_PASSWORD \
    BhchpAwsBucketName=bhchp-bucket \
    BhchpAwsSesSenderEmail=sender@example.com \
    BhchpAwsSesIdentityArn=arn:aws:ses:us-east-2:123456789012:identity/sender@example.com \
    CognitoRegion=us-east-2 \
    CognitoUserPoolId=us-east-2_example \
    CognitoAppClientId=backend-client-id \
    CognitoClientSecret=backend-client-secret \
    ViteCognitoAppClientId=frontend-client-id \
    AllowedCidr=0.0.0.0/0 \
    AssignPublicIp=ENABLED
```

### Outputs

- `ServiceSecurityGroupId` - use this for the RDS stack `ECSSecurityGroupId`
- `LoadBalancerDnsName` - ALB DNS name (used by DNS/ACM stack)
- `LoadBalancerHostedZoneId` - ALB hosted zone ID (used by DNS/ACM stack)

### Notes

- This template uses the smallest Fargate size (`Cpu=256`, `Memory=512`).
- `AssignPublicIp=ENABLED` avoids NAT costs but exposes the service to the internet; lock down `AllowedCidr`.
- For private subnets, set `AssignPublicIp=DISABLED` and ensure NAT access for pulling images.
- The backend container now relies on the AWS SDK default credential chain. On ECS, attach least-privilege permissions to the task role instead of passing static access keys as environment variables.

## DNS + ACM (separate stack)

Template: `dns-acm.yml`

### Purpose (optional helper)

- Creates an ACM certificate for the domain.
- Optionally creates a Route53 alias record to the ALB (after the ALB exists).

If you already have a domain and ACM certificate (via clickops), skip this stack
and pass the existing cert ARN into the ECS stack. You can manage Route53 DNS
records manually or with your own tooling.

### Deploy (step 1: create cert)

```bash
aws cloudformation deploy \
  --region us-east-2 \
  --stack-name bhchp-dns-acm \
  --template-file infrastructure/dns-acm.yml \
  --parameter-overrides \
    HostedZoneId=Z123EXAMPLE \
    DomainName=api.example.com
```

### Deploy (step 2: attach ALB DNS once ECS exists)

```bash
aws cloudformation deploy \
  --region us-east-2 \
  --stack-name bhchp-dns-acm \
  --template-file infrastructure/dns-acm.yml \
  --parameter-overrides \
    HostedZoneId=Z123EXAMPLE \
    DomainName=api.example.com \
    LoadBalancerDnsName=your-alb-dns-name \
    LoadBalancerHostedZoneId=your-alb-zone-id
```

### Outputs

- `AcmCertificateArn` - pass this into the ECS stack as `AcmCertificateArn`

### Use DNS/ACM outputs with ECS stack

If you deploy `dns-acm.yml`, use its outputs to set the ECS HTTPS parameter.

Get the certificate ARN from the DNS/ACM stack:

```bash
aws cloudformation describe-stacks \
  --region us-east-2 \
  --stack-name bhchp-dns-acm \
  --query "Stacks[0].Outputs[?OutputKey=='AcmCertificateArn'].OutputValue" \
  --output text
```

Then update the ECS stack (or your parameter file) with that value:

```bash
aws cloudformation deploy \
  --region us-east-2 \
  --stack-name bhchp-ecs \
  --template-file infrastructure/ecs-fargate.yml \
  --parameter-overrides \
    AcmCertificateArn=arn:aws:acm:us-east-2:123456789012:certificate/your-cert-id
```

If you prefer to use `params.json`, set the value there and then run the
update command with `--parameters file://params.json`:

```json
{ "ParameterKey": "AcmCertificateArn", "ParameterValue": "arn:aws:acm:us-east-2:123456789012:certificate/your-cert-id" }
```

## Static Frontend (S3 + CloudFront)

Template: `s3-cloudfront-frontend.yml`

### Prereqs

- AWS CLI configured with access to your AWS account.
- An existing S3 bucket for the frontend assets.
- Frontend build output available at `dist/apps/frontend`.

### Deploy (example)

```bash
aws cloudformation deploy \
  --region us-east-2 \
  --stack-name bhchp-frontend-static \
  --template-file infrastructure/s3-cloudfront-frontend.yml \
  --parameter-overrides \
    BucketName=bhchp-bucket \
    PriceClass=PriceClass_100 \
    CreateBucketPolicy=true
```

### Upload build output

```bash
aws s3 sync dist/apps/frontend s3://bhchp-bucket
```

### Outputs

- `CloudFrontDomainName` - public URL for the frontend
- `CloudFrontDistributionId` - use to invalidate cache after uploads

### Notes

- This setup is ideal for static React/Vite builds and is usually cheaper than ECS + ALB.
- If you need to change `VITE_*` values, rebuild and re-upload the assets.
- If the bucket already has a policy, set `CreateBucketPolicy=false` and ensure it allows CloudFront read access.
