import neatcsv from 'neat-csv'
import { RawCSVData } from '../../../utils/csv'
import { parseSubmissions, Submission } from '../Submission'

/**
 * No need to convert anything
 */
type SubmissionCSV = Submission

export async function parseSubmissionsCSV(data: RawCSVData) {
  const submissionsCSV = (await neatcsv<SubmissionCSV>(data)).map(parseSubmissionCSV)
  return parseSubmissions(submissionsCSV)
}

const parseSubmissionCSV = (row: SubmissionCSV) => {
  return row
}
