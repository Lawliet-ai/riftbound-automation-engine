import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { specLookup } from '../../data/decks'
import { writeControl } from '../../src/state/battlefieldControl'
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
const blank = (oid: string, ctrl: string, zone: string, might: number, extra: Partial<GameObject> = {}): GameObject =>
  obj(oid, 'OGN-175', ctrl, zone, { baseMight: might, ...extra })

function scene(objs: GameObject[], movesThisTurn: Record<string, number> = {}): GameState {
  const base = createInitialState([asPlayerId(P1), asPlayerId(P2)], 2)
  const objects: Record<string, GameObject> = { ...base.objects }
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: asPlayerId(P1), phase: 'main', objects, zones, movesThisTurn } as GameState
}

type JEv = { kind?: string; targetOid?: string; amount?: number; outcome?: string; player?: string }

                                          
function fight(st: GameState, mover: string): { g: InteractiveGame; journal: JEv[] } {
  const g = new InteractiveGame(st, makeGameDeps(20260826) as never)
  const mv = g.legalActions(asPlayerId(P1)).find((a) =>
    a.kind === 'MOVE' && (a as { oid?: string }).oid === mover && (a as { to?: string }).to === BF1)
  expect(mv, 'MOVE 进 BF1 必须合法').toBeDefined()
  g.apply(mv!)
  for (let i = 0; i < 60; i++) {
    const p = g.pending()
    if (p.mode === 'action' || p.mode === 'gameover') break
    if (p.mode === 'choice') { g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: p.request.candidates[0]!.id } as never); continue }
    if (p.mode === 'window') g.apply({ kind: 'PASS', player: (p as { player: string }).player } as never)
  }
  return { g, journal: g.journal.projectFor(asPlayerId(P1), 0) as unknown as JEv[] }
}
const ctrlOf = (g: InteractiveGame): Record<string, unknown> =>
  ((g.state as { battlefieldControl?: Record<string, unknown> }).battlefieldControl ?? {})

describe('🐛★904 §466.5/§469.1:征服 =【获得】控制权,守成不是征服', () => {
  test('防守方击退进攻、守住自己【显式已控制】的战场 ⇒ 不得分、无 conquer 事件', () => {
    const st = writeControl(scene([blank('atk', P1, `base:${P1}`, 2), blank('def', P2, BF1, 5)]), BF1, asPlayerId(P2))
    const { g, journal } = fight(st, 'atk')
    expect(journal.some((e) => e.kind === 'combatEnd' && e.outcome === 'defenderWins'), '战斗真打成了 defenderWins').toBe(true)
    expect(g.state.scores['P2'], '守住自家战场不是征服(§469.1「获得」),不得分').toBe(0)
    expect(journal.some((e) => e.kind === 'conquer'), '征服事件也不发(「当你征服时」触发不该响)').toBe(false)
    expect(ctrlOf(g)[BF1], '控制权保持 P2').toBe('P2')
  })
  test('§466.5.e 保留:防守方在【此前无人确立过控制】的战场获胜 ⇒ 确立即征服,得分', () => {
                                                         
    const { g, journal } = fight(scene([blank('atk', P1, `base:${P1}`, 2), blank('def', P2, BF1, 5)]), 'atk')
    expect(journal.some((e) => e.kind === 'combatEnd' && e.outcome === 'defenderWins')).toBe(true)
    expect(g.state.scores['P2'], '首次确立控制 ⇒ 征服得分').toBe(1)
    expect(ctrlOf(g)[BF1]).toBe('P2')
  })
  test('对照:进攻方打赢敌控战场照常征服(修法不误伤主路径)', () => {
    const st = writeControl(scene([blank('atk', P1, `base:${P1}`, 3), blank('def', P2, BF1, 1)]), BF1, asPlayerId(P2))
    const { g, journal } = fight(st, 'atk')
    expect(g.state.scores['P1'], '攻方此前不控制 ⇒ 获得 ⇒ 征服').toBe(1)
    expect(journal.some((e) => e.kind === 'conquer')).toBe(true)
    expect(ctrlOf(g)[BF1], '控制权易主').toBe('P1')
  })
})

