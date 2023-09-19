import { Template } from 'aws-cdk-lib/assertions';
import { App } from 'aws-cdk-lib/core';
import { CPDemo } from '../src/main';

test('Testing', () => {
  const app = new App();
  const stack = new CPDemo(app, 'test', { isdefaultvpc: false });

  Template.fromStack(stack).findResources('AWS::S3::Bucket');
  Template.fromStack(stack).findResources('AWS::ECS::ClusterCapacityProviderAssociations');
  Template.fromStack(stack).findResources('AWS::ECS::CapacityProvider');
});