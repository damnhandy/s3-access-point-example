import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { access } from "fs";
import { LookupUtils } from "./lookup-utils";

export interface S3AccessPointExternalStackProps extends cdk.StackProps {
  readonly bucket: s3.IBucket;
}

export class S3AccessPointExternalStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: S3AccessPointExternalStackProps) {
    super(scope, id, props);

    /**
     * Define the name of the access point being creating it. We need
     * to reference this name in the access point policy.
     */
    const apName = "access-point-799104667460";

    /**
     * Construct the ARN of the access point.
     */
    const accessPointArn = cdk.Stack.of(this).formatArn({
      region: props.env?.region,
      account: props.env?.account,
      resource: "accesspoint",
      resourceName: apName,
      service: "s3"
    });

    /**
     * Allows the account 799104667460 to create identity-based policies against the
     * access point. This policy only permits GetObject and ListBucket actions.
     */
    const accessPointPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          actions: ["s3:GetObject*"],
          principals: [new iam.AccountPrincipal("799104667460")],
          resources: [accessPointArn.concat("/object/*")] // note the /object/ path
        }),
        new iam.PolicyStatement({
          actions: ["s3:ListBucket"],
          principals: [new iam.AccountPrincipal("799104667460")],
          resources: [accessPointArn]
        })
      ]
    });

    const accessPoint = new s3.CfnAccessPoint(this, "AccessPoint", {
      bucket: props.bucket.bucketName,
      bucketAccountId: props.env?.account,
      name: apName,
      policy: accessPointPolicy,
      publicAccessBlockConfiguration: {
        blockPublicAcls: true,
        blockPublicPolicy: true,
        restrictPublicBuckets: true,
        ignorePublicAcls: true
      },
      /**
       * Limit the access point to a specific VPC where the request will
       * originate from. This statement will be make the AP inaccessible
       * the vape that hosts the S3 bucket.
       */
      vpcConfiguration: {
        vpcId: "vpc-049f174f4f492fdc8"
      }
    });

    new cdk.CfnOutput(this, "AccessPointAliasArn", {
      description: "Access Point Alias ARN",
      value: cdk.Fn.getAtt(accessPoint.logicalId, "Alias").toString()
    });
  }
}
