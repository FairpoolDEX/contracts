import { dateToTimestampSeconds } from "hardhat/internal/util/date"
import { TextDecoder } from "util"
import { base64 } from "ethers/lib/utils"

export const name = "Trader Loot"

export const symbol = "TRADER"

export const maxTokenId = 1200 // holder count

export const maxClaimTimestamp = dateToTimestampSeconds(new Date("2021-09-12"))

export const style = `
  .body { fill: #001731; }
  .text { font-family: serif; font-size: 14px; }
  .weapon { font-weight: bold; }
  .text.even { fill: #01FEFF; }
  .text.odd { fill: #01FEFF; }
`.replace(/\s{2,}/g, ' ')

export const weapons = [
  "Warhammer",
  "Quarterstaff",
  "Maul",
  "Mace",
  "Club",
  "Katana",
  "Falchion",
  "Scimitar",
  "Long Sword",
  "Short Sword",
  "Ghost Wand",
  "Grave Wand",
  "Bone Wand",
  "Wand",
  "Grimoire",
  "Chronicle",
  "Tome",
  "Book",
]

export const chestArmor = [
  "Divine Robe",
  "Silk Robe",
  "Linen Robe",
  "Robe",
  "Shirt",
  "Demon Husk",
  "Dragonskin Armor",
  "Studded Leather Armor",
  "Hard Leather Armor",
  "Leather Armor",
  "Holy Chestplate",
  "Ornate Chestplate",
  "Plate Mail",
  "Chain Mail",
  "Ring Mail",
]

export function decodeBase64(input: string) {
  return new TextDecoder().decode(base64.decode(input))
}
