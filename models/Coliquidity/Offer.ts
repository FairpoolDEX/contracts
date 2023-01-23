import { z } from 'zod'
import { getDuplicatesRefinement } from '../../utils/zod'
import { isEqualBy } from '../../utils/lodash'
import { AddressSchema } from '../Address'
import { AmountBNSchema } from '../AmountBN'

/**
 * NOTE: does not include takerTokens, because takerTokens are not returned by contract getters
 */
export const OfferSchema = z.object({
  maker: AddressSchema,
  makerToken: AddressSchema,
  makerAmount: AmountBNSchema,
  taker: AddressSchema,
  makerDenominator: AmountBNSchema,
  takerDenominator: AmountBNSchema,
  reinvest: z.boolean(),
  pausedUntil: AmountBNSchema,
  lockedUntil: AmountBNSchema,
}).describe('Offer')

export const OffersSchema = z.array(OfferSchema)
  .superRefine(getDuplicatesRefinement('Offer', parseOfferUid))

export const OfferUidSchema = OfferSchema.pick({})

export type Offer = z.infer<typeof OfferSchema>

export type OfferUid = z.infer<typeof OfferUidSchema>

export function parseOfferFromContract(offer: Offer) {
  return parseOffer({ ...offer })
}

export function parseOffer(offer: Offer): Offer {
  return OfferSchema.parse(offer)
}

export function parseOffers(offers: Offer[]): Offer[] {
  return OffersSchema.parse(offers)
}

export function parseOfferUid(offerUid: OfferUid): OfferUid {
  return OfferUidSchema.parse(offerUid)
}

export const isEqualOffer = (a: Offer) => (b: Offer) => isEqualBy(a, b, parseOfferUid)
