# Demo use Bottlerocket Capacity Provider to Scaling AutoScaling Group for ECS tasks scaling out.


### key point, need to define `machineImageType` in  `AddAutoScalingGroupCapacityOptions`.   
```ts
const capacityProvider = new ecs.AsgCapacityProvider(this, 'AsgCapacityProvider', { autoScalingGroup, machineImageType: ecs.MachineImageType.BOTTLEROCKET });

    // addAsgCapacityProvider option need to add { machineImageType: ecs.MachineImageType.BOTTLEROCKET }.
    // see https://github.com/aws/aws-cdk/blob/6b2d0e0c867651cd632be9ca99c6e342fb3c1067/packages/%40aws-cdk/aws-ecs/lib/cluster.ts#L348-L374
    ecsC.addAsgCapacityProvider(capacityProvider, { machineImageType: ecs.MachineImageType.BOTTLEROCKET });
```