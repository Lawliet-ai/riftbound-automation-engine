                                                               
                                                       
                                                              
                                       

export interface VanillaUnit {
  readonly name: string
                          
  readonly keywords: readonly string[]
                      
  readonly mana: number
                                  
  readonly pips: number
  readonly domains: readonly string[]
                 
  readonly might: number
  readonly heroUnit: boolean
}

export const VANILLA_UNITS: Readonly<Record<string, VanillaUnit>> = {
  "OGN-001": { name: "灼焰飞龙", keywords: ["急速"], mana: 5, pips: 0, domains: ["red"], might: 5, heroUnit: false },
  "OGN-010": { name: "军团后卫", keywords: ["急速"], mana: 2, pips: 0, domains: ["red"], might: 2, heroUnit: false },
  "OGN-013": { name: "呸呸魄罗", keywords: ["法盾"], mana: 2, pips: 0, domains: ["red"], might: 2, heroUnit: false },
  "OGN-049": { name: "贪玩的小鬼", keywords: [], mana: 5, pips: 0, domains: ["green"], might: 5, heroUnit: false },
  "OGN-052": { name: "强强魄罗", keywords: ["坚守"], mana: 2, pips: 0, domains: ["green"], might: 2, heroUnit: false },
  "OGN-054": { name: "日耀卫队", keywords: ["坚守", "壁垒"], mana: 3, pips: 0, domains: ["green"], might: 3, heroUnit: false },
  "OGN-086": { name: "宝石巨像", keywords: ["预知", "坚守"], mana: 5, pips: 0, domains: ["blue"], might: 5, heroUnit: false },
  "OGN-088": { name: "超能机甲", keywords: [], mana: 7, pips: 0, domains: ["blue"], might: 8, heroUnit: false },
  "OGN-135": { name: "帕卡幼崽", keywords: ["待命"], mana: 3, pips: 0, domains: ["orange"], might: 3, heroUnit: false },
  "OGN-142": { name: "山脉亚龙", keywords: [], mana: 9, pips: 0, domains: ["orange"], might: 10, heroUnit: false },
  "OGN-171": { name: "叨叨魄罗", keywords: ["预知"], mana: 2, pips: 0, domains: ["purple"], might: 2, heroUnit: false },
  "OGN-175": { name: "船坞潜伏者", keywords: [], mana: 3, pips: 0, domains: ["purple"], might: 3, heroUnit: false },
  "OGN-210": { name: "莽莽魄罗", keywords: ["强攻"], mana: 2, pips: 0, domains: ["yellow"], might: 2, heroUnit: false },
  "OGN-215": { name: "躁烈的副官", keywords: ["强攻"], mana: 5, pips: 0, domains: ["yellow"], might: 5, heroUnit: false },
  "OGN-219": { name: "先锋中士", keywords: [], mana: 4, pips: 0, domains: ["yellow"], might: 4, heroUnit: false },
  "OGN-241": { name: "慎", keywords: ["反应", "坚守2", "壁垒"], mana: 3, pips: 1, domains: ["yellow"], might: 3, heroUnit: true },
  "OGS-005": { name: "和风贤者", keywords: ["坚守"], mana: 6, pips: 1, domains: ["green"], might: 6, heroUnit: false },
  "OGS-007": { name: "盖伦", keywords: ["强攻2", "坚守2"], mana: 6, pips: 1, domains: ["orange"], might: 5, heroUnit: true },
  "SFD-002": { name: "武装强袭者", keywords: ["急速", "百炼"], mana: 6, pips: 1, domains: ["red"], might: 6, heroUnit: false },
  "SFD-008": { name: "哨兵好手", keywords: ["百炼"], mana: 3, pips: 0, domains: ["red"], might: 3, heroUnit: false },
  "SFD-037": { name: "纳沃利侦察兵", keywords: ["法盾"], mana: 4, pips: 0, domains: ["green"], might: 4, heroUnit: false },
  "SFD-092": { name: "战斗厨神", keywords: ["百炼"], mana: 5, pips: 0, domains: ["orange"], might: 5, heroUnit: false },
  "SFD-096": { name: "劳伦特护刃者", keywords: ["游走"], mana: 3, pips: 0, domains: ["orange"], might: 3, heroUnit: false },
  "SFD-099": { name: "壮壮魄罗", keywords: ["百炼"], mana: 2, pips: 0, domains: ["orange"], might: 2, heroUnit: false },
  "SFD-127": { name: "炳文大师", keywords: ["百炼"], mana: 6, pips: 0, domains: ["purple"], might: 6, heroUnit: false },
  "SFD-156": { name: "劳伦特剑使", keywords: ["强攻2"], mana: 4, pips: 0, domains: ["yellow"], might: 3, heroUnit: false },
  "UNL-002": { name: "伊焚娜", keywords: ["伏击", "强攻2"], mana: 2, pips: 0, domains: ["red"], might: 1, heroUnit: false },
  "UNL-006": { name: "小鲨鱼", keywords: ["急速", "强攻4"], mana: 3, pips: 0, domains: ["red"], might: 1, heroUnit: false },
  "UNL-024": { name: "雷恩加尔", keywords: ["急速", "强攻2", "法盾", "游走"], mana: 4, pips: 1, domains: ["red"], might: 4, heroUnit: true },
  "UNL-036": { name: "变异猫咪", keywords: ["坚守2", "壁垒"], mana: 2, pips: 0, domains: ["green"], might: 1, heroUnit: false },
  "UNL-099": { name: "魁梧斗士", keywords: ["坚守2", "壁垒"], mana: 4, pips: 0, domains: ["orange"], might: 3, heroUnit: false },
  "UNL-100": { name: "贪食魔沼蛙", keywords: ["狩猎3"], mana: 5, pips: 0, domains: ["orange"], might: 5, heroUnit: false },
  "UNL-220": { name: "呸呸魄罗", keywords: ["法盾"], mana: 2, pips: 0, domains: ["red"], might: 2, heroUnit: false },
  "UNL-223": { name: "壮壮魄罗", keywords: ["百炼"], mana: 2, pips: 0, domains: ["orange"], might: 2, heroUnit: false },
  "UNL-224": { name: "叨叨魄罗", keywords: ["预知"], mana: 2, pips: 0, domains: ["purple"], might: 2, heroUnit: false },
  "UNL-225": { name: "莽莽魄罗", keywords: ["强攻"], mana: 2, pips: 0, domains: ["yellow"], might: 2, heroUnit: false },
  "VEN-118": { name: "龙角勇士", keywords: ["壁垒"], mana: 6, pips: 0, domains: ["yellow"], might: 6, heroUnit: false },
}
