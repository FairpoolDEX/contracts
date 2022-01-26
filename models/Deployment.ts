import { z } from 'zod'
import { ensure } from '../util/ensure'
import { AddressSchema } from './Address'
import { NetworkName, NetworkNameSchema } from './NetworkName'
import { ContractNameSchema } from './ContractName'
import { toUid } from './Uid'

export const DeploymentSchema = z.object({
  contract: ContractNameSchema,
  network: NetworkNameSchema,
  address: AddressSchema,
  notes: z.string().optional(),
})

export type Deployment = z.infer<typeof DeploymentSchema>

export function validateDeployment(deployment: Deployment) {
  return DeploymentSchema.parse(deployment)
}

export function getDeploymentUid(deployment: Pick<Deployment, 'contract' | 'network'>): string {
  return toUid(deployment, 'contract', 'network')
}

export function getDeploymentByNetwork(deployments: Deployment[], network: NetworkName) {
  return ensure(deployments.find(d => d.network === network))
}
