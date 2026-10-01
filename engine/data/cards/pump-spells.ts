                                                                
                                                        
                                                                      
                                                                    
                                                        
                                                        
                                                         
                                                                    
  
                           
                                                               
                            
                                                                              
                                                                                 
                                                                 
                                                                           
  
                                                                
                                                               
                                         
                                                              
                                                                    
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { Cost } from '../../src/state/runePool'
import { fieldedUnits, pumpEvent, grantKeywordEvent } from './activated-batch'
import { repelUnits } from './UNL-106'                          
import { insightRecycleChoice, insightRecycled } from '../../src/keywords/insightChoice'
import { hasEphemeral } from '../../src/keywords/ephemeral'
import { isUnit, isEquipment } from '../../src/state/cardTypes'
import { inBattle } from '../../src/combat/battleRoles'                                                                                       
import type { GameObject } from '../../src/state/object'
import { hasDomain } from './card-domain'                                
import { targetsOf } from '../../src/loop/chainTargets'                                
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
                                                     
import { VEN_142_GRANT_KEY, VEN_142_CARD_EFFECT } from './VEN-142'

   
                                       
                                              
                                                               
                                                
                                                            
                                                
                                                
   
export function pumpCandidates(row: PumpSpellRow, state: GameState, controller: PlayerId): string[] {
  if (row.targets === 'friendlyUnitOnBattlefield') {
                                                                  
    return repelUnits(state, controller)
  }
  if (row.targets === 'battlefieldUnitOrGear') {
                                                    
    return Object.values(state.objects)
      .filter((o) => state.zones[o.zone]?.kind === 'battlefield' && (isUnit(o) || isEquipment(o)))
      .map((o) => o.oid as string)
      .sort()
  }
  if (row.targets === 'friendlyPressuredByDomain') {
                                                
                                                      
                                  
                                                                   
                                               
                                                  
                                                                 
                                                      
                                                                                
                                                                                
                                                                   
                                                               
                                       
    if (row.enemyDomain === undefined) return []
    const color = row.enemyDomain
    const myUnits = fieldedUnits(state, { of: controller, friendly: true }) as string[]
                                     
    const hostileInFight = (Object.values(state.objects) as GameObject[]).some((o) =>
      o.controller !== controller && inBattle(o) && hasDomain(o.defId, color))
    return myUnits.filter((oid) => {
      const me = state.objects[oid as ObjId]
      if (me === undefined) return false
                                        
      if (inBattle(me) && hostileInFight) return true
                               
      return state.chain.some((it) => {
        if (it.controller === controller) return false               
        if (it.kind !== 'spell') return false                       
        if (!targetsOf(it).includes(oid as string)) return false                
        const card = it.cardOid === undefined ? undefined : state.objects[it.cardOid]
        return card !== undefined && hasDomain(card.defId, color)
      })
    }).sort()
  }
  if (row.targets === 'enemyWithDomain') {
                                                             
                                                                  
                                       
                                                            
                                                                        
                                                              
                                                           
    if (row.enemyDomain === undefined) return []
    return (fieldedUnits(state) as string[]).filter((oid) => {
      const o = state.objects[oid as ObjId]
      return !!o && o.controller !== controller && hasDomain(o.defId, row.enemyDomain!)
    }).sort()
  }
                                                     
  const base = fieldedUnits(state, row.targets === 'friendlyUnit' ? { of: controller, friendly: true } : undefined) as string[]
                                                             
                                                           
                                                              
                                        
  if (row.excludeHavingEphemeral !== true) return base
  return base.filter((oid) => {
    const o = state.objects[oid as ObjId]
    return !!o && !hasEphemeral(o)
  })
}

   
                                
                                                                             
                                                                     
   
export function pumpGroupTargets(state: GameState, controller: PlayerId): string[] {
  return fieldedUnits(state, { of: controller, friendly: true }) as string[]
}

                                                
export interface PumpSpellRow {
  readonly defId: string
  readonly cardNo: string
  readonly name: string
  readonly domain: string
  readonly cost: Cost
                                           
