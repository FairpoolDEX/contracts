import { Filename } from '../../util/filesystem'
import { readFile } from 'fs/promises'
import { parseRewritesCSV } from './parseRewritesCSV'

export async function getRewritesFromCSVFile(filename: Filename) {
  const data = await readFile(filename)
  return parseRewritesCSV(data)
}
