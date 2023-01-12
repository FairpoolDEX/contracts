import { readFile } from 'fs/promises'
import { parseSubmissionsCSV } from './parseSubmissionsCSV'
import { Filename } from '../../../libs/utils/filesystem'

export async function getSubmissionsFromCSVFile(filename: Filename) {
  const data = await readFile(filename)
  return parseSubmissionsCSV(data)
}
