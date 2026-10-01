                                                                   
  
                                            
                                                             
  
                                   
                                                                          
                                                                          
                                                     
                                                                     
                                                               
  
                                                
                                                      
                                                   
                                                                           
                                                        
                                                         
                                                
import type { Trigger } from '../../src/dsl/trigger'
import { variantSiblings } from '../variantAlias'                             
import type { GameState } from '../../src/state/gameState'
import type { TokenSpec } from '../../src/state/mutations'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { isUnit } from '../../src/state/cardTypes'
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { ZoneId } from '../../src/state/ids'
import type { PlayExtraCost } from '../../src/session/interactiveGame'
import type { PlaySpec } from '../../src/loop/playSpec'
import { tokenDropZones } from './token-spells'
import { spawnTokenHasteChoice, spawnTokenHasteResolve } from './spawn-token-haste'                                         
import { hasteKeyOf } from './haste-key'                                                       

                                                          
export const SHADOW_CLONE_TOKEN: TokenSpec = {
  defId: 'token:影分身', baseMight: 0, baseTypes: ['unit'], baseKeywords: [],
}

                               
export const SHADOW_CLONE_ABILITY =
  '当我进攻时，你可以选择从你的废牌堆中放逐一名单位。若如此做，则给予我在本回合内{{强攻4}}。'

export const SHADOW_CLONE_ASSAULT = 4

                            
export function ownDiscardUnitOptions(
  state: GameState, controller: PlayerId,
): readonly { readonly id: string; readonly label: string }[] {
  return (state.zones[`discard:${controller}`]?.contents ?? [])
    .map((oid) => state.objects[oid])
    .filter((o) => o !== undefined && isUnit(o))
    .map((o) => ({ id: o!.oid as string, label: o!.defId }))
}

   
                                                  
                                                                   
   
export function makeShadowCloneTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
                                                                          
                                                       
                                                         
                                                        
                                                              
                                 
                                                 
                                                    
                                                            
                               
                                                 
                                                       
                                                       
    guard: (ctx) => {
      const picked = ctx.chosen['unit']
      if (picked === undefined) return false
      const o = ctx.state.objects[picked as ObjId]
      return !!o && isUnit(o) && (o.zone as string) === `discard:${ctx.controller}`
    },
    then: [
      { op: 'banish', target: { ref: 'chosen', key: 'unit' } }, // 费用:放逐它
      {
        op: 'grantKeyword', target: { ref: 'self' },
        keyword: `强攻${SHADOW_CLONE_ASSAULT}`, duration: 'thisTurn', id: 'token:影分身-assault',
      },
    ],
  })
  return compileTrigger({
    id: `token:影分身:attack:${selfOid}`,
    rawId: true, // id 已自带 selfOid(场上可能同时有好几只影分身)
    sourceDefId: 'token:影分身',
    event: 'attack',
    by: 'any',
    mayChoose: true, // §383.3.a「你可以选择」在效果开头
    when: [
      { kind: 'subjectIsSelf' }, // 「当【我】进攻时」
                                                     
      { kind: 'custom', test: (_ev, state: GameState) => ownDiscardUnitOptions(state, controller).length > 0 },
    ],
    choose: {
      key: 'unit', prompt: '影分身:从你的废牌堆中放逐一名单位,以此获得本回合{{强攻4}}',
      selector: { type: 'unit', zone: 'discard', owner: 'you' },
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

                                                                 
                                            
                             
                                            
  
                                                          
                                                        
                                                     
                                                                      
                                                             
                             
                                                      
                                                                    
                                                                
                                                    
                                                      
export const VEN_023_CARD_EFFECT =
  '你可以选择弃置一张手牌，作为打出我的额外费用。\n' +
  '当你打出我时，如果你支付了该额外费用，则打出一名0{{S}}的“影分身”。'

                            
export const ZED_EXTRA_COST: PlayExtraCost = {
  label: '弃置一张手牌(打出我的额外费用),以此打出一名战力 0 的影分身',
                         
                                                       
                                                  
  options: (state, player) => (state.zones[`hand:${player}`]?.contents ?? [])
    .map((oid) => state.objects[oid])
    // ★841 ⚠️【必须与 registry.playBonusFor 一起改,否则「把一个漏换成另一个漏」】
    //   这里排的是「正在打出的这张劫自己」。原为手写两个字面量、漏 VEN-023a ——
    //   今天因为 playBonusFor 那条漏而**不可达**;一旦只修那条不修这条,
    //   用 VEN-023a 打出时会**把自己列进弃牌候选**(正是这段注释要排掉的情形)。
    //   ㊟ 上面那句「不在别名组」的注释也已过时:★795/★833 后三号已并组。
    .filter((o) => o !== undefined && !variantSiblings('VEN-023').includes(o.defId))
    .map((o) => ({ id: o!.oid as string, label: o!.defId })),
                                                 
  payEvents: (state, _player, choice) => {
    const o = choice === undefined ? undefined : state.objects[choice as ObjId]
    return o === undefined ? [] : [{ kind: 'zoneChange', obj: o.oid, to: `discard:${o.owner}` as ZoneId }]
  },
  // ★1605【缺陷 212 修 7/7】「如果你支付了该额外费用,则打出一名0[S]的影分身」不再在这里直发:走 `makeZedPlayTrigger` 打出触发入链
  //   (§383.4.a.2),落点与指示物急速都在链上问 ⇒ ★251 的「写死基地」收窄与 ★1403 的手牌路第四维 `bonusTokenHaste` 同时失去载体。
}

                                                   
export const VEN_023_CLONE_TO = 'VEN-023:cloneTo'
export const VEN_023_HASTE_KEY = hasteKeyOf('VEN-023:clone')

   
                                                                                       
                                                                                                      
                                                                                               
                                                                                                                          
                                                
   
export function makeZedPlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const itemId = `VEN-023:play:${selfOid}`
  return compileTrigger({
    id: itemId, rawId: true, sourceDefId: 'VEN-023',
    event: 'playUnit', by: 'you',
    when: [
      { kind: 'subjectIsSelf' },
      { kind: 'custom', test: (ev) => (ev as { bonus?: boolean }).bonus === true },
    ],
    nextChoice: (state, _ev, chosen) => {
      const zones = tokenDropZones(state, controller)
      if (chosen[VEN_023_CLONE_TO] === undefined && zones.length > 1) {
        return { itemId, controller, key: VEN_023_CLONE_TO, prompt: '劫:把影分身打出到哪里?',
          candidates: zones.map((z) => ({ id: z, label: z.startsWith('base:') ? '我的基地' : `战场 ${z}` })) }
      }
      return spawnTokenHasteChoice(state, controller, SHADOW_CLONE_TOKEN, { itemId, key: VEN_023_HASTE_KEY, label: '影分身' }, chosen)
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const zones = tokenDropZones(state, controller)
      const picked = chosen?.[VEN_023_CLONE_TO]
      const to = (picked !== undefined && zones.includes(picked) ? picked : zones[0] ?? `base:${controller}`) as ZoneId
      const x = spawnTokenHasteResolve(state, controller, SHADOW_CLONE_TOKEN, VEN_023_HASTE_KEY, chosen)
      return [
        ...x.pre, // 答付且付得起 ⇒ 恰一条 spend [1][A]
        { kind: 'spawnToken', spec: SHADOW_CLONE_TOKEN as never, zone: to, owner: controller, ...(x.ready ? { ready: true } : {}) } as GameEvent,
      ]
    },
  }, selfOid, controller)
}

const zed = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '劫 - 禁忌之影', category: 'unit',
  domains: ['red'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '可弃一张手牌作额外费用(ZED_EXTRA_COST);付了则触发入链、链上问落点 + 指示物急速后出一只影分身(makeZedPlayTrigger,★1605)' }],
})
export const VEN_023: Card = zed('VEN-023', 'VEN·023')
export const VEN_169: Card = zed('VEN-169', 'VEN·169')                

                                                               
                                                                        
                                                                  
export const ZED_DEFIDS: readonly string[] = variantSiblings('VEN-023')
                                            
