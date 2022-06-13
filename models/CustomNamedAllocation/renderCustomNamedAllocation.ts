import { CustomNamedAllocation } from '../CustomNamedAllocation'

export function renderCustomNamedAllocation(allocation: CustomNamedAllocation) {
  const { address, amount, vesting } = allocation
  return {
    address,
    amount: amount.toString(),
    vesting,
  }
}
