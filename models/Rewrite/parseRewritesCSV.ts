import neatcsv from 'neat-csv'
import { validateRewrite } from '../Rewrite'
import { RawCSVData } from '../../utils/csv'

interface RewriteCSV {
  From: string
  To: string
}

export async function parseRewritesCSV(data: RawCSVData) {
  return (await neatcsv<RewriteCSV>(data)).map(parseRewriteCSV)
}

const parseRewriteCSV = (row: RewriteCSV) => {
  return validateRewrite({
    from: row.From,
    to: row.To,
  })
}
