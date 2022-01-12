import fs, { PathLike } from 'fs'
import path from 'path'

export type Filename = PathLike

export type Dirname = PathLike

export function getFiles(dir: Dirname) {
  return fs.readdirSync(dir).map((file) => fs.readFileSync(`${dir}/${file}`))
}

export function realname(filename: string) {
  return path.basename(filename).split('.').slice(0, -1).join('.')
}
