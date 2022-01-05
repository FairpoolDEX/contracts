import fs, { PathLike } from 'fs'

export type Filename = PathLike

export type Dirname = PathLike

export function getFiles(dir: Dirname) {
  return fs.readdirSync(dir).map((file) => fs.readFileSync(`${dir}/${file}`))
}
