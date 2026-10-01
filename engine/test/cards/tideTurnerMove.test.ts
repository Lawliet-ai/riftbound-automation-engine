import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { makeTideTurnerTrigger } from '../../data/cards/standby-tricks'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { advanceFepr } from '../../src/loop/chainFepr'
import { activeTriggers } from '../../data/registry'

                                   
                                                    

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function obj(id: string, zone: string, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId: `D-${id}`, owner: P1, controller: P1, zone: asZoneId(zone),
    baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
  }
}
function scene(...objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, objects, zones }
}

describe('控潮者换位补发移动信号', () => {
  const play = { kind: 'playUnit' as const, unit: asObjId('tide'), player: P1 }

  test('换位产出:两次位移 + 两条移动完成信号', () => {
    const s = scene(obj('tide', BF0), obj('mate', BF1))
    const t = makeTideTurnerTrigger(asObjId('tide'), P1)
    const evs = t.effect(s, play, { swap: 'mate' })
    expect(evs.map((e) => e.kind)).toEqual(['zoneChange', 'zoneChange', 'unitMoved', 'unitMoved'])
  })

  test('信号的起点/终点是【换位前后】的真实位置,双方各一条', () => {
    const s = scene(obj('tide', BF0), obj('mate', BF1))
    const t = makeTideTurnerTrigger(asObjId('tide'), P1)
    const moves = t.effect(s, play, { swap: 'mate' }).filter((e) => e.kind === 'unitMoved')
    expect(moves).toEqual([
      { kind: 'unitMoved', unit: 'tide', player: P1, from: BF0, to: BF1 },
      { kind: 'unitMoved', unit: 'mate', player: P1, from: BF1, to: BF0 },
    ])
  })

  test('移动信号排在位移【之后】(§446.1 到达终点才算移动完成)', () => {
    const s = scene(obj('tide', BF0), obj('mate', BF1))
    const evs = makeTideTurnerTrigger(asObjId('tide'), P1).effect(s, play, { swap: 'mate' })
    const lastZone = evs.map((e) => e.kind).lastIndexOf('zoneChange')
    const firstMove = evs.map((e) => e.kind).indexOf('unitMoved')
    expect(firstMove).toBeGreaterThan(lastZone)
  })

  test('选择不换位 → 无位移也无移动信号(无操作不产生事件)', () => {
    const s = scene(obj('tide', BF0), obj('mate', BF1))
    expect(makeTideTurnerTrigger(asObjId('tide'), P1).effect(s, play, { swap: 'skip' })).toEqual([])
  })
})

                                                  
                                                       
                                                          
                                                               
                                                                              
describe('★★★★★★★1452:控潮者那一问真的在确认阶段(规则点名的例子)', () => {
  test('★★★advanceFepr 停下来问,项目还是 pending,候选是【要不要执行】', () => {
    const s = scene(obj('tide', BF0, { defId: 'OGN-199' }), obj('mate', BF1))
    const fired = landAndEnqueueTriggers(s, [{ kind: 'playUnit', unit: asObjId('tide'), player: P1 } as never], activeTriggers, P1, {})
    const step = advanceFepr(fired, {})
    expect(step.kind, '★★★确认阶段就停下来问了').toBe('choice')
    expect(step.state.chain.some((i) => i.status === 'pending'), '★★★问的时候项目还没确认').toBe(true)
    const req = (step as Extract<typeof step, { kind: 'choice' }>).request
    expect(req.candidates.map((c) => c.id).sort(), '★★★这一问是【要不要执行】,不是【选谁互换】').toEqual(['no', 'yes'])
    expect(req.sourceDefId, '★问的是控潮者那条').toBe('OGN-199')
  })

                                                        
                                                      
                                                     
                                                         
                                                            
  test('★★★结算期的候选表里【不该再有拒绝项】(拒绝的机会已在确认阶段给过)', () => {
    const s = scene(obj('tide', BF0, { defId: 'OGN-199' }), obj('mate', BF1))
    const t = makeTideTurnerTrigger(asObjId('tide'), P1)
    const q = t.nextChoice!(s, { kind: 'playUnit', unit: asObjId('tide'), player: P1 } as never, {})!
    expect(q, '★结算期仍要问「和谁互换」').not.toBeNull()
    const ids = q.candidates.map((c) => c.id)
    expect(ids, '★候选就是可换位的友方单位').toEqual(['mate'])
    for (const reject of ['skip', 'no', 'none', '__done__', 'decline']) {
      expect(ids.includes(reject), `★★★不该混进拒绝项(查 ${reject})`).toBe(false)
    }
  })
})
