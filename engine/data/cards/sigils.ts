                        
  
                                         
                                                          
                       
                                             
                                            
                                            
  
                                
                                                       
                                                              
                                              
                                                        
                                                        
                                                
                                      
  
                                                           
                                             
                                                   
                                                         
                                                         
                                                       

import type { Card, Domain } from '../../src/dsl/card'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'                                                  

                           
interface SigilDef {
  readonly id: string
  readonly cardNo: string
  readonly name: string
  readonly domain: Domain                                                 
  readonly cn: string                    
}

                                                           
const SIGILS: readonly SigilDef[] = [
  { id: 'OGN-040', cardNo: 'OGN·040/298', name: '暴怒之印', domain: 'red', cn: '红色' },
  { id: 'OGN-081', cardNo: 'OGN·081/298', name: '专注之印', domain: 'green', cn: '绿色' },
  { id: 'OGN-120', cardNo: 'OGN·120/298', name: '洞察之印', domain: 'blue', cn: '蓝色' },
  { id: 'OGN-163', cardNo: 'OGN·163/298', name: '力量之印', domain: 'orange', cn: '橙色' },
  { id: 'OGN-204', cardNo: 'OGN·204/298', name: '不和之印', domain: 'purple', cn: '紫色' },
  { id: 'OGN-245', cardNo: 'OGN·245/298', name: '团结之印', domain: 'yellow', cn: '黄色' },
]
                                
export const SIGIL_REPRINTS: Readonly<Record<string, string>> = {
  'SFD-222': 'OGN-040', 'SFD-226': 'OGN-081', 'SFD-229': 'OGN-120',
  'SFD-231': 'OGN-163', 'SFD-234': 'OGN-204', 'SFD-238': 'OGN-245',
}

                                       
export const sigilCardEffect = (cn: string): string =>
  `{{横置}}：{{反应}}—{{获得}}{{${cn}}}，用以支付符能费用。（获得费用资源的技能无法成为其他法术的反应目标。）`

function makeSigilSpec(def: SigilDef): ActivatedSpec {
  return {
    key: `sigil:${def.domain}`,
    label: `{{横置}} {{反应}}—获得 {{${def.cn}}}`,
    cost: {},          // 冒号前没有资源费用
    tapSelf: true,     // [横置] §135.2.e.2
    keywords: ['反应'], // §813 权限轴:任意玩家回合、闭环也能发
    fastResolve: true, // §337.2/§429.2 获得资源的技能确认后立即结算,不入链、不可被反应
    target: 'none',
    legalTargets: (): string[] => [],
    makeResolve: ({ controller }) => (): readonly GameEvent[] =>
      [{ kind: 'gainResource', player: controller, energy: { [def.domain]: 1 } }],
  }
}

                                               
export const SIGIL_SPECS: Readonly<Record<string, ActivatedSpec>> = Object.fromEntries(
  SIGILS.map((d) => [d.id, makeSigilSpec(d)]),
)

                    
export const SIGIL_CARDS: readonly Card[] = SIGILS.map((d): Card => ({
  id: d.id, cardNo: d.cardNo, name: d.name, category: 'equipment',
  domains: [d.domain], energy: 0, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: `[横置][反应]获得1点${d.cn}符能(SIGIL_SPECS)` }],
}))

                                     
export const SIGIL_DEFIDS: readonly string[] =
  [...SIGILS.map((d) => d.id), ...Object.keys(SIGIL_REPRINTS)]
                                 
export const SIGIL_DOMAIN_OF: Readonly<Record<string, Domain>> = Object.fromEntries([
  ...SIGILS.map((d) => [d.id, d.domain]),
  ...Object.entries(SIGIL_REPRINTS).map(([rp, canon]) => [rp, SIGILS.find((d) => d.id === canon)!.domain]),
])

                                                                   
                                 
                                       
                                             
                                      
                                                    
export const OGN_257_CARD_EFFECT =
  '支付{{1}}，{{横置}}：给予一名友方单位增益。（如果该单位未拥有增益，则获得一个{{S}}+1增益。）'

export const OGN_257_SPEC: ActivatedSpec = {
  key: 'OGN-257:buff',
  label: '支付 1 法力并{{横置}}:给予一名友方单位增益',
  cost: { mana: 1 },
  tapSelf: true,
  target: 'custom',
  legalTargets: (state: GameState, controller: PlayerId): string[] =>
    Object.values(state.objects)
      .filter((o) => {
        const k = state.zones[o.zone]?.kind
        return (k === 'battlefield' || k === 'base')
          && isUnit(o)                                                        
          && o.controller === controller        
      })
      .map((o) => o.oid as string)
      .sort(),
  makeResolve: ({ target }) => (): readonly GameEvent[] =>
    target === undefined ? [] : [{ kind: 'grantBuff', target: target as ObjId }],
}
const blindMonk = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '盲僧', category: 'legend',
  domains: ['green', 'orange'], energy: 0, power: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '付1横置:给予一名友方单位增益(OGN_257_SPEC)' }],
})
export const OGN_257: Card = blindMonk('OGN-257', 'OGN·257/298')

                        
export const SIGIL_BATCH_DEFIDS: readonly string[] = [...SIGIL_DEFIDS, 'OGN-257', 'OGN-304']
