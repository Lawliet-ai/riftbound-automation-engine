import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { specLookup } from '../../data/decks'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { writeControl } from '../../src/state/battlefieldControl'

                                                      
                                        
                                     
  
                             
                                                              
                                                         
                                    
                                       
                                                  
                             
  
                                                               

installProviders()
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function obj(oid: string, defId: string, ctrl: typeof P1, zone: string, extra: Partial<GameObject> = {}): GameObject {
  const spec = (specLookup(defId) ?? {}) as Partial<GameObject>
  return {
    ...spec, oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: spec.baseMight ?? 3, baseKeywords: spec.baseKeywords ?? [], baseTypes: spec.baseTypes ?? ['unit'],
    damage: 0, counters: {}, status: {}, ...extra,
  } as GameObject
}
const blank = (o: string, c: typeof P1, z: string, m: number): GameObject =>
  obj(o, 'OGN-175', c, z, { baseMight: m })

function scene(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = { ...base.objects }
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones }
}
const mkDeps = (): InteractiveDeps => makeGameDeps(20260901) as InteractiveDeps

type JEv = { kind?: string; targetOid?: string; amount?: number; defId?: string; outcome?: string }

                                              
function fight(st: GameState, mover: string, watch: string[]): {
  j: JEv[]; mid: Record<string, number | null>; g: InteractiveGame
} {
  const g = new InteractiveGame(st, mkDeps())
  const mv = g.legalActions(P1).find((a) =>
    a.kind === 'MOVE' && (a as { oid?: string }).oid === mover && (a as { to?: string }).to === BF1)
  expect(mv, '前提:进攻这一步造得出来').toBeDefined()
  const j0 = (g.journal.projectFor(P1, 0) as unknown[]).length
  g.apply(mv!)
  let mid: Record<string, number | null> | null = null
  for (let i = 0; i < 60; i++) {
    const p = g.pending()
    if (p.mode === 'action' || p.mode === 'gameover') break
    if (p.mode === 'choice') { g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: p.request.candidates[0]!.id } as never); continue }
    if (p.mode === 'window') {
      if (mid === null) {
                                                    
        const rc = recomputeContinuous(g.state)
        mid = {}
        for (const w of watch) { const o = rc.objects[w]; mid[w] = o ? effectiveMight(o).reference : null }
      }
      g.apply({ kind: 'PASS', player: (p as { player: typeof P1 }).player } as never)
    }
  }
  return { j: (g.journal.projectFor(P1, 0) as unknown[]).slice(j0) as JEv[], mid: mid ?? {}, g }
}
const combatDmg = (j: JEv[]) => j.filter((e) => e.kind === 'damage' && e.defId === undefined)

