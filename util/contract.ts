export type ContractName = 'BullToken' | 'ShieldToken' | 'GenericToken' | 'Coliquidity' | 'MCP'

export function isContract(code: string) {
  return code !== '0x'
}
