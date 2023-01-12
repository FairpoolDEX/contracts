import { readFile } from 'fs/promises'
import { parseAddressablesCSV } from './parseAddressablesCSV'
import { Filename } from '../../libs/utils/filesystem'

export async function getAddressablesFromCSVFile(filename: Filename) {
  const data = await readFile(filename)
  return parseAddressablesCSV(data)
}