  readonly energy: number
                                                
  readonly keywords: readonly string[]
                                                                
  readonly echo?: Cost
                                       
  readonly delta?: number
     
                                                        
                                                    
                                                  
                                                               
     
  readonly deltaOf?: (state: GameState, controller: PlayerId, target: string) => number
                                                    
  readonly floor?: number
     
                                             
                                     
     
  readonly grants?: readonly string[]
                                                   
  readonly draw?: number
     
                                                       
                                                   
                                                            
                                                                 
                                                          
                                        
     
  readonly insight?: number
     
                                                   
                                                                 
                                                                    
                             
     
  readonly excludeHavingEphemeral?: true
                       
     
                                                               
                       
                                        
                                                           
                                                                         
     
  readonly targets?:
    | 'anyUnit' | 'friendlyUnit' | 'battlefieldUnitOrGear' | 'enemyWithDomain' | 'friendlyPressuredByDomain'
    | 'friendlyUnitOnBattlefield'                                                          
                                                                              
  readonly setReady?: boolean
     
                                            
                                                                             
     
  readonly grantsPermanent?: readonly string[]
                                                  
  readonly doubleMight?: boolean
     
                                                        
                                             
                                                               
                                                 
                                                                
                                                       
                                  
                                                   
                                                    
                                    
                                        
     
  readonly grantsActivated?: string
     
                                                 
                                                               
                                                           
                                                                     
                                                    
                                                        
                                        
     
  readonly setMight?: number
     
                                                       
                                                                            
                                         
                                                                          
     
  readonly group?: 'allFriendly'
     
                                                                         
                                                                     
                              
     
  readonly enemyDomain?: string
     
                                                   
                                         
                                                                   
                                                    
                           
     
  readonly deflectWaived?: true
  readonly cardEffect: string
}

