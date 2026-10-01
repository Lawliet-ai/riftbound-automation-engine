import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { cardKeywords, cardKind, playSpecFor, TRIGGER_ZONE_DEFIDS } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { banishPlayable, makeBanishPlayRelay, SFD_188_SHAPE } from '../../data/cards/play-from-deck'
import {
  OGN_025_SPEC, OGN_025_SHAPE, OGN_025_PICK, furyShown, makeFuryPlayTrigger,
} from '../../data/cards/OGN-025'

                                                             
                                               
                           
  
           
                                                           
                                    
                                                              
                                                                            
                                                      
                                                

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

const obj = (oid: string, defId: string, who: PlayerId, zone: string, types: readonly string[] = ['unit']): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: [...types], damage: 0, counters: {}, status: {},
} as GameObject)

                                                                          
function scene(foeTop: readonly GameObject[] = [obj('ft', 'U-FT', P2, `mainDeck:${P2}`)]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  for (const o of [...foeTop, obj('myTop', 'U-MY', P1, `mainDeck:${P1}`)]) put(o)
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

type Ev = { kind: string, player?: string, cards?: readonly string[], target?: string, by?: string, objs?: readonly string[], obj?: string, freeAll?: boolean, freeMana?: boolean, card?: string }
const resolveWith = (s: GameState, answers: Record<string, string>): readonly Ev[] =>
  OGN_025_SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, answers) as unknown as readonly Ev[]

describe('★ 前提:上游/keywords/接线/形状', () => {
  test('★★★★★4费 2枚红pip、[迅捷] 两份、进 PLAY_SPECS、触发区含 OGN-025;shape=freeAll+收法术', () => {
    expect(CARD_COSTS['OGN-025']).toEqual({ mana: 4, pips: 2, colors: ['red'] })
    expect(OGN_025_SPEC.cost).toEqual({ mana: 4, pips: [['red'], ['red']] })
    expect(cardKind('OGN-025')).toBe('spell')
    expect(cardKeywords('OGN-025')).toEqual(['迅捷'])
    expect(playSpecFor('OGN-025')!.keywords).toEqual(['迅捷'])
    expect(TRIGGER_ZONE_DEFIDS).toContain('OGN-025')
    expect(OGN_025_SHAPE).toEqual({ defId: 'OGN-025', reduceMana: 0, accepts: 'permanent', acceptsSpells: true, freeAll: true })
    expect(SFD_188_SHAPE, '★老六张回归:不带 freeAll(一字不变)').toEqual({ defId: 'SFD-188', reduceMana: 2, accepts: 'permanent' })
  })
})

describe('★★★★★★★ 句①:①展示对手顶1 + ②必选 + ⑤回收其余', () => {
  test('★★★★★★①furyShown=对手顶1(我方牌堆不掺和);revealed player=对手', () => {
    const s = scene()
    expect(furyShown(s, P1)).toEqual([{ player: P2, card: asObjId('ft') }])
    const evs = resolveWith(s, { [OGN_025_PICK]: 'ft' })
    expect(evs[0]).toMatchObject({ kind: 'revealed', player: P2, cards: ['ft'] })
  })

  test('★★★★★②必选:候选=对手那张、**无 skip 档**;牌堆空 ⇒ 不问', () => {
    const s = scene()
    const q = OGN_025_SPEC.makeNextChoice!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, {})!
    expect(q.key).toBe(OGN_025_PICK)
    expect(q.candidates.map((c) => c.id), '★errata 没写「可以」⇒ 没有不选档').toEqual(['ft'])
    const empty = scene([])
    expect(OGN_025_SPEC.makeNextChoice!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(empty, {})).toBeNull()
  })

  test('★★★★★★选中 ⇒ revealed + banish{by:sp};2人局其余=0 ⇒ 不发 recycle', () => {
    const evs = resolveWith(scene(), { [OGN_025_PICK]: 'ft' })
    expect(evs.map((e) => e.kind)).toEqual(['revealed', 'banish'])
    expect(evs[1]).toMatchObject({ kind: 'banish', target: 'ft', by: 'sp' })
  })
})

describe('★★★★★★★ ③④句② relay 的 freeAll', () => {
  const relay = makeBanishPlayRelay(OGN_025_SHAPE, asObjId('sp'), P1)
  const banishedEv = (card: string): GameEvent => ({ kind: 'banished', card: asObjId(card) } as unknown as GameEvent)
                                                       
  const exiled = (defId: string, types: readonly string[]): GameState => {
    const base = createInitialState([P1, P2], 2)
    const o = obj('ex', defId, P2, `exile:${P2}`, types)
    return {
      ...base, activePlayer: P1, phase: 'main',
      objects: { ex: o },
      zones: { ...base.zones, [`exile:${P2}`]: { ...base.zones[`exile:${P2}` as never]!, contents: [asObjId('ex')] } },
    } as unknown as GameState
  }

  test('★★★★★★③④常驻牌:零资源也发 **playFree**(全免通道;不是 playUnit带play 付费)', () => {
    const s = exiled('OGN-085', ['unit'])                                                  
    void s
    const s2 = exiled('OGN-037', ['unit'])             
    expect(banishPlayable(s2, P1, 'OGN-037', OGN_025_SHAPE), '★④freeAll ⇒ 恒过(零资源)').toBe(true)
    const evs = relay.effect(s2, banishedEv('ex'), {}) as unknown as readonly Ev[]
    expect(evs).toHaveLength(1)
    expect(evs[0]).toMatchObject({ kind: 'playFree', obj: 'ex', player: P1 })
  })

  test('★★★★★★③法术:playSpellFromZone 带 **freeAll**(不是 freeMana);目标类没答到 ⇒ 静默', () => {
    const s = exiled('OGN-085', ['spell'])                           
    const q = relay.nextChoice!(s, banishedEv('ex'), {})
    void q                                               
    const evsNoTarget = relay.effect(s, banishedEv('ex'), {}) as unknown as readonly Ev[]
    expect(evsNoTarget, '★目标类法术没答到目标 ⇒ §355.8 静默').toEqual([])
                   
    const bf = 'battlefield:shared:0'
    const withUnit = {
      ...s,
      objects: { ...s.objects, tgt: obj('tgt', 'U-T', P2, bf) },
      zones: { ...s.zones, [bf]: { ...s.zones[bf as never]!, contents: [asObjId('tgt')] } },
    } as unknown as GameState
    const evs = relay.effect(withUnit, banishedEv('ex'), { spellTarget: 'tgt' }) as unknown as readonly Ev[]
    expect(evs).toHaveLength(1)
    expect(evs[0]).toMatchObject({ kind: 'playSpellFromZone', player: P1, card: 'ex', freeAll: true, target: 'tgt' })
    expect(evs[0]!.freeMana, '★是全免不是只免法力(㊶ 三档钱)').toBeUndefined()
  })
})
