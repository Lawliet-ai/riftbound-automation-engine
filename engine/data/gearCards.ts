                                                          
                                                                           
                                                                            
                                           
                                                              
                                                             
                                                            
                                             
                                                           
                                                              

export interface GearCard {
  readonly name: string
                                          
  readonly keywords: readonly string[]
                  
  readonly energy: number
                                                    
  readonly powerBonus: number | null
                                                 
  readonly pips: number
                                      
  readonly domains: readonly string[]
                                                            
  readonly grants: readonly string[]
}

                                                      
                                                 
                                              
                                           
export const GEAR_CARDS: Readonly<Record<string, GearCard>> = {
  "SFD-009": { name: "锯齿短匕", keywords: ["装配红色"], energy: 1, pips: 0, domains: ["red"], powerBonus: 0, grants: ["强攻2"] },
  "SFD-016": { name: "反曲之弓", keywords: ["装配红色"], energy: 2, pips: 0, domains: ["red"], powerBonus: 0, grants: [] },
  "SFD-022": { name: "长剑", keywords: ["灵便", "装配红色"], energy: 2, pips: 1, domains: ["red"], powerBonus: 2, grants: [] },
  "SFD-030": { name: "阿瑞昂的陨落", keywords: ["装配1红色"], energy: 3, pips: 0, domains: ["red"], powerBonus: 2, grants: [] },
  "SFD-033": { name: "多兰之盾", keywords: ["装配绿色"], energy: 1, pips: 0, domains: ["green"], powerBonus: 1, grants: ["壁垒"] },
  "SFD-042": { name: "残暴之力", keywords: ["装配绿色"], energy: 2, pips: 0, domains: ["green"], powerBonus: 1, grants: [] },
  "SFD-051": { name: "守护天使", keywords: ["装配绿色"], energy: 2, pips: 0, domains: ["green"], powerBonus: 1, grants: [] },
  "SFD-056": { name: "斯特拉克的挑战护手", keywords: ["灵便", "装配绿色"], energy: 3, pips: 2, domains: ["green"], powerBonus: 3, grants: [] },
  "SFD-059": { name: "斯弗尔尚歌", keywords: ["装配1绿色"], energy: 3, pips: 1, domains: ["green"], powerBonus: 0, grants: [] },
  "SFD-064": { name: "布甲", keywords: ["灵便", "装配蓝色"], energy: 1, pips: 0, domains: ["blue"], powerBonus: 0, grants: ["坚守2"] },
  "SFD-073": { name: "海克斯注力刚壁", keywords: ["装配蓝色"], energy: 1, pips: 0, domains: ["blue"], powerBonus: 1, grants: [] },
  "SFD-086": { name: "云游图鉴", keywords: ["装配蓝色"], energy: 3, pips: 0, domains: ["blue"], powerBonus: 2, grants: [] },
  "SFD-090": { name: "Z型驱动", keywords: ["装配1蓝色"], energy: 3, pips: 0, domains: ["blue"], powerBonus: 2, grants: ["绝念"] },
  "SFD-095": { name: "多兰之刃", keywords: ["装配橙色"], energy: 2, pips: 0, domains: ["orange"], powerBonus: 2, grants: [] },
  "SFD-102": { name: "海克斯饮魔刀", keywords: ["装配橙色"], energy: 2, pips: 0, domains: ["orange"], powerBonus: 1, grants: ["法盾"] },
  "SFD-108": { name: "狂徒铠甲", keywords: ["装配橙色"], energy: 1, pips: 0, domains: ["orange"], powerBonus: 1, grants: [] },
  "SFD-115": { name: "三相之力", keywords: ["装配橙色"], energy: 4, pips: 0, domains: ["orange"], powerBonus: 2, grants: [] },
  "SFD-118": { name: "碎骨棒", keywords: ["装配1橙色"], energy: 3, pips: 0, domains: ["orange"], powerBonus: 2, grants: [] },
  "SFD-124": { name: "多兰之戒", keywords: ["装配紫色"], energy: 1, pips: 0, domains: ["purple"], powerBonus: 1, grants: [] },
  "SFD-133": { name: "轻灵之靴", keywords: ["装配紫色"], energy: 3, pips: 0, domains: ["purple"], powerBonus: 2, grants: ["游走"] },
  "SFD-134": { name: "萃取", keywords: ["装配紫色"], energy: 1, pips: 0, domains: ["purple"], powerBonus: 1, grants: [] },
  "SFD-139": { name: "夜之锋刃", keywords: ["待命", "装配紫色"], energy: 3, pips: 0, domains: ["purple"], powerBonus: 2, grants: [] },
  "SFD-150": { name: "临终仪式", keywords: [], energy: 3, pips: 0, domains: ["purple"], powerBonus: 2, grants: [] },
  "SFD-153": { name: "先锋之眼", keywords: ["装配黄色"], energy: 1, pips: 0, domains: ["yellow"], powerBonus: 0, grants: [] },
  "SFD-161": { name: "暴风大剑", keywords: ["装配黄色"], energy: 4, pips: 0, domains: ["yellow"], powerBonus: 3, grants: [] },
  "SFD-172": { name: "神圣剪刀", keywords: ["装配黄色"], energy: 2, pips: 1, domains: ["yellow"], powerBonus: 1, grants: ["绝念"] },
  "SFD-178": { name: "破败王者之刃", keywords: [], energy: 3, pips: 1, domains: ["yellow"], powerBonus: 4, grants: [] },
  "SFD-186": { name: "旋转飞斧", keywords: ["灵便", "装配A", "瞬息"], energy: 2, pips: 1, domains: ["red", "purple"], powerBonus: 3, grants: [] },
  "SFD-190": { name: "炉火斗篷", keywords: ["唯我", "装配A"], energy: 4, pips: 2, domains: ["green", "blue"], powerBonus: 3, grants: [] },
  "SFD-191": { name: "灭世者的死亡之冠", keywords: ["唯我", "装配A"], energy: 4, pips: 2, domains: ["green", "blue"], powerBonus: 3, grants: [] },
  "SFD-192": { name: "舒瑞娅的安魂曲", keywords: ["唯我", "装配A"], energy: 4, pips: 2, domains: ["green", "blue"], powerBonus: 2, grants: [] },
  "UNL-019": { name: "枯萎战斧", keywords: ["装配1红色"], energy: 4, pips: 0, domains: ["red"], powerBonus: 4, grants: [] },
  "UNL-039": { name: "灵魂之剑", keywords: ["装配绿色"], energy: 1, pips: 0, domains: ["green"], powerBonus: 1, grants: [] },
  "UNL-096": { name: "猎人的宽刃刀", keywords: ["装配橙色"], energy: 3, pips: 0, domains: ["orange"], powerBonus: 2, grants: ["狩猎"] },
  "UNL-158": { name: "牧人的传家宝", keywords: [], energy: 2, pips: 0, domains: ["yellow"], powerBonus: 2, grants: [] },
  "UNL-188": { name: "海克斯科技护手", keywords: ["装配3A"], energy: 3, pips: 0, domains: ["red", "yellow"], powerBonus: 3, grants: [] },
  "VEN-011": { name: "悬摆之刃", keywords: ["装配红色"], energy: 3, pips: 0, domains: ["red"], powerBonus: 1, grants: [] },
  "VEN-027": { name: "杠锤", keywords: ["装配绿色"], energy: 2, pips: 0, domains: ["green"], powerBonus: 1, grants: [] },
  "VEN-073": { name: "锯齿弯刀", keywords: ["装配橙色"], energy: 3, pips: 0, domains: ["orange"], powerBonus: 2, grants: [] },
  "VEN-137": { name: "可疑的眼镜", keywords: ["装配1黄色"], energy: 4, pips: 0, domains: ["yellow"], powerBonus: 0, grants: [] },
}

                                                
export const UNPARSED_EQUIP: Readonly<Record<string, readonly string[]>> = {
  "SFD-150": ["装配"],
  "SFD-178": ["装配"],
  "UNL-158": ["装配"],
}
