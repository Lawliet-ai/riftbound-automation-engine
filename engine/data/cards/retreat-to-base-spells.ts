                                                                
                                                    
                                                                              
                                                                   
  
                                
                                              
                                 
                                                    
                            
  
                                         
                                                              
                                                            
                          
                                                            
                                                              
  
                                                                 
                                                       
                                                                    
                                                         
                                           
  
                                                                   
                                                           
                                                                        
                                                                                
                                                                                                            
                                                                          
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameEvent } from '../../src/loop/events'
import type { ChainItem } from '../../src/loop/chain'                           
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { Card } from '../../src/dsl/card'
import { multiSelectChoice, multiSelectPicked } from '../../src/loop/multiSelect'
import { groupSubsetChoice, groupSubsetApplied, controllerAtResolve, type GroupTargetSpec } from '../../src/loop/groupTargets'                   
import { isUnit } from '../../src/state/cardTypes'

export const OGN_168_CARD_EFFECT =
  '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n' +
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n将一名单位从战场上移动到其所属的基地。'
export const SFD_043_CARD_EFFECT =
  '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n' +
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n将一处战场上任意数量的友方单位移动到其所属的基地。'

                                                 
export const RETREAT_KEYWORDS: readonly string[] = ['待命', '迅捷']

                                        
export function unitsOnBattlefield(state: GameState): readonly ObjId[] {
  return Object.values(state.objects)
    .filter((o) => state.zones[o.zone]?.kind === 'battlefield' && isUnit(o))
    .map((o) => o.oid)
    .sort()
}

   
                                                          
                           
   
export function retreatEvents(state: GameState, oid: ObjId): readonly GameEvent[] {
  const o = state.objects[oid]
  if (o === undefined) return []
  const to = `base:${o.owner}` as ZoneId                                      
  if ((o.zone as string) === (to as string)) return []
  return [
    { kind: 'zoneChange', obj: oid, to } ,
                                           
    { kind: 'unitMoved', unit: oid, player: o.controller, from: o.zone, to } ,
  ]
}

                                                                    
export const OGN_168_SPEC: PlaySpec = {
  defId: 'OGN-168', cardNo: 'OGN·168/298', name: '战或逃', kind: 'spell',
  cost: { mana: 2 }, // cardCosts 实测:2 法力 0 pip(紫)
  keywords: RETREAT_KEYWORDS,
  target: 'custom',
                                                    
  legalTargets: (state: GameState): string[] => unitsOnBattlefield(state).map((o) => o as string),
  makeResolve: ({ target }: { target?: string }) => (state: GameState): readonly GameEvent[] =>
    target === undefined ? [] : retreatEvents(state, target as ObjId),
}

                                                               
const WALL_PREFIX = 'SFD-043:back'

   
                                 
                                                                 
   
export function wallCandidates(
  state: GameState, controller: PlayerId, picked: readonly string[],
): readonly ObjId[] {
  const lockZone = picked.length === 0 ? undefined : state.objects[picked[0] as ObjId]?.zone
  return Object.values(state.objects)
    .filter((o) =>
      state.zones[o.zone]?.kind === 'battlefield' &&
      isUnit(o) &&
      o.controller === controller &&
      (lockZone === undefined || o.zone === lockZone))
    .map((o) => o.oid)
    .sort()
}

   
                                                              
                                                       
                                                             
                                                                 
   
function wallSpec(
  movedCardOid: string, controller: PlayerId, source: Readonly<Record<string, string>>,
): GroupTargetSpec {
  return {
    itemId: `play:${movedCardOid}`,
    controller,
    groupKey: 'wall',
    initial: multiSelectPicked(source, WALL_PREFIX),
                                       
    memberLegal: (st, o) => {
      const obj = st.objects[o as ObjId]
      return obj !== undefined && st.zones[obj.zone]?.kind === 'battlefield' && isUnit(obj) && obj.controller === controller
    },
    groupOk: (st, group) => {
      if (group.length === 0) return true                    
      return new Set(group.map((o) => String(st.objects[o as ObjId]?.zone ?? ''))).size === 1
    },
    prompt: '禁军之墙:这些目标已不再整体满足限制(不在同一处战场)——从最初选定的单位里挑一个合法子集',
    label: (st, o) => `${st.objects[o as ObjId]?.defId ?? o}`,
  }
}

export const SFD_043_SPEC: PlaySpec = {
  defId: 'SFD-043', cardNo: 'SFD·043/221', name: '禁军之墙', kind: 'spell',
  cost: { mana: 2 }, // cardCosts 实测:2 法力 0 pip(绿)
  keywords: RETREAT_KEYWORDS,
  targetlessChoice: true, // ★499:选择走问链(修跨轮 bug)
  target: 'custom',
  legalTargets: (): string[] => [],
  firstAskOptional: true, // ★1802c §355.13:卡文「一处战场上**任意数量**的友方单位」⇒ 含 0
                                                        
                                                          
  makeConfirmChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) =>
      multiSelectChoice({
        itemId: `play:${movedCardOid}`,
        controller,
        prefix: WALL_PREFIX,
        prompt: '禁军之墙:将一处战场上任意数量的友方单位移回其所属基地',
        isTarget: true, // ★1782 将一处战场上任意数量的友方单位移动到其所属的基地
                                                                 
        candidates: (st, picked) => wallCandidates(st, controller, picked)
          .map((oid) => ({ id: oid as string, label: `${st.objects[oid]?.defId ?? oid}` })),
      })(state, chosen),
                                                             
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) => {
                                              
      if (multiSelectPicked(chosen, WALL_PREFIX).length === 0) return null
                                                                     
                                                                                       
      const cur = controllerAtResolve(state, movedCardOid, controller)
      return groupSubsetChoice(wallSpec(movedCardOid, cur, chosen))(state, chosen)
    },
  makeResolve:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>, self?: ChainItem): readonly GameEvent[] => {
                                                                 
      const cur = (self?.controller ?? controller) as PlayerId
                                                                            
                                                                 
                                                          
      const source = { ...(chosen ?? {}), ...(self?.frozenChoices ?? {}) }
      return groupSubsetApplied(state, chosen, wallSpec(movedCardOid, cur, source))
        .flatMap((oid) => retreatEvents(state, oid as ObjId))
    },
}

export const OGN_168: Card = {
  id: 'OGN-168', cardNo: 'OGN·168/298', name: '战或逃', category: 'spell',
  domains: ['purple'], energy: 2, keywords: [...RETREAT_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[待命][迅捷];把一名单位从战场移回其所属基地(OGN_168_SPEC)' }],
}

export const SFD_043: Card = {
  id: 'SFD-043', cardNo: 'SFD·043/221', name: '禁军之墙', category: 'spell',
  domains: ['green'], energy: 2, keywords: [...RETREAT_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[待命][迅捷];一处战场上任意数量的友方单位移回基地(SFD_043_SPEC)' }],
}
