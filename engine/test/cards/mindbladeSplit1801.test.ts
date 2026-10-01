                                                                               
                                                                    
  
                                                                              
                                                       
                                                          
                                                                 
                                                            
  
                                                        
                                    
import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { ChainItem } from '../../src/loop/chain'
import { playSpecFor } from '../../data/registry'
import { SFD_206_PICK } from '../../data/cards/SFD-206'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, defId: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as GameObject)

                                                                
function scene(objs: readonly GameObject[], withSpell = true): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  const chain: ChainItem[] = []
  if (withSpell) {
    objects['sc' as never] = obj('sc', 'OGN-064', P2, 'chain') as never
    chain.push({ id: 'item1', controller: P2, kind: 'spell', cardOid: asObjId('sc'), status: 'confirmed', resolve: () => [] } as unknown as ChainItem)
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones, chain } as GameState
}

const SPEC = playSpecFor('SFD-206')!
type Ev = { kind: string; target?: string; effect?: { modification: { kind: string; delta?: number } } }
const resolveWith = (s: GameState, target: string | undefined, chosen: Record<string, string>): readonly Ev[] =>
  SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1, ...(target !== undefined ? { target } : {}) } as never)(s, chosen) as unknown as readonly Ev[]

describe('★1801f 缺陷 265 · 心眼刀 negate / pump 各自独立(§359.3.e.5/.e.8)', () => {
  test('㈠ 单位在响应期离场 ⇒ 法术仍合法 ⇒ 只 negate、无 pump', () => {
    const s = scene([])                                          
    const evs = resolveWith(s, 'mine', { [SFD_206_PICK]: 'item1' })
    expect(evs.map((e) => e.kind), '★★★修前整体丢弃 ⇒ [];修后只 negate').toEqual(['negate'])
    expect(evs[0]!.target, '★无效化的是法术项 item1').toBe('item1')
    expect(evs.some((e) => e.kind === 'addEffect'), '★无 pump(单位失法)').toBe(false)
  })

  test('㈡ 法术目标离链、单位仍在 ⇒ 不 negate、无 pump(无幽灵战报条目,★1799 缺陷 256 口径)', () => {
    const s = scene([obj('mine', 'U-M', P1, BF0)], false)          
    expect(resolveWith(s, 'mine', { [SFD_206_PICK]: 'item1' }), '★法术失法 ⇒ 整条不发').toEqual([])
                                  
    const s2 = scene([obj('mine', 'U-M', P1, BF0)])
    expect(resolveWith(s2, 'mine', { [SFD_206_PICK]: 'goneItem' }), '★项目没了 ⇒ 不发 negate(否则战报幽灵条目)').toEqual([])
    expect(resolveWith(s2, 'mine', {}), '★没答法术 ⇒ 不发').toEqual([])
  })

  test('㈢ 对照:两者都合法 ⇒ negate + pump(数额=被否法术印刷法力费,OGN-064=3)', () => {
    const s = scene([obj('mine', 'U-M', P1, BF0)])
    const evs = resolveWith(s, 'mine', { [SFD_206_PICK]: 'item1' })
    expect(evs.map((e) => e.kind)).toEqual(['negate', 'addEffect'])
    expect(evs[0]).toMatchObject({ kind: 'negate', target: 'item1' })
    expect(evs[1]!.effect!.modification, '★+3 = 风之障壁的印刷法力费').toMatchObject({ kind: 'addMight', delta: 3 })
  })
})
