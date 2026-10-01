                                
  
                                  
                                      
                                                                           
                            

import type { Card } from '../../src/dsl/card'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'                                                  
import { fieldedUnits } from './activated-batch'                          
import type { GameEvent } from '../../src/loop/events'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { insightRecycleChoice, insightRecycled } from '../../src/keywords/insightChoice'
import { empowerCount, empowerLimitOf } from '../../src/keywords/empower'
import { perRuneEmpowerDiscount } from './VEN-032'
import { scoredHere } from './scored-here'                                   

   
                                   
                                     
                                                 
  
                                                                  
                                     
                                              
   
   
                                                                          
                                       
                                                       
  
                                                            
                                                           
  
                                                          
                                                        
                                                
                                                                     
                                                                           
                               
   
export const VEN_093_CARD_EFFECT =
  '{{强化2}}（支付{{2}}：强化我。仅在未强化时可用。）\n' +
  '{{已强化>}} 我获得{{S}}+1和{{游走}}。（我可以向其他战场进行移动。）'

export const VEN_093: Card = {
  id: 'VEN-093',
  cardNo: 'VEN·093',
  name: '均衡渡命人',
  category: 'unit',
  domains: ['purple'],
  energy: 4,
  power: 4,
  keywords: ['强化2'], // → empowerActivationSpecs 通用生成(纯资源费,见上面那段边界说明)
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[强化2]§827 主动技能(通用工厂);[已强化>] {S}+1 与 [游走](两张表)' },
  ],
}

   
                                                                         
                                       
                                                                          
                                                                 
                                                                        
   
export const VEN_122_CARD_EFFECT =
  '{{强化2}}（支付{{2}}：强化我。仅在未强化时可用。）\n' +
  '{{已强化>}} 我获得{{S}}+1和{{法盾2}}。（对手必须支付{{A}}{{A}}才能将我选作法术或技能的目标。）'

export const VEN_122: Card = {
  id: 'VEN-122',
  cardNo: 'VEN·122',
  name: '烈阳之鹰',
  category: 'unit',
  domains: ['yellow'],
  energy: 3,
  power: 3,
  keywords: ['强化2'], // → empowerActivationSpecs 通用生成(纯资源费,见 VEN-093 那段边界)
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[强化2]§827 主动技能(通用工厂);[已强化>] {S}+1 与 [法盾2](两张表)' },
  ],
}

   
                                                             
                                                       
                                                           
                                                                
   
export const VEN_134_CARD_EFFECT =
  '{{强化3}}（支付{{3}}：强化我。）\n我最多可以拥有3个{{已强化}}。\n' +
  '我每拥有1个{{已强化}}，便获得{{S}}+2。\n如果我拥有3个{{已强化}}，则我获得{{法盾3}}和{{游走}}。'

export const VEN_134: Card = {
  id: 'VEN-134',
  cardNo: 'VEN·134',
  name: '凯尔',
  category: 'unit',
  domains: ['yellow'],
  energy: 3,
  power: 3,
  keywords: ['强化3'], // → empowerActivationSpecs 通用生成(纯资源费;可叠加档不设未强化门)
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[强化3]可叠加至3;每层+2[S];满3得[法盾3][游走](kaylePassives)' },
  ],
}

export const VEN_070_CARD_EFFECT =
  '{{强化3}}（支付{{3}}：强化我。仅在未强化时可用。）\n' +
  '{{已强化>}} 我获得{{S}}+2和{{游走}}。（我可以向其他战场进行移动。）'

export const VEN_070: Card = {
  id: 'VEN-070',
  cardNo: 'VEN·070',
  name: '残暴猎手',
  category: 'unit',
  domains: ['orange'],
  energy: 3,
  power: 4,
  keywords: ['强化3'], // → empowerActivationSpecs 通用生成
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[强化3]§827 主动技能(通用工厂)' },
    { kind: 'passive', describe: '[已强化>]{S}+2 与 [游走](empowered-passives 两张表各登记一次)' },
  ],
}

   
                                    
                                                             
                                  
  
                                                               
                                                         
                            
   
export const VEN_050_CARD_EFFECT =
  '{{强化12}}。你每控制一枚符文，此技能的费用便减少{{1}}。（支付此费用：强化我。仅在未强化时可用。）\n' +
  '{{已强化>}} 我获得{{法盾}}和{{坚守3}}。'

export const VEN_050_EMPOWER_SPEC: ActivatedSpec = {
  key: 'VEN-050:empower',
  label: '强化12:强化我(每控制一枚符文,费用减少 1 法力)',
  cost: { mana: 12 }, // §206.1 印刷基础费,减免不回写
  costMods: (state, player) => perRuneEmpowerDiscount(state, player, 'VEN-050 凶暴的岩熊'),
  available: (state, _c, selfOid) => {
    const o = state.objects[selfOid as ObjId]
    return o !== undefined && empowerCount(o) < empowerLimitOf(o)                           
  },
  target: 'none', // §827.1.b.1
  makeResolve: ({ selfOid }) => (): readonly GameEvent[] => [{ kind: 'empower', target: selfOid as ObjId }],
}

