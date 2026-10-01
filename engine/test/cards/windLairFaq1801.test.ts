                                                                    
                                                           
                                                               
                            
  
                                                                                
                                                 
                                                                   
import { describe, expect, test } from 'vitest'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { CARD_CATEGORIES } from '../../data/cardCategories'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { moveUnitEvents } from '../../data/cards/enemy-move'
import { OGN_173_SPEC, OGN_173_DEST_KEY } from '../../data/cards/OGN-173'

installProviders()

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const STEP_CAP = 120
type Any = Record<string, any>

const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
const inHand = (oid: string, defId: string, who: PlayerId): GameObject =>
  obj(oid, defId, who, `hand:${who}`, { baseTypes: [CARD_CATEGORIES[defId] === 'spell' ? 'spell' : 'unit'] as never })

                                                         
function scene(): GameState {
  const s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (!z) throw new Error(`造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  put(obj('ally', 'BLK', P1, BF0, { status: { dormant: true } as never }))
  put(inHand('wind', 'OGN-173', P1))
  return recomputeContinuous({
    ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones,
    battlefieldCards: { [BF0]: { defId: 'OGN-295', owner: P1 } },
    runePools: {
      P1: { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } },
      P2: { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } },
    },
  } as GameState)
}
const curState = (g: InteractiveGame): GameState => {
  const gg = g as unknown as { choice?: { state: GameState } | null; window?: { state: GameState } | null; state: GameState }
  return gg.choice?.state ?? gg.window?.state ?? gg.state
}
const findCardPlay = (g: InteractiveGame, player: PlayerId, cardOid: string, target: string): InteractiveAction | null =>
  (g.legalActions(player) as readonly Any[]).find((a) => a.kind === 'PLAY_CARD'
    && String(a.cardOid) === cardOid && String(a.target) === target) as InteractiveAction | null

interface RunOut { asks: { key: string; candidates: string[]; answer: string }[]; error: string | null }
                                                       
function playWind(pick: (cands: readonly string[]) => string): { g: InteractiveGame; out: RunOut } {
  const g = new InteractiveGame(scene(), makeGameDeps(0x1801f) as never)
  const initial = findCardPlay(g, P1, 'wind', 'ally')
  if (!initial) throw new Error('前提:OGN-173 打得出来(target=ally)')
  const asks: RunOut['asks'] = []
  let error: string | null = null
  try {
    g.apply(initial)
    for (let i = 0; i < STEP_CAP; i++) {
      const p = g.pending() as Any
      if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player } as never); continue }
      if (p.mode === 'choice') {
        const cands = ((p.request.candidates ?? []) as readonly Any[]).map((c) => String(c.id))
        const ans = String(p.request.key) === OGN_173_DEST_KEY ? pick(cands) : (cands[0] ?? '')
        asks.push({ key: String(p.request.key), candidates: cands, answer: ans })
        g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: ans } as never)
        continue
      }
      break
    }
  } catch (e) { error = e instanceof Error ? `${e.name}: ${e.message}` : String(e) }
  return { g, out: { asks, error } }
}
const zoneOf = (g: InteractiveGame, oid: string): string | undefined =>
  (curState(g).objects as unknown as Record<string, GameObject | undefined>)[oid]?.zone as string | undefined
const dormantOf = (g: InteractiveGame, oid: string): unknown =>
  (curState(g).objects as unknown as Record<string, GameObject | undefined>)[oid]?.status?.['dormant']

describe('★1801f 缺陷 264 · 驭风而行 × 巢穴(FAQ :552):候选含基地、选基地 ⇒ 移动被撤销但变为活跃', () => {
  test('① 直接:OGN-295 上的 ally 的确认期落点候选【含】base:P1(FAQ:可选、执行时被撤销)', () => {
    const s = scene()
    expect(s.objects[asObjId('ally')]!.derived?.restrictions, '前提:巢穴真的锁了 ally 的基地').toContain('moveToBase')
    const req = OGN_173_SPEC.makeNextChoice!({ movedCardOid: 'sp', controller: P1, target: 'ally' } as never)(s, {})
    expect(req, '★问得出来').not.toBeNull()
    const cands = (req!.candidates ?? []).map((c) => c.id)
    expect(cands, '★★基地在候选里(修前被滤掉)').toContain(`base:${P1}`)
    expect(cands, '⚠️ 别处战场照选').toContain(BF1)
    expect(cands, '当前位置不算').not.toContain(BF0)
  })

  test('② 承重闸不变:moveUnitEvents 仍把「回基地」这步撤销(候选给得出 ≠ 执行得了)', () => {
    const s = scene()
    expect(moveUnitEvents(s, 'ally', `base:${P1}`), '★移动被限制撤销 ⇒ 一个事件都不发').toEqual([])
    expect(moveUnitEvents(s, 'ally', BF1).length, '⚠️ 别锁多:去别处战场照发两条').toBe(2)
  })

  test('③ 真流程:选基地 ⇒ 移动被撤销、单位【留在原地】且变为活跃(FAQ :552)', () => {
    const { g, out } = playWind((cands) => (cands.includes(`base:${P1}`) ? `base:${P1}` : cands[0]!))
    expect(out.error, `运行异常:${out.error}`).toBeNull()
    const destAsk = out.asks.find((a) => a.key === OGN_173_DEST_KEY)
    expect(destAsk?.candidates, '★确认期候选确实含 base:P1').toContain(`base:${P1}`)
    expect(destAsk?.answer, '★选的是基地').toBe(`base:${P1}`)
    expect(zoneOf(g, 'ally'), '★★移动被撤销 ⇒ 留在原地 BF0').toBe(BF0)
    expect(dormantOf(g, 'ally'), '★★「然后让其变为活跃」照发(dormant=false)').not.toBe(true)
  })

  test('④ 对照:选别处战场 ⇒ 移动发生 + 活跃', () => {
    const { g, out } = playWind((cands) => (cands.includes(BF1) ? BF1 : cands[0]!))
    expect(out.error, `运行异常:${out.error}`).toBeNull()
    expect(out.asks.find((a) => a.key === OGN_173_DEST_KEY)?.answer).toBe(BF1)
    expect(zoneOf(g, 'ally'), '★对照:真被移到 BF1').toBe(BF1)
    expect(dormantOf(g, 'ally'), '★对照:变为活跃').not.toBe(true)
  })
})
