import { RateLimiter } from 'limiter'
import { second } from './time'

export const maxBlocksPerQueryFilterRequest = 10000

export const maxRequestsPerSecond = 30

export const rateLimiter = new RateLimiter({
  tokensPerInterval: maxRequestsPerSecond - 1,
  interval: second,
})