describe('★904 三态判定 × 真流程', () => {
  test('defenderWins:攻方全灭、防方存活', () => {
    const { g, journal } = fight(scene([blank('atk', P1, `base:${P1}`, 2), blank('def', P2, BF1, 5)]), 'atk')
    expect(journal.some((e) => e.kind === 'combatEnd' && e.outcome === 'defenderWins')).toBe(true)
    expect(g.state.objects['atk'], '攻方死了').toBeUndefined()
    expect(String(g.state.objects['def']?.zone)).toBe(BF1)
  })
  test('双灭 noResult + §466.5.b 战场变为未受控制', () => {
    const st = writeControl(scene([blank('atk', P1, `base:${P1}`, 4), blank('def', P2, BF1, 4)]), BF1, asPlayerId(P2))
    const { g, journal } = fight(st, 'atk')
    expect(journal.some((e) => e.kind === 'combatEnd' && e.outcome === 'noResult')).toBe(true)
    expect(ctrlOf(g)[BF1], '§466.5.b 双灭 ⇒ 未受控制(显式 null,不是键消失)').toBe(null)
    expect(g.state.scores).toEqual({ P1: 0, P2: 0 })
  })
})

describe('★904 伤害分配细节 × 真流程', () => {
  test('§142.4.b lethalNeeded 扣已受伤:已伤单位只需补刀,余量给下一个', () => {
                                                                   
    const { g, journal } = fight(scene([
      blank('atk', P1, `base:${P1}`, 3),
      blank('hurt', P2, BF1, 3, { damage: 2 }), blank('full', P2, BF1, 3),
    ]), 'atk')
    const dmg = journal.filter((e) => e.kind === 'damage')
    expect(dmg.find((e) => e.targetOid === 'hurt')?.amount, '§465.2.c.3 先给致命:3-2=1').toBe(1)
    expect(dmg.find((e) => e.targetOid === 'full')?.amount, '余量 2 给下一个').toBe(2)
    expect(g.state.objects['hurt'], '补刀致命').toBeUndefined()
    expect(String(g.state.objects['full']?.zone), '2<3 活着').toBe(BF1)
  })
  test('装备不参战:不贡献战力、不承伤(§178.1.a.1 只有单位参战)', () => {
                                               
                                      
    const { g, journal } = fight(scene([
      blank('atk', P1, `base:${P1}`, 3),
      blank('def', P2, BF1, 1), obj('gear', 'SFD-022', P2, BF1),
    ]), 'atk')
    const dmg = journal.filter((e) => e.kind === 'damage')
    expect(dmg.some((e) => e.targetOid === 'gear'), '装备不被分伤害').toBe(false)
    expect(dmg.find((e) => e.targetOid === 'atk')?.amount, '防方战力只有单位那 1 点').toBe(1)
    expect(g.state.scores['P1'], '攻方正常打赢征服').toBe(1)
  })
  test('§466.1.a.1 战斗清理为所有单位移除伤害(存活者带 0 伤走出战斗)', () => {
                                                             
    const { g } = fight(scene([
      blank('atk', P1, `base:${P1}`, 3),
      blank('hurt', P2, BF1, 3, { damage: 2 }), blank('full', P2, BF1, 3),
    ]), 'atk')
    expect(g.state.objects['full']?.damage, '§466.1.a.1 移除残余伤害').toBe(0)
    expect(g.state.objects['atk']?.damage ?? 0, '攻方(若存活)同样清伤').toBe(0)
  })
  test('§465.2.c.6 壁垒/普通/后排三档顺序 × 真流程(壁垒经装备 grants→derived 授予)', () => {
                                                                 
                                            
                                                          
    const { g, journal } = fight(scene([
      blank('atk', P1, `base:${P1}`, 6),
      blank('wall', P2, BF1, 3),
      obj('shield', 'SFD-033', P2, BF1, { status: { attachedTo: asObjId('wall') } }),
      blank('plain', P2, BF1, 3),
      obj('back', 'UNL-043', P2, BF1),
    ]), 'atk')
    const dmg = journal.filter((e) => e.kind === 'damage')
    expect(dmg.find((e) => e.targetOid === 'wall')?.amount, '壁垒位先分致命 3+1=4').toBe(4)
    expect(dmg.find((e) => e.targetOid === 'plain')?.amount, '普通位吃剩余 2').toBe(2)
    expect(dmg.some((e) => e.targetOid === 'back'), '后排一点不吃(非后排未清完)').toBe(false)
    expect(g.state.objects['wall'], '壁垒位战死').toBeUndefined()
    expect(String(g.state.objects['plain']?.zone)).toBe(BF1)
    expect(String(g.state.objects['back']?.zone)).toBe(BF1)
  })
  test('🐛★907 §465.2.c.10 常驻免疫单位从分配里忽略(规则原文举例点名凯隐)', () => {
                                                      
                             
                                                                        
                                                            
                                                      
    const { g, journal } = fight(scene([
      blank('atk', P1, `base:${P1}`, 5),
      obj('kayn', 'OGN-189', P2, BF1),
      blank('mate', P2, BF1, 3),
    ], { kayn: 2 }), 'atk')
    const dmg = journal.filter((e) => e.kind === 'damage')
    expect(dmg.some((e) => e.targetOid === 'kayn'), '免疫的凯隐不参与分配(连 0 点事件都不该有)').toBe(false)
    expect(dmg.find((e) => e.targetOid === 'mate')?.amount, '伤害改分给队友:唯一可分配单位吃全部 5 点(§465.2.c / .c.4)').toBe(5)
    expect(g.state.objects['mate'], '队友战死').toBeUndefined()
    expect(String(g.state.objects['kayn']?.zone), '凯隐无伤存活').toBe(BF1)
  })
  test('对照:凯隐只移动过 1 次(免疫未生效)⇒ 照常参与分配', () => {
                                           
                                                        
                                                                        
                                                   
                                             
                                                                 
                                           
                                                                   
    const { g, journal } = fight(scene([
      blank('atk', P1, `base:${P1}`, 5),
      obj('kayn', 'OGN-189', P2, BF1),
      blank('mate', P2, BF1, 3),
    ], { kayn: 1 }), 'atk')
    const dmg = journal.filter((e) => e.kind === 'damage')
    expect(dmg.some((e) => e.targetOid === 'kayn'), '★未免疫 ⇒ 凯隐确实进了分配(与免疫那条的判别点)').toBe(true)
    expect(dmg.find((e) => e.targetOid === 'mate')?.amount, '§465.2.c.3:5 点杀得死的只有 3 力队友 ⇒ 它先拿致命 3 点').toBe(3)
    expect(dmg.find((e) => e.targetOid === 'kayn')?.amount, '凯隐拿剩余 2 点(6 力,非致命)').toBe(2)
    expect(g.state.objects['mate'], '队友吃满致命 ⇒ 战死').toBeUndefined()
    expect(String(g.state.objects['kayn']?.zone), '凯隐带 2 点伤存活在原地').toBe(BF1)
  })
  test('§466.7 战斗结束移除所有攻防身份', () => {
    const { g } = fight(scene([blank('atk', P1, `base:${P1}`, 3), blank('def', P2, BF1, 1)]), 'atk')
    for (const o of Object.values(g.state.objects)) {
      expect(o.status.attacking, `${o.oid} 不该残留进攻身份`).toBeUndefined()
      expect(o.status.defending, `${o.oid} 不该残留防守身份`).toBeUndefined()
    }
  })
})
