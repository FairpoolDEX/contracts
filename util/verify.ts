import { RunTaskFunction } from 'hardhat/types/runtime'
import { TaskArguments } from 'hardhat/types'
import { silenceErrors } from './silenceErrors'

export async function verify(run: RunTaskFunction, taskArguments: TaskArguments) {
  return silenceErrors(
    () => run('verify', taskArguments),
    (e) => e.message === 'Contract source code already verified',
  )
}
