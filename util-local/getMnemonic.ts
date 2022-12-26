import Cryptr from 'cryptr'
import { ensureEnvVar } from '../libs/utils/process'

const cryptr = new Cryptr('z4m6bT4Y!poayKDXkey%9Pu8')

export function getMnemonic() {
  if (process.env.MNEMONIC_RAW) {
    const mnemonicEncrypted = cryptr.encrypt(process.env.MNEMONIC_RAW)
    console.info(`MNEMONIC_ENC=${mnemonicEncrypted}`)
    process.exit(1)
  }
  const mnemonicEncrypted = ensureEnvVar('MNEMONIC_ENC', process.env.MNEMONIC_ENC)
  return cryptr.decrypt(mnemonicEncrypted)
}
