                                            
  
                                                      
                                                             
                                            
import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { makeVolibear041Trigger } from '../../data/cards/OGN-041'
import { splitPoolBoost, damageBoostShields } from '../../data/cards/damage-boost'
import { installProviders } from '../../data/gameDeps'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'

installProviders()
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(oid: string, defId: string, ctrl = P1, zone = BF0): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  }
}
function scene(withAnnie: boolean): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {
    voli: obj('voli', 'OGN-041', P1),
    e1: { ...obj('e1', 'E1', P2), baseMight: 9 }, e2: obj('e2', 'E2', P2), // e1 高血:6点打不死,伤害标记可见
    ...(withAnnie ? { annie: obj('annie', 'OGS-001', P1, `base:${P1}`) } : {}),
  }
  const zones = { ...base.zones }
  const put = (z: string, oid: string): void => { zones[asZoneId(z)] = { ...zones[asZoneId(z)]!, contents: [...zones[asZoneId(z)]!.contents, asObjId(oid)] } }
  put(BF0, 'voli'); put(BF0, 'e1'); put(BF0, 'e2')
  if (withAnnie) put(`base:${P1}`, 'annie')
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}
const atkEv = { kind: 'attack', unit: asObjId('voli'), battlefield: BF0, responsible: [P1] } as unknown as GameEvent

describe('★895 §715.3 分摊池(规则举例逐字:沃利贝尔+安妮)', () => {
  test('splitPoolBoost:安妮在场=+1、不在=0', () => {
    expect(splitPoolBoost(scene(true), 'voli', 'P1', 'e1')).toBe(1)
    expect(splitPoolBoost(scene(false), 'voli', 'P1', 'e1')).toBe(0)
  })
  test('🔴★★★★★安妮在场:问链预算=共计6点(5+1),不是每笔再+1', () => {
    const s = scene(true)
    const t = makeVolibear041Trigger(asObjId('voli'), P1)
    const q = t.nextChoice!(s, atkEv, {})
    expect(q, '分摊问链要弹').not.toBeNull()
    expect(q!.prompt, '★池子预加:提示写「共计6点」').toContain('共计6点')
                      
    const chosen: Record<string, string> = {}
    for (let i = 0; i < 6; i++) chosen[`OGN-041:hit:voli${i}`] = 'e1'                    
    const evs = t.effect!(s, atkEv, chosen) as readonly { kind?: string; amount?: number; fromSplitPool?: boolean }[]
    const dmg = evs.filter((e) => e.kind === 'damage')
    expect(dmg, '合并成一笔').toHaveLength(1)
    expect(dmg[0]!.amount, '★总量=6(池预加),不是 5+每笔+1=10').toBe(6)
    expect(dmg[0]!.fromSplitPool, '★子笔带豁免标(逐笔改写不再吃)').toBe(true)
                                                               
    const landed = applyEvents(s, evs as never, { replacementShields: (st) => damageBoostShields(st) }).state                            
    expect(landed.objects[asObjId('e1')]!.damage, '★落地伤害=6(豁免生效)').toBe(6)
  })
  test('对照:安妮不在=共计5点', () => {
    const s = scene(false)
    const t = makeVolibear041Trigger(asObjId('voli'), P1)
    const q = t.nextChoice!(s, atkEv, {})
    expect(q!.prompt).toContain('共计5点')
  })
})
