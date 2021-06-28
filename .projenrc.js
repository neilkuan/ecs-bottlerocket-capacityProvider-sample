const { AwsCdkTypeScriptApp, DependenciesUpgradeMechanism } = require('projen');
const project = new AwsCdkTypeScriptApp({
  cdkVersion: '1.110.0',
  defaultReleaseBranch: 'main',
  name: 'ecs-Bottlerocket-cp',
  authorName: 'Neil Kuan',
  authorEmail: 'guan840912@gmail.com',
  repository: 'https://github.com/neilkuan/ecs-bottlerocket-capacityProvider-sample.git',
  depsUpgrade: DependenciesUpgradeMechanism.githubWorkflow({
    workflowOptions: {
      labels: ['auto-approve'],
      secret: 'AUTOMATION_GITHUB_TOKEN',
    },
  }),
  autoApproveOptions: {
    secret: 'GITHUB_TOKEN',
    allowedUsernames: ['neilkuan'],
  },
  cdkDependencies: [
    '@aws-cdk/core',
    '@aws-cdk/aws-ec2',
    '@aws-cdk/aws-ecs',
    '@aws-cdk/aws-iam',
    '@aws-cdk/aws-s3',
    '@aws-cdk/aws-kms',
    '@aws-cdk/aws-logs',
    '@aws-cdk/aws-autoscaling',
  ],
  gitignore: ['cdk.context.json'],
});
project.synth();