import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { makeViktorPioneerTriggers } from '../../data/cards/OGN-117'
import { eventSubjectIsToken, eventSubjectIsUnit } from '../../data/cards/notTokenGuard1154'

                                                                                  
  
                                                                                         
                                                                            
                                                                                                     
                                                 
  
                                                                        
                                                              
                                                                
                                          
  
                                                                   
                                                     
  
                                    
                                                           
                                                                           
                                                                              
                                                                                  
                             
  
                                  
                                                                   
                                            
                                                       
                                                                            
                                                            
                                                         
                                                                     
                                                                                  
                                                                 
                                                  
                                   
  
                                                     
                                          

const P1 = asPlayerId('P1'); const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const obj = (oid: string, defId: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as GameObject)
function scene(objs: readonly GameObject[]): GameState {
  const b = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}; const zones = { ...b.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]; if (!z) throw new Error(`★造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
                                               
  return { ...b, activePlayer: P2, phase: 'main', objects, zones } as GameState
}
const TRIGS = makeViktorPioneerTriggers(asObjId('vik'), P1)
const viktorItems = (evs: readonly GameEvent[]): number => {
  const s0 = scene([obj('vik', 'OGN-117', P1, BF0), obj('tok', 'token:随从', P1, BF0)])
  const s = landAndEnqueueTriggers(s0, evs, (() => TRIGS) as never, P1, {})
  return (s.chain ?? []).filter((i) => String(i.id).includes('OGN-117')).length
}
const PLAY_TOKEN: GameEvent = { kind: 'playUnit', unit: asObjId('tok'), player: P1, at: BF0 } as unknown as GameEvent

describe('★1274【前瞻守卫】§185 守卫 SUBJECT_IS_NOT_TOKEN 在【取不到物件】时 fail-open', () => {
  test('① 判据层:同一个文件里两道守卫的失效方向【相反】—— 一个 fail-open、一个 fail-closed', () => {
    const s = scene([obj('vik', 'OGN-117', P1, BF0)])
    const ghost = { kind: 'playUnit', unit: asObjId('不存在'), player: P1 } as unknown as GameEvent
    expect(s.objects[asObjId('不存在')], '★前提:这个 oid 真的不在 objects 里').toBeUndefined()
    expect(eventSubjectIsToken(ghost, s),
      '★★★fail-open:取不到物件 ⇒ isToken(undefined)=false ⇒ 判成「不是指示物」⇒ SUBJECT_IS_NOT_TOKEN 放行').toBe(false)
    expect(eventSubjectIsUnit(ghost, s),
      '★★对照:同文件的 isUnit 走 typesOf(undefined)=[] ⇒ false ⇒ SUBJECT_IS_UNIT 是 fail-closed(方向相反)').toBe(false)
  })

  test('② 行为层【记档当前行为】:同一批里指示物打出后就离场 ⇒ 维克托【误响】', () => {
    const evs: GameEvent[] = [PLAY_TOKEN, { kind: 'banish', target: asObjId('tok'), by: P1 } as unknown as GameEvent]
    expect(viktorItems(evs),
      '★★★记档:批末取不到那枚指示物 ⇒ 守卫放行 ⇒ 说「打出一张【卡牌】」的维克托被一枚【指示物】点着了(§185 指示物不属于卡牌)。修好后这里应变 0').toBe(1)
  })

  test('③ 两条对照,证明 ② 不是恒真', () => {
    expect(viktorItems([PLAY_TOKEN]),
      '★对照 A(单变量:只去掉那条离场事件):指示物批末仍在 ⇒ 守卫挡住 ⇒ 不响').toBe(0)
    const realCard: GameEvent = { kind: 'playUnit', unit: asObjId('vik'), player: P1, at: BF0 } as unknown as GameEvent
    expect(viktorItems([realCard]),
      '★对照 C(判别力下限):打出的是【真卡牌】⇒ 本来就该响;若这条也是 0,说明造景根本没通,②那个 1 不作数').toBe(1)
  })
})