describe('★932 坚守 × 壁垒(同卡双关键词,10 张)', () => {
                                                    
  test('前提:卡面数值与关键词照实登记', () => {
    const s = specLookup('OGN-054')!
    expect(s.baseMight).toBe(3)
    expect(s.baseKeywords).toEqual(['坚守', '壁垒'])
  })

  test('★★★壁垒吸走的那一笔按【含坚守加成后】的战力算(3+1=4,不是 3)', () => {
                                       
                                  
                                             
    const r = fight(scene([
      blank('atk', P1, `base:${P1}`, 7),
                                           
                                                
      blank('mate', P2, BF1, 3),
      obj('guard', 'OGN-054', P2, BF1),
    ]), 'atk', ['guard'])
    expect(r.mid['guard'], '防守方身份 ⇒ 坚守 +1 已进派生战力').toBe(4)
    const d = combatDmg(r.j)
    expect(d.find((e) => e.targetOid === 'guard')?.amount, '壁垒吃致命 = 3+1').toBe(4)
    expect(d.find((e) => e.targetOid === 'mate')?.amount, '余量给队友').toBe(3)
  })

  test('§815.1.b 壁垒优先:伤害不够时,队友一点都分不到', () => {
                                               
    const r = fight(scene([
      blank('atk', P1, `base:${P1}`, 2),
      blank('mate', P2, BF1, 3), // 摆在壁垒前面,才验得到"优先"
      obj('guard', 'OGN-054', P2, BF1),
    ]), 'atk', ['guard'])
    const d = combatDmg(r.j)
    expect(d.find((e) => e.targetOid === 'guard')?.amount).toBe(2)
    expect(d.some((e) => e.targetOid === 'mate'), '壁垒没被打死之前队友是无效分配对象').toBe(false)
  })

  test('坚守值不是 1 的那档也对:慎 OGN-241 [坚守2]+[壁垒] ⇒ 3+2=5', () => {
    expect(specLookup('OGN-241')!.baseKeywords).toContain('坚守2')
    const r = fight(scene([
      blank('atk', P1, `base:${P1}`, 8),
      blank('mate', P2, BF1, 3), // 同上:摆前面
      obj('shen', 'OGN-241', P2, BF1),
    ]), 'atk', ['shen'])
    expect(r.mid['shen'], '3 + 坚守2').toBe(5)
    const d = combatDmg(r.j)
    expect(d.find((e) => e.targetOid === 'shen')?.amount).toBe(5)
    expect(d.find((e) => e.targetOid === 'mate')?.amount).toBe(3)
  })

  test('对照:坚守只在【防守方】给 —— 同一张卡去进攻时不该 +1', () => {
                                      
    const r = fight(scene([
      obj('guard', 'OGN-054', P1, `base:${P1}`),
      blank('foe', P2, BF1, 1),
    ]), 'guard', ['guard'])
    expect(r.mid['guard'], '进攻方拿不到坚守加成').toBe(3)
  })
})

describe('★932 急速 × 强攻(同卡双关键词,9 张)', () => {
                               
  test('前提:卡面数值与关键词照实登记', () => {
    const s = specLookup('OGN-030')!
    expect(s.baseMight).toBe(4)
    expect(s.baseKeywords).toEqual(['急速', '强攻2'])
  })

  test('★★急速单位当回合就能进攻,且进攻时强攻加成照常生效(4+2=6)', () => {
                                             
    const r = fight(scene([
      obj('jinx', 'OGN-030', P1, `base:${P1}`, { status: { dormant: false } }),
      blank('foe', P2, BF1, 6),
    ]), 'jinx', ['jinx'])
    expect(r.mid['jinx'], '进攻方身份 ⇒ 强攻2 生效').toBe(6)
    const d = combatDmg(r.j)
    expect(d.find((e) => e.targetOid === 'foe')?.amount, '6 点打在 6 战力敌人上 = 致命').toBe(6)
  })

  test('对照:强攻只在【进攻方】给 —— 它当防守方时不该 +2', () => {
    const r = fight(scene([
      blank('raider', P1, `base:${P1}`, 1),
      obj('jinx', 'OGN-030', P2, BF1),
    ]), 'raider', ['jinx'])
    expect(r.mid['jinx'], '防守方拿不到强攻加成').toBe(4)
  })
})

describe('★933 法盾 × 壁垒(UNL-171 加里奥)', () => {
  test('前提:卡面数值与关键词照实登记', () => {
    const s = specLookup('UNL-171')!
    expect(s.baseMight).toBe(6)
    expect(s.baseKeywords).toEqual(['法盾', '壁垒'])
  })

  test('★★壁垒照常生效:即使它排在队友后面,也必须先吃满致命 6', () => {
                                           
                                          
    const r = fight(scene([
      blank('atk', P1, `base:${P1}`, 9),
      blank('mate', P2, BF1, 3),
      obj('galio', 'UNL-171', P2, BF1),
    ]), 'atk', ['galio'])
    const d = combatDmg(r.j)
    expect(d.find((e) => e.targetOid === 'galio')?.amount, '壁垒先吃致命 6').toBe(6)
    expect(d.find((e) => e.targetOid === 'mate')?.amount, '余 3 给队友').toBe(3)
  })

  test('🔒法盾【不】保护战斗伤害 —— 它只管"被选作法术或技能的目标"', () => {
                                           
                                             
    const r = fight(scene([
      blank('atk', P1, `base:${P1}`, 6),
      obj('galio', 'UNL-171', P2, BF1),
    ]), 'atk', ['galio'])
    const d = combatDmg(r.j)
    expect(d.find((e) => e.targetOid === 'galio')?.amount, '法盾拦不住战斗伤害').toBe(6)
    expect(r.g.state.objects['galio'], '6 点打在 6 战力上 ⇒ 致命').toBeUndefined()
  })
})