export const SHADOW_CLONE_DEFIDS: readonly string[] = ['VEN-023', 'VEN-144', 'VEN-169']

                                                           
                                    
                                   
                                                                      
  
                      
                                                                 
                                                   
                                                                                  
                                                                     
                                                         
                                                             
                                                                         
                                                                     
export const VEN_144_CARD_EFFECT =
  '{{燃烧3}}。（将你主牌堆顶部的三张牌放入你的废牌堆。）\n' +
  '打出一名0{{S}}的“影分身”。\n' +
  '{{流转}}{{1}}{{A}}{{A}}（你可以选择支付此牌的流转费用，以此将其从你的废牌堆中打出。然后将其放逐。）'

export const VEN_144_BURN = 3
                                                            
export const VEN_144_KEYWORDS: readonly string[] = ['流转1AA']
export const VEN_144_HASTE_KEY = hasteKeyOf('VEN-144:clone')                  

export const VEN_144_SPEC: PlaySpec = {
  defId: 'VEN-144', cardNo: 'VEN·144', name: '禁奥义！瞬狱影杀阵', kind: 'spell',
  cost: { mana: 2, pips: [['red', 'purple']] }, // 卡面核:2法力+1枚红/紫 pip
  keywords: [...VEN_144_KEYWORDS],
  target: 'custom',
  legalTargets: (state: GameState, controller: PlayerId): readonly string[] => tokenDropZones(state, controller),
                                            
                                               
                                                                                                            
  makeNextChoice: ({ movedCardOid, controller, target }: { movedCardOid: string; controller: PlayerId; target?: string }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) =>
      target === undefined ? null : spawnTokenHasteChoice(state, controller, SHADOW_CLONE_TOKEN, { itemId: `play:${movedCardOid}`, key: VEN_144_HASTE_KEY, label: '影分身' }, chosen),
  makeResolve: ({ target, controller }: { controller: PlayerId; target?: string }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
                                                                                               
                                                            
      const x = target === undefined ? { ready: false, pre: [] as readonly GameEvent[] } : spawnTokenHasteResolve(state, controller, SHADOW_CLONE_TOKEN, VEN_144_HASTE_KEY, chosen)
      return [
        { kind: 'burn', player: controller, count: VEN_144_BURN } as GameEvent,
        ...x.pre, // 答付且付得起 ⇒ 恰一条 spend [1][A]
        ...(target === undefined ? [] : [{
          kind: 'spawnToken', spec: SHADOW_CLONE_TOKEN as never,
          zone: target as never, owner: controller, ...(x.ready ? { ready: true } : {}),
        } as GameEvent]),
      ]
    },
}

export const VEN_144: Card = {
  id: 'VEN-144', cardNo: 'VEN·144', name: '禁奥义！瞬狱影杀阵', category: 'spell',
  domains: ['red', 'purple'], energy: 2, keywords: [...VEN_144_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '燃烧3;打出一只影分身;流转1AA(VEN_144_SPEC)' }],
}
