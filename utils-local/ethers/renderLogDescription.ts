import { LogDescription } from '@ethersproject/abi'

export function renderLogDescription(desc: LogDescription) {
  return `${desc.name}(${desc.args.map(a => a.toString()).join(',')})`
}
