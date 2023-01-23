import { Filename } from '../libs/utils/filesystem'

export async function importDefault(filename: Filename) {
  return (await import(getAbsoluteFilename(filename))).default
}

function isAbsolute(filename: string) {
  return filename.startsWith('~') || filename.startsWith('/')
}

export function getAbsoluteFilename($filename: Filename) {
  const filename = $filename.toString()
  if (isAbsolute(filename)) {
    return filename
  } else {
    return `${process.cwd()}/${filename}`
  }
}