export const VEN_050: Card = {
  id: 'VEN-050',
  cardNo: 'VEN·050',
  name: '凶暴的岩熊',
  category: 'unit',
                                                                             
  domains: ['blue'],
  energy: 4,
  power: 4,
  keywords: [], // 见上:带减费文本的强化走手写规格
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[强化12]每控制一枚符文减{1}(与 VEN-032 共用实现)' },
    { kind: 'passive', describe: '[已强化>][法盾] 与 [坚守3](EMPOWERED_KEYWORDS)' },
  ],
}

   
                                   
                                     
                                                        
                          
                           
  
                                                                
  
                                         
                                                   
                                   
                                                              
                                            
                                          
   
export const VEN_047_CARD_EFFECT =
  '{{强化2}}（支付{{2}}：强化我。仅在未强化时可用。）\n' +
  '当我变为{{已强化}}时，进行{{洞察2}}。\n' +
  '{{已强化>}} 我获得{{S}}+1。'

export function makeApprenticeInsightTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const prefix = `VEN-047:recycle:${selfOid}:`
                                                          
                                                    
  const effect = compileEffect({
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => [{
        kind: 'insight',
        player: ctx.controller,
        count: INSIGHT_N,
        recycle: insightRecycled(ctx.chosen, prefix),
      }],
    }],
  })
  return compileTrigger({
    id: `VEN-047-insight:${selfOid}`,
    rawId: true, // id 已自带 selfOid,编译层别再追加(战报/测试认这个字面)
    event: 'empower',
    by: 'any', // §441.2.a 被外部效果强化也算"变为已强化"
    when: [{ kind: 'subjectIsSelf' }], // 「当【我】变为已强化时」:empower 事件的 target 得是我
                                                 
                                                  
                                         
                                                                                    
                                      
                                                         
                                                                        
                                                         
    nextChoice: (state, _ev, chosen) => insightRecycleChoice({
      itemId: `trig:VEN-047-insight:${selfOid}`,
      controller,
      look: INSIGHT_N,
      prefix,
      prompt: '见习法师·洞察2:选择要回收的牌(可不选)',
      doneLabel: '够了,其余放回牌堆顶',
    })(state, chosen),
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

                          
const INSIGHT_N = 2

export const VEN_047: Card = {
  id: 'VEN-047',
  cardNo: 'VEN·047',
  name: '见习法师',
  category: 'unit',
  domains: ['blue'],
  energy: 3,
  power: 3,
  keywords: ['强化2'], // 纯资源费 → 通用工厂
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[强化2]§827 主动技能(通用工厂)' },
    { kind: 'passive', describe: '变为已强化时洞察2(makeApprenticeInsightTrigger,§441.2.a)' },
    { kind: 'passive', describe: '[已强化>]{S}+1(EMPOWERED_MIGHT)' },
  ],
}

   
                               
                                               
                                               
  
                                              
                                                          
                                  
                                              
   
export const VEN_018_CARD_EFFECT =
  '{{强化6红色}}（支付{{6}}和{{红色}}：强化此牌。仅在未强化时可用。）\n' +
  '你的单位获得{{S}}+1。如果我{{已强化}}，则改为让其获得{{S}}+2。'

export const VEN_018: Card = {
  id: 'VEN-018',
  cardNo: 'VEN·018',
  name: '怒火放大器',
  category: 'equipment',
  domains: ['red'],
  energy: 4,
  keywords: ['强化6红色'], // 带域的纯资源费 → 通用工厂(parseCostSuffix 认得)
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[强化6红色]§827 主动技能(通用工厂)' },
    { kind: 'passive', describe: '你的单位 {S}+1,我已强化则改为 +2(ragePassives,常驻非 §828)' },
  ],
}

   
                              
                                      
                                                                  
  
                                           
                                                         
                      
                                        
   
export const VEN_077_CARD_EFFECT =
  '{{强化2}}（支付{{2}}：强化此牌。仅在未强化时可用。）\n' +
  '{{横置}}：给予一名单位在本回合内{{S}}+2。如果此牌{{已强化}}，则改为给予该单位在本回合内{{S}}+4。'

export const VEN_077_BUFF_SPEC: ActivatedSpec = {
  key: 'VEN-077:pump',
  label: '{{横置}}:给予一名单位本回合战力+2(我已强化则改为 +4)',
  cost: {},
  tapSelf: true,
  target: 'custom',
  legalTargets: (state): string[] =>
    fieldedUnits(state), // ★1515:折到共用件(㊼ 「一名单位」零限定;判据逐字等价,含 §187.6 映像那一档)
  makeResolve: ({ selfOid, target }) => (state): readonly GameEvent[] => {
    if (target === undefined) return []
    const self = state.objects[selfOid as ObjId]
    const delta = self !== undefined && empowerCount(self) > 0 ? 4 : 2             
    return [{
      kind: 'addEffect',
      effect: {
        id: `VEN-077:pump:${target}:${delta}`,
        duration: 'thisTurn',
        fromPassive: false,
        predicate: (x: { oid: ObjId }) => x.oid === (target as ObjId),
        modification: { kind: 'addMight', delta },
      },
    }]
  },
}

