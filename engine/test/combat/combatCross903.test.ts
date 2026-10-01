import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { specLookup } from '../../data/decks'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { installProviders, makeGameDeps } from '../../data/gameDeps'

                                                
  
                                                              
                                                                     
                                                                  
  
                                     
                                                              
                                                                        
                                                           

installProviders()

const P1 = 'P1'
const P2 = 'P2'
const BF0 = 'battlefield:shared:0'
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

   
                                    
                                                              
                                                           
                                                      
                                          
   
function seedDecks(st: GameState, per = 5): GameState {
  const objects: Record<string, GameObject> = { ...st.objects }
  const zones = { ...st.zones }
  for (const p of st.players) {
    const zid = `mainDeck:${p}`
    const z = zones[zid]
    if (!z) continue
    const ids = Array.from({ length: per }, (_, i) => {
      const o = obj(`deck-${p}-${i}`, 'OGN-175', p, zid)
      objects[o.oid] = o
      return o.oid
    })
    zones[zid] = { ...z, contents: [...z.contents, ...ids] }
  }
  return { ...st, objects, zones }
}

function scene(objs: GameObject[], active: string = P1): GameState {
  const base = createInitialState([asPlayerId(P1), asPlayerId(P2)], 2)
  const objects: Record<string, GameObject> = { ...base.objects }
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return seedDecks({ ...base, activePlayer: asPlayerId(active), phase: 'main', objects, zones })
}

type JEv = { kind?: string; player?: string; amount?: number }

                                                    
function fight(st: GameState, mover: string, to: string, watch: string[], active: string = P1): {
  midMight: Record<string, number | null>; midRole: Record<string, string | null>
  journal: JEv[]; end: GameState; moved: boolean
} {
  const g = new InteractiveGame(st, makeGameDeps(20260826) as never)
  const mv = g.legalActions(asPlayerId(active)).find((a) =>
    a.kind === 'MOVE' && (a as { oid?: string }).oid === mover && (a as { to?: string }).to === to)
  const snap = (): { m: Record<string, number | null>; r: Record<string, string | null> } => {
    const rc = recomputeContinuous(g.state)
    const m: Record<string, number | null> = {}
    const r: Record<string, string | null> = {}
    for (const w of watch) {
      const o = rc.objects[w]
      m[w] = o ? effectiveMight(o).reference : null
      r[w] = o ? (o.status.attacking ? 'atk' : o.status.defending ? 'def' : null) : null
    }
    return { m, r }
  }
  if (!mv) return { midMight: {}, midRole: {}, journal: [], end: g.state, moved: false }
  const j0 = (g.journal.projectFor(asPlayerId(P1), 0) as unknown[]).length
  g.apply(mv)
  let mid: ReturnType<typeof snap> | null = null
  for (let i = 0; i < 60; i++) {
    const p = g.pending()
    if (p.mode === 'action' || p.mode === 'gameover') break
    if (p.mode === 'choice') {
      const r = p.request
      g.apply({ kind: 'CHOOSE', player: p.player, key: r.key, answer: r.candidates[0]!.id } as never)
      continue
    }
    if (p.mode === 'window') {
      if (mid === null) mid = snap()
      g.apply({ kind: 'PASS', player: (p as { player: string }).player } as never)
    }
  }
  mid ??= snap()
  const journal = (g.journal.projectFor(asPlayerId(P1), 0) as unknown[]).slice(j0) as JEv[]
  return { midMight: mid.m, midRole: mid.r, journal, end: g.state, moved: true }
}

const alive = (st: GameState, oid: string): boolean => {
  const o = st.objects[oid]
  return !!o && String(o.zone).startsWith('battlefield')
}