export const PUMP_SPELLS: readonly PumpSpellRow[] = [
                                                                    
                                                 
                                                    
                                                       
                                         
                                                                   
  {
    defId: 'VEN-040', cardNo: 'VEN·040', name: '专注箴言', domain: 'green',
    cost: { mana: 1 }, energy: 1, keywords: ['反应'], // cardCosts 实测:1 法力 **0 pip**
    targets: 'friendlyPressuredByDomain', enemyDomain: 'red',
    delta: 4,
    cardEffect:
      '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n' +
      '选择一名正在与具有炽烈（{{红色}}）特性的敌方单位进行战斗、' +
      '或被敌方具有炽烈特性的法术选为目标的友方单位。给予其在本回合内{{S}}+4。',
  },
                                                                    
                                     
                                                 
                                                       
                                                  
                                             
                                                     
                                                                             
                         
  {
    defId: 'VEN-061', cardNo: 'VEN·061', name: '洞察箴言', domain: 'blue',
    cost: { mana: 1 }, energy: 1, keywords: ['反应'], // cardCosts 实测:1 法力 **0 pip**
    targets: 'enemyWithDomain', enemyDomain: 'orange',
    delta: -5,
    deflectWaived: true,
    cardEffect:
      '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n' +
      '支付此法术的费用时，无视{{法盾}}。\n' +
      '给予一名具有摧破（{{橙色}}）特性的敌方单位在本回合内{{S}}-5。',
  },
  {
    defId: 'OGN-154', cardNo: 'OGN·154/298', name: '洪荒巨力', domain: 'orange',
    cost: { mana: 4, pips: [['orange']] }, energy: 4, keywords: ['迅捷'], delta: 7,
    cardEffect: '让一名单位在本回合内{{S}}+7。',
  },
  {
    defId: 'SFD-097', cardNo: 'SFD·097/221', name: '先打再问', domain: 'orange',
    cost: { mana: 1, pips: [['orange'], ['orange']] }, energy: 1, keywords: ['迅捷'], delta: 5,
    cardEffect: '让一名单位在本回合内{{S}}+5。',
  },
  {
    defId: 'UNL-066', cardNo: 'UNL-066/219', name: '月光之殇', domain: 'blue',
    cost: { mana: 7 }, energy: 7, keywords: ['反应'], delta: -10, // ⚠️ 0 pip ⇒ 只写 mana(①)
    cardEffect: '让一名单位在本回合内{{S}}-10。',
  },
  {
    defId: 'OGN-093', cardNo: 'OGN·093/298', name: '烟幕弹', domain: 'blue',
    cost: { mana: 2, pips: [['blue']] }, energy: 2, keywords: ['反应'], delta: -4, floor: 1,
    cardEffect: '让一名单位在本回合内{{S}}-4，不得低于1{{S}}。',
  },
                                                         
  {
    defId: 'SFD-034', cardNo: 'SFD·034/221', name: '蛮荒之力', domain: 'green',
    cost: { mana: 2 }, energy: 2, keywords: ['反应'], echo: { mana: 2 }, delta: 2,
    cardEffect: '让一名单位在本回合内{{S}}+2。',
  },
  {
    defId: 'SFD-066', cardNo: 'SFD·066/221', name: '封冻', domain: 'blue',
    cost: { mana: 2 }, energy: 2, keywords: ['反应'], echo: { mana: 2 }, delta: -2,
    cardEffect: '让一名单位在本回合内{{S}}-2。',
  },
                                                  
  {
    defId: 'OGN-004', cardNo: 'OGN·004/298', name: '顺劈', domain: 'red',
    cost: { mana: 1 }, energy: 1, keywords: ['迅捷'], grants: ['强攻3'],
    cardEffect: '让一名单位本回合内获得{{强攻3}}。',
  },
  {
    defId: 'UNL-010', cardNo: 'UNL-010/219', name: '强能冲拳', domain: 'red',
    cost: { mana: 1, pips: [['red']] }, energy: 1, keywords: ['迅捷'], grants: ['强攻2', '游走'],
    cardEffect: '让一名单位本回合内获得{{强攻2}}和{{游走}}。',
  },
  {
                                                                    
    defId: 'OGN-057', cardNo: 'OGN·057/298', name: '格挡', domain: 'green',
    cost: { mana: 2 }, energy: 2, keywords: ['待命', '迅捷'], grants: ['坚守3', '壁垒'],
    cardEffect: '让一名单位在本回合内获得{{坚守3}}和{{壁垒}}。',
  },
  {
                                               
                                                    
                                                         
    defId: 'SFD-003', cardNo: 'SFD·003/221', name: '血性冲刺', domain: 'red',
    cost: { mana: 1 }, energy: 1, keywords: ['迅捷'], echo: { mana: 1 }, grants: ['强攻2'],
    cardEffect: '让一名单位本回合内获得{{强攻2}}。',
  },
                               
  {
    defId: 'OGN-058', cardNo: 'OGN·058/298', name: '训练有素', domain: 'green',
    cost: { mana: 2 }, energy: 2, keywords: ['反应'], delta: 2, draw: 1,
    cardEffect: '让一名单位在本回合内{{S}}+2，然后抽一张牌。',
  },
                                       
  {
                                                           
                                                           
    defId: 'UNL-009', cardNo: 'UNL-009/219', name: '大幕渐起', domain: 'red',
    cost: { mana: 2 }, energy: 2, keywords: [], echo: { mana: 2 }, setReady: true,
    cardEffect: '让一名单位变为活跃状态。',
  },
  {
    defId: 'OGN-180', cardNo: 'OGN·180/298', name: '逝水如镜', domain: 'purple',
    cost: { mana: 4, pips: [['purple']] }, energy: 4, keywords: [],
    targets: 'battlefieldUnitOrGear', grantsPermanent: ['瞬息'],
    cardEffect: '让一名战场上的单位或一件装备变为{{瞬息}}。',
  },
  {
                                                            
                                                                
    defId: 'OGN-069', cardNo: 'OGN·069/298', name: '背水一战', domain: 'green',
    cost: { mana: 3, pips: [['green']] }, energy: 3, keywords: ['迅捷'],
    targets: 'friendlyUnit', doubleMight: true, grantsPermanent: ['瞬息'],
    cardEffect: '让一名友方单位在本回合内战力翻倍，并让其变为{{瞬息}}。',
  },
                                             
  {
    defId: 'OGN-233', cardNo: 'OGN·233/298', name: '宏伟战略', domain: 'yellow',
    cost: { mana: 6, pips: [['yellow'], ['yellow'], ['yellow']] }, energy: 6, keywords: ['迅捷'],
    group: 'allFriendly', delta: 5,
    cardEffect: '在本回合内，让所有友方单位{{S}}+5。',
  },
  {
    defId: 'OGS-024', cardNo: 'OGS·024/024', name: '致命打击', domain: 'orange',
                                                                        
    cost: { mana: 5, pips: [['orange', 'yellow']] }, energy: 5, keywords: ['迅捷'],
    group: 'allFriendly', delta: 2,
    cardEffect: '在本回合内，让所有友方单位{{S}}+2。',
  },
                                      
                                              
                                                         
                                                       
  {
    defId: 'OGN-095', cardNo: 'OGN·095/298', name: '“敲”诈', domain: 'blue',
    cost: { mana: 1 }, energy: 1, keywords: ['反应'], // 上游 pips=0 ⇒ 一枚都不写
    delta: -1, floor: 1, draw: 1,
                                                                    
    cardEffect: '让一名单位在本回合内{{S}}-1，不得低于1{{S}}。抽一张牌。',
  },
                            
  {
    defId: 'UNL-165', cardNo: 'UNL-165/219', name: '暗影的召唤', domain: 'yellow',
    cost: { mana: 2 }, energy: 2, keywords: [], // 上游 pips=0;卡文没有横幅 ⇒ 印刷关键词是空的
    targets: 'friendlyUnit', excludeHavingEphemeral: true,
                                                                          
    grantsPermanent: ['瞬息'], draw: 2,
                                            
    cardEffect: '选择一名未拥有{{瞬息}}的友方单位，让其获得{{瞬息}}。抽两张牌。',
  },
                                        
  {
    defId: 'VEN-116', cardNo: 'VEN·116', name: '龙之形', domain: 'yellow',
    cost: { mana: 3 }, energy: 3, // 上游 pips=0 ⇒ 一枚都不写
                                                                    
                                                                  
                                        
    keywords: ['流转3'],
                                                                    
    setMight: 5,
    cardEffect:
      '选择一名单位。其基础战力在本回合内变为5。\n'
      + '{{流转3}}（你可以选择支付此牌的流转费用，以此将其从你的废牌堆中打出。然后将其放逐。）',
  },
                                                                     
                                                                      
    
                                                          
                                                                  
                                                                
                                                   
                                                   
                                                        
                                                      
                                             
  {
    defId: 'VEN-081', cardNo: 'VEN·081', name: '狂袭', domain: 'orange',
    cost: { mana: 4 }, energy: 4, // 上游 pips=0 ⇒ 一枚都不写
    keywords: ['流转4'],
    delta: 6,
    cardEffect:
      '给予一名单位在本回合内{{S}}+6。\n'
      + '{{流转4}}（你可以选择支付此牌的流转费用，以此将其从你的废牌堆中打出。然后将其放逐。）',
  },
  {
    defId: 'UNL-063', cardNo: 'UNL-063/219', name: '月蚀', domain: 'blue',
    cost: { mana: 3 }, energy: 3, keywords: ['反应'],
    delta: -4, // ⚠️ **没有 floor** —— 卡文一个字都没写下限,能减成负值(由清理步判摧毁)
    insight: 1, // 「进行{{洞察}}」⇒ §436.3.a 缺省 X=1
    cardEffect: '让一名单位在本回合内{{S}}-4。\n进行{{洞察}}。',
  },
                                                                  
                                             
                                           
                                          
                                                                       
                                                                    
                                                    
                                                     
                                                                     
                                
  {
    defId: 'VEN-142', cardNo: 'VEN·142', name: '终极统治', domain: 'red',
    cost: { mana: 4 }, energy: 4, keywords: ['迅捷'], // cardCosts 实测:4 法力 **0 pip**(双色但无 pip)
    doubleMight: true, grantsActivated: VEN_142_GRANT_KEY,
    cardEffect: VEN_142_CARD_EFFECT,
  },
                                                                  
                                             
                              
                                                                
                                                            
                                                     
  {
    defId: 'SFD-001', cardNo: 'SFD·001/221', name: '矢志不退', domain: 'red',
    cost: { mana: 2 }, energy: 2, keywords: ['反应'],
    targets: 'friendlyUnitOnBattlefield',
    deltaOf: (state, controller, target) => 2 * countEnemiesAt(state, controller, target),
    cardEffect: '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n'
      + '选择战场上的一名友方单位，此战场上每有一名敌方单位，就让该友方单位在本回合内{{S}}+2。',
  },
                                                                  
                                                      
                            
                                                    
                                                
                                                                  
                                                                     
  {
    defId: 'OGN-046', cardNo: 'OGN·046/298', name: '决斗架势', domain: 'green',
    cost: { mana: 1 }, energy: 1, keywords: ['反应'],
    targets: 'friendlyUnit',
    deltaOf: (state, controller, target) => countFriendliesAt(state, controller, target) === 1 ? 2 : 1,
    cardEffect: '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n'
      + '让一名友方单位本回合内{{S}}+1，如果它是你在该处唯一控制的单位，则它本回合内额外获得{{S}}+1。',
  },
]

   
                                               
                                                
                                                              
   
   
                                          
                                          
                                             
   
