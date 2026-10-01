import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { ChainItem } from '../../src/loop/chain'
import { cardKeywords, cardKind, playSpecFor, TRIGGER_ZONE_DEFIDS } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { SFD_206_PICK } from '../../data/cards/SFD-206'

                                                                      
                                          
                       
  
           
                                                     
                                                            
                                                         
                                                       
                            

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, defId: string, who: PlayerId, zone: string, types: readonly string[] = ['unit']): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: [...types], damage: 0, counters: {}, status: {},
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
    objects['sc' as never] = obj('sc', 'OGN-064', P2, `chain`) as never
    chain.push({ id: 'item1', controller: P2, kind: 'spell', cardOid: asObjId('sc'), status: 'confirmed', resolve: () => [] } as unknown as ChainItem)
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones, chain } as GameState
}

const SPEC = playSpecFor('SFD-206')!
type Ev = { kind: string, target?: string, effect?: { modification: { kind: string, delta?: number } } }
const ask = (s: GameState, target: string | undefined, chosen: Record<string, string> = {}) =>
  SPEC.makeNextChoice!({ movedCardOid: asObjId('sp'), controller: P1, ...(target !== undefined ? { target } : {}) } as never)(s, chosen)
const resolveWith = (s: GameState, target: string | undefined, chosen: Record<string, string>): readonly Ev[] =>
  SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1, ...(target !== undefined ? { target } : {}) } as never)(s, chosen) as unknown as readonly Ev[]

describe('★ 前提:登记/①第一目标口', () => {
  test('★★★★★专属法术 2费 2pip 一橙一黄、[反应]、进 PLAY_SPECS、不进触发区;友方单位含基地', () => {
    expect(CARD_COSTS['SFD-206']).toEqual({ mana: 2, pips: 2, colors: ['orange', 'yellow'] })
    expect(SPEC.cost).toEqual({ mana: 2, pips: [['orange'], ['yellow']] })
    expect(cardKind('SFD-206')).toBe('spell')
    expect(cardKeywords('SFD-206')).toEqual(['反应'])
    expect(SPEC.target).toBe('custom')
    expect(TRIGGER_ZONE_DEFIDS).not.toContain('SFD-206')
    const s = scene([obj('mine', 'U-M', P1, BF0), obj('atBase', 'U-B', P1, `base:${P1}`),
      obj('foe', 'U-F', P2, BF0), obj('gear', 'E-G', P1, BF0, ['equipment'])])
    expect(SPEC.legalTargets(s, P1), '★友方单位含基地;敌方/装备不在').toEqual(['atBase', 'mine'])
  })
})

describe('★★★★★★★ ②第二问', () => {
  test('★★★★★★候选=链上法术项+isTarget;链上没法术 ⇒ 不问;答过不再问', () => {
    const s = scene([obj('mine', 'U-M', P1, BF0)])
    const q = ask(s, 'mine')!
    expect(q.key).toBe(SFD_206_PICK)
    expect(q.candidates.map((c) => c.id)).toEqual(['item1'])
    expect((q as { isTarget?: boolean }).isTarget, '★§355.6 第二个也是目标').toBe(true)
    expect(ask(scene([obj('mine', 'U-M', P1, BF0)], false), 'mine'), '★链上没法术').toBeNull()
    expect(ask(s, 'mine', { [SFD_206_PICK]: 'item1' })).toBeNull()
  })
})

describe('★★★★★★★ ③④结算', () => {
  test('★★★★★★③negate 该项 + pump 数额=被否法术印刷法力费(OGN-064=3,§206 现算)', () => {
    const s = scene([obj('mine', 'U-M', P1, BF0)])
    const evs = resolveWith(s, 'mine', { [SFD_206_PICK]: 'item1' })
    expect(evs).toHaveLength(2)
    expect(evs[0]).toMatchObject({ kind: 'negate', target: 'item1' })
    expect(evs[1]!.kind).toBe('addEffect')
    expect(evs[1]!.effect!.modification, '★+3 = 风之障壁的印刷法力费').toMatchObject({ kind: 'addMight', delta: 3 })
  })

  test('★★★★★④多目标部分失效:单位没了但法术仍在 ⇒ 只 negate;法术没了 ⇒ 空;两者都没 ⇒ 空(§359.3.e.5/.e.8)', () => {
    const s = scene([obj('mine', 'U-M', P1, BF0)])
                                                               
                                                                
                                                   
                                                                     
    const unitGone = resolveWith(scene([]), 'mine', { [SFD_206_PICK]: 'item1' })
    expect(unitGone.map((e) => e.kind), '★单位没了、法术仍在 ⇒ 只 negate').toEqual(['negate'])
    expect(unitGone[0]!.target, '★无效化的仍是法术项 item1').toBe('item1')
    expect(unitGone.some((e) => e.kind === 'addEffect'), '★无 pump(单位失法)').toBe(false)
                                                                      
    expect(resolveWith(s, 'mine', {}), '★没答法术 ⇒ 空').toEqual([])
    expect(resolveWith(s, 'mine', { [SFD_206_PICK]: 'goneItem' }), '★法术项已不在链上 ⇒ 空').toEqual([])
               
    expect(resolveWith(scene([]), 'mine', { [SFD_206_PICK]: 'goneItem' }), '★两者都没 ⇒ 空').toEqual([])
  })
})