describe('★933 后排 × 待命(UNL-141 伊芙琳)', () => {
  test('前提:卡面数值与关键词照实登记', () => {
    const s = specLookup('UNL-141')!
    expect(s.baseMight).toBe(2)
    expect(s.baseKeywords).toEqual(['待命', '后排'])
  })

  test('★★后排最后承伤:即使它排在队友前面,也要等队友先吃满致命', () => {
                                      
                                       
    const r = fight(scene([
      blank('atk', P1, `base:${P1}`, 3),
      obj('eve', 'UNL-141', P2, BF1),
      blank('mate', P2, BF1, 3),
    ]), 'atk', ['eve'])
    const d = combatDmg(r.j)
    expect(d.find((e) => e.targetOid === 'mate')?.amount, '3 点全给不带后排的队友').toBe(3)
    expect(d.some((e) => e.targetOid === 'eve'), '§826.4.b 队友吃满致命前,后排是无效分配对象').toBe(false)
  })

  test('队友吃满致命后,后排才开始吃', () => {
    const r = fight(scene([
      blank('atk', P1, `base:${P1}`, 5),
      obj('eve', 'UNL-141', P2, BF1),
      blank('mate', P2, BF1, 3),
    ]), 'eve' === 'eve' ? 'atk' : 'atk', ['eve'])
    const d = combatDmg(r.j)
    expect(d.find((e) => e.targetOid === 'mate')?.amount).toBe(3)
    expect(d.find((e) => e.targetOid === 'eve')?.amount, '余 2 才轮到后排').toBe(2)
  })

  test('🔒面朝下的待命牌【不参战】:它在独立的 standby 区,不是战场', () => {
                                                    
                                                           
                                        
    const st = scene([
      blank('atk', P1, `base:${P1}`, 5),
      blank('mate', P2, BF1, 3),
      obj('hidden', 'UNL-141', P2, 'standby:shared:1', { status: { faceDown: true } }),
    ])
    const r = fight(st, 'atk', ['hidden'])
    const d = combatDmg(r.j)
    expect(d.find((e) => e.targetOid === 'mate')?.amount, '全部砸在场上那个(★1037:唯一可分配单位吃攻方全部 5 点,§465.2.c / .c.4)').toBe(5)
    expect(d.some((e) => e.targetOid === 'hidden'), '待命牌一点伤害都不该吃').toBe(false)
  })

  test('§466.5.c 顺带验到:战场易主后,对方的待命牌被移除', () => {
                                           
                                                 
                                                    
    const r = fight(scene([
      blank('atk', P1, `base:${P1}`, 5),
      blank('mate', P2, BF1, 3),
      obj('hidden', 'UNL-141', P2, 'standby:shared:1', { status: { faceDown: true } }),
    ]), 'atk', ['hidden'])
    expect(r.j.some((e) => e.kind === 'combatEnd' && e.outcome === 'attackerWins'), '前提:攻方赢下战场').toBe(true)
    expect(String(r.g.state.objects['hidden']?.zone ?? '<gone>'), '§466.5.c 清掉错位的待命牌').not.toContain('standby')
  })

  test('对照:战场没易主时,待命牌原地不动', () => {
                                                                            
                                                              
                                                       
                                                                   
                                                        
                                            
    const st = writeControl(scene([
      blank('atk', P1, `base:${P1}`, 1),
      blank('mate', P2, BF1, 5),
      obj('hidden', 'UNL-141', P2, 'standby:shared:1', { status: { faceDown: true } }),
    ]), BF1, P2)
    const r = fight(st, 'atk', ['hidden'])
                                                                       
                                                   
    expect(r.j.some((e) => e.kind === 'combatEnd' && e.outcome === 'defenderWins'), '前提:守方赢下').toBe(true)
    const ctrl = (r.g.state as { battlefieldControl?: Record<string, unknown> }).battlefieldControl ?? {}
    expect(ctrl[BF1], '控制权仍在 P2 手里').toBe(P2)
    expect(String(r.g.state.objects['hidden']?.zone ?? '<gone>'), '控制权没变就不该清').toContain('standby')
  })

  test('⚠️边角留档:战场【无人控制】时,待命牌一律被判错位而清除', () => {
                                                   
                                                                      
                                       
                                                   
    const r = fight(scene([
      blank('atk', P1, `base:${P1}`, 1),
      blank('mate', P2, BF1, 5),
      obj('hidden', 'UNL-141', P2, 'standby:shared:1', { status: { faceDown: true } }),
    ]), 'atk', ['hidden'])
    expect(String(r.g.state.objects['hidden']?.zone ?? '<gone>'), '现行口径:无人控制 ⇒ 清').toContain('discard')
  })
})

