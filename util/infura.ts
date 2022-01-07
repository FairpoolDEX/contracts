import { RateLimiter } from 'limiter'
import { second } from '../test/support/all.helpers'

export const rateLimiter = new RateLimiter({
  tokensPerInterval: 5,
  interval: second,
})
