import { ensure } from './ensure'
import { Address } from '../models/Address'
import { NetworkName } from '../models/NetworkName'

export interface Deployment {
  network: NetworkName
  address: Address
}

export function getDeploymentByNetwork(deployments: Deployment[], network: NetworkName) {
  return ensure(deployments.find(d => d.network === network))
}