describe('★934 雷恩加尔 UNL-024 四关键词总检(急速+强攻2+法盾+游走)', () => {
                       
                                               
                                 
                                         
                            
  test('前提:四个关键词与数值都照卡面登记', () => {
    const s = specLookup('UNL-024')!
    expect(s.baseMight).toBe(4)
    expect(s.baseKeywords).toEqual(['急速', '强攻2', '法盾', '游走'])
  })

  test('★★§144.4.c.1 游走:可以从一处战场直接移动到另一处战场', () => {
                                               
    const g = new InteractiveGame(scene([
      obj('kha', 'UNL-024', P1, BF0, { status: { dormant: false } }),
      blank('foe', P2, BF1, 1),
    ]), mkDeps())
    const tos = g.legalActions(P1)
      .filter((a) => a.kind === 'MOVE' && (a as { oid?: string }).oid === 'kha')
      .map((a) => String((a as { to?: string }).to))
    expect(tos, '游走 ⇒ 战场→另一处战场').toContain(BF1)
    expect(tos, '基地这条常规路照旧在').toContain(`base:${P1}`)
  })

  test('🔒对照:不带游走的白板在战场上,只回得了基地', () => {
    const g = new InteractiveGame(scene([
      blank('plain', P1, BF0, 4, ),
      blank('foe', P2, BF1, 1),
    ]), mkDeps())
    const tos = g.legalActions(P1)
      .filter((a) => a.kind === 'MOVE' && (a as { oid?: string }).oid === 'plain')
      .map((a) => String((a as { to?: string }).to))
    expect(tos, '没有游走就去不了别的战场').not.toContain(BF1)
  })

  test('★★★游走 × 强攻2:游走过去照样算进攻方,加成生效(4+2=6)', () => {
                                                     
                                                  
    const r = fight(scene([
      obj('kha', 'UNL-024', P1, BF0, { status: { dormant: false } }),
      blank('foe', P2, BF1, 6),
    ]), 'kha', ['kha'])
    expect(r.mid['kha'], '游走进攻 ⇒ 强攻2 照常生效').toBe(6)
    const d = combatDmg(r.j)
    expect(d.find((e) => e.targetOid === 'foe')?.amount, '6 点砸在 6 战力上 = 致命').toBe(6)
  })

  test('🔒法盾不干扰它自己的战斗伤害(与 ★933 加里奥同一条,换张卡再钉一次)', () => {
    const r = fight(scene([
      blank('atk', P1, `base:${P1}`, 4),
      obj('kha', 'UNL-024', P2, BF1),
    ]), 'atk', ['kha'])
    expect(r.mid['kha'], '它当防守方 ⇒ 强攻不给,仍是 4').toBe(4)
    const d = combatDmg(r.j)
    expect(d.find((e) => e.targetOid === 'kha')?.amount, '法盾拦不住战斗伤害').toBe(4)
    expect(r.g.state.objects['kha'], '4 点打在 4 战力上 ⇒ 死').toBeUndefined()
  })

  test('四个关键词同时在身上,互不干扰:游走进攻时强攻生效、法盾不改战力', () => {
                                     
    const r = fight(scene([
      obj('kha', 'UNL-024', P1, BF0, { status: { dormant: false } }),
      blank('foe', P2, BF1, 2),
    ]), 'kha', ['kha'])
    expect(r.mid['kha'], '强攻2 生效且法盾没有意外改动战力').toBe(6)
    expect(r.g.state.objects['foe'], '2 战力敌人被打死').toBeUndefined()
    expect(String(r.g.state.objects['kha']?.zone), '它自己活着留在打下来的战场').toBe(BF1)
  })
})

