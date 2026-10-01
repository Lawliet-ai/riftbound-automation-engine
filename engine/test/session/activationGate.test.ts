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

function scene(extra: GameObject[], over: Partial<GameState> = {}): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of extra) {
    objects[o.oid] = o
    const z = zones[o.zone]!
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones, ...over }
           
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

                           
function withStandbyTarget(s: GameState): GameState {
  const sbZone = Object.values(s.zones).find((z) => z.kind === 'standby' && z.parentBattlefield === BF0)!
  const sb = obj('sb', 'BLK', P1, sbZone.id, { status: { faceDown: true } })
  return { ...s, objects: { ...s.objects, sb }, zones: { ...s.zones, [sbZone.id]: { ...sbZone, contents: [asObjId('sb')] } } }
}

const activateActs = (g: InteractiveGame, player = P1) =>
  g.legalActions(player).filter((a) => a.kind === 'ACTIVATE' && (a as { oid: string }).oid === 'satchel')

describe('§381/§145.2 时机门接进 activations()', () => {
  test('基线:开环主阶段,行囊技能被枚举', () => {
    const s = withStandbyTarget(scene([obj('satchel', 'OGN-181', P1, 'base:P1'), obj('p1a', 'BLK', P1, BF0)]))
    expect(activateActs(new InteractiveGame(s, DEPS)).length).toBeGreaterThan(0)
  })

  test('§145.2 法术对决期间:无权限关键词的技能不被枚举(此前是漏洞:照样列出)', () => {
    const s = withStandbyTarget(scene([obj('satchel', 'OGN-181', P1, 'base:P1'), obj('p1a', 'BLK', P1, BF0)], { spellDuelActive: true }))
    expect(activateActs(new InteractiveGame(s, DEPS))).toHaveLength(0)
  })

  test('处理器同样拒绝:硬发 ACTIVATE 不生效(服务端权威,不信客户端)', () => {
    const s = withStandbyTarget(scene([obj('satchel', 'OGN-181', P1, 'base:P1'), obj('p1a', 'BLK', P1, BF0)], { spellDuelActive: true }))
    const g = new InteractiveGame(s, DEPS)
    g.apply({ kind: 'ACTIVATE', player: P1, oid: 'satchel', ability: 'bounce', target: 'sb' })
                             
    expect(g.state.objects['sb' as never]).toBeDefined()
    expect(g.state.objects['satchel' as never]!.status.tapped).not.toBe(true)
  })
})

describe('§135.4 已贴附卡牌的印刷技能未激活', () => {
  test('行囊被贴附到单位上 → 其 [E] 技能不再被枚举,硬发也被拒', () => {
    const host = obj('host', 'BLK', P1, 'base:P1')
    const satchel = obj('satchel', 'OGN-181', P1, 'base:P1', { status: { attachedTo: asObjId('host') } })
    const s = withStandbyTarget(scene([host, satchel, obj('p1a', 'BLK', P1, BF0)]))
    const g = new InteractiveGame(s, DEPS)
    expect(activateActs(g)).toHaveLength(0)
    g.apply({ kind: 'ACTIVATE', player: P1, oid: 'satchel', ability: 'bounce', target: 'sb' })
    expect(g.state.objects['satchel' as never]!.status.tapped).not.toBe(true)
  })
})
