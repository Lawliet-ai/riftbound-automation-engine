                                                                       
                                                                     
                                     

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { RoomManager } from '../engine/src/net/room.ts'
import { InteractiveGame } from '../engine/src/session/interactiveGame.ts'
import { deckFacts, winTargetBonusFor, runeIdOf, kindOf } from '../engine/data/registry.ts'                                             
import { vegasReactionDemo, discardCounterDemo, seizeReflectDemo, servitorCopyDemo, militaristCombatDemo } from '../engine/data/demoScenes.ts'
import { blankMirrorGame } from '../engine/src/session/gameSession.ts'
import { setupGame } from '../engine/src/game/setup.ts'
import { resolveDeckPick, CUSTOM_PREFIX, type PickDeps } from '../engine/src/game/deckPick.ts'
import { isLegalHeroFor } from '../engine/data/heroTags.ts'
import { makeRng } from '../engine/src/util/rng.ts'
import { installProviders, makeGameDeps, DEMO_DEPS } from '../engine/data/gameDeps.ts'
import type { PlayerId } from '../engine/src/state/ids.ts'
import { ReplayStore } from '../engine/src/replay/replayStore.ts'             
import { fileReplayIO } from './replayFiles.ts'
import { specLookup, DEMO_DECK_A, DEMO_DECK_B, DEMO_DECK_C } from '../engine/data/decks.ts'

const DEPS = DEMO_DEPS                                  
const SCENES: Record<string, () => ReturnType<typeof vegasReactionDemo>> = {
  vegas: vegasReactionDemo, discard: discardCounterDemo, seize: seizeReflectDemo,
  servitor: servitorCopyDemo, militarist: militaristCombatDemo, blank: blankMirrorGame,
}
                                    
export const DECKS: Record<string, typeof DEMO_DECK_A> = { diana: DEMO_DECK_A, teemo: DEMO_DECK_B, lucian: DEMO_DECK_C }                 

   
                                                       
                                        
                                         
   
const PICK_DEPS: PickDeps = {
  known: DECKS,
  fallback: DEMO_DECK_A,
  facts: deckFacts,
  decode: { runeIdOf, kindOf }, // ★755 别家牌表导入(符文/传奇/战场按卡类别归位)
  heroOk: (legend, hero) => isLegalHeroFor(legend, hero),
}

   
                                                  
                                               
   
function rejectIfIllegal(pick: string | undefined): { error: string; violations?: unknown } | null {
  if (!pick || !pick.startsWith(CUSTOM_PREFIX)) return null
  const r = resolveDeckPick(pick, PICK_DEPS)
  if (r.ok) return null
  return { error: r.reason, ...(r.violations ? { violations: r.violations } : {}) }
}

let seedCounter = 1
                                                                
                                                                    
                                                  
installProviders()

   
                
                                                           
                                            
                                
   
function deckFor(pick: string | undefined, fallback: typeof DEMO_DECK_A): typeof DEMO_DECK_A {
  const r = resolveDeckPick(pick, { ...PICK_DEPS, fallback })
  if (!r.ok) throw new Error(`牌组未通过校验却进了房间:${r.reason}`)
  return r.deck
}

function makeDeckGame(pickA: string | undefined, pickB: string | undefined, forcedStarter?: PlayerId): InteractiveGame {
  const a = deckFor(pickA, DEMO_DECK_A)
  const b = deckFor(pickB, DEMO_DECK_B)
  const seed = (seedCounter++ * 2654435761 + Date.now()) >>> 0
                                                           
  const gameDeps = makeGameDeps(seed)                                          
                                                    
                                           
                                   
                                              
                                                
                                                 
                                  
                                         
                                                
                                
  const startRng = makeRng((seed ^ 0x5bf03635) >>> 0)
  const starter = forcedStarter ?? (startRng.int(2) === 0 ? ('P1' as PlayerId) : ('P2' as PlayerId))
  return new InteractiveGame(setupGame(a, b, specLookup, makeRng(seed), starter, { winTargetBonus: winTargetBonusFor }).state, gameDeps)
}

function makeGame(scene: string, deck?: string): () => InteractiveGame {
  if (scene === 'deck') return () => makeDeckGame(deck, undefined)
  const factory = SCENES[scene] ?? discardCounterDemo
  return () => new InteractiveGame(factory(), DEPS)
}

                    
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
let codeSeed = 1
function genCode(): string {
                                                     
  let n = (codeSeed++ * 2654435761 + Date.now()) >>> 0
  let s = ''
  for (let i = 0; i < 4; i++) { s += ALPHABET[n % ALPHABET.length]; n = Math.floor(n / ALPHABET.length) + 7 }
  return s
}

