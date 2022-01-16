import neatcsv from 'neat-csv'
import { RawCSVData } from '../../util/csv'
import { isFinished, validateAllocation } from '../Allocation'
import { validateVestingType } from '../VestingType'
import { parseAmountBNCSV } from '../AmountBN/parseAmountBNCSV'

interface AllocationRow {
  Address: string
  Vesting: string
  Total: string
}

export async function parseAllocationsCSV(data: RawCSVData) {
  return (await neatcsv<AllocationRow>(data)).map(parseAllocationRow).filter(isFinished)
}

function parseAllocationRow(row: AllocationRow) {
  return validateAllocation({
    address: row.Address,
    vestingType: validateVestingType(row.Vesting),
    amount: parseAmountBNCSV(row.Total),
  })
}
