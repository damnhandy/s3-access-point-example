import { StackProps, Stack } from "aws-cdk-lib";
import {
  Instance,
  InstanceClass,
  InstanceSize,
  InstanceType,
  MachineImage,
  Peer,
  Port,
  SecurityGroup,
  SubnetFilter
} from "aws-cdk-lib/aws-ec2";
import * as kms from "aws-cdk-lib/aws-kms";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Role, ServicePrincipal, ManagedPolicy } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { LookupUtils } from "./lookup-utils";

export interface Ec2TesterStackProps extends StackProps {
  readonly kmsKey: kms.IKey;
  readonly bucket: s3.IBucket;
}

export class Ec2TesterStack extends Stack {
  constructor(scope: Construct, id: string, props: Ec2TesterStackProps) {
    super(scope, id, props);

    const vpc = LookupUtils.vpcLookup(this, "VpcLookup");

    const role = new Role(this, "InstanceRoleWithSsmPolicy", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com")
    });
    role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"));
    role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("PowerUserAccess"));

    props.bucket.grantReadWrite(role);
    props.kmsKey.grantEncryptDecrypt(role);

    const sg = new SecurityGroup(this, "InstanceSecurityGroup", {
      vpc: vpc,
      allowAllOutbound: false,
      disableInlineRules: true
    });

    sg.addIngressRule(
      Peer.ipv4("100.64.0.0/19"),
      Port.tcp(22),
      "Allow all traffic within the security group"
    );
    sg.addEgressRule(
      Peer.ipv4("100.64.0.0/19"),
      Port.allTcp(),
      "Allow all traffic within the security group"
    );
    sg.addEgressRule(
      Peer.ipv4("10.105.112.0/21"),
      Port.allTcp(),
      "Allow all traffic within the security group"
    );
    sg.addIngressRule(
      Peer.ipv4("10.105.112.0/21"),
      Port.tcp(22),
      "Allow all traffic within the security group"
    );
    const instance = new Instance(this, "TestInstance", {
      vpc: vpc,
      vpcSubnets: vpc.selectSubnets({
        subnetFilters: [SubnetFilter.containsIpAddresses(["100.64.12.100", "100.64.16.100"])]
      }),
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
      machineImage: MachineImage.latestAmazonLinux2023(),
      role: role,
      securityGroup: sg,
      userDataCausesReplacement: true
    });
    instance.connections.allowTo(
      Peer.prefixList("pl-63a5400a"),
      Port.tcp(443),
      "Allow access to S3"
    );
  }
}
