import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, cardKind } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { onOpponentTurn } from '../../data/cards/SFD-063'
import { canDormantSelf } from '../../data/cards/dormant-self-cost'

                                                   
                         
  
                                               
                                         

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function barrel(oid = 'b', extra: Partial<GameObject> = {}): GameObject {
  const s = specLookup('SFD-063')
  return {
    oid: asObjId(oid), defId: 'SFD-063', owner: P1, controller: P1, zone: asZoneId(`base:${P1}`),
    baseMight: s.baseMight, baseKeywords: s.baseKeywords,
    ...(s.baseTypes ? { baseTypes: s.baseTypes } : {}),
    damage: 0, counters: {}, status: {}, ...extra,
  }
}
function spellCard(oid: string, owner = P1): GameObject {
  return {
    oid: asObjId(oid), defId: 'SPL', owner, controller: owner, zone: asZoneId(`hand:${owner}`),
    baseMight: 0, baseKeywords: [], baseTypes: ['spell'], damage: 0, counters: {}, status: {},
  }
}
                           
function scene(objs: GameObject[], activeTurn = P2): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: activeTurn, phase: 'main', objects, zones }
}
                                             
function castAndResolve(st: GameState, take = true, caster = P1): GameState {
  let s = landAndEnqueueTriggers(
                                                       
                                                                         
    st, [{ kind: 'spellResolved', player: caster, cardOid: asObjId('s1') }], activeTriggers, caster, {})
  for (let i = 0; i < 8 && s.chain.length > 0; i++) {
    const items = s.chain.filter((it: { status: string }) => it.status === 'pending')
    if (items.length === 0) break
    for (const it of items) {
      if (!take) continue
                                                                
      const paid = it.basePerform ? it.basePerform(s, {}) : s
      if (paid === null) continue
      s = applyEvents(paid, it.resolve(paid, {}, it), {}).state
    }
    s = { ...s, chain: s.chain.filter((it: unknown) => !items.includes(it as never)) }
  }
  return s
}
                   
function goldTokens(s: GameState): readonly GameObject[] {
  return Object.values(s.objects).filter((o) => o.defId === 'token:金币' && o.controller === P1)
}

describe('前提', () => {
  test('这张卡在真 registry 里是装备', () => {
    expect(cardKind('SFD-063')).toBe('equipment')
    expect(specLookup('SFD-063').baseTypes).toEqual(['equipment'])
  })

  test('真 registry 收得到它的触发', () => {
    expect(activeTriggers(scene([barrel(), spellCard('s1')])).some((t) => t.sourceOid === asObjId('b'))).toBe(true)
  })

  test('开局基地里本来没有金币(否则下面"多了一个"压不住)', () => {
    expect(goldTokens(scene([barrel(), spellCard('s1')]))).toHaveLength(0)
  })
})

describe('★对手回合内打法术', () => {
  test('★接受触发 → 桶横置、基地多一个【休眠的】金币', () => {
    const s = castAndResolve(scene([barrel(), spellCard('s1')]))
    expect(s.objects['b']!.status.tapped).toBe(true)         
    const gold = goldTokens(s)
    expect(gold).toHaveLength(1)
    expect(gold[0]!.status.tapped).toBe(true)                     
    expect(s.zones[`base:${P1}`]!.contents).toContain(gold[0]!.oid)                
  })

  test('★不接受(可选)→ 桶没横置、也没金币', () => {
    const s = castAndResolve(scene([barrel(), spellCard('s1')]), false)
    expect(s.objects['b']!.status.tapped).not.toBe(true)
    expect(goldTokens(s)).toHaveLength(0)
  })
})

describe('★不该触发的情形', () => {
  test('★【自己】回合内打法术 → 不触发(这一条是这张卡的全部意义)', () => {
    const st = scene([barrel(), spellCard('s1')], P1)
    expect(onOpponentTurn(st, P1)).toBe(false)
    const s = castAndResolve(st)
    expect(s.objects['b']!.status.tapped).not.toBe(true)
    expect(goldTokens(s)).toHaveLength(0)
  })

  test('★法术是【对手】打的 → 不触发(卡文写的是"当你打出")', () => {
    const st = scene([barrel(), spellCard('s1', P2)], P2)
    const s = castAndResolve(st, true, P2)
    expect(s.objects['b']!.status.tapped).not.toBe(true)
    expect(goldTokens(s)).toHaveLength(0)
  })

  test('★桶已横置 → 付不出费用,整条不执行(不能白拿金币)', () => {
    const st = scene([barrel('b', { status: { tapped: true } }), spellCard('s1')])
    expect(canDormantSelf(st, asObjId('b'))).toBe(false)
    expect(goldTokens(castAndResolve(st))).toHaveLength(0)
  })

  test('★§383.2.c 桶在手牌里 → 不生效', () => {
    const inHand = { ...barrel(), zone: asZoneId(`hand:${P1}`) }
    const st = scene([inHand, spellCard('s1')])
    expect(canDormantSelf(st, asObjId('b'))).toBe(false)
    expect(goldTokens(castAndResolve(st))).toHaveLength(0)
  })
})
