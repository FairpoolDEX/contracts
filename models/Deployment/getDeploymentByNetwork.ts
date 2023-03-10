import { NetworkName } from '../NetworkName'
import { ensure } from '../../util/ensure'
import { Deployment } from '../Deployment'

export function getDeploymentByNetwork(deployments: Deployment[], network: NetworkName) {
  return ensure(deployments.find(d => d.network === network))
}
