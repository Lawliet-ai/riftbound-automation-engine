import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import { activeTriggers, cardCost, cardKind, cardPassives, playSpecFor } from '../../data/registry'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { controlledBattlefields } from '../../src/state/battlefieldControl'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { LONGTAIL16_DEFIDS } from '../../data/cards/longtail-16'

                            
                                                             
                                                  
                                           

setCardPassiveProvider(cardPassives)

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function obj(oid: string, defId: string, ctrl = P1, zone = BF0, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: specLookup(defId)?.baseMight ?? 3, baseKeywords: [], baseTypes: ['unit'],
    damage: 0, counters: {}, status: {}, ...extra,
  }
}
const unit = (oid: string, ctrl = P1, zone = BF0, might = 3): GameObject =>
  ({ ...obj(oid, 'BLK', ctrl, zone), baseMight: might })

function scene(objs: GameObject[], deck = 8): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const all = [
    ...objs,
    ...[P1, P2].flatMap((p) => Array.from({ length: deck }, (_, i) => unit(`d${p}${i}`, p, `mainDeck:${p}`))),
  ]
  for (const o of all) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones }
}
const play = (defId: string, chosen: Record<string, string> = {}) => (st: GameState) =>
  playSpecFor(defId)!.makeResolve({ movedCardOid: 'x', controller: P1 } as never)(st, chosen, undefined as never)
const handSize = (s: GameState, p = P1): number => s.zones[`hand:${p}`]?.contents.length ?? 0

describe('★【长尾批次·十六】前提', () => {
  test('登记齐,费用/战力照卡面实测取', () => {
    expect(LONGTAIL16_DEFIDS.slice().sort()).toEqual(['SFD-047', 'UNL-015', 'UNL-110'])
    expect(cardCost('UNL-015')).toEqual({ mana: 3, pips: [['red']] })
    expect(cardCost('UNL-110')).toEqual({ mana: 6, pips: [['orange'], ['orange']] })
    expect(cardCost('SFD-047')).toEqual({ mana: 5, pips: [['green']] })
    expect(cardKind('SFD-047')).toBe('unit')
    expect(specLookup('SFD-047').baseMight).toBe(5)
  })
})

describe('★★占山为王 UNL-015(抽1 + 每控制一处战场再抽1)', () => {
                                                 
  const controlling = (n: number) =>
    scene(Array.from({ length: n }, (_, i) => unit(`m${i}`, P1, [BF0, BF1][i]!)))

  test('★★压三档:控 0 处抽 1 / 控 1 处抽 2 / 控 2 处抽 3', () => {
                                                     
    const at = (n: number): number => {
      const s = controlling(n)
      expect(controlledBattlefields(s, P1)).toHaveLength(n)                  
      return handSize(applyEvents(s, play('UNL-015')(s), {}).state)
    }
    expect(at(0)).toBe(1)
    expect(at(1)).toBe(2)
    expect(at(2)).toBe(3)
  })

  test('★★没写「其他」:一处都不排除(与群峰哨站 SFD-217 正好差这两个字)', () => {
                                          
    const s = controlling(2)
    expect(handSize(applyEvents(s, play('UNL-015')(s), {}).state)).toBe(3)               
  })

  test('★★数的是【我】控制的:对手占着的战场不算', () => {
    const s = scene([unit('mine', P1, BF0), unit('foe', P2, BF1)])
    expect(controlledBattlefields(s, P1)).toEqual([BF0])
    expect(handSize(applyEvents(s, play('UNL-015')(s), {}).state)).toBe(2)
  })
})

