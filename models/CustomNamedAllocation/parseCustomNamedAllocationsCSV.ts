import neatcsv from 'neat-csv'
import { RawCSVData } from '../../utils/csv'
import { parseAmountCSV } from '../AmountBN/parseAmountCSV'
import { parseCustomNamedAllocation } from '../CustomNamedAllocation'

interface CustomNamedAllocationRow {
  Address: string
  Amount: string
  Vesting: string
}

export async function parseCustomNamedAllocationsCSV(data: RawCSVData) {
  return (await neatcsv<CustomNamedAllocationRow>(data)).map(parseCustomNamedAllocationRow)
}

function parseCustomNamedAllocationRow(row: CustomNamedAllocationRow) {
  return parseCustomNamedAllocation({
    address: row.Address,
    amount: parseAmountCSV(row.Amount),
    vesting: row.Vesting,
  })
}