describe('★903 驭水者 OGN-055「独自 进攻或防守 ⇒ M+2」× 真战斗', () => {
  test('独自进攻:身份由引擎授予,2+2=4;4v4 互杀 ⇒ 无人存活无征服', () => {
    const f = fight(scene([obj('wd', 'OGN-055', P1, `base:${P1}`), blank('foe', P2, BF1, 4)]), 'wd', BF1, ['wd', 'foe'])
    expect(f.moved).toBe(true)
    expect(f.midRole['wd'], '§323.2 引擎自己授的进攻身份').toBe('atk')
    expect(f.midMight['wd'], '独自进攻 2+2').toBe(4)
    expect(alive(f.end, 'foe'), '4≥4 敌死').toBe(false)
    expect(alive(f.end, 'wd'), '4≥4 我也死(互杀)').toBe(false)
    expect(f.end.scores['P1'], '攻方无人存活 ⇒ 不确立控制 ⇒ 无征服分').toBe(0)
  })
  test('独自防守(「或防守」半句):P2 打进来,2+2=4 互杀', () => {
    const f = fight(scene([obj('wd', 'OGN-055', P1, BF0), blank('raider', P2, `base:${P2}`, 4)], P2), 'raider', BF0, ['wd'], P2)
    expect(f.moved).toBe(true)
    expect(f.midRole['wd'], '防守身份').toBe('def')
    expect(f.midMight['wd'], '独自防守同样给').toBe(4)
    expect(alive(f.end, 'wd')).toBe(false)
    expect(alive(f.end, 'raider')).toBe(false)
  })
  test('有伴进攻(反例):预摆的友军按 §323.2.a 拿到同侧身份 ⇒ 不「独自」⇒ 保持 2', () => {
    const f = fight(scene([obj('wd', 'OGN-055', P1, `base:${P1}`), blank('mate', P1, BF1, 3), blank('foe', P2, BF1, 4)]), 'wd', BF1, ['wd', 'mate'])
    expect(f.midRole['mate'], '迟到单位(预摆在战场上的)也拿身份').toBe('atk')
    expect(f.midMight['wd'], '我这一侧有两名进攻方 ⇒ 不给').toBe(2)
  })
})

describe('★903 猩红飞鸽 UNL-154「和另一名单位一起 进攻 ⇒ M+2」× 真战斗', () => {
  test('一起进攻:3+2=5;打赢征服得分,全队存活', () => {
    const f = fight(scene([obj('dove', 'UNL-154', P1, `base:${P1}`), blank('mate', P1, BF1, 3), blank('foe', P2, BF1, 2)]), 'dove', BF1, ['dove', 'mate'])
    expect(f.midMight['dove'], '一起进攻 3+2').toBe(5)
    expect(alive(f.end, 'foe')).toBe(false)
    expect(alive(f.end, 'dove')).toBe(true)
    expect(alive(f.end, 'mate')).toBe(true)
    expect(f.end.scores['P1'], '征服得分').toBe(1)
    expect(f.journal.some((e) => e.kind === 'conquer'), '战报里有 conquer').toBe(true)
  })
  test('§142.4.b 连锁致死:同伴死 ⇒「一起」失效 ⇒ 战力 5→3 ⇒ 已标 4 点变致命 ⇒ 三方全灭', () => {
                                                             
                                                            
                                                      
    const f = fight(scene([obj('dove', 'UNL-154', P1, `base:${P1}`), blank('mate', P1, BF1, 3), blank('foe', P2, BF1, 7)]), 'dove', BF1, ['dove'])
    expect(f.midMight['dove'], '让过窗口时加成在').toBe(5)
    expect(alive(f.end, 'mate')).toBe(false)
    expect(alive(f.end, 'dove'), '§142.4.b:战力回落后旧伤害变致命').toBe(false)
    expect(alive(f.end, 'foe'), '8>7 敌也死').toBe(false)
    expect(f.end.scores['P1'], '攻方全灭 ⇒ 无征服').toBe(0)
  })
  test('独自进攻(反例):不给,3v7 我死敌活', () => {
    const f = fight(scene([obj('dove', 'UNL-154', P1, `base:${P1}`), blank('foe', P2, BF1, 7)]), 'dove', BF1, ['dove'])
    expect(f.midMight['dove']).toBe(3)
    expect(alive(f.end, 'dove')).toBe(false)
    expect(alive(f.end, 'foe')).toBe(true)
  })
  test('一起防守(反例):「只进攻」⇒ 两人一起防也不给', () => {
    const f = fight(scene([obj('dove', 'UNL-154', P1, BF0), blank('mate', P1, BF0, 3), blank('raider', P2, `base:${P2}`, 2)], P2), 'raider', BF0, ['dove'], P2)
    expect(f.midRole['dove']).toBe('def')
    expect(f.midMight['dove']).toBe(3)
  })
})

