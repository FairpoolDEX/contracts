#!/usr/bin/env ts-node

import { parallelMap, sequentialMap } from './libs/utils/promise'
import { readFileAsYaml } from './libs/utils/yaml/readFileAsYaml'
import { writeFileAsYaml } from './libs/utils/yaml/writeFileAsYaml'
import { clone } from 'remeda'
import { file } from 'tmp-promise'
import childProcess from 'child_process'
import { promisify } from 'util'
import { debug } from './libs/utils/debug'

const execFile = promisify(childProcess.execFile)

interface EchidnaConfig {
  mode: string
}

const modes = ['overflow', 'assertion']
const contracts = ['FairpoolTestEchidna', 'ERC20EnumerableTestEchidna', 'SharedOwnershipTest']

async function main() {
  const config: EchidnaConfig = await readFileAsYaml('.echidna.yml')
  return parallelMap(modes, fuzzMode(config))
}

const fuzzMode = (config: EchidnaConfig) => async (mode: string) => {
  const $config = clone(config)
  $config.mode = mode
  return sequentialMap(contracts, fuzzContract($config))
}

const fuzzContract = (config: EchidnaConfig) => async (contract: string) => {
  const { path, cleanup } = await file()
  await writeFileAsYaml(path, config)
  debug(__filename, fuzzContract, config.mode, contract, path)
  const result = await execFile('echidna-test', [
    '--config',
    path,
    '--contract',
    contract,
    `contracts/${contract}.sol`,
  ])
    .finally(cleanup)
  console.log('result', result)
  return result
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
