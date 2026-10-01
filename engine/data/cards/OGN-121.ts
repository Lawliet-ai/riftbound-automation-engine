                                                 
                                                          
                                                
                                                                       
                                                                            
                                                             

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { applyEvents } from '../../src/loop/reduce'
import { insight, topOfDeck } from '../../src/keywords/insight'
import { voidSproutChoice, voidSproutRecycleEvents, voidSproutFilter } from './SFD-018'        
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { currentKeywords } from '../../src/state/object'

export const OGN_121_CARD_EFFECT =
  '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n' +
  '当我防守时，选择一名此处的敌方单位，展示你主牌堆顶部的五张牌。当中每有一张带有{{待命}}技能的卡牌，便对该单位造成1点伤害，然后将展示的牌回收。'

function hasStandbyKeyword(obj: GameObject | undefined): boolean {
  if (!obj) return false
  return (currentKeywords(obj)).includes('待命')
}

   
                                                      
                                          
   
export function militaristDefendEffect(
  state: GameState,
  chosenEnemyOid: ObjId,
  controller: PlayerId,
  selfOid?: ObjId, // ★854 与事件形式同签名(见下);缺省=老行为
): GameState {
  const top5 = topOfDeck(state, controller, 5)                               
  const standbyCount = top5.filter((oid) => hasStandbyKeyword(state.objects[oid])).length
  let s = state
  if (standbyCount > 0) {
                                                                   
                                          
                                                    
    s = applyEvents(s, [{ kind: 'damage', target: chosenEnemyOid, amount: standbyCount,
      ...(selfOid !== undefined ? { source: selfOid } : {}), sourcePlayer: controller }]).state          
  }
  return insight(s, controller, 5, (top) => top)               
}

                                                         
export function militaristEffectEvents(
  state: GameState,
  chosenEnemyOid: ObjId,
  controller: PlayerId,
  chosen?: Readonly<Record<string, string>>, // ★748 兽苗前置问档答案(缺省=旧行为一字不变)
  selfOid?: ObjId, // ★854 发这发伤害的物件(军事家自己)。见下面 damage 那行的说明;缺省=老行为
): readonly GameEvent[] {
                                                      
                                                                 
                                                                  
  const rec = voidSproutRecycleEvents(state, controller, chosen)
  const top5 = voidSproutFilter(chosen, state, controller, topOfDeck(state, controller, 5))
  const standbyCount = top5.filter((oid) => hasStandbyKeyword(state.objects[oid])).length
  const events: GameEvent[] = [...rec]
                                                          
                                             
  if (top5.length > 0) events.push({ kind: 'revealed', player: controller, cards: top5 })
                                                                          
                                                        
                                                        
  if (standbyCount > 0) events.push({ kind: 'damage', target: chosenEnemyOid, amount: standbyCount,
    ...(selfOid !== undefined ? { source: selfOid } : {}), sourcePlayer: controller })      
  if (top5.length > 0) events.push({ kind: 'insight', player: controller, count: top5.length, recycleAll: true })                
  return events
}

                                                 
function enemyUnitsHere(state: GameState, selfOid: ObjId, controller: PlayerId): ObjId[] {
  const self = state.objects[selfOid]
  if (!self) return []
  const z = state.zones[self.zone]
  if (!z || z.kind !== 'battlefield') return []
  return z.contents.filter((oid) => oid !== selfOid && state.objects[oid]?.controller !== controller)
}

   
                                                
                                                          
   
export function makeMilitaristTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                       
                                                                           
                                                                           
                                                     
                                           
  const effect = compileEffect({
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => {
        const target = ctx.chosen['target']
        if (!target) return []                              
                                                                
                                                                                 
        if (!enemyUnitsHere(ctx.state, selfOid, controller).includes(target as ObjId)) return []
        return militaristEffectEvents(ctx.state, target as ObjId, ctx.controller, ctx.chosen,
          ctx.selfOid ?? undefined)                                             
      },
    }],
  })
  return compileTrigger({
    id: `OGN-121-defend:${selfOid}`,
    rawId: true, // id 已自带 selfOid
    event: 'defend',
    when: [{ kind: 'custom', test: (ev) => ev.kind === 'defend' && ev.unit === selfOid }], // 当【我】防守时
    nextChoice: (state, _ev, chosen) => {
      const vq = voidSproutChoice(state, controller, chosen)                    
      if (vq) return vq
      if (chosen.target !== undefined) return null
      const cands = enemyUnitsHere(state, selfOid, controller).map((oid) => ({ id: oid, label: `集火→${oid}` }))
      if (cands.length === 0) return null                       
      return { itemId: `trig:OGN-121-defend:${selfOid}:defend:${selfOid}`, controller, key: 'target', prompt: '军事家:选择此处一名敌方单位集火', candidates: cands,
        isTarget: true, // ★1782 对此处的一名敌方单位造成1点伤害
        }
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const OGN_121: Card = {
  id: 'OGN-121',
  cardNo: 'OGN·121/298',
  name: '提莫',
  category: 'unit', // 英雄单位,subTitle 军事家
  domains: ['blue'], // 灵光(CN库 cardColorList=['blue'],2026-07-20核)
  energy: 2,
  power: 2,
  keywords: ['待命'], // §811 自带待命
  playModes: [{ kind: 'standard' }, { kind: 'hidden' }], // 可标准打出或待命
  abilities: [{ kind: 'triggered', trigger: makeMilitaristTrigger('SELF' as ObjId, 'SELF' as PlayerId) }],
}
