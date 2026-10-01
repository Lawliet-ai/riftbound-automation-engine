                                              
  
                                                                
                                                                        
                                                           
                                              
                                                                                      
                                                                  
                                                                
  
                                                                
                                                            
                                     
                                                             
  
                                                                    
import { describe, expect, test } from 'vitest'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { CARD_CATEGORIES } from '../../data/cardCategories'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { blocksEnemyTargeting, filterTargetable } from '../../src/keywords/untargetable'
import { MULTI_SELECT_DONE } from '../../src/loop/multiSelect'
import { UNL_054_PREFIX } from '../../data/cards/UNL-054'

installProviders()

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const STEP_CAP = 120
type Any = Record<string, any>

const FULL_POOL = { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } }

const curState = (g: InteractiveGame): GameState => {
  const gg = g as unknown as { choice?: { state: GameState } | null; window?: { state: GameState } | null; state: GameState }
  return gg.choice?.state ?? gg.window?.state ?? gg.state
}

                                                        
const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
const inHand = (oid: string, defId: string, who: PlayerId): GameObject =>
  obj(oid, defId, who, `hand:${who}`, { baseTypes: [CARD_CATEGORIES[defId] === 'spell' ? 'spell' : 'unit'] as never })

function scene(objs: readonly GameObject[]): GameState {
  const s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (!z) throw new Error(`造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  let i = 0
  for (const p of [P1, P2]) for (let k = 0; k < 4; k++) {
    const id = `deck${i++}`
    const c = obj(id, 'BLK', p, `mainDeck:${p}`)
    objects[id] = c
    zones[`mainDeck:${p}`] = { ...zones[`mainDeck:${p}`]!, contents: [...zones[`mainDeck:${p}`]!.contents, c.oid] }
  }
  return recomputeContinuous({
    ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones,
    runePools: {
      P1: { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } },
      P2: { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } },
    },
  } as GameState)
}

                            
const listed = (g: InteractiveGame, player: PlayerId, cardOid: string): boolean =>
  (g.legalActions(player) as readonly Any[]).some((a) =>
    (a.kind === 'PLAY_CARD' || a.kind === 'PLAY_STANDBY') && String(a.cardOid ?? a.oid) === cardOid)

const zoneOf = (g: InteractiveGame, oid: string): string => {
  const o = (curState(g).objects as unknown as Record<string, GameObject | undefined>)[oid]
  return o === undefined ? 'gone' : String(o.zone)
}

                                                
function playAndDrive(
  g: InteractiveGame, cardOid: string, decide: (key: string, req: Any) => string,
): { error: string | null; asks: string[] } {
  const act = (g.legalActions(P1) as readonly Any[]).find((a) =>
    (a.kind === 'PLAY_CARD' || a.kind === 'PLAY_STANDBY') && String(a.cardOid ?? a.oid) === cardOid)
  const asks: string[] = []
  let error: string | null = null
  try {
    g.apply(act as InteractiveAction)
    for (let i = 0; i < STEP_CAP; i++) {
      const p = g.pending() as Any
      if (p.mode === 'choice') {
        const req = p.request as Any
        asks.push(String(req.key))
        g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer: decide(String(req.key), req) } as never)
        continue
      }
      if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player } as never); continue }
      break
    }
  } catch (e) {
    error = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
  }
  return { error, asks }
}

                                                                                  
describe('★1807d ㈠ UNL-110 巨人之战:计数必须过 §757(敌方沙墟啸匪不算可选候选)', () => {
  test('㈠1 真盘面:我方 A + 对手 SFD-105 ⇒ UNL-110 **不在** legalActions(§355.8/§355.9.b)', () => {
    const g = new InteractiveGame(scene([
      obj('ally', 'BLK', P1, BF0, { baseMight: 3 }),
      obj('foe', 'SFD-105', P2, BF0, { baseMight: 5 }), // 敌方沙墟啸匪:「我无法被敌方法术和技能选作目标」
      inHand('titan', 'UNL-110', P1),
    ]), makeGameDeps(0x1807) as never)
    const foe = curState(g).objects[asObjId('foe')]
    expect(foe !== undefined && blocksEnemyTargeting(foe), '★前提:啸匪真带着这条限制(走真 passives)').toBe(true)
                                                     
    expect(filterTargetable(curState(g).objects, String(P1), ['ally', 'foe']), '★前提:过 §757 后只剩 ally').toEqual(['ally'])
    expect(listed(g, P1, 'titan'), '★★候选不足 2 ⇒ 不出现在 legalActions').toBe(false)
  })

  test('㈠2 对照:把啸匪换成普通敌方单位 ⇒ UNL-110 **出现在** legalActions(证明闸不是恒拦)', () => {
    const g = new InteractiveGame(scene([
      obj('ally', 'BLK', P1, BF0, { baseMight: 3 }),
      obj('plainFoe', 'BLK', P2, BF0, { baseMight: 3 }), // 普通敌方单位(无限制)
      inHand('titan', 'UNL-110', P1),
    ]), makeGameDeps(0x1807) as never)
    expect(blocksEnemyTargeting(curState(g).objects[asObjId('plainFoe')]!), '★前提:普通单位不带这条限制').toBe(false)
    expect(listed(g, P1, 'titan'), '★两名可选单位 ⇒ 列得出').toBe(true)
  })

  test('㈠3 账本对照:㈠1 的盘面下玩家的法力/符能**一分没动**(白付费这条路被堵死)', () => {
    const g = new InteractiveGame(scene([
      obj('ally', 'BLK', P1, BF0, { baseMight: 3 }),
      obj('foe', 'SFD-105', P2, BF0, { baseMight: 5 }),
      inHand('titan', 'UNL-110', P1),
    ]), makeGameDeps(0x1807) as never)
    const before = JSON.stringify(curState(g).runePools.P1)
    expect(listed(g, P1, 'titan'), '★打不出 ⇒ 无动作可点').toBe(false)
    expect(JSON.stringify(curState(g).runePools.P1), '★法力/符能与初始全池逐字相同').toBe(JSON.stringify(FULL_POOL))
    expect(JSON.stringify(curState(g).runePools.P1), '★与判前快照一致:一分没动').toBe(before)
  })
})

                                                                                
describe('★1807d ㈢ UNL-054 顽皮触手:§355.13「任意数量」含 0', () => {
  test('㈢1 盘面上没有任何敌方单位 ⇒ UNL-054 **仍出现在** legalActions(§355.13 末句)', () => {
    const g = new InteractiveGame(scene([inHand('tent', 'UNL-054', P1)]), makeGameDeps(0x1807) as never)
    expect(listed(g, P1, 'tent'), '★「任意数量」含 0 ⇒ 没有目标也能打出').toBe(true)
  })

  test('㈢2 打出并答「够了」(0 个)⇒ 结算不抛错、不产生移动事件', () => {
    const g = new InteractiveGame(scene([
      obj('foe1', 'BLK', P2, BF0, { baseMight: 3 }),
      inHand('tent', 'UNL-054', P1),
    ]), makeGameDeps(0x1807) as never)
    expect(listed(g, P1, 'tent'), '★有敌方单位 ⇒ 可打(前提)').toBe(true)
    const { error, asks } = playAndDrive(g, 'tent', (key) => (key.startsWith(UNL_054_PREFIX) ? MULTI_SELECT_DONE : ''))
    expect(error, '★结算不抛错').toBeNull()
    expect(asks, '★确认期确实问了「移动哪些敌方单位」的 pick').toContain(`${UNL_054_PREFIX}0`)
    expect(zoneOf(g, 'foe1'), '★答 0 个 ⇒ 敌方单位一步没动').toBe(BF0)
  })
})
