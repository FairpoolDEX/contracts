import { CLIArgumentType } from "hardhat/src/types/index"
import { HardhatError } from "hardhat/src/internal/core/errors"
import { ERRORS } from "hardhat/src/internal/core/errors-list"

export const date: CLIArgumentType<Date> = {
  name: "date",
  parse: (argName, strValue) => new Date(strValue),
  validate: (argName: string, value: any): void => {
    const isValid = value && Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value);

    if (!isValid) {
      throw new HardhatError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
        value,
        name: argName,
        type: date.name,
      })
    }
  },
}