export function countFriendliesAt(state: GameState, controller: PlayerId, target: string): number {
  const at = state.objects[target as ObjId]?.zone
  if (at === undefined) return 0
  return Object.values(state.objects).filter((o) => o.zone === at
    && isUnit(o) && o.controller === controller).length                                                          
}

export function countEnemiesAt(state: GameState, controller: PlayerId, target: string): number {
  const at = state.objects[target as ObjId]?.zone
  if (at === undefined) return 0
  return Object.values(state.objects)
    .filter((o) => o.zone === at && o.controller !== controller && isUnit(o))                        
    .length
}

                                        
export function makePumpSpellSpec(row: PumpSpellRow): PlaySpec {
  return {
    defId: row.defId, cardNo: row.cardNo, name: row.name, kind: 'spell',
    cost: row.cost,
    keywords: row.keywords,
    ...(row.echo !== undefined ? { echo: row.echo } : {}), // §820 印了[回响N]才给
                                                            
    target: row.group !== undefined ? 'none' : 'custom', // 单体档由 legalTargets 说了算(见 `targets` 列)
    legalTargets: (state, controller) => (row.group !== undefined ? [] : pumpCandidates(row, state, controller)),
    makeResolve:
      ({ target, controller }) =>
      (state, chosen): readonly GameEvent[] => {
                                                 
        const victims: readonly string[] = row.group !== undefined
          ? pumpGroupTargets(state, controller)
          : (target === undefined ? [] : [target])
        if (victims.length === 0) return []
        const out: GameEvent[] = []
        for (const who of victims) {
                                                        
                                                                                  
                                                              
                                                          
                                                          
          if (row.delta !== undefined) out.push(pumpEvent(`${row.defId}:pump`, who, row.delta, row.floor))
          // ★641 数额现算档(㊺ 结算那一刻按盘面数;0 就不发 —— 「每有一名」一名都没有 = 没得加)
          else if (row.deltaOf !== undefined) {
            const n = row.deltaOf(state, controller, who)
            if (n !== 0) out.push(pumpEvent(`${row.defId}:pump`, who, n, row.floor))
          }
          for (const kw of row.grants ?? []) out.push(grantKeywordEvent(`${row.defId}:kw:${kw}`, who, kw))
                               
          if (row.setReady === true) {
            out.push({ kind: 'statusChange', target: who as ObjId, key: 'dormant', value: false } as GameEvent)
          }
                                                                 
          if (row.setMight !== undefined) {
            out.push({
              kind: 'addEffect',
              effect: {
                id: `${row.defId}:setMight:${who}`, duration: 'thisTurn', fromPassive: false,
                predicate: (x: { oid: ObjId }) => x.oid === (who as ObjId),
                modification: { kind: 'setMight', value: row.setMight },
              },
            } as GameEvent)
          }
                           
          if (row.doubleMight === true) {
            out.push({
              kind: 'addEffect',
              effect: {
                id: `${row.defId}:dbl:${who}`, duration: 'thisTurn', fromPassive: false,
                predicate: (x: { oid: ObjId }) => x.oid === (who as ObjId),
                modification: { kind: 'doubleMight' },
              },
            } as GameEvent)
          }
                                                   
          for (const kw of row.grantsPermanent ?? []) {
            out.push(grantKeywordEvent(`${row.defId}:pkw:${kw}`, who, kw, 'permanent'))
          }
                                                           
          if (row.grantsActivated !== undefined) {
            out.push({
              kind: 'addEffect',
              effect: {
                id: `${row.defId}:gact:${who}`, duration: 'thisTurn', fromPassive: false,
                predicate: (x: { oid: ObjId }) => x.oid === (who as ObjId),
                modification: { kind: 'grantActivated', specKey: row.grantsActivated },
              },
            } as GameEvent)
          }
        }
                                                   
        if (row.draw !== undefined) out.push({ kind: 'draw', player: controller, count: row.draw } as GameEvent)
                                                       
                                                                     
        if (row.insight !== undefined) {
          const recycle = insightRecycled(chosen, `${row.defId}:ins`)
          out.push({
            kind: 'insight', player: controller, count: row.insight,
            ...(recycle.length > 0 ? { recycle } : {}),
          } as GameEvent)
        }
        return out
      },
                                                  
                                                      
    ...(row.insight !== undefined ? {
      makeNextChoice: ({ movedCardOid, controller }: { readonly movedCardOid: string; readonly controller: PlayerId }) =>
        insightRecycleChoice({
          itemId: `play:${movedCardOid}`, controller, look: row.insight!,
          prefix: `${row.defId}:ins`,
          prompt: `${row.name}·洞察${row.insight}:选要回收的(可以一张都不选)`,
        }),
    } : {}),
  }
}

   
                                                 
                                                             
   
