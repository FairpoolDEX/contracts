import { demandIntegerEnvVar } from "./env"
import { gwei } from "../test/support/all.helpers"
import { strict as assert } from "assert"

export const maxFeePerGas = demandIntegerEnvVar("MAX_FEE", "gwei") * gwei

export const maxPriorityFeePerGas = demandIntegerEnvVar("MAX_PRIORITY_FEE", "gwei") * gwei

assert(maxFeePerGas >= maxPriorityFeePerGas)
