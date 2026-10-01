import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs } from '../../data/registry'
import { makeDianaDuelTrigger } from '../../data/cards/diana-core'
import { canPayFromState } from '../../src/game/economy'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS = { getTriggers: activeTriggers, handPlaySpecs }

function obj(id: string, defId: string, ctrl: typeof P1, zone: string, might = 2): GameObject {
  return { oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone), baseMight: might, baseKeywords: [], damage: 0, counters: {}, status: {} }
}

                                                      
function scene(): GameState {
  const base = createInitialState([P1, P2], 2)
  const diana = obj('diana', 'UNL-079', P1, 'base:P1', 3)
  const foe = obj('foe', 'BLK', P2, BF0, 2)
  const rune = obj('r1', 'rune:blue', P1, 'base:P1', 0)
  return {
    ...base, activePlayer: P1, priority: null, phase: 'main',
    objects: { diana, foe, r1: rune },
    zones: {
      ...base.zones,
      ['base:P1']: { ...base.zones['base:P1']!, contents: [asObjId('diana'), asObjId('r1')] },
      [BF0]: { ...base.zones[BF0]!, contents: [asObjId('foe')] },
    },
  }
}

describe('黛安娜·皎月化身:法术对决开始时的付{1}选项(委托人五测)', () => {
  test('移动进敌占战场→自动开战→§344.1 法术对决开始→(让过窗口后)弹出支付{1}抉择', () => {
    const g = new InteractiveGame(scene(), DEPS)
    g.apply({ kind: 'MOVE', player: P1, oid: 'diana', to: BF0 })
                             
    let sawPay = false
    for (let i = 0; i < 20; i++) {
      const p = g.pending()
      if (p.mode === 'choice') {
                                                                
                                                       
                                                                            
                                                                                       
                                                                         
        if (p.request.key.startsWith('__mayChoose__') && p.request.sourceDefId === 'UNL-079') {
          sawPay = true; expect(p.player).toBe(P1)
        }
        g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: p.request.candidates[0]!.id })
        if (sawPay) break
        continue
      }
      if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
      break
    }
    expect(sawPay).toBe(true)
  })

  test('付不起{1}(无符文无池)→ 不弹抉择,直接进反应窗口', () => {
    const s = scene()
    const noRune: GameState = {
      ...s,
      objects: { diana: s.objects['diana']!, foe: s.objects['foe']! },
      zones: { ...s.zones, ['base:P1']: { ...s.zones['base:P1']!, contents: [asObjId('diana')] } },
    }
    const g = new InteractiveGame(noRune, DEPS)
    g.apply({ kind: 'MOVE', player: P1, oid: 'diana', to: BF0 })
    expect(g.pending().mode).not.toBe('choice')
  })
})

                                             
                                                          
                                                 
                                                             
                                                        
describe('★★★★★★★ ★1447:那 1 点法力真的在确认阶段被扣走(防双扣/防白嫖)', () => {
                                                            
                                                       
                                             
  const withMana = (n: number): GameState => {
    const st = scene()
    const objects = { ...st.objects }
    delete (objects as Record<string, unknown>)['r1']
    return {
      ...st, objects,
      zones: { ...st.zones, ['base:P1']: { ...st.zones['base:P1']!, contents: [asObjId('diana')] } },
      runePools: { ...st.runePools, [P1]: { mana: n, runes: {} } },
    } as GameState
  }
  const trig = makeDianaDuelTrigger(asObjId('diana'), P1, () => true)

  test('★★★basePerform 恰好扣掉 1 点;effect 里【没有】第二笔费用', () => {
    const rich = withMana(1)
    expect(canPayFromState(rich, P1, { mana: 1 }), '★前提自证:池里有 1 点').toBe(true)
    const paid = trig.basePerform!(rich, { kind: 'duelStart' } as never, {})
    expect(paid, '★付得起 ⇒ 返回付完的 state').not.toBeNull()
    expect(canPayFromState(paid!, P1, { mana: 1 }), '★★★确认阶段那一点已经被扣走了').toBe(false)
                                              
    const evs = trig.effect(paid!, { kind: 'duelStart', battlefield: BF0 } as never, {}) as unknown as readonly { kind: string }[]
    expect(evs.filter((e) => e.kind === 'spend'), '★★★收益侧一笔费用都不该再发').toEqual([])
  })

  test('★★★池空 ⇒ basePerform 返回 null(§383.3.b.1 不确认、视为未触发)', () => {
    expect(trig.basePerform!(withMana(0), { kind: 'duelStart' } as never, {}), '★付不起 ⇒ null').toBeNull()
  })
})
