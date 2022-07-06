import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { waffleChai as solidity } from '@ethereum-waffle/chai'

chai.use(chaiAsPromised)
chai.use(solidity)

export const expect = chai.expect
