import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export class S3BucketStack extends cdk.Stack {
  readonly kmsKey: kms.IKey;
  readonly bucket: s3.IBucket;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.kmsKey = new kms.Key(this, "AccessPointKey", {
      enableKeyRotation: true,
      alias: "alias/AccessPointKey"
    });

    /**
     * Both statements are required to permit cross-account access to the key
     */
    this.kmsKey.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.AccountPrincipal("799104667460")],
        actions: [
          "kms:Decrypt",
          "kms:DescribeKey",
          "kms:Encrypt",
          "kms:GenerateDataKey*",
          "kms:ReEncrypt*"
        ],
        resources: ["*"]
      })
    );
    this.kmsKey.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.AccountPrincipal("799104667460")],
        actions: ["kms:CreateGrant", "kms:ListGrants", "kms:RevokeGrant"],
        resources: ["*"],
        conditions: {
          Bool: {
            "kms:GrantIsForAWSResource": "true"
          }
        }
      })
    );

    this.bucket = new s3.Bucket(this, "SourceBucket", {
      bucketName: `${props?.env?.account}-source-bucket-${props?.env?.region}`,
      encryptionKey: this.kmsKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    this.bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:*"],
        principals: [new iam.AnyPrincipal()],
        resources: [this.bucket.bucketArn, this.bucket.arnForObjects("*")],
        conditions: {
          StringEquals: {
            "s3:DataAccessPointAccount": cdk.Aws.ACCOUNT_ID
          }
        }
      })
    );
  }
}
