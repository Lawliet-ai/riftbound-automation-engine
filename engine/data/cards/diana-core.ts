                                       
                                                            
                                             
                                                                            
                                                  
                                                            
                                                                      
                                                            
                                                 
                                                     
                                                                    

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { canPayFromState, couldPayWithReactionGains, payFromState } from '../../src/game/economy'
import { voidSproutChoice, voidSproutRecycleEvents } from './SFD-018'        
import { topOfDeck } from '../../src/keywords/insight'
import { insightRecycleChoice, insightRecycled } from '../../src/keywords/insightChoice'

                               
const UNL_079_INS_PREFIX = 'UNL-079:ins'
import { isUnitDefId } from '../cardKinds'
import { isUnit } from '../../src/state/cardTypes'                                         

                                                                                                                                     
export const UNL_079_CARD_EFFECT =
  '当法术对决在此处开始时，你可以选择支付{{1}}。若如此做，则进行{{洞察}}，然后展示你主牌堆顶部的一张牌。' +
  '如果是一张法术牌，则抽取该卡牌。（洞察时，查看你主牌堆顶部的一张牌。你可以选择将其回收。）'
export const UNL_134_CARD_EFFECT =
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n{{回响}}{{2}}（你可以选择支付此额外费用，以重复此法术效果。）\n' +
  '{{眩晕}}一名正在进攻的敌方单位。如果它已经被眩晕，则改为让该单位返回其所属的手牌。'
                                                                               
                                                                                
export const UNL_197_CARD_EFFECT =
  '{{反应>}} {{横置}}：{{获得}}{{1}}。此法力仅可在法术对决期间消耗。（获得费用资源的技能无法成为其他法术的反应目标。）'

                                    
export function attackingEnemies(state: GameState, controller: PlayerId): string[] {
  const out: string[] = []
  for (const z of Object.values(state.zones)) {
    if (z.kind !== 'battlefield') continue
    for (const oid of z.contents) {
      const o = state.objects[oid]
                                                           
                                                                          
                                                      
      if (o && o.controller !== controller && o.status.attacking === true
        && isUnitDefId(o.defId) && isUnit(o)) out.push(oid)
    }
  }
  return out
}

   
                                                       
                                            
   
export function makeDianaDuelTrigger(selfOid: ObjId, controller: PlayerId, isSpell: (defId: string) => boolean): Trigger {
  const effect = compileEffect({
                                                       
                                                                 
                                                            
                                                                   
                                                                  
    then: [
                                                                  
                                                                
      { op: 'custom', emit: (ctx) => {
        const recycle = insightRecycled(ctx.chosen, UNL_079_INS_PREFIX)
        return [{ kind: 'insight', player: ctx.controller, count: 1, ...(recycle.length > 0 ? { recycle } : {}) }]
      } },
      { op: 'custom', emit: (ctx) => {
                                                          
                                                             
                                                  
                                                    
                                               
        const recycled = insightRecycled(ctx.chosen, UNL_079_INS_PREFIX)
                                                 
        const sproutTop = topOfDeck(ctx.state, ctx.controller, 2).find((o) => !recycled.includes(o))
        const rec = voidSproutRecycleEvents(ctx.state, ctx.controller, ctx.chosen, sproutTop)
        const skip = rec.length > 0 ? sproutTop : undefined
        const top = topOfDeck(ctx.state, ctx.controller, 3).find((o) => !recycled.includes(o) && o !== skip)
        const topDef = top ? ctx.state.objects[top]?.defId : undefined
                                                              
        const reveal: GameEvent[] = top !== undefined
          ? [{ kind: 'revealed', player: ctx.controller, cards: [top] } as GameEvent] : []
        return topDef && isSpell(topDef)
          ? [...rec, ...reveal, { kind: 'draw', player: ctx.controller, count: 1 }] : [...rec, ...reveal]
      } },
    ],
  })
  return compileTrigger({
    id: 'UNL-079-duel', // 编译层拼成 `UNL-079-duel:${selfOid}`
    event: 'duelStart', by: 'any',
                                          
                                                                     
    when: [{ kind: 'selfAtEventBattlefield' }, {
                                                               
                                                                
                                                                    
                                                                                     
                                                                      
      kind: 'custom' as const,
      test: (_ev: GameEvent, state: GameState): boolean =>
        couldPayWithReactionGains(state, controller, { mana: 1 }),
    }],
    mayChoose: true, // ★1447【缺陷 194】§383.3.a:卡文开头就是「你可以选择」⇒ 这一问在【确认阶段】
                                                                
                                                                       
                                                                
                                                                 
    basePerform: (state): GameState | null => {
      const paid = payFromState(state, controller, { mana: 1 })
      return paid.ok ? paid.state : null
    },
    nextChoice: (state, _ev, chosen) => {
                                                          
                                                           
                                                           
                                                            
                                
                                                 
      const iq = insightRecycleChoice({
        itemId: `trig:UNL-079-duel:${selfOid}`, controller, look: 1, prefix: UNL_079_INS_PREFIX,
        prompt: '黛安娜·洞察1:是否回收顶上这张(不回收就原样放回)?',
      })(state, chosen)
      if (iq) return iq
                                                             
      const sproutTop = topOfDeck(state, controller, 2).find((o) => !insightRecycled(chosen, UNL_079_INS_PREFIX).includes(o))
      return voidSproutChoice(state, controller, chosen, sproutTop)
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const UNL_079: Card = {
  id: 'UNL-079', cardNo: 'UNL-079/219', name: '黛安娜·皎月化身', category: 'unit', domains: ['blue'],
  energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '法术对决在此处开始时可付1洞察+法术则抽(makeDianaDuelTrigger)' }],
}
export const UNL_134: Card = {
  id: 'UNL-134', cardNo: 'UNL-134/219', name: '存在焦虑', category: 'spell', domains: ['purple'],
  energy: 1, keywords: ['迅捷', '回响'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '眩晕进攻中敌方单位;已眩晕则弹回(PlaySpec,带回响2)' }],
}
export const UNL_197: Card = {
  id: 'UNL-197', cardNo: 'UNL-197/219', name: '皎月女神', category: 'legend', domains: ['blue', 'purple'],
  keywords: ['反应'], playModes: [], 
  abilities: [{ kind: 'passive', describe: '[反应][E]:获得{1}(ActivatedSpec;⚠️对决限定池未建模)' }],
}
