                                     
  
                                                      
  
           
                                                               
                                                                   
                                                                  
                                                  
                                          
                                                             
                                                              
                                                      
                                             
                                            

import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, cardKeywords, cardKind, handPlaySpecs, playSpecFor, cardPassives } from '../../data/registry'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { seedRunes } from '../../src/game/economy'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { NO_ENEMY_MOVE, moveRestricted } from '../../src/state/moveRestriction'
import { GEAR_HOST_PASSIVES } from '../../data/cards/gear-host-passives'

setCardPassiveProvider(cardPassives)                                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const CHARM = 'OGN-043'                                    

const DEPS = { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, cardKind, playSpecFor }

function obj(oid: string, defId: string, ctrl: typeof P1, zone: string, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
  } as GameObject
}
                                             
function scene(objs: readonly GameObject[]): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) { objects[o.oid] = o; const z = zones[o.zone]!; zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones }
  return seedRunes(s, P1, 'green', 8)
}
const host = (extra: Partial<GameObject> = {}): GameObject => obj('host', 'BLK', P2, BF0, extra)
const blade = (attached = true): GameObject => obj('blade', 'VEN-073', P2, BF0, {
  baseTypes: ['equipment'] as const, baseMight: 0,
  ...(attached ? { status: { attachedTo: asObjId('host') } } : { status: {} }),
})
                                      
function castCharm(g: InteractiveGame): void {
  const play = g.legalActions(P1).find((a) => a.kind === 'PLAY_CARD')
  expect(play, '魅惑妖术要枚举得出来(宿主仍是合法目标——这不是不可选目标)').toBeDefined()
  g.apply(play!)
  for (let i = 0; i < 20; i++) {
    const p = g.pending()
    if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
    if (p.mode === 'choice') {
      g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: p.request.candidates[0]!.id })
      continue
    }
    return
  }
  throw new Error('没收敛')
}
const zoneOf = (g: InteractiveGame, oid: string): string | undefined => g.state.objects[asObjId(oid)]?.zone as string | undefined

describe('★864 前提与罩面', () => {
  test('表行:VEN-073 在 GEAR_HOST_PASSIVES 里,产物是 addRestriction NO_ENEMY_MOVE', () => {
    const row = GEAR_HOST_PASSIVES.find((r) => r.defId === 'VEN-073')!
    expect(row.cardText).toBe('我无法被敌方法术和技能移动。')
    expect(row.modification).toEqual({ kind: 'addRestriction', restriction: NO_ENEMY_MOVE })
  })

  test('★★★贴附 ⇒ 限制挂在【宿主】的派生态上;武装自己不挂', () => {
    const s = recomputeContinuous(scene([host(), blade()]))
    expect(s.objects[asObjId('host')]!.derived?.restrictions ?? []).toContain(NO_ENEMY_MOVE)
    expect(s.objects[asObjId('blade')]!.derived?.restrictions ?? []).not.toContain(NO_ENEMY_MOVE)
  })

  test('★★★§136.2.b 未贴附 ⇒ 一条限制都不产', () => {
    const s = recomputeContinuous(scene([host(), blade(false)]))
    expect(s.objects[asObjId('host')]!.derived?.restrictions ?? []).not.toContain(NO_ENEMY_MOVE)
  })
})

describe('★864 moveRestricted 的发起方维度(单元级)', () => {
  const armed = (): GameState => recomputeContinuous(scene([host(), blade()]))

  test('★★★敌方发起(mover=P1)⇒ 挡', () => {
    const s = armed()
    expect(moveRestricted(s, s.objects[asObjId('host')]!, BF1, P1)).toBe(true)
  })
  test('★★★宿主控制者自己发起(mover=P2)⇒ 不挡', () => {
    const s = armed()
    expect(moveRestricted(s, s.objects[asObjId('host')]!, BF1, P2)).toBe(false)
  })
  test('★★★★发起方未知 ⇒ fail-open 放行(理由见 moveRestriction ★864:正确性不是保守)', () => {
    const s = armed()
    expect(moveRestricted(s, s.objects[asObjId('host')]!, BF1)).toBe(false)
  })
  test('★★★★夺控现判:宿主被夺控给 P1 后,「敌方」翻面 —— P2 的效果才被挡', () => {
    const s0 = armed()
    const h = s0.objects[asObjId('host')]!
    const seized = { ...h, derived: { ...h.derived!, controller: P1 } }
    const s = { ...s0, objects: { ...s0.objects, host: seized } } as GameState
    expect(moveRestricted(s, seized, BF1, P2), '★原主人 P2 现在是「敌方」').toBe(true)
    expect(moveRestricted(s, seized, BF1, P1), '★新主人 P1 不是').toBe(false)
  })
})

describe('★864 端到端:真打魅惑妖术', () => {
  test('★★★★★敌方(P1)的魅惑妖术选中宿主:法术照常结算、移动那一步被无视,宿主原地不动', () => {
    const g = new InteractiveGame(scene([
      host(), blade(),
      obj('charm', CHARM, P1, `hand:${P1}`, { baseTypes: ['spell'] as const }),
    ]), DEPS)
    castCharm(g)
    expect(zoneOf(g, 'host'), '★被撤销的是移动这一步,宿主留在原地').toBe(BF0)
  })

  test('★★★★对照组:没贴刀 ⇒ 同一张魅惑妖术把宿主移走了(闸不是常开的)', () => {
    const g = new InteractiveGame(scene([
      host(), // 没有 blade
      obj('charm', CHARM, P1, `hand:${P1}`, { baseTypes: ['spell'] as const }),
    ]), DEPS)
    castCharm(g)
    expect(zoneOf(g, 'host'), '★没有刀就该被移走 —— 否则上面那格是假绿').not.toBe(BF0)
  })
})
