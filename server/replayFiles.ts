                                                                      
                           
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ReplayIO } from '../engine/src/replay/replayStore.ts'

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'replays')

export function fileReplayIO(): ReplayIO {
  return {
    write(name, text) {
      mkdirSync(DIR, { recursive: true })
      writeFileSync(join(DIR, name), text, 'utf-8')
    },
    read(name) {
                             
      if (!/^[A-Za-z0-9_-]+\.json$/.test(name)) return null
      const p = join(DIR, name)
      return existsSync(p) ? readFileSync(p, 'utf-8') : null
    },
    list() {
      if (!existsSync(DIR)) return []
      return readdirSync(DIR).filter((f) => f.endsWith('.json')).sort().reverse()
    },
  }
}
export const REPLAY_DIR = DIR
