import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, cardKind } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { canDormantSelf } from '../../data/cards/dormant-self-cost'

                                            
                                
  
                                                          
                                         
                                                  

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function altar(oid = 'k', extra: Partial<GameObject> = {}): GameObject {
  const s = specLookup('SFD-169')
  return {
    oid: asObjId(oid), defId: 'SFD-169', owner: P1, controller: P1, zone: asZoneId(`base:${P1}`),
    baseMight: s.baseMight, baseKeywords: s.baseKeywords,
    ...(s.baseTypes ? { baseTypes: s.baseTypes } : {}),
    damage: 0, counters: {}, status: {}, ...extra,
  }
}
function unit(oid: string, controller = P1): GameObject {
  return {
    oid: asObjId(oid), defId: 'BLK', owner: controller, controller, zone: asZoneId(BF0),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  }
}
function card(oid: string, defId: string, zone: string): GameObject {
  return {
    oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(zone),
    baseMight: 0, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  }
}
function scene(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
                                     
  const all = [...objs, card('deckBottom', 'D-BOT', `mainDeck:${P1}`), card('deckTop', 'D-TOP', `mainDeck:${P1}`)]
  for (const o of all) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones }
}
function hand(s: GameState): readonly string[] {
  return (s.zones[`hand:${P1}`]?.contents ?? []).map((o) => s.objects[o]?.defId ?? '')
}
function deck(s: GameState): readonly string[] {
  return (s.zones[`mainDeck:${P1}`]?.contents ?? []).map((o) => s.objects[o]?.defId ?? '')
}

   
                                         
  
                                                             
                                                 
                                       
   
function killAndResolve(
  st: GameState, victim: string, take = true, answers: Record<string, string> = {}, actor = P1,
): GameState {
  let s = landAndEnqueueTriggers(st, [{ kind: 'destroy', target: asObjId(victim) }], activeTriggers, actor, {})
  for (let i = 0; i < 10 && s.chain.length > 0; i++) {
    const items = s.chain.filter((it: { status: string }) => it.status === 'pending')
    if (items.length === 0) break
    for (const it of items) {
      if (!take) continue
                                                                                            
      const paid = it.basePerform ? it.basePerform(s, {}) : s
      if (paid === null) continue
      s = paid
                                           
      const chosen: Record<string, string> = {}
      for (let q = 0; q < 4; q++) {
        const req = it.nextChoice?.(s, chosen)
        if (!req) break
        const want = answers[req.key]
        const hit = want === undefined ? undefined : req.candidates.find((c) => c.label === want || c.id === want)
        chosen[req.key] = (hit ?? req.candidates[0]!).id
      }
      s = applyEvents(s, it.resolve(s, chosen, it), {}).state
    }
    s = { ...s, chain: s.chain.filter((it: unknown) => !items.includes(it as never)) }
  }
  return s
}

describe('前提', () => {
  test('这张卡在真 registry 里是装备', () => {
    expect(cardKind('SFD-169')).toBe('equipment')
    expect(specLookup('SFD-169').baseTypes).toEqual(['equipment'])
  })

  test('真 registry 收得到它的触发', () => {
    expect(activeTriggers(scene([altar(), unit('u')])).some((t) => t.sourceOid === asObjId('k'))).toBe(true)
  })

  test('开局手牌是空的、牌堆两张(顶 D-TOP、底 D-BOT)', () => {
    const s = scene([altar(), unit('u')])
    expect(hand(s)).toEqual([])
    expect(deck(s)).toEqual(['D-BOT', 'D-TOP'])
  })
})

describe('★友方单位被摧毁', () => {
  test('★接受触发 → 祭坛横置、抽到牌堆顶那张', () => {
    const s = killAndResolve(scene([altar(), unit('u')]), 'u')                         
    expect(s.objects['k']!.status.tapped).toBe(true)         
                                                  
    expect(deck(s)).toEqual(['D-BOT', 'D-TOP'])
    expect(hand(s)).toEqual([])
  })

  test('★放到【底部】→ 真的落在 index 0(不是默认追加到顶)', () => {
    const s = killAndResolve(scene([altar(), unit('u')]), 'u', true, { where: 'bottom' })
    expect(deck(s)).toEqual(['D-TOP', 'D-BOT'])             
  })

  test('★刚抽到的那张也能放回去——证明选择发生在抽牌【之后】', () => {
                                                           
    const s0 = scene([altar(), unit('u'), card('old', 'OLD', `hand:${P1}`)])
    const s = killAndResolve(s0, 'u', true, { card: 'D-TOP', where: 'bottom' })              
    expect(hand(s)).toEqual(['OLD'])              
    expect(deck(s)).toEqual(['D-TOP', 'D-BOT'])
  })

  test('★不接受(可选)→ 祭坛没横置、没抽也没放', () => {
    const s = killAndResolve(scene([altar(), unit('u')]), 'u', false)
    expect(s.objects['k']!.status.tapped).not.toBe(true)
    expect(hand(s)).toEqual([])
    expect(deck(s)).toEqual(['D-BOT', 'D-TOP'])
  })

  test('★【对手】摧毁我的单位也算(卡文没写谁摧毁的)', () => {
    const s = killAndResolve(scene([altar(), unit('u')]), 'u', true, {}, P2)
    expect(s.objects['k']!.status.tapped).toBe(true)
  })
})

describe('★不该触发的情形', () => {
  test('★死的是【敌方】单位 → 不触发(卡文写的是"友方单位")', () => {
    const s = killAndResolve(scene([altar(), unit('e', P2)]), 'e')
    expect(s.objects['k']!.status.tapped).not.toBe(true)
    expect(deck(s)).toEqual(['D-BOT', 'D-TOP'])
  })

  test('★死的是友方【装备】→ 不触发(卡文写的是"一名单位")', () => {
    const gear = { ...unit('g'), defId: 'G', baseTypes: ['equipment'] as const, baseMight: 0 }
    const s = killAndResolve(scene([altar(), gear]), 'g')
    expect(s.objects['k']!.status.tapped).not.toBe(true)
  })

  test('★祭坛已横置 → 付不出费用,整条不执行(不能白抽一张)', () => {
    const st = scene([altar('k', { status: { tapped: true } }), unit('u')])
    expect(canDormantSelf(st, asObjId('k'))).toBe(false)
    expect(deck(killAndResolve(st, 'u'))).toEqual(['D-BOT', 'D-TOP'])
  })

  test('★§383.2.c 祭坛在手牌里 → 不生效', () => {
    const inHand = { ...altar(), zone: asZoneId(`hand:${P1}`) }
    const st = scene([inHand, unit('u')])
    expect(canDormantSelf(st, asObjId('k'))).toBe(false)
    expect(deck(killAndResolve(st, 'u'))).toEqual(['D-BOT', 'D-TOP'])
  })
})
