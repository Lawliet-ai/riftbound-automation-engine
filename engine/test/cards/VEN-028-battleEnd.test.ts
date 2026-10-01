import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { runCombat } from '../../src/combat/battle'
import { applyEvents } from '../../src/loop/reduce'
import { activeTriggers, cardPassives } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { isEmpowered } from '../../src/keywords/empower'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'                                       

                                        
                                         
  
                                                    
                                             

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const might = (o: GameObject): number => effectiveMight(o).actual

function witness(oid: string, controller = P1, zone = BF0): GameObject {
  const s = specLookup('VEN-028')
  return {
    oid: asObjId(oid), defId: 'VEN-028', owner: controller, controller, zone: asZoneId(zone),
    baseMight: s.baseMight, baseKeywords: s.baseKeywords,
    ...(s.baseTypes ? { baseTypes: s.baseTypes } : {}),
    damage: 0, counters: {}, status: {},
  }
}
function plain(oid: string, might_: number, controller: PlayerIdLike, zone = BF0): GameObject {
  return {
    oid: asObjId(oid), defId: 'BLK', owner: controller as never, controller: controller as never,
    zone: asZoneId(zone), baseMight: might_, baseKeywords: [], baseTypes: ['unit'],
    damage: 0, counters: {}, status: {},
  }
}
type PlayerIdLike = typeof P1 | typeof P2

function scene(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones }
}

                                      
function fightAndSignal(st: GameState): GameState {
  const r = runCombat(st, BF0, P1)
  const ev = {
    kind: 'battleEnd' as const,
    battlefield: BF0,
    attacker: P1,
    defender: P2,
    outcome: r.outcome,
    participants: r.participants,
  }
  let s = landAndEnqueueTriggers(r.state, [ev], activeTriggers, P1, {})
              
  for (let i = 0; i < 8 && s.chain.length > 0; i++) {
    const items = s.chain.filter((it: { status: string }) => it.status === 'pending')
    if (items.length === 0) break
    for (const it of items) s = applyEvents(s, it.resolve(s, {}, it), {}).state
    s = { ...s, chain: s.chain.filter((it: unknown) => !items.includes(it as never)) }
  }
  return s
}

describe('★§466.7 战斗结束事件带出参战名单', () => {
  test('先钉住前提:VEN-028 在真 registry 里产得出触发', () => {
    const st = scene([witness('w')])
    expect(activeTriggers(st).some((t) => t.sourceOid === asObjId('w'))).toBe(true)
  })

  test('参战名单在【伤害步开始时】抓:双方单位都在里面', () => {
    const st = scene([witness('w'), plain('e', 1, P2)])
    const r = runCombat(st, BF0, P1)
    expect([...r.participants].sort()).toEqual(['e', 'w'].sort())
  })
})

describe('★悲悯见证者:参与的战斗结束后强化,战力 2→4', () => {
  test('★打赢(对手单位被清空)→ 我强化了', () => {
    setCardPassiveProvider(cardPassives)
                                   
    const s = fightAndSignal(scene([witness('w'), plain('e', 1, P2)]))
    const me = s.objects['w']
    expect(me).toBeDefined()
    expect(isEmpowered(me!)).toBe(true)
    expect(might(recomputeContinuous(s).objects['w']!)).toBe(4)       
  })

  test('★参战名单是在【伤害步开始时】抓的:阵亡单位仍在名单里', () => {
                                                       
                                                                
                                                       
                                                   
    const st = scene([witness('w'), plain('e', 1, P2)])
    const r = runCombat(st, BF0, P1)
    expect(r.participants).toContain(asObjId('e'))                
    expect(r.state.objects['e']).toBeUndefined()            
  })

  test('★阵亡的见证者不强化(物件都没了,效果自然不发)', () => {
    const s = fightAndSignal(scene([witness('w'), plain('e', 9, P2)]))
    expect(s.objects['w']).toBeUndefined()
  })

  test('★没参与的战斗不触发:见证者待在基地时,战场上打完它不强化', () => {
    const s = fightAndSignal(scene([witness('w', P1, `base:${P1}`), plain('a', 2, P1), plain('e', 1, P2)]))
    expect(isEmpowered(s.objects['w']!)).toBe(false)
  })

  test('对手的见证者参战也照样触发(by:any,不分敌我发起)', () => {
    const s = fightAndSignal(scene([plain('a', 1, P1), witness('w', P2)]))
    const me = s.objects['w']
    expect(me).toBeDefined()
    expect(isEmpowered(me!)).toBe(true)
  })
})
