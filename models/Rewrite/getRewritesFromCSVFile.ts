import { readFile } from 'fs/promises'
import { parseRewritesCSV } from './parseRewritesCSV'
import { Filename } from '../../libs/utils/filesystem'

export async function getRewritesFromCSVFile(filename: Filename) {
  const data = await readFile(filename)
  return parseRewritesCSV(data)
}
