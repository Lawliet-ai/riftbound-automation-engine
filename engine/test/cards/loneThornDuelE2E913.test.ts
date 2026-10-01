import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { specLookup } from '../../data/decks'
import { EMPOWER_COUNTER } from '../../src/keywords/empower'
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

function run(empowered: boolean): { g: InteractiveGame; saved: boolean; dmgEvents: number; outcome: string | undefined } {
  const base = createInitialState([asPlayerId(P1), asPlayerId(P2)], 2)
  const objects: Record<string, GameObject> = { ...base.objects }
  const zones = { ...base.zones }
  for (const o of [
    obj('raider', 'OGN-175', P1, `base:${P1}`, { baseMight: 3 }),
    obj('thorn', 'VEN-189', P1, `legend:${P1}`, empowered ? { counters: { [EMPOWER_COUNTER]: 1 } } : {}),
    obj('foe', 'OGN-175', P2, BF1, { baseMight: 5 }), // 3v5:不救必死
  ]) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  const st: GameState = { ...base, activePlayer: asPlayerId(P1), phase: 'main', objects, zones }
  const g = new InteractiveGame(st, makeGameDeps(20260826) as never)
  g.apply(g.legalActions(asPlayerId(P1)).find((a) =>
    a.kind === 'MOVE' && (a as { oid?: string }).oid === 'raider' && (a as { to?: string }).to === BF1)!)
  let saved = false
  for (let i = 0; i < 80; i++) {
    const p = g.pending()
    if (p.mode === 'action' || p.mode === 'gameover') break
    if (p.mode === 'choice') { g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: p.request.candidates[0]!.id } as never); continue }
    if (p.mode === 'window') {
      const wp = (p as { player: string }).player
      if (!saved && wp === P1) {
                                                      
        const act = g.legalActions(asPlayerId(P1)).find((a) =>
          a.kind === 'ACTIVATE' && (a as { oid?: string }).oid === 'thorn' && (a as { target?: string }).target === 'raider')
        if (act) { saved = true; g.apply(act); continue }
      }
      g.apply({ kind: 'PASS', player: wp } as never)
    }
  }
  const j = g.journal.projectFor(asPlayerId(P1), 0) as unknown as { kind?: string; outcome?: string }[]
  return { g, saved,
    dmgEvents: j.filter((e) => e.kind === 'damage').length,
    outcome: j.find((e) => e.kind === 'combatEnd')?.outcome }
}

describe('★913 离群之刺 VEN-189 × 真战斗对决', () => {
  test('未强化:对决窗口真激活、单位被拽回基地躲过必死,战斗零伤害;不解除休眠', () => {
    const r = run(false)
    expect(r.saved, '对决期间 [迅捷] 激活真列得出(带 target=raider)').toBe(true)
    expect(String(r.g.state.objects['raider']?.zone), '救回基地').toBe(`base:${P1}`)
    expect(r.g.state.objects['raider']?.status.dormant, '未强化 ⇒ 只移动,保持休眠').toBe(true)
    expect(r.g.state.objects['thorn']?.status.tapped, '刺自己横置(激活费)').toBe(true)
    expect(r.dmgEvents, '攻方撤空 ⇒ §465 零伤害').toBe(0)
    expect(r.outcome, '防守方存活判 defenderWins').toBe('defenderWins')
    expect(r.g.state.scores[P2], '首次确立控制 ⇒ 征服(§466.5.e)').toBe(1)
  })
  test('已强化:救回之外追加「变为活跃」(dormant:false)——「且如果」是追加不是替换', () => {
    const r = run(true)
    expect(String(r.g.state.objects['raider']?.zone)).toBe(`base:${P1}`)
    expect(r.g.state.objects['raider']?.status.dormant, '已强化 ⇒ 顺带解除休眠').toBe(false)
    expect(r.dmgEvents).toBe(0)
  })
})
