import { getAddressablesFromCSVFile } from '../Addressable/getAddressablesFromCSVFile'
import { Filename } from '../../libs/utils/filesystem'

export async function getAddressesFromCSVFile(filename: Filename) {
  const addressables = await getAddressablesFromCSVFile(filename)
  return addressables.map(a => a.address)
}
