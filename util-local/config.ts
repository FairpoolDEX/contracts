import { config as dotEnvConfig } from 'dotenv'

dotEnvConfig()

export const mnemonic = process.env.MNEMONIC || ''
