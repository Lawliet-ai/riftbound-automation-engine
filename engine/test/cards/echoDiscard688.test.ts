import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { activeTriggers, handPlaySpecs, cardCost, cardKeywords, cardKind, playBonusFor, cardDomains, playSpecFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { UNL_017_SPEC, UNL_017_ASSAULT } from '../../data/cards/UNL-017'

                                                       
                                                  
  
           
                                                                       
                                                           
                     
                                                                  
                                                                       

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, defId: string, ctrl: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)

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

const runes = (n: number): GameObject[] =>
  Array.from({ length: n }, (_, i) => ({ ...obj(`rr${i}`, 'rune:red', P1, `base:${P1}`), baseTypes: ['rune'] as never }))
const deps = { getTriggers: activeTriggers, handPlaySpecs, cardCost, cardKeywords, cardKind, playBonusFor, cardDomains }
const mk = (extraHand: number): GameState => scene([
  obj('sp', 'UNL-017', P1, `hand:${P1}`, { baseTypes: ['spell'] }),
  ...Array.from({ length: extraHand }, (_, i) => obj(`h${i}`, 'BLK', P1, `hand:${P1}`)),
  obj('tgt', 'U-T', P1, BF0), ...runes(10),
])
const acts = (g: InteractiveGame): InteractiveAction[] =>
  g.legalActions(P1).filter((a) => a.kind === 'PLAY_CARD' && (a as { cardOid: string }).cardOid === 'sp')
function drain(g: InteractiveGame): void {
  let guard = 0
  while (g.state.chain.length > 0 && guard++ < 10) {
    for (const p of [P1, P2]) {
      const pa = g.legalActions(p).find((a) => a.kind === 'PASS')
      if (pa) g.apply(pa)
    }
  }
}

describe('★ 前提:①登记与 spec 形状', () => {
  test('★★★★★法术 4费 0pip 红;echo 资源半空+echoDiscard:1;强攻4 字面量一处', () => {
    expect(CARD_COSTS['UNL-017']).toEqual({ mana: 4, pips: 0, colors: ['red'] })
    expect(cardKind('UNL-017')).toBe('spell')
    expect(playSpecFor('UNL-017')).toBe(UNL_017_SPEC)
    expect((UNL_017_SPEC as { echo?: unknown }).echo).toEqual({ mana: 0 })
    expect((UNL_017_SPEC as { echoDiscard?: number }).echoDiscard).toBe(1)
    expect(cardKeywords('UNL-017'), '★[回响]走 PlaySpec 不进 CARD_KEYWORDS(闸 326/ECHO_EXEMPT)').toEqual([])
    expect(UNL_017_ASSAULT).toBe('强攻4')
  })
})

describe('★★★★★★★ ②枚举:弃牌变体', () => {
  test('★★★★★★手牌一张 ⇒ [不付, 付+弃h0];法术自己不算可弃;手牌空 ⇒ 回响档不列、不付档在', () => {
    const vs = acts(new InteractiveGame(mk(1), deps)).map((a) => {
      const x = a as { echoPicks?: number[], echoDiscardOid?: string, target?: string }
      return { e: x.echoPicks, d: x.echoDiscardOid, t: x.target }
    })
    expect(vs).toEqual([
      { e: undefined, d: undefined, t: 'tgt' },
      { e: [0], d: 'h0', t: 'tgt' },
    ])
    const empty = acts(new InteractiveGame(mk(0), deps))
    expect(empty.filter((a) => ((a as { echoPicks?: number[] }).echoPicks ?? []).length > 0), '★没牌可弃 ⇒ 付不出这份回响').toHaveLength(0)
    expect(empty.length, '★不付档照在').toBeGreaterThan(0)
  })
})

describe('★★★★★★★ ③④apply:付费即弃+双份强攻', () => {
  test('★★★★★★★付回响:h0 真进废(§204.1.b);两条 effect(id 带 nonce 不覆盖)=§807 相加强攻8', () => {
    const g = new InteractiveGame(mk(1), deps)
    const act = acts(g).find((a) => ((a as { echoPicks?: number[] }).echoPicks ?? []).includes(0))!
    g.apply(act)
    drain(g)
    const st = g.state
    const h0 = Object.values(st.objects).find((o) => o.defId === 'BLK')!
    expect(h0.zone, '★弃牌费真付了').toBe(`discard:${P1}`)
    expect(st.continuousEffects, '★初始+回响各一条(id nonce 防覆盖)').toHaveLength(2)
    const t = recomputeContinuous(st).objects[asObjId('tgt')]!
    expect(t.derived!.keywords).toContain('强攻4')
  })

  test('★★★★★★手写不带 echoDiscardOid 的回响宣告被拒(铁律101 两道门);目标没了 resolve 空', () => {
    const g = new InteractiveGame(mk(1), deps)
    const before = g.state
    g.apply({ kind: 'PLAY_CARD', player: P1, cardOid: 'sp', target: 'tgt', echoPicks: [0], echoTargets: ['tgt'] } as unknown as InteractiveAction)
    expect(g.state, '★校验侧:不带弃牌指定=付不出').toBe(before)
    const evs = UNL_017_SPEC.makeResolve!({ movedCardOid: 'mv', controller: P1, target: 'ghost' } as never)(mk(1), {} as never, undefined as never)
    expect(evs, '★§355.8 目标离场落空').toEqual([])
  })
})