describe('★935 瞬息 × 据守得分(时点交互:OGN-274 精灵 M3 纯瞬息)', () => {
                            
                                                      
                                                              
                                                  
                                                  
    
                                                            

  const deck = (who: typeof P1): GameObject[] => [
    blank(`d1${String(who)}`, who, `mainDeck:${who}`, 3),
    blank(`d2${String(who)}`, who, `mainDeck:${who}`, 3),
  ]

                                        
  function crossTurn(objs: GameObject[]): InteractiveGame {
    let st = scene([...objs, ...deck(P1), ...deck(P2)])
    st = { ...st, activePlayer: P2 }
    st = writeControl(st, BF1, P1)                            
    const g = new InteractiveGame(st, mkDeps())
    const et = g.legalActions(P2).find((a) => a.kind === 'END_TURN')
    expect(et, '前提:P2 结束得了回合').toBeDefined()
    g.apply(et!)
    for (let i = 0; i < 80; i++) {
      const p = g.pending()
      if (p.mode === 'action' || p.mode === 'gameover') break
      if (p.mode === 'choice') { g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: p.request.candidates[0]!.id } as never); continue }
      if (p.mode === 'window') g.apply({ kind: 'PASS', player: (p as { player: typeof P1 }).player } as never)
    }
    return g
  }

  test('前提:OGN-274 精灵是 M3 纯瞬息', () => {
    const sp = specLookup('OGN-274')!
    expect(sp.baseMight).toBe(3)
    expect(sp.baseKeywords).toEqual(['瞬息'])
  })

  test('★★★瞬息单位在自己回合开始就被摧毁 ⇒ 据守不成立,一分都拿不到', () => {
    const g = crossTurn([obj('wisp', 'OGN-274', P1, BF1)])
    expect(g.state.objects['wisp'], '§816 在得分计算之前先摧毁').toBeUndefined()
    expect(g.state.scores[P1], '场上已经没有我的单位 ⇒ 守不住 ⇒ 不得分').toBe(0)
  })

  test('🔒对照:换成不带瞬息的单位,同样布景据守得 1 分', () => {
                                            
    const g = crossTurn([blank('solid', P1, BF1, 3)])
    expect(String(g.state.objects['solid']?.zone), '它活着').toBe(BF1)
    expect(g.state.scores[P1], '§315.2.b 据守得分').toBe(1)
  })

  test('瞬息单位陪着一个普通单位时:它死了,普通单位仍然守得住', () => {
                                  
    const g = crossTurn([obj('wisp', 'OGN-274', P1, BF1), blank('solid', P1, BF1, 3)])
    expect(g.state.objects['wisp'], '瞬息的照死').toBeUndefined()
    expect(String(g.state.objects['solid']?.zone), '同伴不受牵连').toBe(BF1)
    expect(g.state.scores[P1], '还有单位在 ⇒ 据守照常得分').toBe(1)
  })

  test('§816.1.b「控制者的回合」:对手回合开始时,我的瞬息单位不该被摧毁', () => {
                                                  
    let st = scene([obj('wisp', 'OGN-274', P1, BF1), ...deck(P1), ...deck(P2)])
    st = writeControl(st, BF1, P1)                      
    const g = new InteractiveGame(st, mkDeps())
    g.apply(g.legalActions(P1).find((a) => a.kind === 'END_TURN')!)
    for (let i = 0; i < 80; i++) {
      const p = g.pending()
      if (p.mode === 'action' || p.mode === 'gameover') break
      if (p.mode === 'choice') { g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: p.request.candidates[0]!.id } as never); continue }
      if (p.mode === 'window') g.apply({ kind: 'PASS', player: (p as { player: typeof P1 }).player } as never)
    }
    expect(String(g.state.activePlayer), '现在是对手的回合').toBe(String(P2))
    expect(String(g.state.objects['wisp']?.zone), '不是我的回合 ⇒ 瞬息不触发').toBe(BF1)
  })
})

