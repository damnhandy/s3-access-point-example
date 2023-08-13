#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { S3BucketStack } from "../lib/s3-bucket-stack";
import { Ec2TesterStack } from "../lib/ec2-tester-stack";
import { S3AccessPointStack } from "../lib/s3-access-point";
import { S3AccessPointExternalStack } from "../lib/s3-access-point-external";

const app = new cdk.App();
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION
};

const bucketStack = new S3BucketStack(app, "S3BucketStack", { env });

new S3AccessPointStack(app, "S3AccessPointStack", {
  env,
  bucket: bucketStack.bucket
});

new S3AccessPointExternalStack(app, "S3AccessPointExternalStack", {
  env,
  bucket: bucketStack.bucket
});

new Ec2TesterStack(app, "Ec2TesterStack", {
  env,
  kmsKey: bucketStack.kmsKey,
  bucket: bucketStack.bucket
});
