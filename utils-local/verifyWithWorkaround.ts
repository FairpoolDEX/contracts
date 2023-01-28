import { RunTaskFunction } from 'hardhat/types/runtime'
import { TaskArguments } from 'hardhat/types'
import { silenceErrors } from './silenceErrors'

export async function verifyWithWorkaround(run: RunTaskFunction, taskArguments: TaskArguments) {
  return silenceErrors(
    () => run('verify', taskArguments),
    (e) => e.message.toLowerCase().includes('already verified'),
  )
}

export async function getConstructorArgs(run: RunTaskFunction, constructorArgsModule: string | undefined, constructorArgsParams: string[]) {
  return run('verify:get-constructor-arguments', {
    constructorArgsModule,
    constructorArgsParams,
  })
}