describe('★936 触发 × 触发(同一事件下多个触发同发)', () => {
                                        
    
                                                        
                                                  
                                              
                                              
    
                                                 
                                                       
                             

  const byCard = (j: JEv[], defId: string) =>
    j.filter((e) => e.kind === 'damage' && e.defId === defId)

  test('前提:神射海盗 OGN-130「当我进攻时造成 1 点伤害」在册', () => {
    expect(specLookup('OGN-130')).toBeDefined()
  })

  test('★★两个神射海盗一起进攻:两条触发各响一次(共 2 点,不吞不重)', () => {
                                                    
    const r = fight(scene([
      obj('sniperA', 'OGN-130', P1, BF1),
      obj('sniperB', 'OGN-130', P1, `base:${P1}`),
      blank('foe1', P2, BF1, 5),
      blank('foe2', P2, BF1, 5),
    ]), 'sniperB', ['sniperA', 'sniperB'])
    const hits = byCard(r.j, 'OGN-130')
    expect(hits.length, '两个进攻者 ⇒ 两条触发各响一次').toBe(2)
    expect(hits.every((h) => h.amount === 1), '每条各 1 点').toBe(true)
  })

  test('🔒对照:只有一个进攻者时只响一次(证明上一条数的是"每个单位一次")', () => {
    const r = fight(scene([
      obj('sniperB', 'OGN-130', P1, `base:${P1}`),
      blank('foe1', P2, BF1, 5),
    ]), 'sniperB', ['sniperB'])
    expect(byCard(r.j, 'OGN-130').length).toBe(1)
  })

  test('★★两张【不同】卡的进攻触发同发:各按自己的规则算,互不干扰', () => {
                                           
                                   
    const r = fight(scene([
      obj('yasuo', 'OGN-076', P1, BF1),
      obj('sniper', 'OGN-130', P1, `base:${P1}`),
      blank('foe1', P2, BF1, 9),
      blank('foe2', P2, BF1, 9),
    ]), 'sniper', ['yasuo', 'sniper'])
    const y = byCard(r.j, 'OGN-076')
    const sn = byCard(r.j, 'OGN-130')
    expect(y.length, '亚索响一次').toBe(1)
    expect(sn.length, '神射海盗响一次').toBe(1)
    expect(sn[0]?.amount, '神射海盗照卡面 1 点').toBe(1)
    expect(y[0]?.amount, '亚索照自己的战力打(不是抄神射海盗的 1)').toBe(r.mid['yasuo'])
  })

  test('一场战斗里,同一单位的进攻触发只响一次', () => {
                                   
                                               
                                                          
                                                         
                                                       
                                                
                                                        
                                                          
                                                           
    const r = fight(scene([
      obj('sniper', 'OGN-130', P1, `base:${P1}`),
      blank('foe1', P2, BF1, 9),
      blank('foe2', P2, BF1, 9),
    ]), 'sniper', ['sniper'])
    expect(byCard(r.j, 'OGN-130').length, '一场战斗里该单位的进攻触发只响一次').toBe(1)
  })

  test('触发的伤害与战斗伤害是两笔:带 defId 的才是卡效果打的(★903 归因判据)', () => {
    const r = fight(scene([
      obj('sniper', 'OGN-130', P1, `base:${P1}`),
      blank('foe1', P2, BF1, 5),
    ]), 'sniper', ['sniper'])
    expect(byCard(r.j, 'OGN-130').length, '触发那一下带 defId').toBe(1)
    expect(combatDmg(r.j).length, '战斗伤害不带 defId,单独一批').toBeGreaterThan(0)
  })
})

