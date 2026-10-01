import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, cardKind } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { retrievableFromDiscard } from '../../data/cards/SFD-035'

                                                         
  
                                             
                                                           
                                        

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function warden(oid = 'w', zone = BF0, extra: Partial<GameObject> = {}): GameObject {
  const s = specLookup('SFD-035')
  return {
    oid: asObjId(oid), defId: 'SFD-035', owner: P1, controller: P1, zone: asZoneId(zone),
    baseMight: s.baseMight, baseKeywords: s.baseKeywords,
    ...(s.baseTypes ? { baseTypes: s.baseTypes } : {}),
    damage: 0, counters: {}, status: {}, ...extra,
  }
}
function dead(oid: string, defId: string, types: readonly ('unit' | 'equipment' | 'spell' | 'rune')[], owner = P1): GameObject {
  return {
    oid: asObjId(oid), defId, owner, controller: owner, zone: asZoneId(`discard:${owner}`),
    baseMight: 1, baseKeywords: [], baseTypes: types, damage: 0, counters: {}, status: {},
  }
}
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
                                                 
function holdAndResolve(
  st: GameState, battlefield = BF0, holder = P1, take = true, want?: string,
): GameState {
  let s = landAndEnqueueTriggers(
    st, [{ kind: 'hold', player: holder, battlefield, nth: 1 }], activeTriggers, holder, {})
  for (let i = 0; i < 8 && s.chain.length > 0; i++) {
    const items = s.chain.filter((it: { status: string }) => it.status === 'pending')
    if (items.length === 0) break
    for (const it of items) {
      if (!take) continue
      const chosen: Record<string, string> = {}
      for (let q = 0; q < 3; q++) {
        const req = it.nextChoice?.(s, chosen)
        if (!req) break
        const hit = want === undefined ? undefined : req.candidates.find((c) => c.label === want)
        chosen[req.key] = (hit ?? req.candidates[0]!).id
      }
      s = applyEvents(s, it.resolve(s, chosen, it), {}).state
    }
    s = { ...s, chain: s.chain.filter((it: unknown) => !items.includes(it as never)) }
  }
  return s
}
const handOf = (s: GameState): readonly string[] =>
  (s.zones[`hand:${P1}`]?.contents ?? []).map((o) => s.objects[o]?.defId ?? '')
const discardOf = (s: GameState): readonly string[] =>
  (s.zones[`discard:${P1}`]?.contents ?? []).map((o) => s.objects[o]?.defId ?? '')

describe('前提', () => {
  test('这张卡在真 registry 里是单位,印刷 6[M]', () => {
    expect(cardKind('SFD-035')).toBe('unit')
    expect(specLookup('SFD-035').baseMight).toBe(6)
  })

  test('真 registry 收得到它的触发', () => {
    expect(activeTriggers(scene([warden()])).some((t) => t.sourceOid === asObjId('w'))).toBe(true)
  })
})

describe('★候选只认单位和装备(㊼ 类型判据走 cardTypes 那一处)', () => {
  test('★废牌堆里的法术/符文不在候选内', () => {
    const st = scene([
      warden(),
      dead('u', 'D-UNIT', ['unit']),
      dead('g', 'D-GEAR', ['equipment']),
      dead('s', 'D-SPELL', ['spell']),
      dead('r', 'D-RUNE', ['rune']),
    ])
    const got = retrievableFromDiscard(st, P1).map((o) => st.objects[o]!.defId).sort()
    expect(got).toEqual(['D-GEAR', 'D-UNIT'])
  })

  test('★对手废牌堆里的不算(卡文写的是"你废牌堆里")', () => {
    const st = scene([warden(), dead('foe', 'FOE-UNIT', ['unit'], P2)])
    expect(retrievableFromDiscard(st, P1)).toHaveLength(0)
  })
})

describe('★据守时回收', () => {
  test('★接受触发 → 选中的那张从废牌堆回到手牌', () => {
    const st = scene([warden(), dead('u', 'D-UNIT', ['unit']), dead('g', 'D-GEAR', ['equipment'])])
    const s = holdAndResolve(st, BF0, P1, true, 'D-GEAR')
    expect(handOf(s)).toEqual(['D-GEAR'])
    expect(discardOf(s)).toEqual(['D-UNIT'])           
  })

  test('★不接受(可选)→ 废牌堆一动不动', () => {
    const st = scene([warden(), dead('u', 'D-UNIT', ['unit'])])
    const s = holdAndResolve(st, BF0, P1, false)
    expect(handOf(s)).toEqual([])
    expect(discardOf(s)).toEqual(['D-UNIT'])
  })

  test('废牌堆里没有单位/装备 → 什么都不做(不报错、也不凭空回手)', () => {
    const st = scene([warden(), dead('s', 'D-SPELL', ['spell'])])
    const s = holdAndResolve(st)
    expect(handOf(s)).toEqual([])
    expect(discardOf(s)).toEqual(['D-SPELL'])
  })
})

describe('★不该触发的情形', () => {
  test('★我在【别处】战场,你在这处据守 → 不触发(只靠 by:you 会误触发)', () => {
    const st = scene([warden('w', BF1), dead('u', 'D-UNIT', ['unit'])])
    const s = holdAndResolve(st, BF0)                   
    expect(handOf(s)).toEqual([])
    expect(discardOf(s)).toEqual(['D-UNIT'])
  })

  test('★据守的是【对手】 → 我这张不触发', () => {
    const st = scene([warden(), dead('u', 'D-UNIT', ['unit'])])
    const s = landAndEnqueueTriggers(
      st, [{ kind: 'hold', player: P2, battlefield: BF0, nth: 1 }], activeTriggers, P2, {})
    expect(s.chain.some((it) => it.id.includes('SFD-035-recover:w'))).toBe(false)
  })

  test('★§383.2.c 我在基地(不在战场)→ 不生效', () => {
    const st = scene([warden('w', `base:${P1}`), dead('u', 'D-UNIT', ['unit'])])
    const s = holdAndResolve(st)
    expect(handOf(s)).toEqual([])
  })
})
