import { Arbitrary, Random } from 'fast-check'

export type GetRandomValue = <T>(arbitrary: Arbitrary<T>) => T

export function get_getRandomValue<T>(random: Random): GetRandomValue {
  return function <T> (arbitrary: Arbitrary<T>) {
    const result = arbitrary.generate(random, undefined)
    return result.value
  }
}

export const get_getValue = (random: Random) => <T>(arbitrary: Arbitrary<T>) => {
  const result = arbitrary.generate(random, undefined)
  return result.value
}
