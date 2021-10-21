import { strict as assert } from "assert"

export function demand<T>(value: T | undefined): T {
  assert(value)
  return value
}
