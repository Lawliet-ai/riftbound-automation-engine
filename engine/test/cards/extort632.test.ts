import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKeywords, cardKind, playSpecFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import {
  OGN_033_SPEC, OGN_033_KEY, OGN_033_YES, OGN_033_NO, OGN_033_DRAW, OGN_033_DAMAGE, extortTargets,
} from '../../data/cards/OGN-033'

                                                             
                                            
  
           
                                                
                                        
                                                      
                                     
                                                                    
                                        

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

const unit = (oid: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
})

                                                                 
function scene(): GameState {
  const base = createInitialState([P1, P2], 2)
  const bfs = zonesByKind(base, 'battlefield').map((z) => z.id as string)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  put(unit('foeBase', P2, `base:${P2}`))
  put(unit('foeBf', P2, bfs[0]!))
  put(unit('mine', P1, bfs[0]!))
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

type Ev = { kind: string, player?: string, count?: number, target?: string, amount?: number, source?: string, sourcePlayer?: string }
const resolveWith = (s: GameState, target: string, answers: Record<string, string>): readonly Ev[] =>
  OGN_033_SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1, target } as never)(s, answers) as readonly Ev[]

describe('★ 前提:上游费用 / 印刷关键词 / 进表', () => {
  test('★★★★★2费 **1红pip**(㊶ 有 pip 别当没有)、[反应] 进印刷表、进 PLAY_SPECS', () => {
    expect(CARD_COSTS['OGN-033']).toEqual({ mana: 2, pips: 1, colors: ['red'] })
    expect(OGN_033_SPEC.cost).toEqual({ mana: 2, pips: [['red']] })
    expect(cardKind('OGN-033')).toBe('spell')
    expect(cardKeywords('OGN-033')).toEqual(['反应'])
    expect(playSpecFor('OGN-033')).toBe(OGN_033_SPEC)
    expect(playSpecFor('OGN-033')!.keywords).toEqual(['反应'])
  })
})

describe('★★★★★★★ 候选与问链', () => {
  test('★★★★★★④「一名敌方单位」含基地;友方 mine 不在', () => {
    const s = scene()
    expect(extortTargets(s, P1)).toEqual(['foeBase', 'foeBf'])
    expect(OGN_033_SPEC.legalTargets!(s, P1)).toEqual(['foeBase', 'foeBf'])
  })

  test('★★★★★★①问派给【目标的控制者】P2,不是打出者;②③两个选项恒可选(对手零资源)', () => {
    const s = scene()                                                        
    const q = OGN_033_SPEC.makeNextChoice!({ movedCardOid: asObjId('sp'), controller: P1, target: 'foeBf' } as never)(s, {})!
    expect(q.controller, '★由他本人决定').toBe(P2)
    expect(q.key).toBe(OGN_033_KEY)
    expect(q.candidates.map((c) => c.id), '★恒两个选项(代价不花他的资源)').toEqual([OGN_033_YES, OGN_033_NO])
  })

  test('★★★★答过就不再问;目标已离场 ⇒ 无从问起', () => {
    const s = scene()
    const next = OGN_033_SPEC.makeNextChoice!({ movedCardOid: asObjId('sp'), controller: P1, target: 'foeBf' } as never)
    expect(next(s, { [OGN_033_KEY]: OGN_033_NO })).toBeNull()
    const gone = {
      ...s, objects: Object.fromEntries(Object.entries(s.objects).filter(([k]) => k !== 'foeBf')),
    } as GameState
    expect(next(gone, {})).toBeNull()
  })
})

describe('★★★★★★★ 结算:二选一没有第三种结果', () => {
  test('★★★★★★②选了「让你抽」⇒ 一条 draw 给【打出者 P1】、张数2、**不砸伤害**', () => {
    const evs = resolveWith(scene(), 'foeBf', { [OGN_033_KEY]: OGN_033_YES })
    expect(evs).toHaveLength(1)
    expect(evs[0]).toMatchObject({ kind: 'draw', player: P1, count: OGN_033_DRAW })
  })

  test('★★★★★★⑤拒绝 ⇒ 一条 damage 6 点、source/sourcePlayer 都带、**不抽牌**', () => {
    const evs = resolveWith(scene(), 'foeBf', { [OGN_033_KEY]: OGN_033_NO })
    expect(evs).toHaveLength(1)
    expect(evs[0]).toMatchObject({
      kind: 'damage', target: 'foeBf', amount: OGN_033_DAMAGE, source: 'sp', sourcePlayer: P1,
    })
  })

  test('★★★★★没作答(问没发生)⇒ 走「否则」砸伤害 —— 二选一缺省不是抽牌', () => {
                                                          
    const evs = resolveWith(scene(), 'foeBf', {})
    expect(evs).toHaveLength(1)
    expect(evs[0]!.kind).toBe('damage')
  })

  test('★★★★★★⑥㊺复验:目标已离场 ⇒ 零事件;易主(变友方)⇒ 零事件', () => {
    const s = scene()
    const gone = {
      ...s, objects: Object.fromEntries(Object.entries(s.objects).filter(([k]) => k !== 'foeBf')),
    } as GameState
    expect(resolveWith(gone, 'foeBf', { [OGN_033_KEY]: OGN_033_NO })).toEqual([])
    const stolen = {
      ...s,
      objects: { ...s.objects, foeBf: { ...(s.objects['foeBf' as never] as GameObject), controller: P1 } },
    } as GameState
    expect(resolveWith(stolen, 'foeBf', { [OGN_033_KEY]: OGN_033_NO }),
      '★易主后不再是「敌方单位」⇒ §355.17 整条无视').toEqual([])
  })
})
