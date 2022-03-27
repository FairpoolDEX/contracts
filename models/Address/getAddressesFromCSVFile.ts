import { Filename } from '../../util/filesystem'
import { getAddressablesFromCSVFile } from '../Addressable/getAddressablesFromCSVFile'

export async function getAddressesFromCSVFile(filename: Filename) {
  const addressables = await getAddressablesFromCSVFile(filename)
  return addressables.map(a => a.address)
}
