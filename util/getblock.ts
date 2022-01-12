import { RateLimiter } from 'limiter'
import { second } from './time'

export const maxBlocksPerQueryFilterRequest = 100

export const rateLimiter = new RateLimiter({
  tokensPerInterval: 30 - 1,
  interval: second,
})