export const VEN_077: Card = {
  id: 'VEN-077',
  cardNo: 'VEN·077',
  name: '帝国工具',
  category: 'equipment',
  domains: ['orange'],
  energy: 4,
  keywords: ['强化2'],
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[强化2]§827 主动技能(通用工厂)' },
    { kind: 'passive', describe: '[横置]给一名单位本回合+2,我已强化则改为+4(VEN_077_BUFF_SPEC)' },
  ],
}

   
                              
                                               
                                                          
  
                                                             
                                                     
   
export const VEN_045_CARD_EFFECT =
  '{{强化4绿色}}（支付{{4}}和{{绿色}}：强化此牌。仅在未强化时可用。）\n' +
  '对手的法术费用增加{{1}}。如果此牌{{已强化}}，则改为对手的法术费用增加{{1}}和{{A}}。'

export const VEN_045: Card = {
  id: 'VEN-045',
  cardNo: 'VEN·045',
  name: '抑制之盔',
  category: 'equipment',
  domains: ['green'],
  energy: 4,
  keywords: ['强化4绿色'], // 带域纯资源费 → 通用工厂
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[强化4绿色]§827 主动技能(通用工厂)' },
    { kind: 'passive', describe: '对手法术费用 +{1},我已强化则改为 +{1}和{A}(cost-modifiers)' },
  ],
}

   
                                           
                                         
                           
  
                                          
                                                      
  
                                                 
                                               
                                                    
                              
                                    
   
export const VEN_028_CARD_EFFECT =
  '当我参与的战斗结束时，强化我。（如果我未被强化，则变为已强化状态。）\n' +
  '{{已强化>}} 我获得{{S}}+2。'

export function makeWitnessBattleEndTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                       
                                                               
                                    
                                                          
  const effect = compileEffect({
    guard: (ctx) => ctx.selfOid !== null && ctx.state.objects[ctx.selfOid] !== undefined, // 已被摧毁就不发
    then: [{ op: 'custom', emit: (ctx): readonly GameEvent[] =>
      (ctx.selfOid ? [{ kind: 'empower', target: ctx.selfOid }] : []) }], // selfOid 恒非空(单位卡),窄化用
  })
  return compileTrigger({
    id: `VEN-028-empower:${selfOid}`,
    rawId: true,
    event: 'battleEnd',
    by: 'any', // 谁发起的战斗都算
    when: [{ kind: 'custom', test: (ev) => ev.kind === 'battleEnd' && ev.participants.includes(selfOid) }],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const VEN_028: Card = {
  id: 'VEN-028',
  cardNo: 'VEN·028',
  name: '悲悯见证者',
  category: 'unit',
  domains: ['green'],
  energy: 2,
  power: 2,
  keywords: [], // 它的强化是触发式,不是 §827 关键词
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '当我参与的战斗结束时强化我(makeWitnessBattleEndTrigger,§466.7)' },
    { kind: 'passive', describe: '[已强化>]{S}+2(EMPOWERED_MIGHT,早在表里)' },
  ],
}

   
                                    
                                               
                                     
                                
  
                                  
                                                       
                                                 
                                                      
  
                                            
                                                 
                                                              
                               
                                                 
   
export const VEN_046_CARD_EFFECT =
  '{{法盾2}}（对手必须支付{{A}}{{A}}才能将我选作法术或技能的目标。）\n' +
  '{{强化8}}（支付{{8}}：强化我。仅在未强化时可用。）\n' +
  '{{已强化>}} 当我征服一处战场时，你获得1分。'

export function makeNasusConquerTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const conqueredHere = (state: GameState, ev: GameEvent): boolean => {
    if (ev.kind !== 'conquer') return false
                                                                            
    return scoredHere(state, selfOid, ev, ['conquer'])
  }
                       
                                                               
                                                                
                                         
                                                             
                      
                                                         
                                         
                                
                                               
                                                 
                                              
                                                
                                         
                                                           
  const effect = compileEffect({
    then: [{ op: 'custom', emit: (ctx): readonly GameEvent[] => [{ kind: 'gainPoint', player: ctx.controller, amount: 1 }] }],
  })
  return compileTrigger({
    id: `VEN-046-score:${selfOid}`,
    rawId: true,
    event: 'conquer',
    by: 'you',
    when: [{ kind: 'custom', test: (ev, state) => conqueredHere(state, ev) }],
                                    
    additionalCondition: (state) => empowerCount(state.objects[selfOid]) > 0,
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const VEN_046: Card = {
  id: 'VEN-046',
  cardNo: 'VEN·046',
  name: '内瑟斯',
  category: 'unit',
  domains: ['green'],
  energy: 8,
  power: 8,
  keywords: ['法盾2', '强化8'],
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[法盾2]§809 费用 tax' },
    { kind: 'passive', describe: '[强化8]§827 主动技能(通用工厂)' },
    { kind: 'passive', describe: '[已强化>]征服此处时得 1 分(makeNasusConquerTrigger,条件触发)' },
  ],
}
