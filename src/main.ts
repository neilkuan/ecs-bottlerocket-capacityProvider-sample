import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
// import * as kms from 'aws-cdk-lib/aws-kms';
// import * as logs from 'aws-cdk-lib/aws-logs';
// import * as s3 from 'aws-cdk-lib/aws-s3';

import { App, Stack, StackProps } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';

export interface CPDemoStackProps extends StackProps {
  isdefaultvpc?: boolean;
};

export class CPDemo extends Stack {
  readonly vpc: ec2.IVpc;
  constructor(scope: Construct, id: string, props?: CPDemoStackProps ) {
    super(scope, id, props);
    this.vpc = props?.isdefaultvpc ? ec2.Vpc.fromLookup(this, 'defVpc', { isDefault: true }) : new ec2.Vpc(this, 'newVpc', { natGateways: 1, maxAzs: 3 });
    const vpc = this.vpc;
    const ec2Role = new iam.Role(this, 'InstanceProfile', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });
    const autoScalingGroup = new autoscaling.AutoScalingGroup(this, 'ASG', {
      vpc,
      minCapacity: 0,
      maxCapacity: 100,
      desiredCapacity: 1,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      launchTemplate: new ec2.LaunchTemplate(this, 'LaunchTemplate', {
        instanceType: new ec2.InstanceType('t2.micro'),
        machineImage: new ecs.BottleRocketImage(),
        associatePublicIpAddress: true,
        userData: ec2.UserData.forLinux(),
        role: ec2Role,
        securityGroup: new ec2.SecurityGroup(this, 'SecurityGroup', {
          vpc,
          allowAllOutbound: true,
        }),
        httpPutResponseHopLimit: 2,
        httpTokens: ec2.LaunchTemplateHttpTokens.REQUIRED,
      }),
    });
    const ecsC = new ecs.Cluster(this, 'tryEcsEc2AutoScalingCluster', {
      clusterName: 'Ec2AutoScalingCluster',
      vpc,
      // executeCommandConfiguration: {
      //   kmsKey: new kms.Key(this, 'CPdemokey'),
      //   logConfiguration: {
      //     cloudWatchLogGroup: new logs.LogGroup(this, 'CPdemologGroup', { logGroupName: 'CPdemologGroup' }),
      //     s3Bucket: new s3.Bucket(this, 'CPdemobucket', { removalPolicy: RemovalPolicy.DESTROY, autoDeleteObjects: true }),
      //     s3KeyPrefix: 'ecs-exec-logs',
      //   },
      //   logging: ecs.ExecuteCommandLogging.OVERRIDE,
      // },
    });
    const capacityProvider = new ecs.AsgCapacityProvider(this, 'AsgCapacityProvider', { autoScalingGroup, machineImageType: ecs.MachineImageType.BOTTLEROCKET });

    // addAsgCapacityProvider option need to add { machineImageType: ecs.MachineImageType.BOTTLEROCKET }.
    // see https://github.com/aws/aws-cdk/blob/6b2d0e0c867651cd632be9ca99c6e342fb3c1067/packages/%40aws-cdk/aws-ecs/lib/cluster.ts#L348-L374
    ecsC.addAsgCapacityProvider(capacityProvider, { machineImageType: ecs.MachineImageType.BOTTLEROCKET });

    const taskDefinition = new ecs.Ec2TaskDefinition(this, 'testNginxTD');
    taskDefinition.addContainer('testNginxC', {
      // let task desiredCount 2 need 2 nodes.
      cpu: 250,
      memoryReservationMiB: 256,
      image: ecs.ContainerImage.fromRegistry('public.ecr.aws/ubuntu/nginx:latest'),
    });
    const svc = new ecs.Ec2Service(this, 'testNginx', {
      taskDefinition,
      cluster: ecsC,
      desiredCount: 1,
      // use capacity Provider Metrics to control your autoscaling group.
      capacityProviderStrategies: [
        {
          capacityProvider: capacityProvider.capacityProviderName,
          weight: 1,
        },
      ],
      enableExecuteCommand: true,
    });
    ec2Role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'));
    svc.node.addDependency(this.node.tryFindChild('tryEcsEc2AutoScalingCluster') as ecs.CfnClusterCapacityProviderAssociations);
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();
const isdefaultvpc = process.env.GITHUB_ACTIONS === 'true' ? false : true;
new CPDemo(app, 'my-stack-dev-bottlerocket', { env: devEnv, isdefaultvpc });

app.synth();