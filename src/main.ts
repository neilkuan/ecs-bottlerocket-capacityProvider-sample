import * as autoscaling from '@aws-cdk/aws-autoscaling';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as kms from '@aws-cdk/aws-kms';
import * as logs from '@aws-cdk/aws-logs';
import * as s3 from '@aws-cdk/aws-s3';

import { App, Construct, RemovalPolicy, Stack, StackProps } from '@aws-cdk/core';

export interface CPDemoStackProps extends StackProps {
  isdefaultvpc?: boolean;
};

export class CPDemo extends Stack {
  readonly vpc: ec2.IVpc;
  constructor(scope: Construct, id: string, props?: CPDemoStackProps ) {
    super(scope, id, props);
    this.vpc = props?.isdefaultvpc ? ec2.Vpc.fromLookup(this, 'defVpc', { isDefault: true }) : new ec2.Vpc(this, 'newVpc', { natGateways: 1, maxAzs: 3 });
    const vpc = this.vpc;
    const autoScalingGroup = new autoscaling.AutoScalingGroup(this, 'ASG', {
      vpc,
      // 1 vcpu , 1GB  to demo.
      instanceType: new ec2.InstanceType('t2.micro'),
      machineImage: new ecs.BottleRocketImage(),
      minCapacity: 0,
      maxCapacity: 100,
      desiredCapacity: 1,
      associatePublicIpAddress: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    const ecsC = new ecs.Cluster(this, 'tryEcsEc2AutoScalingCluster', {
      clusterName: 'Ec2AutoScalingCluster',
      vpc,
      executeCommandConfiguration: {
        kmsKey: new kms.Key(this, 'CPdemokey'),
        logConfiguration: {
          cloudWatchLogGroup: new logs.LogGroup(this, 'CPdemologGroup', { logGroupName: 'CPdemologGroup' }),
          s3Bucket: new s3.Bucket(this, 'CPdemobucket', { removalPolicy: RemovalPolicy.DESTROY, autoDeleteObjects: true }),
          s3KeyPrefix: 'ecs-exec-logs',
        },
        logging: ecs.ExecuteCommandLogging.OVERRIDE,
      },
    });
    const capacityProvider = new ecs.AsgCapacityProvider(this, 'AsgCapacityProvider', { autoScalingGroup, machineImageType: ecs.MachineImageType.BOTTLEROCKET });

    // addAsgCapacityProvider option need to add { machineImageType: ecs.MachineImageType.BOTTLEROCKET }.
    // see https://github.com/aws/aws-cdk/blob/6b2d0e0c867651cd632be9ca99c6e342fb3c1067/packages/%40aws-cdk/aws-ecs/lib/cluster.ts#L348-L374
    ecsC.addAsgCapacityProvider(capacityProvider, { machineImageType: ecs.MachineImageType.BOTTLEROCKET });

    const taskDefinition = new ecs.Ec2TaskDefinition(this, 'testNginxTD');
    taskDefinition.addContainer('testNginxC', {
      // let task desiredCount 2 need 2 nodes.
      cpu: 600,
      memoryReservationMiB: 512,
      memoryLimitMiB: 600,
      image: ecs.ContainerImage.fromRegistry('public.ecr.aws/ubuntu/nginx:latest'),
    });
    new ecs.Ec2Service(this, 'testNginx', {
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
    });

  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new CPDemo(app, 'my-stack-dev', { env: devEnv, isdefaultvpc: false });
// new MyStack(app, 'my-stack-prod', { env: prodEnv });

app.synth();