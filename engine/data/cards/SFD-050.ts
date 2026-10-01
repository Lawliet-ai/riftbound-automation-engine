                                                                     
                                                     
                                                    
                                             
                  
                                            
  
                            
                                                
                                                              
                                                      
                                                
                                                                 
                                                        
                                             
                                             
                                                              
  
                                                           
                                                               
                                                                       
                                                        
                                                                      
                                                
import type { GameEvent } from '../../src/loop/events'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import { isUnit } from '../../src/state/cardTypes'                                              
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Card } from '../../src/dsl/card'
import { moveUnitEvents } from './enemy-move'
import { objectCardTags } from '../cardTagQuery'
import { GEAR_CARDS } from '../gearCards'

export const SFD_050_CARD_EFFECT =
  '支付{{绿色}}：{{迅捷}} — 选择一个受你控制的单位，将我移动到它的位置，再将它移动到我原来的位置。'
  + '如果该单位已配有武装，则你可以选择将其中一件武装贴附到我身上。每回合仅可使用一次。'

                                         
export function armamentsOn(state: GameState, unit: string | undefined): ObjId[] {
  if (unit === undefined) return []
  return Object.values(state.objects)
    // ⚠️「武装」是合成标签(registry.defHasTag 同款两半):印刷/获得标签那半走 objectCardTags,
    //   [武装]装备卡那半 = defId in GEAR_CARDS(data 层直查,不成环 ⑦)
    .filter((o) => (o.status.attachedTo as string | undefined) === unit
      && (objectCardTags(o).includes('武装') || o.defId in GEAR_CARDS))
    .map((o) => o.oid)
}

const fielded = (state: GameState, oid: string): boolean => {
  const k = state.zones[state.objects[oid as ObjId]?.zone as never]?.kind as string | undefined
  return k === 'battlefield' || k === 'base'
}

export const SFD_050_SPEC: ActivatedSpec = {
  key: 'SFD-050:swap', label: '阿兹尔:与友方单位互换位置(可转移一件武装)',
  keywords: ['迅捷'], // §806 权限轴(反应窗可激活);⚠️不是单位印刷关键词
  cost: { pips: [['green']] }, // 「支付{绿色}」= 纯 1 绿 pip,零法力
  oncePerTurn: true, // 「每回合仅可使用一次」(★682 档;按技能实例记账,QA L290)
  target: 'custom',
                                                               
  legalTargets: (state: GameState, controller: PlayerId): string[] =>                                          
    Object.values(state.objects)
      .filter((o) => o.controller === controller
        && isUnit(o)                                                                                                    
        && fielded(state, o.oid as string))
      .map((o) => o.oid as string)
      .sort(),
                                                             
  extraCost: {
    label: '选择要转移的武装(可不转移)',
    options: (state: GameState, _c: PlayerId, _selfOid: string, target?: string) => [
      ...armamentsOn(state, target).map((g) => ({
        id: g as string, label: `转移武装:${state.objects[g]?.defId ?? g}`,
      })),
      { id: 'none', label: '不转移武装' }, // 「你**可以**选择」⇒ 不转移档恒在
    ],
    pay: (state: GameState): GameState => state, // 非费用:宣告期锁定选择,零状态变更
  },
  makeResolve:
    ({ selfOid, controller, target, extraChoice }: { selfOid: string; controller: PlayerId; target?: string; extraChoice?: string }) =>
    (state: GameState): readonly GameEvent[] => {
      const self = state.objects[selfOid as ObjId]
      const tgt = target !== undefined ? state.objects[target as ObjId] : undefined
      if (!self || !tgt || !fielded(state, selfOid) || !fielded(state, target!)) return []                      
                                                                        
      const selfZone = self.zone as string
      const tgtZone = tgt.zone as string
      const evs: GameEvent[] = [
        ...moveUnitEvents(state, selfOid, tgtZone),
        ...moveUnitEvents(state, target, selfZone),
      ]
                                                    
      if (extraChoice !== undefined && extraChoice !== 'none') {
        const gear = state.objects[extraChoice as ObjId]
        if (gear && (gear.status.attachedTo as string | undefined) === target) {
          evs.push({ kind: 'attach', obj: extraChoice as ObjId, to: selfOid as ObjId, player: controller } as GameEvent)
        }
      }
      return evs
    },
}

export const SFD_050: Card = {
  id: 'SFD-050', cardNo: 'SFD·050/221', name: '阿兹尔', category: 'unit',
  domains: ['green'], energy: 6, power: 6, keywords: [], // 卡面无横幅关键词([迅捷]在技能行内)
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '付1绿pip[迅捷]:与受控单位互换位置+可转移一件武装;每回合一次(真实现=SFD_050_SPEC 走 ACTIVATED 表)' }],
}
