import { todo } from './todo'

export async function packageDirectory() {
  return todo(process.cwd(), 'Use pkg-dir')
}
