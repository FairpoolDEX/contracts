import { z } from 'zod'
import { getDuplicatesRefinement } from '../util/zod'
import { ContractNameSchema } from './ContractName'
import { NetworkNameSchema } from './NetworkName'
import { AddressSchema } from './Address'

export const DeploymentSchema = z.object({
  contract: ContractNameSchema,
  network: NetworkNameSchema,
  address: AddressSchema,
  notes: z.string().optional(),
})

export const DeploymentsSchema = z.array(DeploymentSchema)
  .superRefine(getDuplicatesRefinement('Deployment', parseDeploymentUid))

export const DeploymentUidSchema = DeploymentSchema.pick({
  contract: true,
  network: true,
})

export type Deployment = z.infer<typeof DeploymentSchema>

export type DeploymentUid = z.infer<typeof DeploymentUidSchema>

export function parseDeployment(deployment: Deployment): Deployment {
  return DeploymentSchema.parse(deployment)
}

export function parseDeployments(deployments: Deployment[]): Deployment[] {
  return DeploymentsSchema.parse(deployments)
}

export function parseDeploymentUid(deploymentUid: DeploymentUid): DeploymentUid {
  return DeploymentUidSchema.parse(deploymentUid)
}
