import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { couldPayWithReactionGains } from '../../src/game/economy'
import { installProviders } from '../../data/gameDeps'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { Cost } from '../../src/state/runePool'

                                                            
  
                                                                 
                                                                            
  
                                                
                                                         
                                                                  
                                                                 
                                                      
                                                         
                                                        
  
                                                                           
                                                                

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BASE = `base:${P1}`
const M1: Cost = { mana: 1 } as Cost
const M2: Cost = { mana: 2 } as Cost
const M3: Cost = { mana: 3 } as Cost

const spec = (key: string, tap: boolean): ActivatedSpec => ({
  key, cost: {}, keywords: ['反应'], fastResolve: true, tapSelf: tap,
  makeResolve: ({ controller }: { controller: string }) => () =>
    [{ kind: 'gainResource', player: controller, mana: 1 }],
} as unknown as ActivatedSpec)

const mk = (oid: string, defId: string, attachedTo?: string): GameObject => ({
  oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(BASE),
  baseMight: 1, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {},
  status: attachedTo ? { attachedTo } : {},
} as unknown as GameObject)

                                                   
function board(hostDef: string, n: number, extra: readonly GameObject[] = []): GameState {
  const s = createInitialState([P1, P2], 2)
  const objs = [mk('host', hostDef), ...Array.from({ length: n }, (_, i) => mk(`sh${i}`, 'SFD-059', 'host')), ...extra]
  const base = s.zones[asZoneId(BASE)]!
  return {
    ...s,
    objects: { ...s.objects, ...Object.fromEntries(objs.map((o) => [String(o.oid), o])) },
    zones: { ...s.zones, [BASE]: { ...base, contents: objs.map((o) => o.oid) } },
    runePools: { ...s.runePools, [P1]: { mana: 0, runes: {} } },
  } as unknown as GameState
}
                          
const pv = (tap: boolean) => (defId: string): readonly ActivatedSpec[] => (defId === 'D' ? [spec('D:gain', tap)] : [])

describe('★1195 尚歌复制层(缺陷 133 的最后一层)', () => {
  test('★★★★★【对照组】非 tapSelf、不贴尚歌 ⇒ 只有印刷那一份', () => {
    installProviders()
    expect(couldPayWithReactionGains(board('D', 0), P1, M1, pv(false)), '★一份算得出').toBe(true)
    expect(couldPayWithReactionGains(board('D', 0), P1, M2, pv(false)), '★没有第二份').toBe(false)
  })

  test('⭐⭐⭐⭐⭐⭐⭐⭐【接线生效·靶心】非 tapSelf + 贴 1 张尚歌 ⇒ 两份都算得出', () => {
    installProviders()
    expect(
      couldPayWithReactionGains(board('D', 1), P1, M2, pv(false)),
      '★★★这是整组闸里【唯一】对「接没接尚歌层」有判别力的一条 ——'
      + ' 真卡造景全被 tapSelf 互斥吃掉,只有非 tapSelf 才照得出这条通路',
    ).toBe(true)
  })

  test('⭐⭐⭐⭐⭐⭐⭐【份数要对】非 tapSelf + 贴 2 张 ⇒ 印刷 1 + 复制 2 = 三份', () => {
    installProviders()
    expect(couldPayWithReactionGains(board('D', 2), P1, M3, pv(false)), '★不是「有尚歌就 +1」,是按张数各挂一份').toBe(true)
    expect(couldPayWithReactionGains(board('D', 2), P1, { mana: 4 } as Cost, pv(false)), '★也不许多算').toBe(false)
  })

  test('⭐⭐⭐⭐⭐⭐⭐⭐【与 ★1193 互斥接上】tapSelf + 贴尚歌 ⇒ 仍只算一份', () => {
    installProviders()
    expect(couldPayWithReactionGains(board('D', 1), P1, M1, pv(true)), '★一份算得出').toBe(true)
    expect(
      couldPayWithReactionGains(board('D', 1), P1, M2, pv(true)),
      '★★横置一次只能激活一条 —— 接尚歌层【不能】把上一轮刚修的互斥绕过去',
    ).toBe(false)
  })

  test('⭐⭐⭐⭐⭐⭐【贴多张也一样】tapSelf + 贴 3 张尚歌 ⇒ 仍只算一份', () => {
    installProviders()
    expect(couldPayWithReactionGains(board('D', 3), P1, M2, pv(true))).toBe(false)
  })

  test('⭐⭐⭐⭐⭐⭐⭐【当前卡池的真实情况】真卡 UNL-093 贴尚歌 ⇒ 仍只算一份', () => {
    installProviders()
                                                    
    expect(couldPayWithReactionGains(board('UNL-093', 1), P1, M1), '★印刷那份照常').toBe(true)
    expect(
      couldPayWithReactionGains(board('UNL-093', 1), P1, M2),
      '★★UNL-093 是 tapSelf ⇒ 尚歌复制份拿不到第二次;这条【对接没接没有判别力】,靠上面那条靶心',
    ).toBe(false)
  })

  test('⭐⭐⭐⭐⭐⭐【别推广过头】尚歌贴在【别的】物件上 ⇒ 不复制到本物件', () => {
    installProviders()
    const other = mk('other', 'X')
    const st = board('D', 0, [other, mk('sh9', 'SFD-059', 'other')])
    expect(couldPayWithReactionGains(st, P1, M2, pv(false)), '★`shangeCopies` 按 attachedTo 认宿主').toBe(false)
    expect(couldPayWithReactionGains(st, P1, M1, pv(false)), '★本物件那一份照常').toBe(true)
  })

  test('⭐⭐⭐⭐⭐⭐⭐【不复制被授予的】QA L184:granted 那份不进尚歌复制', () => {
    installProviders()
                                              
    const st = {
      ...board('EMPTY', 1),
    } as GameState
    const withGrant = {
      ...st,
      objects: {
        ...st.objects,
        host: { ...(st.objects[asObjId('host')] as GameObject), derived: { grantedActivated: ['G:gain'] } },
      },
    } as unknown as GameState
    const grantFn = (k: string): ActivatedSpec | undefined => (k === 'G:gain' ? spec('G:gain', false) : undefined)
    const none = (): readonly ActivatedSpec[] => []
    expect(couldPayWithReactionGains(withGrant, P1, M1, none, undefined, grantFn), '★被授予那份算得出').toBe(true)
    expect(
      couldPayWithReactionGains(withGrant, P1, M2, none, undefined, grantFn),
      '★★`withShangeCopies` 只包印刷面 —— 被授予的不复制(QA L184),包错了这条会红',
    ).toBe(false)
  })
})
