import { RateLimiter } from 'limiter'
import { second } from './time'

export const rateLimiter = new RateLimiter({
  tokensPerInterval: 5,
  interval: second,
})
