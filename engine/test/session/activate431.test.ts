import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { InteractiveAction, InteractiveDeps } from '../../src/session/interactiveGame'
import { InteractiveGame } from '../../src/session/interactiveGame'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { GameEvent } from '../../src/loop/events'
import {
  activeTriggers, cardCost, cardDomains, cardKeywords, cardKind, costModsFor, handPlaySpecs, playSpecFor, activatedFor,
} from '../../data/registry'

                                                         
                                                                    
                                                        
                                                                           
                                                                  
                                         
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const GUN = 'TEST-GUN'                          

function obj(oid: string, defId: string, ctrl = P1, zone = BF0, types: readonly string[] = ['unit']): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: types as never, damage: 0, counters: {}, status: {},
  }
}
const rune = (oid: string, color: string, ctrl = P1): GameObject =>
  ({ ...obj(oid, `rune:${color}`, ctrl, `base:${ctrl}`), baseTypes: ['rune'] as never })

                                                
const REACT_CHAIN_SPEC: ActivatedSpec = {
  key: 'zap', label: '测试:付{1}对 foe 造成2伤(入链)',
  cost: { mana: 1 }, keywords: ['反应'], target: 'none',
  legalTargets: () => [],
  makeResolve: () => () => [{ kind: 'damage', target: asObjId('foe'), amount: 2 } as GameEvent],
} as unknown as ActivatedSpec
                                              
const PLAIN_CHAIN_SPEC: ActivatedSpec = {
  ...REACT_CHAIN_SPEC, key: 'plainZap', keywords: [],
} as unknown as ActivatedSpec

const deps: InteractiveDeps = {
  getTriggers: activeTriggers, handPlaySpecs, cardKeywords, cardKind, cardCost, cardDomains, costModsFor, playSpecFor,
  activatedFor: (defId: string) => (defId === GUN ? [REACT_CHAIN_SPEC, PLAIN_CHAIN_SPEC] : activatedFor(defId)),
}

   
                                    
                                                            
                                                           
                                                                    
                                                    
   
function withDecks(st: GameState, per = 5): GameState {
  const objects: Record<string, GameObject> = { ...st.objects }
  const zones = { ...st.zones }
  for (const p of st.players) {
    const zid = `mainDeck:${p}`
    const z = zones[zid]
    if (!z) continue
    const ids = Array.from({ length: per }, (_, i) => {
      const o = obj(`deck-${p}-${i}`, 'BLK', p, zid)
      objects[o.oid] = o
      return o.oid
    })
    zones[zid] = { ...z, contents: [...z.contents, ...ids] }
  }
  return { ...st, objects, zones }
}

function windowScene(): InteractiveGame {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const all = [
    obj('gun', GUN, P1, BF0),
    obj('foe', 'BLK', P2, BF0),
    obj('starter', 'SFD-087', P2, `hand:${P2}`, ['spell']),
    ...Array.from({ length: 4 }, (_, i) => rune(`r${i}`, 'green', P1)),
    ...Array.from({ length: 8 }, (_, i) => rune(`rb${i}`, 'blue', P2)),
  ]
  for (const o of all) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  const g = new InteractiveGame(
    withDecks({ ...base, activePlayer: P2, phase: 'main', objects, zones } as GameState), deps)
  const cast = g.legalActions(P2).find((a: InteractiveAction) => a.kind === 'PLAY_CARD')!
  expect(cast, '前提自证:对手起得了链').toBeDefined()
  g.apply(cast)
  g.apply({ kind: 'PASS', player: P2 })
  expect(g.pending().mode, '前提自证:P1 拿到反应窗口').toBe('window')
  return g
}

describe('🔴★★★★★窗口内入链的主动技能(通道级,426 backlog)', () => {
  test('🔴★★★枚举:带[反应]的入链技能列得出;无[反应]的列不出(canActivateNow 挡)', () => {
    const g = windowScene()
    const acts = g.legalActions(P1).filter((a) => a.kind === 'ACTIVATE')
    expect(acts.some((a) => (a as { ability: string }).ability === 'zap'), '入链+反应 ⇒ 列').toBe(true)
    expect(acts.some((a) => (a as { ability: string }).ability === 'plainZap'), '入链+无反应 ⇒ 不列').toBe(false)
  })

  test('🔴★★★★★点下去真入链、先于起链法术结算(§330 LIFO);费用真付', () => {
    const g = windowScene()
    g.apply({ kind: 'ACTIVATE', player: P1, oid: 'gun', ability: 'zap' })
                                                            
    for (let i = 0; i < 12 && g.pending().mode === 'window'; i++) {
      g.apply({ kind: 'PASS', player: (g.pending() as { player: PlayerId }).player })
    }
    expect(g.pending().mode, '链清空').toBe('action')
    const foe = Object.values(g.state.objects).find((o) => o.defId === 'BLK' && o.controller === P2)!
    expect(foe.damage, '技能真结算:foe 吃了 2 伤').toBe(2)
    const myRunes = Object.values(g.state.objects).filter((o) =>
      (o.defId as string).startsWith('rune:') && o.owner === P1)
    expect(myRunes.some((o) => o.status.tapped === true), '付{1}真横置了符文').toBe(true)
  })

  test('★付不起就不动(整个激活作废,窗口原样)', () => {
    const g = windowScene()
                            
    const s = g.state
    void s
    const win = (g as unknown as { window: { state: GameState } }).window
    const objects = { ...win.state.objects }
    for (const [id, o] of Object.entries(objects)) {
      if ((o.defId as string).startsWith('rune:') && o.owner === P1) {
        objects[id] = { ...o, status: { ...o.status, tapped: true } } as GameObject
      }
    }
    win.state = { ...win.state, objects }
    g.apply({ kind: 'ACTIVATE', player: P1, oid: 'gun', ability: 'zap' })
    expect(g.pending().mode, '没付成 ⇒ 窗口还开着').toBe('window')
                                                         
                                                   
    for (let i = 0; i < 12 && g.pending().mode === 'window'; i++) {
      g.apply({ kind: 'PASS', player: (g.pending() as { player: PlayerId }).player })
    }
    const foe = Object.values(g.state.objects).find((o) => o.defId === 'BLK' && o.controller === P2)!
    expect(foe.damage, '链清空后 foe 仍一点伤都没有(整个激活真的作废了)').toBe(0)
  })

  test('★无[反应]的入链技能点下去也不动(执行侧同一道门,铁律101)', () => {
    const g = windowScene()
    g.apply({ kind: 'ACTIVATE', player: P1, oid: 'gun', ability: 'plainZap' })
    expect(g.pending().mode, '被 canActivateNow 挡下,窗口原样').toBe('window')
  })
})
