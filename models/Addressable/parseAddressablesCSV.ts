import neatcsv from 'neat-csv'
import { RawCSVData } from '../../util/csv'
import { parseAddressable } from '../Addressable'

interface AddressableCSV {
  address: string
}

export async function parseAddressablesCSV(data: RawCSVData) {
  return (await neatcsv<AddressableCSV>(data)).map(parseAddressableCSV)
}

const parseAddressableCSV = (row: AddressableCSV) => {
  return parseAddressable(row)
}
