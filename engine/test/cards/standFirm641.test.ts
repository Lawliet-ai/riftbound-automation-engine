import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKeywords, cardKind, playSpecFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { PUMP_SPELLS, countEnemiesAt, makePumpSpellSpec } from '../../data/cards/pump-spells'

                                                              
                                                     
  
           
                                    
                                
                                                        
                                                       

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

const unit = (oid: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
})
const gearObj = (oid: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId: `G-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 0, baseKeywords: [], baseTypes: ['equipment'], damage: 0, counters: {}, status: {},
} as GameObject)

                                                                                
function scene(extra: readonly GameObject[] = []): GameState {
  const base = createInitialState([P1, P2], 2)
  const bfs = zonesByKind(base, 'battlefield').map((z) => z.id as string)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  for (const o of [unit('mine', P1, bfs[0]!), unit('ally', P1, bfs[0]!),
    unit('e1', P2, bfs[0]!), unit('e2', P2, bfs[0]!), gearObj('gFoe', P2, bfs[0]!),
    unit('far', P2, bfs[1]!), unit('eBase', P2, `base:${P2}`), ...extra]) put(o)
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

const ROW = PUMP_SPELLS.find((r) => r.defId === 'SFD-001')!
const SPEC = makePumpSpellSpec(ROW)

describe('★ 前提:上游/两份 keywords/进表/行表', () => {
  test('★★★★★2费0pip红、[反应] 两份、进 PLAY_SPECS;deltaOf 档(delta 不给)', () => {
    expect(CARD_COSTS['SFD-001']).toEqual({ mana: 2, pips: 0, colors: ['red'] })
    expect(cardKind('SFD-001')).toBe('spell')
    expect(cardKeywords('SFD-001')).toEqual(['反应'])
    expect(playSpecFor('SFD-001')!.keywords).toEqual(['反应'])
    expect(ROW.delta, '★静态 delta 不给(动态档)').toBeUndefined()
    expect(ROW.deltaOf).toBeDefined()
    expect(ROW.targets).toBe('friendlyUnitOnBattlefield')
  })
})

describe('★★★★★★★ ①②数口:「此战场」的「敌方单位」', () => {
  test('★★★★★★BF0 有 e1/e2 两名敌方 ⇒ 数 2;敌方装备 gFoe/友方 ally/别处 far/基地 eBase 都不算', () => {
    expect(countEnemiesAt(scene(), P1, 'mine')).toBe(2)
  })

  test('★★★★★deltaOf = 2×数;0 名敌方 ⇒ resolve 一条都不发(「每有一名」没得加)', () => {
    const s = scene()
    expect(ROW.deltaOf!(s, P1, 'mine')).toBe(4)
                                 
    const empty = {
      ...s, objects: Object.fromEntries(Object.entries(s.objects).filter(([k]) => !['e1', 'e2', 'gFoe'].includes(k))),
    } as GameState
    expect(ROW.deltaOf!(empty, P1, 'mine')).toBe(0)
    expect(SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1, target: 'mine' } as never)(empty), '★0 ⇒ 零事件').toEqual([])
  })
})

describe('★★★★★★★ ③④结算:现算 + thisTurn', () => {
  test('★★★★★★真结算:一条 addEffect,+4(2敌×2)、时限 thisTurn、只加目标那个', () => {
    const evs = SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1, target: 'mine' } as never)(scene()) as unknown as readonly { kind: string, effect?: { duration?: string, modification?: { kind?: string, delta?: number } } }[]
    expect(evs).toHaveLength(1)
    expect(evs[0]!.kind).toBe('addEffect')
    expect(evs[0]!.effect!.duration, '★「在本回合内」').toBe('thisTurn')
    expect(evs[0]!.effect!.modification).toMatchObject({ kind: 'addMight', delta: 4 })
  })

  test('★★★★★★③㊺现算(近似冒充刀的靶):结算前又进来一名敌方 ⇒ +6 不是 +4', () => {
    const grown = scene([unit('e3', P2, zonesByKind(createInitialState([P1, P2], 2), 'battlefield').map((z) => z.id as string)[0]!)])
    const evs = SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1, target: 'mine' } as never)(grown) as unknown as readonly { effect?: { modification?: { delta?: number } } }[]
    expect(evs[0]!.effect!.modification!.delta, '★选定时 2 名、结算时 3 名 ⇒ 按 3 名算').toBe(6)
  })
})