describe('★★巨人之战 UNL-110(相互以自身战力互殴)', () => {
  const chosen = { clashOfTitans0: 'a', clashOfTitans1: 'b' }

                                       
                                                        
                                                              
  test('★★两条伤害【各以自己的战力】打对方,不是同一个数', () => {
    const s = scene([unit('a', P1, BF0, 7), unit('b', P2, BF0, 2)])
    const evs = play('UNL-110', chosen)(s)
    expect(evs).toEqual([
      { kind: 'damage', target: 'b', amount: 7, source: 'a' }, // a 的战力打到 b
      { kind: 'damage', target: 'a', amount: 2, source: 'b' }, // ⚠️ 写成两边同一个数会红
    ])
  })

  test('★★战力是【现算】的:被动加成要算进去(㉘)', () => {
                                                 
    const s = recomputeContinuous(scene([obj('garen', 'OGS-013', P1, BF0), unit('a', P1, BF0, 3), unit('b', P2, BF0, 2)]))
    const evs = play('UNL-110', chosen)(s)
    expect((evs[0] as { amount: number }).amount).toBe(4)                
  })

  test('★★两个数用【同一个结算前快照】算(⑫):互殴不因先后顺序改变', () => {
                                                
                                               
    const s = scene([unit('a', P1, BF0, 9), unit('b', P2, BF0, 4)])
    const evs = play('UNL-110', chosen)(s)
    expect(evs.map((e) => (e as { amount: number }).amount)).toEqual([9, 4])
    expect(evs.map((e) => (e as { target: string }).target)).toEqual(['b', 'a'])
  })

  test('★★「两名」不足两个就什么都不发生(含零个 / 只选一个)', () => {
    const s = scene([unit('a', P1, BF0, 5)])
    expect(play('UNL-110', {})(s)).toEqual([])
    expect(play('UNL-110', { clashOfTitans0: 'a' })(s)).toEqual([])
  })

  test('★★封顶两名:选满就不再追问,硬塞第三个也只认两个', () => {
    const s = scene([unit('a', P1, BF0, 5), unit('b', P2, BF0, 5), unit('c', P1, BF1, 5)])
    const nc = playSpecFor('UNL-110')!.makeNextChoice!({ movedCardOid: 'x', controller: P1 } as never)
    expect(nc(s, {})).not.toBeNull()
    expect(nc(s, chosen)).toBeNull()
    expect(play('UNL-110', { ...chosen, clashOfTitans2: 'c' })(s)).toHaveLength(2)
  })

  test('★没写敌我:两个都选自己的也合法(候选里双方都在)', () => {
    const s = scene([unit('a', P1, BF0, 5), unit('b', P2, BF0, 5)])
    const req = playSpecFor('UNL-110')!.makeNextChoice!({ movedCardOid: 'x', controller: P1 } as never)(s, {})!
    expect(req.candidates.map((c) => c.id).filter((i) => i !== '__done__').sort()).toEqual(['a', 'b'])
  })
})

describe('★★山猿老祖 SFD-047(你给予我增益 → 我变活跃)', () => {
  const fire = (st: GameState, ev: GameEvent, actor = P1): GameState => {
    let s = landAndEnqueueTriggers(st, [ev], activeTriggers, actor, {})
    for (const it of s.chain.filter((x: { status: string }) => x.status === 'pending')) {
      s = applyEvents(s, it.resolve(s, {}, it), {}).state
    }
    return s
  }
  const sleeping = () => obj('ape', 'SFD-047', P1, BF0, { status: { dormant: true } })

  test('★★给我上增益 → 我起身', () => {
                                                                               
                                                                                 
                                                     
                                               
                                                                   
                                                         
    const after = fire(scene([sleeping()]), { kind: 'grantBuff', target: asObjId('ape') } as GameEvent)
    expect(after.objects['ape']!.status.dormant).toBe(false)
  })

  test('★★给【队友】上增益不算(subjectIsSelf)', () => {
    const s = scene([sleeping(), unit('mate', P1, BF0)])
    const after = fire(s, { kind: 'grantBuff', target: asObjId('mate') } as GameEvent)
    expect(after.objects['ape']!.status.dormant).toBe(true)
  })

  test('★★是【你】给的才算:对手给我上增益不该让我起身(by:you)', () => {
    const s = scene([sleeping()])
    const after = fire(s, { kind: 'grantBuff', target: asObjId('ape') } as GameEvent, P2)
    expect(after.objects['ape']!.status.dormant).toBe(true)
  })

  test('★对照组:没有这张卡时,同样的事件什么也不触发', () => {
    const s = scene([unit('plain', P1, BF0)])
    expect(landAndEnqueueTriggers(s, [{ kind: 'grantBuff', target: asObjId('plain') } as GameEvent],
      activeTriggers, P1, {}).chain).toHaveLength(0)
  })
})
