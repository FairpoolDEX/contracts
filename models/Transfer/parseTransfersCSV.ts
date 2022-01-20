import neatcsv from 'neat-csv'
import { validateTransfer } from '../Transfer'
import { toInteger } from 'lodash'
import { parseEtherscanAmountCSV } from '../AmountBN/parseEtherscanAmountCSV'
import { RawCSVData } from '../../util/csv'

interface EtherscanExportTransferRow {
  Txhash: string
  Blockno: string
  UnixTimestamp: string
  DateTime: string
  From: string
  To: string
  Quantity: string
  Method: string
}

export async function parseTransfersCSV(decimals: number, data: RawCSVData) {
  return (await neatcsv<EtherscanExportTransferRow>(data)).map(parseEtherscanExportTransferRow(decimals))
}

const parseEtherscanExportTransferRow = (decimals: number) => (row: EtherscanExportTransferRow) => {
  return validateTransfer({
    from: row.From,
    to: row.To,
    amount: parseEtherscanAmountCSV(decimals, row.Quantity),
    blockNumber: toInteger(row.Blockno),
    transactionHash: row.Txhash,
  })
}
