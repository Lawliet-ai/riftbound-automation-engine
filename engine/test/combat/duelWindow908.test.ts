import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { specLookup } from '../../data/decks'
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
const blank = (oid: string, ctrl: string, zone: string, might: number): GameObject =>
  obj(oid, 'OGN-175', ctrl, zone, { baseMight: might })

function scene(objs: GameObject[]): GameState {
  const base = createInitialState([asPlayerId(P1), asPlayerId(P2)], 2)
  const objects: Record<string, GameObject> = { ...base.objects }
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
                                            
  return { ...base, activePlayer: asPlayerId(P1), phase: 'main', objects, zones,
    runePools: { ...base.runePools, [P1]: addMana(emptyRunePool(), 3) } }
}

type JEv = { kind?: string; targetOid?: string; amount?: number; defId?: string; outcome?: string }

                                                      
function run(objs: GameObject[], mover: string, playCardOid?: string): { g: InteractiveGame; j: JEv[] } {
  const g = new InteractiveGame(scene(objs), makeGameDeps(20260826) as never)
  const mv = g.legalActions(asPlayerId(P1)).find((a) =>
    a.kind === 'MOVE' && (a as { oid?: string }).oid === mover && (a as { to?: string }).to === BF1)
  expect(mv, 'MOVE 进 BF1 必须合法').toBeDefined()
  g.apply(mv!)
  let played = false
  for (let i = 0; i < 80; i++) {
    const p = g.pending()
    if (p.mode === 'action' || p.mode === 'gameover') break
    if (p.mode === 'choice') { g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: p.request.candidates[0]!.id } as never); continue }
    if (p.mode === 'window') {
      const wp = (p as { player: string }).player
      if (!played && playCardOid && wp === P1) {
        const act = g.legalActions(asPlayerId(P1)).find((a) => (a as { cardOid?: string }).cardOid === playCardOid)
        expect(act, '对决窗口里那张反应必须列得出([反应] §813.1.c.1)').toBeDefined()
        played = true
        g.apply(act!)
        continue
      }
      g.apply({ kind: 'PASS', player: wp } as never)
    }
  }
  return { g, j: g.journal.projectFor(asPlayerId(P1), 0) as unknown as JEv[] }
}

describe('★908 对决中反应改变战局 → §465 伤害步按现状重算', () => {
  test('飓风削防:杀掉 1 战力防守、削伤 3 战力防守 ⇒ 分配读对决后的 lethal(3-1=2)', () => {
    const { g, j } = run([
      blank('atk', P1, `base:${P1}`, 5),
      obj('storm', 'OGN-133', P1, `hand:${P1}`),
      blank('weak', P2, BF1, 1), blank('tough', P2, BF1, 3),
    ], 'atk', 'storm')
    const byStorm = j.filter((e) => e.kind === 'damage' && e.defId === 'OGN-133')
    expect(byStorm.map((e) => e.targetOid).sort(), '飓风不分敌我全场各 1 点(带 defId 归因)').toEqual(['atk', 'tough', 'weak'])
    const combatDmg = j.filter((e) => e.kind === 'damage' && e.defId === undefined)
                                                                              
                                                                
    expect(combatDmg.find((e) => e.targetOid === 'tough')?.amount, '唯一防守方吃攻方全部 5 点(致命额 2 只在尚有其他单位时封顶)').toBe(5)
    expect(combatDmg.some((e) => e.targetOid === 'weak'), 'weak 在对决里已死,伤害步不再分它').toBe(false)
    expect(combatDmg.find((e) => e.targetOid === 'atk')?.amount, '防方战力只剩 tough 那 3 点').toBe(3)
    expect(j.find((e) => e.kind === 'combatEnd')?.outcome).toBe('attackerWins')
    expect(g.state.scores['P1'], '打赢征服').toBe(1)
  })
  test('飓风清场:对决里杀光防守方 ⇒ 伤害步没有对象、直接 attackerWins + 征服', () => {
    const { g, j } = run([
      blank('atk', P1, `base:${P1}`, 5),
      obj('storm', 'OGN-133', P1, `hand:${P1}`),
      blank('weak', P2, BF1, 1),
    ], 'atk', 'storm')
    expect(j.filter((e) => e.kind === 'damage' && e.defId === undefined), '没有战斗伤害事件(§465 只在双方都有单位时跑)').toHaveLength(0)
    expect(j.find((e) => e.kind === 'combatEnd')?.outcome).toBe('attackerWins')
    expect(g.state.scores['P1']).toBe(1)
    expect(g.state.objects['atk']?.damage, '攻方毫发无伤(飓风那 1 点已被 §466.1.a.1 清除)').toBe(0)
  })
  test('对照:不打飓风 ⇒ weak 照常参与分配(证明上面两景的差异来自那张反应)', () => {
    const { j } = run([
      blank('atk', P1, `base:${P1}`, 5),
      blank('weak', P2, BF1, 1), blank('tough', P2, BF1, 3),
    ], 'atk')
    const combatDmg = j.filter((e) => e.kind === 'damage' && e.defId === undefined)
    expect(combatDmg.find((e) => e.targetOid === 'weak')?.amount, '没被飓风杀 ⇒ 照常吃致命 1').toBe(1)
                                                                                       
    expect(combatDmg.find((e) => e.targetOid === 'tough')?.amount, 'weak 封顶 1 后,最后一个 tough 吃剩余 4').toBe(4)
    expect(combatDmg.find((e) => e.targetOid === 'atk')?.amount, '防方战力 1+3=4').toBe(4)
  })
})
