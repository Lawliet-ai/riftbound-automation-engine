                                                               
                                                 
  
                                  
                                                           
                                                        
                                                         
                                                                    
                                      
                                                                
  
                                                                                       
                                                                     
                                                                           
                                                              
               
  
                                                                      
                                                                
                                                                                         
                                                     
                                                               
  
                                                      
                                                                       
                                                              
                                                                      
                                     
  
      
                                                                    
                                                          
                             
                                                                 
                                             
                                                                            
                                               
                                                                                
                                                                        
                                                                                   
                                               
  
                                                                    
import { describe, expect, test } from 'vitest'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { CARD_CATEGORIES } from '../../data/cardCategories'
import { applyEvents } from '../../src/loop/reduce'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { blocksEnemyTargeting, filterTargetable } from '../../src/keywords/untargetable'
import { shroudEvent } from '../../data/cards/untargetable-cards'
                                                                                        
import { UNL_101_DEST_KEY, UNL_101_FOE_KEY, UNL_101_FOE_UNIT_KEY } from '../../data/cards/UNL-101'

installProviders()

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const STEP_CAP = 200
type Any = Record<string, any>

const curState = (g: InteractiveGame): GameState => {
  const gg = g as unknown as { choice?: { state: GameState } | null; window?: { state: GameState } | null; state: GameState }
  return gg.choice?.state ?? gg.window?.state ?? gg.state
}
const mutationsDeps = makeGameDeps(0x1802) as never

                                                        
const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
const inHand = (oid: string, defId: string, who: PlayerId): GameObject =>
  obj(oid, defId, who, `hand:${who}`, { baseTypes: [CARD_CATEGORIES[defId] === 'spell' ? 'spell' : 'unit'] as never })
                                                                          

