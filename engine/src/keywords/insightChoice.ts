                                                      
  
                                                               
                                                             
                                                     
                                                            
                              
                                                          
                                                     
  
                                                                  
                                                                 
                                                 
                                                                
                                      
                                                                          
                                           

import type { GameState } from '../state/gameState'
import type { ObjId, PlayerId } from '../state/ids'
import type { ChoiceRequest } from '../loop/chain'
import { multiSelectChoice, multiSelectPicked } from '../loop/multiSelect'
import { topOfDeck } from './insight'

                                           
export const INSIGHT_DONE_LABEL = '够了,其余放回牌堆顶'

   
                                              
  
                                               
                                                                  
   
export function insightRecycleChoice(spec: {
  readonly itemId: string
  readonly controller: PlayerId
  readonly look: number
  readonly prefix: string
  readonly prompt: string
  readonly doneLabel?: string
}): (state: GameState, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null {
  return multiSelectChoice({
    itemId: spec.itemId,
    controller: spec.controller,
    prefix: spec.prefix,
    prompt: spec.prompt,
    doneLabel: spec.doneLabel ?? INSIGHT_DONE_LABEL,
                                                            
                                             
    max: spec.look,
                                               
    candidates: (state) => topOfDeck(state, spec.controller, spec.look)
      .map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
  })
}

                                               
export function insightRecycled(
  chosen: Readonly<Record<string, string>> | undefined,
  prefix: string,
): readonly ObjId[] {
  return multiSelectPicked(chosen, prefix) as readonly ObjId[]
}
