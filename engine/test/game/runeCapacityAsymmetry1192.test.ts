import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { seedRunes, resourceCapacity, canPayFromState } from '../../src/game/economy'
import type { Cost } from '../../src/state/runePool'

                                                    
                                                                    
                                                              
                                              
                                                                     
                                                                      
  
                                                
                                                                          
                                                                    
                                       
                                                   
                                                                  
                                                          
                                                     
                                               
                                                     
                                                              
  
                                                     
                                             
                                                              

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BASE1 = `base:${P1}`

const BLUE_PIP: Cost = { mana: 0, pips: [['blue']] } as Cost
const ONE_MANA: Cost = { mana: 1 } as Cost

                                     
function board(n: number, tapCount: number): { st: GameState; runes: readonly string[] } {
  let s: GameState = createInitialState([P1, P2], 2)
  s = seedRunes(s, P1, 'blue', n)
  const base = s.zones[asZoneId(BASE1)]!
  const runes = base.contents
    .filter((o) => String(s.objects[o]?.defId ?? '').startsWith('rune:'))
    .map(String)
  expect(runes.length, '★造景自证:符文真的摆上去了').toBe(n)
  for (const oid of runes.slice(0, tapCount)) {
    const o = s.objects[asObjId(oid)]!
    s = { ...s, objects: { ...s.objects, [oid]: { ...o, status: { ...o.status, tapped: true } } } } as GameState
  }
  return { st: s, runes }
}

describe('★1192 符文容量的孪生不对称:符能源含横置 / 法力源不含', () => {
  test('★★★★【基线】全活跃 ⇒ 两个数相等(不对称此刻看不出来,是对照组)', () => {
    const { st } = board(2, 0)
    const cap = resourceCapacity(st, P1)
    expect(cap.runes['blue'], '符能源').toBe(2)
    expect(cap.activeRunes, '法力源').toBe(2)
  })

  test('⭐⭐⭐⭐⭐⭐⭐【符能源含横置】横置一枚 ⇒ runes 一分不减(§164.2.b 官方 QA)', () => {
    const cap = resourceCapacity(board(2, 1).st, P1)
    expect(
      cap.runes['blue'],
      '★★这一条守的是 runesByDomain【没有】tapped 过滤 —— 补上去它就红',
    ).toBe(2)
  })

  test('⭐⭐⭐⭐⭐⭐【法力源不含横置】同一个造景 ⇒ activeRunes 要减到 1', () => {
    const cap = resourceCapacity(board(2, 1).st, P1)
    expect(
      cap.activeRunes,
      '★★与上一条【同一个造景、两个读数】—— 不对称就在这里,谁把两边改成一致都会红一条',
    ).toBe(1)
  })

  test('⭐⭐⭐⭐⭐⭐⭐⭐【端到端·真路径】全横置仍付得出符能 pip', () => {
    const { st } = board(2, 2)
    expect(resourceCapacity(st, P1).activeRunes, '★前提自证:确实一枚活跃的都没有').toBe(0)
    expect(
      canPayFromState(st, P1, BLUE_PIP),
      '★★穿过 canPayFromState → resourceCapacity → solvePayment 整条链,不是只测纯函数',
    ).toBe(true)
  })

  test('⭐⭐⭐⭐⭐⭐⭐【端到端·反面】全横置就付不出法力(否则是印钞)', () => {
    const { st } = board(2, 2)
    expect(canPayFromState(st, P1, ONE_MANA)).toBe(false)
  })

  test('⭐⭐⭐⭐⭐⭐【别推广过头】非符文载体(能量炮台/六色之印)一个都不许进这两个数', () => {
    const { st } = board(1, 0)
    const carriers: GameObject[] = ['OGN-098', 'OGN-120'].map((defId, i) => ({
      oid: asObjId(`carrier${i}`), defId, owner: P1, controller: P1, zone: asZoneId(BASE1),
      baseMight: 0, baseKeywords: [], baseTypes: ['gear'],
      damage: 0, counters: {}, status: {},
    } as unknown as GameObject))
    const base = st.zones[asZoneId(BASE1)]!
    const s2 = {
      ...st,
      objects: { ...st.objects, ...Object.fromEntries(carriers.map((o) => [String(o.oid), o])) },
      zones: { ...st.zones, [BASE1]: { ...base, contents: [...base.contents, ...carriers.map((o) => o.oid)] } },
    } as unknown as GameState
    const cap = resourceCapacity(s2, P1)
    expect(cap.runes['blue'], '★[反应]技能载体不是「支付时点就在容量里」的资源 —— 灌进去就是印钞').toBe(1)
    expect(Object.keys(cap.runes).sort(), '★也不许凭 OGN-120 的蓝域凭空多出一个域').toEqual(['blue'])
    expect(cap.activeRunes, '★法力源同样不许把载体算进来').toBe(1)
  })
})
