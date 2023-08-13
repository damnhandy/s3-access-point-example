import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { access } from "fs";
import { LookupUtils } from "./lookup-utils";

export interface S3AccessPointStackProps extends cdk.StackProps {
  readonly bucket: s3.IBucket;
}

export class S3AccessPointStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: S3AccessPointStackProps) {
    super(scope, id, props);

    const apName = "access-point-local";

    const vpc = LookupUtils.vpcLookup(this, "VpcLookup");

    const accessPointArn = cdk.Stack.of(this).formatArn({
      region: props.env?.region,
      account: props.env?.account,
      resource: "accesspoint",
      resourceName: apName,
      service: "s3"
    });

    const accessPointPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          actions: ["s3:GetObject*"],
          principals: [new iam.AccountRootPrincipal()],
          resources: [accessPointArn.concat("/object/*")]
        })
      ]
    });

    const accessPoint = new s3.CfnAccessPoint(this, "AccessPoint", {
      bucket: props.bucket.bucketName,
      name: apName,
      policy: accessPointPolicy,
      publicAccessBlockConfiguration: {
        blockPublicAcls: true,
        blockPublicPolicy: true,
        restrictPublicBuckets: true,
        ignorePublicAcls: true
      },
      vpcConfiguration: {
        vpcId: vpc.vpcId
      }
    });

    new cdk.CfnOutput(this, "AccessPointAliasArn", {
      description: "Access Point Alias ARN",
      value: cdk.Fn.getAtt(accessPoint.logicalId, "Alias").toString()
    });
  }
}