const rooms = new RoomManager(() => new InteractiveGame(discardCounterDemo(), DEPS), genCode)

                                                      
const replays = new ReplayStore(fileReplayIO())
                                        
const autoSaved = new Set<string>()

function saveReplay(code: string, note?: string): string | null {
  const rec = rooms.exportRecording(code, note)
  return rec ? replays.save(rec, { code, savedAt: new Date().toISOString(), ...(note !== undefined ? { note } : {}) }) : null
}
                                                                
function autoSaveIfOver(code: string): void {
  if (!rooms.isOver(code)) return
  const key = code + ':' + String(rooms.exportRecording(code)?.actions.length ?? 0)
  if (autoSaved.has(key)) return
  autoSaved.add(key)
  saveReplay(code, '对局结束自动存档')
}

function send(res: ServerResponse, code: number, body: unknown): void {
  const json = JSON.stringify(body)
  res.writeHead(code, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
  })
  res.end(json)
}

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (c) => (data += c))
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}) } catch { resolve({}) } })
  })
}

                                                                                 
                                                          
  
                                              
                                        
  
                  
                                                       
                                                    
                                                    
                                             
                                                                          
                                                                  
                                        
                                                
                                                                                

                                                 
const botConns = new Map<string, string>()

                                                
const BOT_RANK = ['PASS', 'END_TURN', 'MULLIGAN', 'CONCEDE']
function botPick(acts: readonly { kind: string }[]): { kind: string } | undefined {
  for (const k of BOT_RANK) { const a = acts.find((x) => String(x.kind) === k); if (a) return a }
  return acts[0]
}

   
                                                 
                                 
   
