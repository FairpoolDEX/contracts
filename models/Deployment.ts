import { z } from 'zod'
import { ensure } from '../util/ensure'
import { AddressSchema } from './Address'
import { NetworkName, NetworkNameSchema } from './NetworkName'
import { NativeTokenTypeSchema } from './NativeTokenType'
import { toUid } from '../util/uid'

export const DeploymentSchema = z.object({
  token: NativeTokenTypeSchema,
  network: NetworkNameSchema,
  address: AddressSchema,
})

export type Deployment = z.infer<typeof DeploymentSchema>

export function validateDeployment(deployment: Deployment) {
  return DeploymentSchema.parse(deployment)
}

export function getDeploymentUid(deployment: Pick<Deployment, 'token' | 'network'>): string {
  return toUid(deployment, 'token', 'network')
}

export function getDeploymentByNetwork(deployments: Deployment[], network: NetworkName) {
  return ensure(deployments.find(d => d.network === network))
}
