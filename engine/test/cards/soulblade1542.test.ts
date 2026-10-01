                                                                          
  
                                                   
                                                                             
                                                
                                                                             
                        
                                                                           
                                                            
                                     
                                          
  
          
                                                                        
                                                  
                                                               
                                                                
                                                                  
                                                      
import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { UNL_039_LEVEL, UNL_039_MIGHT_DELTA, GEAR_HOST_PASSIVES } from '../../data/cards/gear-host-passives'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { cardPassives } from '../../data/registry'

                                                   
setCardPassiveProvider(cardPassives)

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const HOST_MIGHT = 3

const obj = (oid: string, defId: string, ctrl: PlayerId, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
  baseMight: HOST_MIGHT, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)

                                               
function scene(xp: number, o: { attached?: boolean; gearCtrl?: PlayerId } = {}): GameState {
  const { attached = true, gearCtrl = P1 } = o
  const base = createInitialState([P1, P2], 2)
  const gear = obj('gear', 'UNL-039', gearCtrl, {
    baseTypes: ['equipment'], baseMight: 0,
    ...(attached ? { status: { attachedTo: asObjId('host') } } : {}),
  })
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const x of [obj('host', 'BLK', P1), gear]) {
    objects[x.oid] = x
    const z = zones[x.zone]
    if (z) zones[x.zone] = { ...z, contents: [...z.contents, x.oid] }
  }
  return {
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    experience: { ...base.experience, [gearCtrl as string]: xp },
  } as GameState
}
const hostMight = (s: GameState): number => effectiveMight(recomputeContinuous(s).objects['host']!).actual

describe('★1542 灵魂之剑 UNL-039 的 [等级3] 条件加成(缺陷 204)', () => {
  test('① 在册:表里有这一行,且条件档是 controllerAtLevel3、数额走 ㊶ 常量', () => {
    const row = GEAR_HOST_PASSIVES.find((r) => r.defId === 'UNL-039')
    expect(row, '★要在 GEAR_HOST_PASSIVES 里').toBeDefined()
    expect(row!.condition).toBe('controllerAtLevel3')
    expect(row!.modification).toEqual({ kind: 'addMight', delta: UNL_039_MIGHT_DELTA })
    expect(row!.cardText, '★卡文逐字(来源=补录 effectBoxes)').toContain('等级3 我额外获得[M]+1')
    expect(UNL_039_LEVEL, '★门槛 3').toBe(3)
  })

  test('🔴② §824.1.b.1「不少于」是 >=:经验 2 不给 / 3 给 / 4 给', () => {
    expect(hostMight(scene(2)), `★经验 2 ⇒ 只有印刷加成(${HOST_MIGHT})`).toBe(HOST_MIGHT)
    expect(hostMight(scene(3)), '★经验 3 ⇒ 额外 +1').toBe(HOST_MIGHT + UNL_039_MIGHT_DELTA)
    expect(hostMight(scene(4)), '★经验 4 ⇒ 照样给(不是 == 3)').toBe(HOST_MIGHT + UNL_039_MIGHT_DELTA)
    expect(hostMight(scene(0)), '★经验 0 ⇒ 不给').toBe(HOST_MIGHT)
  })

  test('③ §136.2.b/§721.2 未贴附 ⇒ 一条都不产(哪怕经验够)', () => {
    expect(hostMight(scene(5, { attached: false })), '★没贴在宿主上 ⇒ 宿主拿不到').toBe(HOST_MIGHT)
  })

  test('🔴④ §824.1.d 经验掉下去【立即失效】(provider 每次现算,不缓存)', () => {
    const on = scene(3)
    expect(hostMight(on), '★前提:3 经验时在生效').toBe(HOST_MIGHT + UNL_039_MIGHT_DELTA)
    const off: GameState = { ...on, experience: { ...on.experience, [P1 as string]: 2 } }
    expect(hostMight(off), '★经验掉回 2 ⇒ 加成当场消失').toBe(HOST_MIGHT)
  })

  test('🔴⑤ §824.1.c.1 判的是【带[等级]那张卡(武装)】的控制者,不是宿主的', () => {
                                                            
    const s = scene(3, { gearCtrl: P2 })
    expect(s.experience[P1 as string] ?? 0, '★前提:宿主控制者 P1 没有经验').toBe(0)
    expect(s.experience[P2 as string], '★前提:武装控制者 P2 有 3 经验').toBe(3)
    expect(hostMight(s), '★按武装控制者判 ⇒ 宿主吃到 +1').toBe(HOST_MIGHT + UNL_039_MIGHT_DELTA)
    // ⚠️反向:若误读成宿主的控制者,这一条会退回 HOST_MIGHT —— 失败信息就指这里。
  })

  test('⑥ 前提自证:去掉这一行实现,②⑤ 会红(证明不是别的层在兜)', () => {
                                                          
    const src = GEAR_HOST_PASSIVES.map((r) => r.defId)
    expect(src, '★UNL-039 在册(删掉它 ② ⑤ 立刻退回 HOST_MIGHT)').toContain('UNL-039')
    expect(hostMight(scene(3)) - hostMight(scene(2)), '★这个差值就是本轮修的那 1 点').toBe(UNL_039_MIGHT_DELTA)
  })
})
