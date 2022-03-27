import { Filename } from '../../util/filesystem'
import { readFile } from 'fs/promises'
import { parseAddressablesCSV } from './parseAddressablesCSV'

export async function getAddressablesFromCSVFile(filename: Filename) {
  const data = await readFile(filename)
  return parseAddressablesCSV(data)
}
