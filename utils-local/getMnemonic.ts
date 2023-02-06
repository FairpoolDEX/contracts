import Cryptr from 'cryptr'
import { getStringEnvVar } from '../libs/utils/process'

function getCryptr() {
  const secret = getStringEnvVar('MNEMONIC_SECRET', process.env.MNEMONIC_SECRET)
  return new Cryptr(secret)
}

export function getMnemonic() {
  const cryptr = getCryptr()
  if (process.env.MNEMONIC_RAW) {
    const mnemonicEncrypted = cryptr.encrypt(process.env.MNEMONIC_RAW)
    console.info(`MNEMONIC_ENC=${mnemonicEncrypted}`)
    process.exit(1)
  }
  const mnemonicEncrypted = getStringEnvVar('MNEMONIC_ENC', process.env.MNEMONIC_ENC)
  return cryptr.decrypt(mnemonicEncrypted)
}
