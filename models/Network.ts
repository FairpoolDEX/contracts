import { z } from 'zod'

export const NetworkNameSchema = z.enum(['mainnet', 'ropsten', 'bsctestnet', 'bscmainnet', 'avaxtestnet', 'avaxmainnet'])

export type NetworkName = z.infer<typeof NetworkNameSchema>