describe('★938 持续效果 × 触发(互相依赖:效果改战力,触发读战力)', () => {
                                                     
                                                  
                                                            
                                      
                                                                          
  const gear = (oid: string, defId: string, host: string, ctrl: typeof P1): GameObject =>
    obj(oid, defId, ctrl, BF1, { status: { attachedTo: asObjId(host) } })
  const yasuoHit = (j: JEv[]) => j.filter((e) => e.kind === 'damage' && e.defId === 'OGN-076')

  test('前提:亚索 M6、三件装备的加成值照卡面', () => {
    expect(specLookup('OGN-076')!.baseMight).toBe(6)
    expect((specLookup('SFD-022') as { basePowerBonus?: number }).basePowerBonus).toBe(2)
    expect((specLookup('SFD-056') as { basePowerBonus?: number }).basePowerBonus).toBe(3)
    expect((specLookup('SFD-033') as { basePowerBonus?: number }).basePowerBonus).toBe(1)
  })

  test('基准:裸装亚索进攻 ⇒ 触发打 6 点(等同印刷战力)', () => {
    const r = fight(scene([
      obj('yasuo', 'OGN-076', P1, `base:${P1}`),
      blank('foe', P2, BF1, 20),
    ]), 'yasuo', ['yasuo'])
    expect(yasuoHit(r.j)[0]?.amount, '没有任何加成时就是印刷值').toBe(6)
  })

  test('★★★贴一件长剑(+2)⇒ 触发打 8 点(读的是加成后的战力,不是印刷值)', () => {
    const st = scene([
      obj('yasuo', 'OGN-076', P1, `base:${P1}`),
      blank('foe', P2, BF1, 20),
    ])
                                         
    const withGear: GameState = {
      ...st,
      objects: { ...st.objects, sword: { ...obj('sword', 'SFD-022', P1, `base:${P1}`, { status: { attachedTo: asObjId('yasuo') } }) } },
      zones: { ...st.zones, [`base:${P1}`]: { ...st.zones[`base:${P1}` as never]!, contents: [...st.zones[`base:${P1}` as never]!.contents, asObjId('sword')] } } as never,
    }
    const r = fight(withGear, 'yasuo', ['yasuo'])
    expect(r.mid['yasuo'], '派生战力 6+2').toBe(8)
    expect(yasuoHit(r.j)[0]?.amount, '触发按加成后的战力打').toBe(8)
  })

  test('★★两件装备同层叠加(+2 和 +3)⇒ 11 点', () => {
    const base = scene([
      obj('yasuo', 'OGN-076', P1, `base:${P1}`),
      blank('foe', P2, BF1, 30),
    ])
    const z = `base:${P1}`
    const st: GameState = {
      ...base,
      objects: {
        ...base.objects,
        sword: obj('sword', 'SFD-022', P1, z, { status: { attachedTo: asObjId('yasuo') } }),
        gaunt: obj('gaunt', 'SFD-056', P1, z, { status: { attachedTo: asObjId('yasuo') } }),
      },
      zones: { ...base.zones, [z]: { ...base.zones[z as never]!, contents: [...base.zones[z as never]!.contents, asObjId('sword'), asObjId('gaunt')] } } as never,
    }
    const r = fight(st, 'yasuo', ['yasuo'])
    expect(r.mid['yasuo'], '§477.3.d 同层加减相加:6+2+3').toBe(11)
    expect(yasuoHit(r.j)[0]?.amount).toBe(11)
  })

  test('🔒顺序无关:两件装备换个贴附次序,结果一模一样(分层不动点该收敛到同一处)', () => {
    const mk = (first: string, second: string): number => {
      const base = scene([
        obj('yasuo', 'OGN-076', P1, `base:${P1}`),
        blank('foe', P2, BF1, 30),
      ])
      const z = `base:${P1}`
      const st: GameState = {
        ...base,
        objects: {
          ...base.objects,
          [first]: obj(first, first === 'sword' ? 'SFD-022' : 'SFD-056', P1, z, { status: { attachedTo: asObjId('yasuo') } }),
          [second]: obj(second, second === 'sword' ? 'SFD-022' : 'SFD-056', P1, z, { status: { attachedTo: asObjId('yasuo') } }),
        },
        zones: { ...base.zones, [z]: { ...base.zones[z as never]!, contents: [...base.zones[z as never]!.contents, asObjId(first), asObjId(second)] } } as never,
      }
      return fight(st, 'yasuo', ['yasuo']).mid['yasuo'] ?? -1
    }
    expect(mk('sword', 'gaunt')).toBe(11)
    expect(mk('gaunt', 'sword'), '换序后必须仍是 11').toBe(11)
  })
})
