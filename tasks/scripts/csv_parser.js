const csv = require("csv-parser")
const fs = require("fs")

/* eslint-env node */
/* globals Set */

const VESTING_TYPES = {
  "Seed": "0",
  "Private": "1",
  "Advisory": "2",
  "Team": "3",
  "Development": "4",
  "Marketing": "5",
  "General Reserve": "7",
  "Liquidity provisioning": "",
  "Liquidity mining": "",
  "Rewards": "",
  "Public": "",
}

function process_csv(rows) {
  const vestings = [...new Set(rows.map(i => i.vesting))].sort()
  const data = {}
  vestings.map(vesting => {
    data[vesting] = rows
      .filter(i => i.vesting === vesting)
      .sort((i, j) => i.address - j.address)
      .reduce((obj, i) => ({ ...obj, [i.address]: i.tokens }), {})
  })
  console.log(JSON.stringify(data, null, 2))
}

function parse_csv(file) {
  const rows = []
  fs.createReadStream(file)
    .pipe(csv({
      separator: ",",
      mapValues: ({ header, index, value }) => {
        value = value.trim()
        if (header === "Vesting") {
          if (!(value in VESTING_TYPES)) {
            throw new Error(`Invalid vesting type: ${value} (row ${index})`)
          }
          return VESTING_TYPES[value]
        }
        return value
      },
    }))
    .on("data", (data) => rows.push({
      address: data.Address.trim(),
      vesting: data.Vesting,
      tokens: data.Total,
    }))
    .on("end", () => process_csv(rows))
}

const file = process.argv[2]
parse_csv(file)
