import { Block, BlockSchema, getBlockUid } from '../models/Block'
import { getFinder, getInserter } from '../utils/zod'
import { minute } from '../utils-local/time'

export const allBlocks: Block[] = []

export const addBlock = getInserter('Block', BlockSchema, getBlockUid, allBlocks)

export const findBlock = getFinder(getBlockUid, allBlocks)

export function findClosestBlock(date: Date) {
  return allBlocks.find(b => Math.abs(b.timestamp.getTime() - date.getTime()) < minute)
}

export const airdropStage1 = addBlock({
  number: 12568112,
  timestamp: new Date('2021-06-04T12:59:38.000Z'),
})

export const airdropStage2 = addBlock({
  number: 12761166,
  timestamp: new Date('2021-07-04T12:59:38.000Z'),
})

export const airdropStage3 = addBlock({
  number: 12952451,
  timestamp: new Date('2021-08-03T12:59:56.000Z'),
})

addBlock({
  number: 13146399,
  timestamp: new Date('2021-09-02T12:59:41.000Z'),
})

addBlock({
  number: 13339985,
  timestamp: new Date('2021-10-02T12:59:52.000Z'),
})
