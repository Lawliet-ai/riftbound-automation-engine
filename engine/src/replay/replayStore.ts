                                   
  
                                                     
                                     
                                            
  
                                               

import type { Recording } from './recordedGame'
import { isSerializable } from './recordedGame'

                                             
export interface ReplayIO {
  write(name: string, text: string): void
  read(name: string): string | null
  list(): readonly string[]
}

                                     
export interface ReplayMeta {
  readonly name: string
  readonly code?: string
  readonly savedAt?: string
  readonly actions: number
  readonly note?: string
}

                                                                  
export interface SaveMeta {
  readonly code?: string
  readonly savedAt?: string
  readonly note?: string
}

interface StoredFile {
  readonly meta: SaveMeta
  readonly recording: Recording
}

                               
function safe(part: string): string {
  return part.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) || 'x'
}

export class ReplayStore {
  constructor(private readonly io: ReplayIO) {}

     
                                               
                                                        
     
  save(rec: Recording, meta: SaveMeta = {}): string | null {
    if (rec.actions.length === 0) return null
    if (!isSerializable(rec)) return null
    const stamp = safe(meta.savedAt ?? 'nodate').replace(/[:.]/g, '')
    const name = `${safe(meta.code ?? 'room')}-${stamp}-${rec.actions.length}.json`
    const file: StoredFile = { meta, recording: rec }
    this.io.write(name, JSON.stringify(file))
    return name
  }

                                             
  list(): readonly ReplayMeta[] {
    const out: ReplayMeta[] = []
    for (const name of this.io.list()) {
      const raw = this.io.read(name)
      if (raw === null) continue
      try {
        const f = JSON.parse(raw) as StoredFile
        if (!f?.recording?.actions) continue
        out.push({
          name,
          actions: f.recording.actions.length,
          ...(f.meta?.code !== undefined ? { code: f.meta.code } : {}),
          ...(f.meta?.savedAt !== undefined ? { savedAt: f.meta.savedAt } : {}),
          ...(f.meta?.note !== undefined ? { note: f.meta.note } : {}),
        })
      } catch { /* 坏文件跳过 */ }
    }
    return out
  }

                                                   
  load(name: string): Recording | null {
    const raw = this.io.read(name)
    if (raw === null) return null
    try {
      const f = JSON.parse(raw) as StoredFile
      const rec = f?.recording
      if (!rec || !Array.isArray(rec.actions) || !rec.initial) return null
      return rec
    } catch {
      return null
    }
  }
}

                    
export function memoryReplayIO(): ReplayIO & { readonly files: Map<string, string> } {
  const files = new Map<string, string>()
  return {
    files,
    write: (n, t) => { files.set(n, t) },
    read: (n) => files.get(n) ?? null,
    list: () => [...files.keys()],
  }
}
