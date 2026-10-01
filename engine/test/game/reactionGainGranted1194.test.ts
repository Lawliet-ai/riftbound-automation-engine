import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { couldPayWithReactionGains, canPayFromState, hasGrantedSpecProvider } from '../../src/game/economy'
import { installProviders } from '../../data/gameDeps'
import type { Cost } from '../../src/state/runePool'

                               
  
                                       
                                             
                                                                   
                                                         
                                                
                                                            
                                                      
                                                                      
                                                        
                                             
                                                         
                                                              
  
                                                                
                                                         

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BASE = `base:${P1}`
const M1: Cost = { mana: 1 } as Cost
const M2: Cost = { mana: 2 } as Cost
const BLUE: Cost = { mana: 0, pips: [['blue']] } as Cost

const mk = (oid: string, defId: string, tapped: boolean, granted?: readonly string[]): GameObject => ({
  oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(BASE),
  baseMight: 1, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {},
  status: tapped ? { tapped: true } : {},
  ...(granted ? { derived: { grantedActivated: granted } } : {}),
} as unknown as GameObject)

                   
function board(objs: readonly GameObject[]): GameState {
  const s = createInitialState([P1, P2], 2)
  const base = s.zones[asZoneId(BASE)]!
  return {
    ...s,
    objects: { ...s.objects, ...Object.fromEntries(objs.map((o) => [String(o.oid), o])) },
    zones: { ...s.zones, [BASE]: { ...base, contents: objs.map((o) => o.oid) } },
    runePools: { ...s.runePools, [P1]: { mana: 0, runes: {} } },
  } as unknown as GameState
}

describe('★1194 谓词补上被授予层(§477.2)', () => {
  test('⭐⭐⭐⭐⭐⭐【provider 没被漏掉】installProviders() 之后必须装上', () => {
    installProviders()
    expect(
      hasGrantedSpecProvider(),
      '★★漏掉 gameDeps 里那一行 ⇒ 静默退化成「只看印刷面」,引擎与用例都通、真对局里是死的',
    ).toBe(true)
  })

  test('★★★★【前提自证】场景 C 的池子确实付不出', () => {
    installProviders()
    const st = board([mk('hd', 'OGN-111', false, ['UNL-093:mana']), mk('src', 'UNL-093', true)])
    expect(canPayFromState(st, P1, M1)).toBe(false)
  })

  test('⭐⭐⭐⭐⭐⭐⭐⭐【接线生效·场景 C】黑默丁格活跃 + 源已横置 ⇒ 借来那份算得出', () => {
    installProviders()
    const st = board([mk('hd', 'OGN-111', false, ['UNL-093:mana']), mk('src', 'UNL-093', true)])
    expect(
      couldPayWithReactionGains(st, P1, M1),
      '★★这正是 ★1193-B 那个反例:源被跳过、借来那份挂在活跃的借用者身上',
    ).toBe(true)
  })

  test('⭐⭐⭐⭐⭐⭐⭐【别推广过头】借用者【自己】已横置 ⇒ 借来的那份也用不了', () => {
    installProviders()
    const st = board([mk('hd', 'OGN-111', true, ['UNL-093:mana']), mk('src', 'UNL-093', true)])
    expect(
      couldPayWithReactionGains(st, P1, M1),
      '★★§376 冒号前是费用的一部分:横置的是【激活者自己】——'
      + ' 与 heimer578 那条「黑默丁格已横置 ⇒ 这条就列不出来了」同口径',
    ).toBe(false)
  })

  test('⭐⭐⭐⭐⭐⭐⭐【源也活跃 ⇒ 两份都算】物件之间不互斥', () => {
    installProviders()
    const st = board([mk('hd', 'OGN-111', false, ['UNL-093:mana']), mk('src', 'UNL-093', false)])
    expect(
      couldPayWithReactionGains(st, P1, M2),
      '★★源自己横置产一份、借用者横置产一份 —— 这是【对的】,不许因为 key 相同就去重',
    ).toBe(true)
  })

  test('⭐⭐⭐⭐⭐⭐⭐⭐【与 ★1193 互斥接上】同一物件「印刷一份 + 被授予同一条」仍只算一份', () => {
    installProviders()
                                                                  
    const st = board([mk('src', 'UNL-093', false, ['UNL-093:mana'])])
    expect(couldPayWithReactionGains(st, P1, M1), '★一份算得出').toBe(true)
    expect(
      couldPayWithReactionGains(st, P1, M2),
      '★★★接被授予层【不能】把 ★1193 那道物件内互斥绕过去 —— 绕过去就是印钞',
    ).toBe(false)
  })

  test('⭐⭐⭐⭐⭐⭐【符能通道同样接上】借来六色之印那条 ⇒ 凑得出一枚蓝', () => {
    installProviders()
    const st = board([mk('hd', 'OGN-111', false, ['sigil:blue']), mk('src', 'OGN-120', true)])
    expect(canPayFromState(st, P1, BLUE), '★前提自证').toBe(false)
    expect(couldPayWithReactionGains(st, P1, BLUE), '★别只修法力那半').toBe(true)
  })

  test('★★★★★【没有被授予时照旧】空 granted 的物件不受影响', () => {
    installProviders()
    expect(couldPayWithReactionGains(board([mk('src', 'UNL-093', false)]), P1, M1), '★印刷面那条照常算').toBe(true)
    expect(couldPayWithReactionGains(board([mk('src', 'UNL-093', true)]), P1, M1), '★已横置照常不算').toBe(false)
  })
})