describe('★903 卢锡安 SFD-113「每回合首次征服 ⇒ 我变活跃」× 真征服流程', () => {
                                                                        
                                                    
  test('真征服后卢锡安活跃(dormant:false);对照白板征服后休眠(dormant:true)', () => {
    const run = (defId: string, oid: string): GameState => {
      const g = new InteractiveGame(scene([obj(oid, defId, P1, `base:${P1}`), blank('foe', P2, BF1, 1)]), makeGameDeps(20260826) as never)
      const mv = g.legalActions(asPlayerId(P1)).find((a) => a.kind === 'MOVE' && (a as { oid?: string }).oid === oid && (a as { to?: string }).to === BF1)
      expect(mv).toBeDefined()
      g.apply(mv!)
      for (let i = 0; i < 60; i++) {
        const p = g.pending()
        if (p.mode === 'action' || p.mode === 'gameover') break
        if (p.mode === 'choice') { g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: p.request.candidates[0]!.id } as never); continue }
        if (p.mode === 'window') g.apply({ kind: 'PASS', player: (p as { player: string }).player } as never)
      }
      return g.state
    }
    const lucianEnd = run('SFD-113', 'lucian')
    expect(lucianEnd.scores['P1'], '真的征服了').toBe(1)
    expect(lucianEnd.objects['lucian']?.status.dormant, '触发把我拉回活跃').toBe(false)
    const blankEnd = run('OGN-175', 'grunt')
    expect(blankEnd.scores['P1']).toBe(1)
    expect(blankEnd.objects['grunt']?.status.dormant, '对照:普通单位征服后休眠 —— 差异全来自卢锡安的触发').toBe(true)
  })
})

describe('★903 魔像 UNL-087「你据守此处时的据守效果额外触发一次」× 真据守流程', () => {
                                                    
  const runHold = (withGolem: boolean): { holds: number; draws: number } => {
    const objs = [obj('throat', 'UNL-060', P1, BF1)]
    if (withGolem) objs.push(obj('golem', 'UNL-087', P1, BF1))
    const g = new InteractiveGame(scene(objs, P2), makeGameDeps(20260826) as never)
    const et = g.legalActions(asPlayerId(P2)).find((a) => a.kind === 'END_TURN')
    expect(et).toBeDefined()
    const j0 = (g.journal.projectFor(asPlayerId(P1), 0) as unknown[]).length
    g.apply(et!)
    for (let i = 0; i < 80; i++) {
      const p = g.pending()
      if (p.mode === 'action' || p.mode === 'gameover') break
      if (p.mode === 'choice') { g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: p.request.candidates[0]!.id } as never); continue }
      if (p.mode === 'window') g.apply({ kind: 'PASS', player: (p as { player: string }).player } as never)
    }
    const j = (g.journal.projectFor(asPlayerId(P1), 0) as unknown[]).slice(j0) as JEv[]
                                                          
                                                         
                                                                   
                                                  
    const cut = j.findIndex((e) => e.kind === 'summonRune')
    const atHold = cut < 0 ? j : j.slice(0, cut)
    return {
      holds: atHold.filter((e) => e.kind === 'hold').length,
      draws: atHold.filter((e) => e.kind === 'draw' && e.player === P1).length,
    }
  }
  test('魔像在场:跨回合据守 ⇒ hold 事件×2 ⇒ 卑鄙之喉抽 2', () => {
    expect(runHold(true)).toEqual({ holds: 2, draws: 2 })
  })
  test('对照无魔像:hold×1 抽 1(证明上面不是流程本身发两遍)', () => {
    expect(runHold(false)).toEqual({ holds: 1, draws: 1 })
  })
})

describe('★903 机械迷 SFD-068「每件武装提供双倍基础战力加成」× 真战斗', () => {
  test('贴长剑(+2)与护手(+3):3 + (2+3) + (2+3) = 13,打赢征服', () => {
                                                                  
    expect((specLookup('SFD-022') as { basePowerBonus?: number }).basePowerBonus).toBe(2)
    expect((specLookup('SFD-056') as { basePowerBonus?: number }).basePowerBonus).toBe(3)
    const mech = obj('mech', 'SFD-068', P1, `base:${P1}`)
    const g1 = obj('g1', 'SFD-022', P1, `base:${P1}`, { status: { attachedTo: asObjId('mech') } })
    const g2 = obj('g2', 'SFD-056', P1, `base:${P1}`, { status: { attachedTo: asObjId('mech') } })
    const f = fight(scene([mech, g1, g2, blank('foe', P2, BF1, 1)]), 'mech', BF1, ['mech'])
    expect(f.midMight['mech'], '§137.3 原份 + SFD-068 额外一份').toBe(13)
    expect(f.end.scores['P1']).toBe(1)
  })
})