function pumpBot(code: string): void {
  const botConn = botConns.get(code)
  if (botConn === undefined) return
  const v = rooms.viewFor(botConn, code) as unknown as {
    error?: string
    seat?: string
    roll?: { dice?: Record<string, number>; designated?: string; chosen?: string; done?: boolean }
    pending?: { mode?: string; player?: string }
    mulliganSubmitted?: boolean
    legalActions?: readonly { kind: string }[]
  }
  if (v.error !== undefined || v.seat === undefined || v.seat === 'spectator') return
  const seat = v.seat

                                                   
  const roll = v.roll
  if (roll && roll.done !== true) {
    const build = (decks: Readonly<Record<string, string | undefined>>, starter: PlayerId): InteractiveGame | null =>
      decks['P1'] || decks['P2'] ? makeDeckGame(decks['P1'], decks['P2'], starter) : null
    if ((roll.dice ?? {})[seat] === undefined) {
      rooms.submitRoom(botConn, code, { kind: 'ROLL_DICE', player: seat as PlayerId }, build)
      return
    }
    if (roll.designated === seat && roll.chosen === undefined) {
                              
      rooms.submitRoom(botConn, code, { kind: 'CHOOSE_ORDER', player: seat as PlayerId, order: 'second' }, build)
      return
    }
    return                        
  }

                                                          
                                                                 
  if (v.pending?.mode === 'mulligan') {
    if (v.mulliganSubmitted !== true) {
      rooms.submit(botConn, code, { kind: 'MULLIGAN', player: seat, put: [] } as never)
    }
    return
  }

                           
  if (v.pending?.player !== seat) return
  const act = botPick(v.legalActions ?? [])
  if (act) rooms.submit(botConn, code, act as never)
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  if (req.method === 'OPTIONS') return send(res, 204, {})

  try {
    if (req.method === 'GET' && url.pathname === '/api/decks') {
                                                  
                                                                
                                                  
                                              
      return send(res, 200, Object.entries(DECKS).map(([id, d]) => ({
        id, name: d.name, cards: d.mainDeck.length, runes: d.runeDeck.length,
        legend: d.legend, battlefields: d.battlefields.length,
        domains: [...new Set(d.runeDeck.map((r) => r.replace('rune:', '')))],
        heroOptions: [...new Set(d.mainDeck.filter((no) => isLegalHeroFor(d.legend, no)))],
        defaultHero: d.hero,
      })))
    }
    if (req.method === 'POST' && url.pathname === '/api/create') {
      const b = await readBody(req)
      const scene = String(b.scene ?? 'discard')
      const deck = b.deck === undefined ? undefined : String(b.deck)
      const bad = rejectIfIllegal(deck)
      if (bad) return send(res, 400, bad)                         
      const r = rooms.createRoom(String(b.connId), makeGame(scene, deck), scene === 'deck' ? deck : undefined)
      return send(res, 200, r)
    }
    if (req.method === 'POST' && url.pathname === '/api/join') {
      const b = await readBody(req)
      const deck = b.deck === undefined ? undefined : String(b.deck)
      const badJoin = rejectIfIllegal(deck)
      if (badJoin) return send(res, 400, badJoin)
                                                
      const rebuild = (decks: Readonly<Record<string, string | undefined>>): InteractiveGame | null =>
        decks['P1'] || decks['P2'] ? makeDeckGame(decks['P1'], decks['P2']) : null
      return send(res, 200, rooms.joinRoom(String(b.connId), String(b.code).toUpperCase(), deck, rebuild))
    }
    if (req.method === 'POST' && url.pathname === '/api/roll') {
                                                    
      const b = await readBody(req)
      const build = (decks: Readonly<Record<string, string | undefined>>, starter: PlayerId): InteractiveGame | null =>
        decks['P1'] || decks['P2'] ? makeDeckGame(decks['P1'], decks['P2'], starter) : null
      const rr = rooms.submitRoom(String(b.connId), String(b.code).toUpperCase(), b.action as never, build)
      pumpBot(String(b.code).toUpperCase())                    
      return send(res, 200, rr)
    }
    if (req.method === 'POST' && url.pathname === '/api/bot') {
                                   
      const b = await readBody(req)
      const code = String(b.code).toUpperCase()
      if (botConns.has(code)) return send(res, 200, { ok: true, already: true })
      const botConn = `bot:${code}`
                                                                 
                                                 
      const deck = b.deck === undefined ? 'diana' : String(b.deck)
      const rebuild = (decks: Readonly<Record<string, string | undefined>>): InteractiveGame | null =>
        decks['P1'] || decks['P2'] ? makeDeckGame(decks['P1'], decks['P2']) : null
      const r = rooms.joinRoom(botConn, code, deck, rebuild) as { seat?: string; error?: string }
      if (r.error !== undefined || r.seat === undefined || r.seat === 'spectator') {
        return send(res, 400, { error: r.error ?? '傀儡没坐进去' })
      }
      botConns.set(code, botConn)
      rooms.markBot(code, r.seat as PlayerId)
      pumpBot(code)
      return send(res, 200, { ok: true, seat: r.seat })
    }
    if (req.method === 'POST' && url.pathname === '/api/undo') {
                                                            
      const b = await readBody(req)
      const ru = rooms.undo(String(b.connId), String(b.code).toUpperCase())
      return send(res, 200, ru)                                  
    }
                                                 
    if (req.method === 'GET' && url.pathname === '/api/replays') {
      return send(res, 200, { items: replays.list() })
    }
    if (req.method === 'GET' && url.pathname === '/api/replay') {
      const rec = replays.load(url.searchParams.get('name') ?? '')
      return rec ? send(res, 200, rec) : send(res, 404, { error: '这局录像读不出来' })
    }
    if (req.method === 'POST' && url.pathname === '/api/replay/save') {
      const b = await readBody(req)
      const code = String(b.code ?? '').toUpperCase()
      const name = saveReplay(code, b.note === undefined ? undefined : String(b.note))
      return name ? send(res, 200, { ok: true, name }) : send(res, 200, { ok: false, error: '这局还没有可存的录像' })
    }
    if (req.method === 'POST' && url.pathname === '/api/submit') {
      const b = await readBody(req)
      const code = String(b.code).toUpperCase()
      const rs = rooms.submit(String(b.connId), code, b.action as never)
      pumpBot(code)                    
      autoSaveIfOver(code)                     
      return send(res, 200, rs)
    }
    if (req.method === 'POST' && url.pathname === '/api/reclaim') {
      const b = await readBody(req)
      return send(res, 200, rooms.reclaim(String(b.connId), String(b.code).toUpperCase(), String(b.token)))
    }
    if (req.method === 'POST' && url.pathname === '/api/rematch') {
      const b = await readBody(req)
      return send(res, 200, rooms.rematch(String(b.connId), String(b.code).toUpperCase(),
        (decks) => makeDeckGame(decks['P1'], decks['P2'])))
    }
    if (req.method === 'GET' && url.pathname === '/api/view') {
      const connId = url.searchParams.get('connId') ?? ''
      const code = (url.searchParams.get('code') ?? '').toUpperCase()
      const sinceSeq = Number(url.searchParams.get('sinceSeq') ?? 0) || 0
      pumpBot(code)                                                              
      return send(res, 200, rooms.viewFor(connId, code, sinceSeq))
    }
    return send(res, 404, { error: 'not found' })
  } catch (e) {
    return send(res, 500, { error: String(e) })
  }
})

const PORT = Number(process.env.PORT ?? 5180)
server.listen(PORT, () => console.log(`[riftbound-server] 熟人房服务 → http://127.0.0.1:${PORT}`))
