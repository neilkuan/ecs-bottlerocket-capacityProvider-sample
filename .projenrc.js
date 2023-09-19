const { awscdk } = require('projen');
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.96.2',
  defaultReleaseBranch: 'main',
  name: 'ecs-Bottlerocket-cp',
  authorName: 'Neil Kuan',
  authorEmail: 'guan840912@gmail.com',
  repository: 'https://github.com/neilkuan/ecs-bottlerocket-capacityProvider-sample.git',
  depsUpgradeOptions: {
    workflowOptions: {
      labels: ['auto-approve'],
    },
  },
  autoApproveOptions: {
    secret: 'GITHUB_TOKEN',
    allowedUsernames: ['neilkuan'],
  },
  deps: [
    'constructs',
  ],
  gitignore: ['cdk.context.json'],
  typescriptVersion: '4.6',
  devDeps: [
    '@types/prettier@2.6.0',
  ],
});
project.synth();