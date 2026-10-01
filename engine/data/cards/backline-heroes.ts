                                                               
                                           
                                                             
                                                  
                                                                    
                                                  
  
                                                        
                    
                                                          
                                                                    
                    
                                                 
                                             
                                   
  
                                                              
                                                                   
                                                                 
                                                                     
  
                                      
                                                          
                                                         
                                                     
import type { Card } from '../../src/dsl/card'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'
import { effectiveMight } from '../../src/state/might'
import { clearDamageDormantRecall } from '../../src/state/recall'

                                                                       
export const CAITLYN_CARD_EFFECT =
  '我在战斗中最后承担伤害。\n' +
  '{{横置}}：对任意战场中的一个敌方单位造成等同于我战力的伤害。我必须位于战场中才能使用此技能。'

   
                                           
                         
  
                                             
                                                          
                                                           
   
export const selfOnBattlefield = (state: GameState, selfOid: string): boolean =>
  state.zones[state.objects[selfOid as ObjId]?.zone ?? '']?.kind === 'battlefield'

                                                                     
export const caitlynOnBattlefield = selfOnBattlefield

export const OGN_068_SPEC: ActivatedSpec = {
  key: 'OGN-068:snipe',
  label: '{{横置}}:对任意战场中的一个敌方单位造成等同于我战力的伤害',
  cost: {},
  tapSelf: true,
  available: (state, _c, selfOid) => caitlynOnBattlefield(state, selfOid),
  target: 'custom',
                                                               
  legalTargets: (state, controller): string[] =>
    Object.values(state.objects)
      .filter((o) => state.zones[o.zone]?.kind === 'battlefield' && isUnit(o) && o.controller !== controller)
      .map((o) => o.oid as string)
      .sort(),
  makeResolve: ({ selfOid, controller, target }) => (state): readonly GameEvent[] => {
    const me = state.objects[selfOid as ObjId]
    if (target === undefined || me === undefined || state.objects[target as ObjId] === undefined) return []
                                                                
    return [{
      kind: 'damage', target: target as ObjId, amount: effectiveMight(me).reference,
      source: selfOid as ObjId, sourcePlayer: controller,
    } ]
  },
}

const caitlyn = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '凯特琳 - 守望者', category: 'unit',
  domains: ['green'], energy: 3, power: 3,
  keywords: ['后排'], // ② 裸句「我在战斗中最后承担伤害」= [后排] 的提醒文本
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[后排];[横置]对任意战场的敌方单位造成等同于我战力的伤害(OGN_068_SPEC)' }],
})
export const OGN_068: Card = caitlyn('OGN-068', 'OGN·068/298')
export const ARC_002: Card = caitlyn('ARC-002', 'ARC-002/006')

                                                                      
export const SORAKA_CARD_EFFECT =
  '我在战斗中最后承担伤害。\n' +
  '如果你在此处控制的另一名单位被摧毁，且该单位的战力低于我，则改为移除其所受伤害，' +
  '让其变为休眠状态，并将其召回。（把该单位送回基地，此行动不算作移动。）'

                                 
export const SORAKA_DEF_IDS: readonly string[] = ['SFD-173', 'SFD-239', 'SFD-239*']

   
                                                  
                                     
   
export function sorakaSaviorOf(state: GameState, oid: ObjId): ObjId | undefined {
  const dying = state.objects[oid]
  if (dying === undefined || !isUnit(dying)) return undefined
                                            
  if (state.zones[dying.zone]?.kind !== 'battlefield') return undefined
  const dyingMight = effectiveMight(dying).reference
  return Object.values(state.objects)
    .filter((o) =>
      SORAKA_DEF_IDS.includes(o.defId) &&
                                                     
                                                                                    
                                                      
                                                          
                                                          
                                                        
      o.oid !== oid &&
      o.controller === dying.controller &&                     
      o.zone === dying.zone &&                            
      dyingMight < effectiveMight(o).reference)                  
    .map((o) => o.oid)
    .sort()[0]
}

   
                                                             
                                                              
   
export function sorakaSave(state: GameState, oid: ObjId): GameState | null {
  return sorakaSaviorOf(state, oid) === undefined ? null : clearDamageDormantRecall(state, oid)
}

const soraka = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '索拉卡 - 星尘逆旅', category: 'unit',
  domains: ['yellow'], energy: 4, power: 4,
  keywords: ['后排'],
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[后排];此处友方小单位被摧毁时改为清伤+休眠+召回(sorakaSave)' }],
})
export const SFD_173: Card = soraka('SFD-173', 'SFD·173/221')
export const SFD_239: Card = soraka('SFD-239', 'SFD·239/221')
