import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { SFD_200_SPEC, SFD_200_ALLY } from '../../data/cards/SFD-200'
import { OGN_242_SPEC, hookCandidates } from '../../data/cards/OGN-242'

const OGN_242_PICK = 'hookPick'                             

                                                                                                     
                                                                                                    
                                                                                  

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 4, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) { objects[o.oid] = o; const z = zones[o.zone]!; zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}
const kinds = (evs: readonly GameEvent[]) => evs.map((e) => (e as { kind: string }).kind)

describe('★★★★★ ★1257 结算侧复验(闪现 / 海兽钓钩)', () => {
  test('🔴★★★★闪现 SFD-200:blinkAlly 答的是【敌方控制】的单位 ⇒ 不在 blinkAllies ⇒ 不放逐;对照 我控的 ⇒ 放逐(带 by)', () => {
    const s = scene([obj('sp', 'SFD-200', P1, 'chain:shared', { baseTypes: ['spell'] as never, baseMight: 0 }), obj('enemy', 'U-E', P2, BF0), obj('mine', 'U-A', P1, BF0)])
    const resolve = (chosen: Record<string, string>) => (SFD_200_SPEC as unknown as { makeResolve: (c: object) => (s: GameState, ch: Record<string, string>) => readonly GameEvent[] }).makeResolve({ movedCardOid: 'sp', controller: P1 })(s, chosen)
    const bad = resolve({ [SFD_200_ALLY]: 'enemy' }) as readonly { kind: string; target?: string }[]
    expect(bad.filter((e) => e.kind === 'banish').map((e) => e.target), '★复验拒:候选期只可能是友方,结算时答敌方 ⇒ 不放逐它(修前照放逐);没放逐成时闪现只自我放逐').toEqual(['sp'])
    const ok = resolve({ [SFD_200_ALLY]: 'mine' })
    expect(ok.find((e) => (e as { kind: string }).kind === 'banish'), '★对照:合法候选 ⇒ 放逐').toMatchObject({ target: 'mine', by: 'sp' })
  })

  test('🔴★★★★海兽钓钩 OGN-242:hookPick 答的是顶五张里战力超标的单位(在 seen、不在 hookCandidates)⇒ 不放逐、全回收;对照 合法 ⇒ 放逐', () => {
    const s = scene([
      obj('h', 'OGN-242', P1, `base:${P1}`, { baseTypes: ['equipment'] as never, baseMight: 0 }),
      obj('sac', 'U-SAC', P1, BF0, { baseMight: 4 }),
      obj('big', 'DK-big', P1, `mainDeck:${P1}`, { baseMight: 9 }),
      obj('ok', 'DK-ok', P1, `mainDeck:${P1}`, { baseMight: 4 }),
    ])
    expect([...hookCandidates(s, P1, 4)], '★前提:阈值 4+1 ⇒ 只有 ok 是候选,big 在顶五张里但超标').toEqual(['ok'])
    const resolve = (chosen: Record<string, string>) => OGN_242_SPEC.makeResolve({ selfOid: 'h', controller: P1, target: 'sac' } as never)(s, chosen)
    expect(kinds(resolve({ [OGN_242_PICK]: 'big' })), '★复验拒:摧毁 + 全回收,没有 banish(修前 seen.includes 就放行)').toEqual(['destroy', 'recycle'])
    expect(kinds(resolve({ [OGN_242_PICK]: 'ok' })), '★对照:合法候选 ⇒ 摧毁 + 放逐 + 回收其余').toEqual(['destroy', 'banish', 'recycle'])
  })
})