function scene(objs: readonly GameObject[], patch: Any = {}): GameState {
  const s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (!z) throw new Error(`造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  let i = 0
  for (const p of [P1, P2]) for (let k = 0; k < 4; k++) {
    const id = `deck${i++}`
    const c = obj(id, 'BLK', p, `mainDeck:${p}`)
    objects[id] = c
    zones[`mainDeck:${p}`] = { ...zones[`mainDeck:${p}`]!, contents: [...zones[`mainDeck:${p}`]!.contents, c.oid] }
  }
  return recomputeContinuous({
    ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones,
    runePools: {
      P1: { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } },
      P2: { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } },
    },
    ...patch,
  } as GameState)
}

                                            
function mutateInWindow(g: InteractiveGame, fn: (s: GameState) => GameState): void {
  const snap = g.snapshot() as Any
  const after = fn(curState(g))
  if (snap.window) g.restore({ ...snap, window: { ...snap.window, state: after } } as never)
  else if (snap.choice) g.restore({ ...snap, choice: { ...snap.choice, state: after } } as never)
  else g.restore({ ...snap, state: after } as never)
}

const findCardPlay = (g: InteractiveGame, player: PlayerId, cardOid: string, target?: string): InteractiveAction | null => {
  const acts = g.legalActions(player) as readonly Any[]
  return (acts.find((a) => a.kind === 'PLAY_CARD' && String(a.cardOid) === cardOid
    && (target === undefined || String(a.target) === target)
    && !(a.echoPicks?.length)) ?? null) as InteractiveAction | null
}

interface AskRec { step: number; key: string; stage: 'confirm' | 'resolve'; reqStage: string | undefined; passesBefore: number; answer: string; candidates: string[]; controller: string; isTarget: boolean }
interface RunOut { asks: AskRec[]; changeStep: number | null; hitCap: boolean; error: string | null; steps: number }

interface SceneSpec {
  build: () => { g: InteractiveGame; initial: InteractiveAction }
  onChoice: (key: string, req: Any, g: InteractiveGame) => string
  onWindow: (g: InteractiveGame, player: PlayerId, state: { confirmDone: boolean; mutated: boolean; changeStep: number | null }) => InteractiveAction | null
                                                         
  afterChoice?: (key: string, g: InteractiveGame) => void
}

function runScene(sc: SceneSpec): RunOut {
  const asks: AskRec[] = []
  const st = { confirmDone: false, mutated: false, changeStep: null as number | null }
  let steps = 0
  let passes = 0
  let error: string | null = null
  const { g, initial } = sc.build()
  try {
    g.apply(initial); steps++
    for (; steps < STEP_CAP;) {
      const raw = g.pending() as Any
      if (raw.mode === 'choice') {
        const req = raw.request as Any
        const key = String(req.key)
        const cands = ((req.candidates ?? []) as readonly Any[]).map((c) => String(c.id))
        const ans = sc.onChoice(key, req, g)
        asks.push({
          step: steps, key, stage: passes === 0 ? 'confirm' : 'resolve', reqStage: req.stage,
          passesBefore: passes, answer: ans, candidates: cands, controller: String(req.controller), isTarget: req.isTarget === true,
        })
        g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer: ans } as never)
        sc.afterChoice?.(key, g)
        steps++
        continue
      }
      if (raw.mode === 'window') {
        if (asks.length > 0) st.confirmDone = true
        const before = st.mutated
        const play = sc.onWindow(g, raw.player as PlayerId, st)
        if (st.mutated && !before) st.changeStep = steps
        if (play) g.apply(play)
        else { passes++; g.apply({ kind: 'PASS', player: raw.player } as never) }
        steps++
        continue
      }
      break
    }
  } catch (e) {
    error = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
  }
  return { asks, changeStep: st.changeStep, hitCap: steps >= STEP_CAP, error, steps }
}

const zoneOf = (g: InteractiveGame, oid: string): string => {
  const o = (curState(g).objects as unknown as Record<string, GameObject | undefined>)[oid]
  return o === undefined ? 'gone' : String(o.zone)
}
const damageOf = (g: InteractiveGame, oid: string): number =>
  ((curState(g).objects as unknown as Record<string, GameObject | undefined>)[oid]?.damage) ?? 0
const shields = (g: InteractiveGame, oid: string): boolean => {
  const o = (curState(g).objects as unknown as Record<string, GameObject | undefined>)[oid]
  return o === undefined ? false : blocksEnemyTargeting(o)
}

                                                                      
describe('★1802g ㈠ §355.10.e:UNL-101 第三问答者是 P2 ⇒ P2 送自己的啸匪不被遮', () => {
                                                                   
  const build = (): InteractiveGame => new InteractiveGame(scene([
    obj('a1', 'OGN-078', P1, BF0, { baseMight: 3 }),
    obj('shif', 'SFD-105', P2, BF0, { baseMight: 5 }),
    obj('plain', 'OGN-012', P2, BF0, { baseMight: 3 }),
    inHand('rl', 'UNL-101', P1),
  ], { battlefieldControl: { [BF1]: P1 } }), makeGameDeps(0x1802) as never)

  test('候选含啸匪(问口不滤);P2 答啸匪 ⇒ 啸匪真被移到 BF1;对照答普通单位 ⇒ 同样成功', () => {
                       
    {
      const g = build()
      const initial = findCardPlay(g, P1, 'rl', 'a1')
      expect(initial, '找得到战斗号令的打出动作').toBeTruthy()
      expect(shields(g, 'shif'), '前提:啸匪真带着「敌方法术/技能无法将我选作目标」').toBe(true)
                                                             
      let shifZone = ''
      let a1Zone = ''
      const R = runScene({
        build: () => ({ g, initial: initial! }),
        onChoice: (key, req) => key === UNL_101_DEST_KEY ? BF1
          : key === UNL_101_FOE_KEY ? String(P2)
          : key === UNL_101_FOE_UNIT_KEY ? 'shif'
          : String((req.candidates as readonly Any[])[0]?.id ?? ''),
        onWindow: () => null,
        afterChoice: (key, gg) => {
          if (key === UNL_101_FOE_UNIT_KEY) { shifZone = zoneOf(gg, 'shif'); a1Zone = zoneOf(gg, 'a1') }
        },
      })
      expect(R.error, `运行异常:${R.error}`).toBeNull()
      expect(R.hitCap, '打满步数').toBe(false)
      const third = R.asks.filter((a) => a.key === UNL_101_FOE_UNIT_KEY)
      expect(third.length, '★第三问恰问一次').toBe(1)
      expect(third[0]!.stage, '★第三问发生在结算期(PASS 之后)').toBe('resolve')
      expect(third[0]!.controller, '★★答者是那名对手 P2').toBe(String(P2))
      expect(third[0]!.isTarget, '★按 §355.10.e 不是目标选取').toBe(false)
      expect(third[0]!.candidates, '★★候选含啸匪(问口的 chooser 是 P2 本人,不该滤)').toContain('shif')
      expect(shifZone, '★★缺陷 270:啸匪真被移到该战场(不被遮)').toBe(BF1)
      expect(a1Zone, '前半句:我的单位也移到 BF1').toBe(BF1)
    }
                         
    {
      const g = build()
      const initial = findCardPlay(g, P1, 'rl', 'a1')
      let shifZone = ''
      let plainZone = ''
      const R = runScene({
        build: () => ({ g, initial: initial! }),
        onChoice: (key, req) => key === UNL_101_DEST_KEY ? BF1
          : key === UNL_101_FOE_KEY ? String(P2)
          : key === UNL_101_FOE_UNIT_KEY ? 'plain'
          : String((req.candidates as readonly Any[])[0]?.id ?? ''),
        onWindow: () => null,
        afterChoice: (key, gg) => {
          if (key === UNL_101_FOE_UNIT_KEY) { shifZone = zoneOf(gg, 'shif'); plainZone = zoneOf(gg, 'plain') }
        },
      })
      expect(R.error, `对照运行异常:${R.error}`).toBeNull()
      expect(plainZone, '★对照:普通单位被移到 BF1').toBe(BF1)
      expect(shifZone, '★对照:啸匪留在原处').toBe(BF0)
    }
  })
})

                                                               
describe('★1802g ㈡ 不放宽 §758.1:OGN-260 确认期选中的目标响应期变为不可被选取 ⇒ 结算仍失去目标', () => {
  test('确认期选 plainFoe;窗口注入「敌方不可选」⇒ 结算无伤;对照不注入 ⇒ 照打 3 点', () => {
    const build = (): InteractiveGame => new InteractiveGame(scene([
      obj('ally1', 'BLK', P1, 'base:P1', { baseMight: 3 }),
      obj('plainFoe', 'BLK', P2, BF0, { baseMight: 9 }),
      inHand('gust', 'OGN-260', P1),
    ]), makeGameDeps(0x1802) as never)
    {
      const g = build()
      const initial = findCardPlay(g, P1, 'gust', 'ally1')
      expect(initial, '找得到打出动作').toBeTruthy()
      const R = runScene({
        build: () => ({ g, initial: initial! }),
        onChoice: (key, req) => key === 'gustFoe' ? 'plainFoe' : String((req.candidates as readonly Any[])[0]?.id ?? ''),
        onWindow: (_gg, _p, st) => {
          if (st.confirmDone && !st.mutated) {
            mutateInWindow(g, (s) => applyEvents(s, [shroudEvent('probe1802g:shroud', 'plainFoe')], mutationsDeps).state)
            st.mutated = true
          }
          return null
        },
      })
      expect(R.error, `运行异常:${R.error}`).toBeNull()
      expect(R.changeStep, '★扰动真的发生了(窗口注入限制)').not.toBeNull()
      expect(shields(g, 'plainFoe'), '前提:注入后真带着限制').toBe(true)
      expect(damageOf(g, 'plainFoe'), '★★§758.1:确认期选中的目标结算前不可被选取 ⇒ 无伤').toBe(0)
    }
    {
      const g = build()
      const initial = findCardPlay(g, P1, 'gust', 'ally1')
      const R = runScene({
        build: () => ({ g, initial: initial! }),
        onChoice: (key, req) => key === 'gustFoe' ? 'plainFoe' : String((req.candidates as readonly Any[])[0]?.id ?? ''),
        onWindow: () => null,
      })
      expect(R.error, `对照运行异常:${R.error}`).toBeNull()
      expect(damageOf(g, 'plainFoe'), '★对照:不注入 ⇒ 照打 3 点').toBe(3)
    }
  })
})

                                                                           
                                  
                                                                            
  
                                                                     
                                                                             
                                                                                
                            
  
                                                                    
                                                           
                                                                               
                                                                    
                                                                    
                                                                           
                                      
  
                                   
                                                                
                                                              
                                                                 
                                                                 
                                                                      
  
                                                                       
                                                           
                                          
describe('★1805e ㈢ 判据自证:UNL-101 rallyFoeUnit(isTarget=false,没进 targets)不被遮', () => {
  test('第三问由 P2 答啸匪 ⇒ 该答案没进 targets ⇒ 不被遮、真被移到战场', () => {
    const g = new InteractiveGame(scene([
      obj('a1', 'OGN-078', P1, BF0, { baseMight: 3 }),
      obj('shif', 'SFD-105', P2, BF0, { baseMight: 5 }),
      obj('plain', 'OGN-012', P2, BF0, { baseMight: 3 }),
      inHand('rl', 'UNL-101', P1),
    ], { battlefieldControl: { [BF1]: P1 } }), makeGameDeps(0x1802) as never)
    const initial = findCardPlay(g, P1, 'rl', 'a1')
    expect(initial, '找得到战斗号令的打出动作').toBeTruthy()
    expect(shields(g, 'shif'), '前提:啸匪真带着「敌方法术/技能无法将我选作目标」').toBe(true)
    expect(filterTargetable(curState(g).objects, String(P1), ['shif']), '★反面靶:法术控制者 P1 选不了啸匪(旧判据会遮它)').toEqual([])
                                                     
    let shifZone = ''
    let itemTargets: readonly string[] = []
    const R = runScene({
      build: () => ({ g, initial: initial! }),
      onChoice: (key, req) => {
        if (key === UNL_101_FOE_UNIT_KEY) {
                                                                         
          itemTargets = ((curState(g).chain as readonly Any[]).find((it) => String(it.id) === String(req.itemId))?.targets ?? []) as readonly string[]
          return 'shif'
        }
        if (key === UNL_101_DEST_KEY) return BF1
        if (key === UNL_101_FOE_KEY) return String(P2)
        return String((req.candidates as readonly Any[])[0]?.id ?? '')
      },
      onWindow: () => null,
      afterChoice: (key, gg) => { if (key === UNL_101_FOE_UNIT_KEY) shifZone = zoneOf(gg, 'shif') },
    })
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    expect(R.hitCap, '打满步数').toBe(false)
    const third = R.asks.filter((a) => a.key === UNL_101_FOE_UNIT_KEY)
    expect(third.length, '★第三问恰问一次').toBe(1)
    expect(third[0]!.stage, '★第三问发生在结算期(§355.10.e:由该对手在结算时选)').toBe('resolve')
    expect(third[0]!.controller, '★★答者是那名对手 P2').toBe(String(P2))
    expect(third[0]!.isTarget, '★前提:这一问 isTarget=false(因此答案不进 targets)').toBe(false)
    expect(third[0]!.candidates, '候选含啸匪(问口的 chooser 是 P2 本人,不该滤)').toContain('shif')
    expect(itemTargets, '★前提:targets 非空(遮蔽确实 armed —— 打出时锁的主目标 a1 在里面)').toContain('a1')
    expect(itemTargets, '★★该答案没进 targets(不是本项目选作目标)').not.toContain('shif')
    expect(shifZone, '★★判据=进没进 targets:没进 ⇒ 不被遮 ⇒ 啸匪真被移到 BF1').toBe(BF1)
  })
})
