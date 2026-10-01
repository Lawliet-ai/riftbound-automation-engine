                                                                       
        
                                                 
                                                  
                   
                        
                                                   
  
                                        
                                                           
                       
                                                 
                                      
  
                                                  
                                                        
                                                          
  
                                                     
                             
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { Trigger } from '../../src/dsl/trigger'
import type { ChoiceRequest } from '../../src/loop/chain'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { selfBattlefield } from '../../src/state/selfHere'
                                            
                                                             
                                        
import { voidSproutChoice, voidSproutRecycleEvents, voidSproutFilter, VOID_SPROUT_KEY } from './SFD-018'
import { splashDamageEvents, damageVictims } from './damage-spells'
import { fieldedUnits } from './activated-batch'

                                            
export const OGN_200_RED_MAIN = 2
export const OGN_200_RED_SPLASH = 1
export const OGN_200_BRANCHES: Readonly<Record<string, string>> = {
  red: '对此处的一名敌方单位造成2点伤害,并对此处所有其他敌方单位造成1点伤害',
  blue: '抽一张牌',
  yellow: '眩晕一名敌方单位',
}
                                                              
export const OGN_200_RED_KEY = 'OGN-200:redTarget'
export const OGN_200_YELLOW_KEY = 'OGN-200:yellowTarget'

const RUNE_PREFIX = 'rune:'

   
                                                              
                                  
   
export function runeDeckTop(state: GameState, player: PlayerId): ObjId | undefined {
  const deck = state.zones[`runeDeck:${player}` as ZoneId]
  if (deck === undefined) return undefined
  return deck.contents[deck.contents.length - 1]
}

                                                                             
export function runeColorOf(state: GameState, oid: ObjId | undefined): string | undefined {
  if (oid === undefined) return undefined
  const defId = state.objects[oid]?.defId
  if (defId === undefined || !defId.startsWith(RUNE_PREFIX)) return undefined
  return defId.slice(RUNE_PREFIX.length)
}

   
                                             
                                                                                     
                                                                  
                                                            
   
export function redCandidates(state: GameState, controller: PlayerId, here: string | undefined): string[] {
  if (here === undefined) return []
  return damageVictims('oneEnemyOnBattlefield', state, controller)
    .filter((oid) => (state.objects[oid as ObjId]?.zone as string) === here)
}

   
                                        
                                             
   
export function yellowCandidates(state: GameState, controller: PlayerId): string[] {
  return (fieldedUnits(state) as unknown as string[])
    .filter((oid) => state.objects[oid as ObjId]?.controller !== controller)
    .sort()
}

                                                          
                                                                                        

export function makeTwistedFateTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `OGN-200-attack:${selfOid}`,
    rawId: true,
    sourceDefId: 'OGN-200',
    event: 'attack',
    by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「当【我】进攻时」——队友进攻不算
    nextChoice: (state, _ev, chosen): ChoiceRequest | null => {
                                                               
      const sproutTop = runeDeckTop(state, controller)
      const vq = voidSproutChoice(state, controller, chosen, sproutTop)
      if (vq) return vq
                                                     
                                                              
      if (chosen[VOID_SPROUT_KEY] === 'recycle') return null
                                        
      const color = runeColorOf(state, runeDeckTop(state, controller))
      const ask = (key: string, prompt: string, cands: readonly string[]): ChoiceRequest | null => {
        if (chosen[key] !== undefined) return null            
        if (cands.length === 0) return null                             
        return {
          itemId: `trig:OGN-200:${selfOid}`,
          controller,
          key,
          prompt,
          isTarget: true, // ★1781 §355.7:「对此处的一名敌方单位造成2点伤害」/「眩晕一名敌方单位」
          candidates: cands.map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
        }
      }
      if (color === 'red') {
        return ask(OGN_200_RED_KEY, '崔斯特(红):对此处的哪名敌方单位造成 2 点伤害?',
          redCandidates(state, controller, selfBattlefield(state, selfOid)))
      }
      if (color === 'yellow') {
        return ask(OGN_200_YELLOW_KEY, '崔斯特(黄):眩晕哪名敌方单位?',
          yellowCandidates(state, controller))
      }
      return null                    
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const top0 = runeDeckTop(state, controller)
      if (top0 === undefined) return []                       
                                                           
                                                             
      const rec = voidSproutRecycleEvents(state, controller, chosen, top0)
      const shown = voidSproutFilter(chosen, state, controller, [top0], top0)
      if (shown.length === 0) return rec
      const top = shown[0]!
      const color = runeColorOf(state, top)
      const out: GameEvent[] = [
        ...rec, // ★866 兽苗的回收排最前(此分支实为空,写在这是保持接线模式一致)
                                                   
        { kind: 'revealed', player: controller, cards: [top] } as GameEvent,
                                                  
                                                                
        { kind: 'recycle', player: controller, objs: [top] } as GameEvent,
      ]
      const pick = (chosen ?? {})[color === 'red' ? OGN_200_RED_KEY : OGN_200_YELLOW_KEY]
      if (color === 'red') {
                                         
        const here = selfBattlefield(state, selfOid)                 
        if (pick !== undefined && redCandidates(state, controller, here).includes(pick)) {
          out.push({
            kind: 'damage', target: pick as ObjId, amount: OGN_200_RED_MAIN,
            source: selfOid, sourcePlayer: controller,
          } as GameEvent)
                                                                     
          out.push(...splashDamageEvents(state, pick, controller, selfOid as string, OGN_200_RED_SPLASH))
        }
      } else if (color === 'blue') {
        out.push({ kind: 'draw', player: controller, count: 1 } as GameEvent)
      } else if (color === 'yellow') {
        if (pick !== undefined && yellowCandidates(state, controller).includes(pick)) {
          out.push({ kind: 'stun', target: pick as ObjId } as GameEvent)
        }
      }
                                 
      return out
    },
  }, selfOid, controller)
}

export const OGN_200_CARD_EFFECT =
  '当我进攻时，展示你符文牌堆顶部的一张牌，然后将其回收。根据展示的符文特性执行以下效果：\n' +
  '{{红色}}—对此处的一名敌方单位造成2点伤害，并对此处所有其他敌方单位造成1点伤害。\n' +
  '{{蓝色}}—抽一张牌。\n' +
  '{{黄色}}—眩晕一名敌方单位。'

export const OGN_200: Card = {
  id: 'OGN-200', cardNo: 'OGN·200/298', name: '崔斯特', category: 'unit',
  domains: ['purple'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '进攻时展示符文牌堆顶并回收,按颜色执行红/蓝/黄三支(makeTwistedFateTrigger)' }],
}
