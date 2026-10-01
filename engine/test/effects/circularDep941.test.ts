import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { StaticEffect } from '../../src/effects/continuousView'
import { recomputeContinuous, CONTINUOUS_CAP } from '../../src/effects/continuousView'

                                                        
                                                        
                                                   
  
                                                  
                                                                                               
                                                    
                                                               
                       
                                                           
                                                  
                                           
  
                                                        
                                                        
                                                             

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function unit(oid: string, might: number, buff?: number): GameObject {
  return {
    oid: asObjId(oid), defId: 'SYN-941', owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0,
    counters: buff ? { buff } : {}, status: {},
  } as unknown as GameObject
}

const M = (s: GameState, id: string): number => s.objects[id]?.derived?.might ?? -999

   
                                                         
                                                      
   
function crossEff(
  id: string, readOid: string, gate: (m: number) => boolean, targetOid: string, delta: number,
): StaticEffect {
  return {
    id, duration: 'permanent', fromPassive: true, timestamp: 1,
    predicate: (o: GameObject, s: GameState) =>
      (o.oid as string) === targetOid &&
      gate(s.objects[readOid]?.derived?.might ?? s.objects[readOid]?.baseMight ?? 0),
    modification: { kind: 'addMight', delta },
  } as unknown as StaticEffect
}

