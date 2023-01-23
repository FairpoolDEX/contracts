import { config as dotEnvConfig } from 'dotenv'
import { getMnemonic } from './getMnemonic'

dotEnvConfig()

export const mnemonic = getMnemonic()
