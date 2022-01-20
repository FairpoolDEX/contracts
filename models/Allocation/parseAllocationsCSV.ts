import neatcsv from 'neat-csv'
import { RawCSVData } from '../../util/csv'
import { validateAllocation } from '../Allocation'
import { validateVestingType } from '../VestingType'
import { parseAmountCSV } from '../AmountBN/parseAmountCSV'

interface AllocationRow {
  Address: string
  Vesting: string
  Total: string
}

export async function parseAllocationsCSV(data: RawCSVData) {
  return (await neatcsv<AllocationRow>(data)).map(parseAllocationRow)
}

function parseAllocationRow(row: AllocationRow) {
  return validateAllocation({
    address: row.Address,
    type: validateVestingType(row.Vesting),
    amount: parseAmountCSV(row.Total),
  })
}
