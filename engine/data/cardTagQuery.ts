                                                              
  
                                                                   
                                               
                                                          
                                                   
                                                                    
                                                            
                                                                       
  
                                                               
                                               
import { CARD_TAGS } from './cardTags'
import { resolveImplDefId } from './variantAlias'

   
                           
  
                                           
                                                     
                                      
                                                                     
                                                           
                                                                         
                                                   
                                      
                                                            
  
                                                              
                                               
  
                                                   
                                                       
                                                                 
                                                                
                                        
                               
                                                                   
                                                         
                                                         
                                                      
              
   
const TOKEN_TAGS: Readonly<Record<string, string>> = {
  'token:随从': '随从', // §187.1
  'token:精灵': '仙灵', // §187.2
  'token:黄沙士兵': '恕瑞玛', // §187.3
  'token:机器人': '机械', // §187.4
  'token:战鹰': '鸟类', // §187.7
  'token:触手': '比尔吉沃特', // §187.10
}

                                                           
export function cardTagsOf(defId: string): readonly string[] {
  const id = resolveImplDefId(defId, (x) => x in CARD_TAGS)
  const raw = CARD_TAGS[id] ?? TOKEN_TAGS[id] ?? ''
  return raw === '' ? [] : raw.split('|')
}

   
                                     
                                                       
                                                                           
                                   
   
export function allCardTags(): readonly string[] {
  const all = new Set<string>()
                                                  
  for (const defId of [...Object.keys(CARD_TAGS), ...Object.keys(TOKEN_TAGS)]) {
    for (const t of cardTagsOf(defId)) all.add(t)
  }
  return [...all].sort()
}

                                       
export function hasCardTag(defId: string, tag: string): boolean {
  return cardTagsOf(defId).includes(tag)
}

                                                
export function hasAnyCardTag(defId: string, tags: Iterable<string>): boolean {
  const mine = cardTagsOf(defId)
  for (const t of tags) if (mine.includes(t)) return true
  return false
}

                                                         
  
                                               
                                                                                           
                                              
                            
                                                       
                                                          
                                                               
                                                                    
                                               

   
                                                      
                                            
                                     
                                                        
                                     
                                            
   
export const GAINED_TAG_KEY = 'gainedCardTag'

                                                                       
export interface TaggableObject {
  readonly defId: string
  readonly declared?: Readonly<Record<string, string>>
     
                                                                                   
                                                                     
                                                        
                                                  
     
  readonly derived?: { readonly tags?: readonly string[]; readonly copiedDefId?: string }
}

   
                                    
                                                     
   
export function objectCardTags(obj: TaggableObject): readonly string[] {
                                                     
                                                              
                         
  const printed = cardTagsOf(obj.derived?.copiedDefId ?? obj.defId)
  const gained = obj.declared?.[GAINED_TAG_KEY]
  const granted = obj.derived?.tags                                                
  if ((gained === undefined || gained === '') && (granted === undefined || granted.length === 0)) return printed
  const out = [...printed]
  for (const t of (gained ?? '').split('|')) if (t !== '' && !out.includes(t)) out.push(t)
  for (const t of granted ?? []) if (!out.includes(t)) out.push(t)
  return out
}

                                    
export function objectHasCardTag(obj: TaggableObject, tag: string): boolean {
  return objectCardTags(obj).includes(tag)
}