export const DEFLECT_WAIVED_PUMP_DEFIDS: readonly string[] =
  PUMP_SPELLS.filter((r) => r.deflectWaived === true).map((r) => r.defId)

export const PUMP_SPELL_SPECS: Readonly<Record<string, PlaySpec>> =
  Object.fromEntries(PUMP_SPELLS.map((r) => [r.defId, makePumpSpellSpec(r)]))

                                                              
export const PUMP_SPELL_KEYWORDS: Readonly<Record<string, readonly string[]>> =
  Object.fromEntries(PUMP_SPELLS.map((r) => [r.defId, r.keywords]))

export const PUMP_SPELL_CARDS: readonly Card[] = PUMP_SPELLS.map((r) => ({
  id: r.defId, cardNo: r.cardNo, name: r.name, category: 'spell',
  domains: [r.domain], energy: r.energy, keywords: r.keywords, playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '让一名单位本回合'
    + (r.delta !== undefined ? ` {S}${r.delta >= 0 ? '+' : ''}${r.delta}` : '')
    + (r.floor !== undefined ? `(不得低于 ${r.floor})` : '')
    + (r.grants ? ` 获得 ${r.grants.join('、')}` : '')
    + '(PUMP_SPELL_SPECS)' }],
}) as Card)

                                                                                                      
                                                                                                          
                                                                                                                                      
export const SFD_003_CARD_EFFECT = '{{迅捷}}（可在你的回合或法术对决中打出。）\n{{回响1}}（你可以选择支付此额外费用，以重复此法术效果。）\n让一名单位本回合内获得{{强攻2}}。（如果它是进攻方，则{{S}}+2。）'
