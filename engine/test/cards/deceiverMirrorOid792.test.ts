                                               
  
                              
                                                                         
                                                            
                                              
                             
                                                        
  
                                                                
                                                                       
  
                                                 
                                 
import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { makeDeceiverTrigger } from '../../data/cards/UNL-199'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
const lb = (): GameObject => ({ ...obj('lb', P1, `legend:${P1}`), defId: 'UNL-199', baseTypes: ['legend'] } as GameObject)
const card = (oid: string): GameObject => ({ ...obj(oid, P1, `hand:${P1}`), baseTypes: ['spell'] } as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

const trigC = makeDeceiverTrigger(asObjId('lb'), P1, 'conquer')
const conquer = (player: PlayerId): GameEvent =>
  ({ kind: 'conquer', player, battlefield: BF0 } as unknown as GameEvent)

describe('★792 诡术妖姬:映像的 playUnit 信号打在哪', () => {
  test('playUnit.unit === 真正落地的映像,而不是那张被弃掉的手牌', () => {
    const s = scene([lb(), card('h1'), obj('mine', P1, BF0)])
    const evs = trigC.effect(s, conquer(P1), {
      deceiverSwap: 'swap', deceiverDiscard: 'h1', deceiverVictim: 'mine',
    }) as unknown as { kind: string; unit?: string }[]

                                                                                    
                                                              
    expect(evs.map((e) => e.kind), '★卡自己不发 playUnit').not.toContain('playUnit')
    const r = applyEvents(s, evs.slice(0, 3) as never, {})
    const after = r.state
    const landed = ((r as unknown as { events?: readonly { kind: string; unit?: string }[] }).events ?? [])
    const predicted = landed.find((e) => e.kind === 'playUnit')?.unit
    expect(predicted, '前提:产地派生了 playUnit').toBeDefined()
    const mirror = Object.values(after.objects).find((o) => o.defId === 'token:映像')
    expect(mirror, '前提:映像得真的落地').toBeDefined()

    expect(predicted, '§185 信号必须命中真映像').toBe(mirror!.oid as string)

                                 
    const pointed = after.objects[predicted as never]
    expect(String(pointed?.zone), 'playUnit 指向的物件不该在废牌堆里').not.toContain('discard')
    expect(pointed?.defId, '更不该是那张被弃掉的手牌').toBe('token:映像')
  })

  test('弃牌确实进了废牌堆(证明前置 zoneChange 真的跨区、真的吃了一个号)', () => {
    const s = scene([lb(), card('h1'), obj('mine', P1, BF0)])
    const evs = trigC.effect(s, conquer(P1), {
      deceiverSwap: 'swap', deceiverDiscard: 'h1', deceiverVictim: 'mine',
    }) as unknown as GameEvent[]
    const after = applyEvents(s, evs.slice(0, 4) as never, {}).state
    const discarded = (after.zones[`discard:${P1}` as never]?.contents ?? [])
      .map((oid) => after.objects[oid as never]?.defId)
    expect(discarded, '弃牌落废牌堆').toContain('U-h1')
    expect(after.objects[asObjId('h1')], '跨区 ⇒ 旧 oid 查不到(§124)').toBeUndefined()
  })
})
