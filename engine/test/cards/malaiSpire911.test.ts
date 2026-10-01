import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { specLookup } from '../../data/decks'
import { writeControl } from '../../src/state/battlefieldControl'
import { addMana, emptyRunePool } from '../../src/state/runePool'
import { installProviders, makeGameDeps } from '../../data/gameDeps'

                                                
  
                                                         
                                  
                                                                       
                                                     
                                           
                                                
  
                                              

installProviders()

const P1 = 'P1'
const P2 = 'P2'
const BF1 = 'battlefield:shared:1'

function obj(oid: string, defId: string, ctrl: string, zone: string, extra: Partial<GameObject> = {}): GameObject {
  const spec = (specLookup(defId) ?? {}) as Partial<GameObject>
  return {
    ...spec,
    oid: asObjId(oid), defId, owner: asPlayerId(ctrl), controller: asPlayerId(ctrl), zone: asZoneId(zone),
    baseMight: spec.baseMight ?? 3, baseKeywords: spec.baseKeywords ?? [], baseTypes: spec.baseTypes ?? ['unit'],
    damage: 0, counters: {}, status: {}, ...extra,
  } as GameObject
}

function scene(withSpire: boolean): GameState {
  const base = createInitialState([asPlayerId(P1), asPlayerId(P2)], 2)
  const objects: Record<string, GameObject> = { ...base.objects }
  const zones = { ...base.zones }
                              
  for (const o of [obj('me', 'OGN-175', P1, BF1), obj('wild', 'SFD-034', P1, `hand:${P1}`)]) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  let s: GameState = { ...base, activePlayer: asPlayerId(P1), phase: 'main', objects, zones,
    runePools: { ...base.runePools, [P1]: addMana(emptyRunePool(), 9) } }
  if (withSpire) {
                                                                                     
    s = { ...s, battlefieldCards: { ...(s.battlefieldCards ?? {}), [BF1]: { defId: 'SFD-211', owner: asPlayerId(P1) } } } as GameState
    s = writeControl(s, BF1, asPlayerId(P1))
  }
  return s
}

                                              
function dues(withSpire: boolean): { plain: number | undefined; echoed: number | undefined; g: InteractiveGame } {
  const g = new InteractiveGame(scene(withSpire), makeGameDeps(20260826) as never)
  const acts = g.legalActions(asPlayerId(P1))
    .filter((a): a is InteractiveAction & { cardOid: string; echoPicks?: number[]; due?: { mana?: number } } =>
      a.kind === 'PLAY_CARD' && (a as { cardOid?: string }).cardOid === 'wild')
  const plain = acts.find((a) => (a.echoPicks ?? []).length === 0)
  const echoed = acts.find((a) => (a.echoPicks ?? []).length === 1)
  return { plain: plain?.due?.mana, echoed: echoed?.due?.mana, g }
}

describe('★911 玛莱尖塔:友方回响费 -1(通道接线)', () => {
  test('受控玛莱在场:付回响的总价 2+2-1=3;不付回响仍 2(减的是回响那份,不碰基础费)', () => {
    const { plain, echoed } = dues(true)
    expect(plain, '不付回响:基础费原样').toBe(2)
    expect(echoed, '付回响:2 + (2-1)').toBe(3)
  })
  test('对照无玛莱:付回响 4、不付 2', () => {
    const { plain, echoed } = dues(false)
    expect(plain).toBe(2)
    expect(echoed, '2 + 2,一分不少').toBe(4)
  })
  test('apply 侧同价(㉖ 两道门):付回响真扣 3 法力', () => {
    const { g } = dues(true)
    const act = g.legalActions(asPlayerId(P1)).find((a) =>
      a.kind === 'PLAY_CARD' && (a as { cardOid?: string }).cardOid === 'wild'
      && ((a as { echoPicks?: number[] }).echoPicks ?? []).length === 1)
    expect(act).toBeDefined()
    const before = g.state.runePools[P1]?.mana ?? 0
    g.apply(act!)
    expect(before - (g.state.runePools[P1]?.mana ?? 0), '真扣的钱与枚举报价一致').toBe(3)
  })
})
