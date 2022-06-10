import { Filename } from '../../../util/filesystem'
import { readFile } from 'fs/promises'
import { parseSubmissionsCSV } from './parseSubmissionsCSV'

export async function getSubmissionsFromCSVFile(filename: Filename) {
  const data = await readFile(filename)
  return parseSubmissionsCSV(data)
}
