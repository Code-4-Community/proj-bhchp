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
    AllowedCidr=0.0.0.0/0 \
    AssignPublicIp=ENABLED
```

### Outputs

- `ServiceSecurityGroupId` - use this for the RDS stack `ECSSecurityGroupId`

### Notes

- This template uses the smallest Fargate size (`Cpu=256`, `Memory=512`).
- `AssignPublicIp=ENABLED` avoids NAT costs but exposes the service to the internet; lock down `AllowedCidr`.
- For private subnets, set `AssignPublicIp=DISABLED` and ensure NAT access for pulling images.

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
