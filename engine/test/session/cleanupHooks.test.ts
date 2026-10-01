import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, activatedFor, cardKind } from '../../data/registry'

                                                      
                                                              
                             

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS: InteractiveDeps = { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, activatedFor, cardKind }

function obj(id: string, defId: string, ctrl: typeof P1, zone: string, extra: Partial<GameObject> = {}): GameObject {
  return { oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone), baseMight: 2, baseKeywords: [], damage: 0, counters: {}, status: {}, ...extra }
}

function scene(extra: GameObject[]): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of extra) {
    objects[o.oid] = o
    const z = zones[o.zone]!
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones }
  let i = 0
  for (const p of [P1, P2]) {
    for (let k = 0; k < 4; k++) {
      const id = `deck${i++}`
      const c = obj(id, 'BLK', p, `mainDeck:${p}`)
      s = { ...s, objects: { ...s.objects, [id]: c }, zones: { ...s.zones, [`mainDeck:${p}`]: { ...s.zones[`mainDeck:${p}`]!, contents: [...s.zones[`mainDeck:${p}`]!.contents, asObjId(id)] } } }
    }
  }
  return s
}

   
                                           
                                                                                       
   
function nudge(g: InteractiveGame): void {
  const play = g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === 'nudger')
  expect(play).toBeDefined()                           
  g.apply(play!)
  for (let i = 0; i < 8 && g.pending().mode === 'window'; i++) {
    const p = g.pending()
    if (p.mode === 'window') g.apply({ kind: 'PASS', player: p.player })
  }
}

describe('§323.2.c 无战斗时的残留攻防身份被清理步清除', () => {
  test('伪造的 attacking 状态在下一次清理时被剥掉', () => {
    const g = new InteractiveGame(scene([
      obj('nudger', 'BLK', P1, `hand:${P1}`),
      obj('stale', 'BLK', P2, BF0, { status: { attacking: true, defending: true } }),
    ]), DEPS)
    nudge(g)             
    const after = g.state.objects['stale' as never]!
    expect(after.status.attacking).toBeUndefined()
    expect(after.status.defending).toBeUndefined()
  })
})

describe('§323.7 散装备清扫接进真实对局', () => {
  test('战场上未贴附的装备(cardKind 判据,无 baseTypes)在清理步被召回控制者基地', () => {
                                                                             
    const g = new InteractiveGame(scene([
      obj('nudger', 'BLK', P1, `hand:${P1}`),
      obj('satchel', 'OGN-181', P1, BF0),
    ]), DEPS)
    nudge(g)
    expect(g.state.objects['satchel' as never]!.zone).toBe(`base:${P1}`)
  })

  test('已贴附在战场单位身上的装备不动(§323.7 只召回"未贴附"的)', () => {
    const g = new InteractiveGame(scene([
      obj('nudger', 'BLK', P1, `hand:${P1}`),
      obj('host', 'BLK', P1, BF0),
      obj('satchel', 'OGN-181', P1, BF0, { status: { attachedTo: asObjId('host') } }),
    ]), DEPS)
    nudge(g)
    expect(g.state.objects['satchel' as never]!.zone).toBe(BF0)
  })
})