function scene(us: GameObject[], eff: readonly StaticEffect[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const u of us) {
    objects[u.oid] = u
    const z = zones[u.zone]
    if (z) zones[u.zone] = { ...z, contents: [...z.contents, u.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones, continuousEffects: eff } as GameState
}

                                                            
const MUTUAL = (): StaticEffect[] => [
  crossEff('e1', 'B', (m) => m >= 4, 'A', 3),
  crossEff('e2', 'A', (m) => m >= 5, 'B', 2),
]
                                                                       
const OSCILLATE = (): StaticEffect[] => [
  crossEff('e1', 'B', (m) => m <= 4, 'A', 3),
  crossEff('e2', 'A', (m) => m >= 5, 'B', 2),
]

                                                     
const bare = (eff: readonly StaticEffect[]) => scene([unit('A', 2), unit('B', 4)], eff)
const withSpectator = (eff: readonly StaticEffect[]) =>
  scene([unit('A', 2), unit('B', 4), unit('C', 1, 1)], eff)

describe('★941 §476 真循环依赖:互相依赖的持续效果收敛到唯一不动点', () => {
  test('可收敛的互依景算到真不动点(A=5 / B=6),不是只推进一跳', () => {
    const s = recomputeContinuous(bare(MUTUAL()))
                                                      
    expect(M(s, 'A')).toBe(5)
    expect(M(s, 'B')).toBe(6)
  })

  test('两条路径(早退候选景 / 不动点循环景)对同一组效果给出【逐位相同】的答案', () => {
    const a = recomputeContinuous(bare(MUTUAL()))
    const b = recomputeContinuous(withSpectator(MUTUAL()))
    expect([M(a, 'A'), M(a, 'B')]).toEqual([M(b, 'A'), M(b, 'B')])
    expect(M(b, 'C')).toBe(2)                                      
  })

  test('幂等:对已收敛态再算,派生战力一位不动(不动点的定义)', () => {
    let s = recomputeContinuous(bare(MUTUAL()))
    const first: [number, number] = [M(s, 'A'), M(s, 'B')]
    for (let i = 0; i < 3; i++) s = recomputeContinuous(s)
    expect([M(s, 'A'), M(s, 'B')]).toEqual(first)
  })

                                                                         
                                                            
                                                        
                                                           
                                                       
                                                           
                                                                    
  const EXCLUSIVE = (): StaticEffect[] => [
    crossEff('x1', 'B', (m) => m <= 3, 'A', 3),
    crossEff('x2', 'A', (m) => m <= 3, 'B', 3),
  ]
  test('互斥对:整轮同时应用,不许凭物件插入顺序决出胜负', () => {
    const fwd = () => recomputeContinuous(scene([unit('A', 2), unit('B', 2), unit('C', 1, 1)], EXCLUSIVE()))
    const rev = () => recomputeContinuous(scene([unit('C', 1, 1), unit('B', 2), unit('A', 2)], EXCLUSIVE()))
                                                 
    expect(fwd).toThrow(/§476\.2|疑似循环/)
    expect(rev).toThrow(/§476\.2|疑似循环/)
  })

  test('可收敛景颠倒插入顺序,不动点不变', () => {
    const fwd = recomputeContinuous(scene([unit('A', 2), unit('B', 4), unit('C', 1, 1)], MUTUAL()))
    const rev = recomputeContinuous(scene([unit('C', 1, 1), unit('B', 4), unit('A', 2)], MUTUAL()))
    expect([M(fwd, 'A'), M(fwd, 'B')]).toEqual([M(rev, 'A'), M(rev, 'B')])
  })
})

describe('★941 §476.2 不收敛必须抛,不许静默给答案', () => {
  test('振荡型循环依赖:抛「疑似循环」', () => {
    expect(() => recomputeContinuous(bare(OSCILLATE()))).toThrow(/§476\.2|疑似循环/)
  })

  test('两条路径对振荡景的判定一致(都抛,不是一条抛一条静默)', () => {
    expect(() => recomputeContinuous(bare(OSCILLATE()))).toThrow()
    expect(() => recomputeContinuous(withSpectator(OSCILLATE()))).toThrow()
  })

  test('抛错不留半成品:入参 state 的 derived 没有被就地改写', () => {
    const s0 = bare(OSCILLATE())
    const before = Object.keys(s0.objects).map((k) => s0.objects[k]?.derived)
    expect(() => recomputeContinuous(s0)).toThrow()
    expect(Object.keys(s0.objects).map((k) => s0.objects[k]?.derived)).toEqual(before)
  })
})

describe('★941 多跳链:依赖深度大于 2 时逐轮推进到底', () => {
                                                                     
  const CHAIN = (): StaticEffect[] => [
    crossEff('c1', 'C', (m) => m >= 2, 'B', 3),
    crossEff('c2', 'B', (m) => m >= 7, 'A', 4),
  ]
  test('三跳链一次 recompute 就走到底(不是每次事件才推进一跳)', () => {
    const s = recomputeContinuous(scene([unit('A', 2), unit('B', 4), unit('C', 1, 1)], CHAIN()))
    expect(M(s, 'C')).toBe(2)
    expect(M(s, 'B')).toBe(7)
    expect(M(s, 'A')).toBe(6)              
  })
  test('迭代上限是有限的护栏,不是靠"链够短"侥幸', () => {
    expect(CONTINUOUS_CAP).toBeGreaterThan(3)
    expect(Number.isFinite(CONTINUOUS_CAP)).toBe(true)
  })
})

                                        
  
                                                 
                                                           
                                     
                                                                        
                                             
                                                       
  
                                        
                                                                     
                                                                                   
  
                                                    
                                                            
                                                         
describe('★1341【缺陷 171】谓词抛错不该炸掉整局重算', () => {
                                                         
  const boomEff = (calls: { n: number }): StaticEffect => ({
    id: 'boom-1341', duration: 'permanent', fromPassive: true, timestamp: 1,
    predicate: (): boolean => { calls.n++; throw new Error('★数据层谓词抛错(模拟引用已离场物件)') },
    modification: { kind: 'addMight', delta: 99 },
  } as unknown as StaticEffect)

  test('★★★★★ 一条卡的谓词抛错 ⇒ 重算不许炸,那条按【不命中】处理', () => {
    const calls = { n: 0 }
    const s = scene([unit('A', 2)], [boomEff(calls)])
    let out: GameState | undefined
    expect(() => { out = recomputeContinuous(s) },
      '★★★★★谓词抛错把整局重算炸了 —— battle.ts:152/359 直接调 recomputeContinuous 且无 try/catch,对局会当场崩。改用 src/effects/safePredicate.ts 的 safePredicate(e, o, state)。')
      .not.toThrow()
    expect(calls.n, '★前提自证:那枚谓词【确实被求值过】(否则「没抛」只是因为压根没走到)').toBeGreaterThan(0)
    expect(M(out!, 'A'), '★★抛错的那条按不命中处理 ⇒ 不该吃到 +99').toBe(2)
  })

  test('★★【防修过头】吞掉抛错的那条,不许连累同批里正常的效果', () => {
    const calls = { n: 0 }
                               
    const ok = crossEff('ok-1341', 'A', () => true, 'A', 3)
    const s = scene([unit('A', 2)], [boomEff(calls), ok])
    const out = recomputeContinuous(s)
    expect(calls.n, '★前提自证:必抛那条确实被求值过').toBeGreaterThan(0)
    expect(M(out, 'A'), '★★★正常那条照常生效(2 + 3 = 5)—— 防「一条抛错就整批不算」这种修过头').toBe(5)
  })

  test('★★【判别力下限】把必抛换成必不命中,结果应当一致(证明上面两条不是恒真)', () => {
    const never: StaticEffect = { id: 'never-1341', duration: 'permanent', fromPassive: true, timestamp: 1,
      predicate: (): boolean => false, modification: { kind: 'addMight', delta: 99 } } as unknown as StaticEffect
    const ok = crossEff('ok2-1341', 'A', () => true, 'A', 3)
    expect(M(recomputeContinuous(scene([unit('A', 2)], [never, ok])), 'A'),
      '★对照:谓词返回 false 与谓词抛错,结果必须同为「那条不生效、其余照常」').toBe(5)
  })
})
