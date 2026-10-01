                                  
  
                                                                   
                                                     
                                                           
  
                        
                                                                            
                                                             
                                               
                                                              
                                                 
                          
  
                                                     
                                                                        
                                          
  
                         
                                                                                 
                                                         

import { describe, expect, test } from 'vitest'
import { isPlainEquipmentDef, isPlainUnitDef, cardKind } from '../../data/registry'

                                                    
const TOKEN_DEFIDS = ['token:金币', 'token:机器人', 'token:随从', 'token:战鹰', 'token:影分身'] as const

describe('★855 「非指示物」判据:指示物一个都不许进两本账', () => {
  test('★★★所有 token 既不算非指示物单位、也不算非指示物装备', () => {
    for (const d of TOKEN_DEFIDS) {
      expect(isPlainUnitDef(d), `${d} 不该算非指示物单位`).toBe(false)
      expect(isPlainEquipmentDef(d), `${d} 不该算非指示物装备`).toBe(false)
    }
  })

  test('★★★★★承重前提:`cardKind` 对 token 的回落是 `unit` —— 装备那道判据靠它才不用补 token 门', () => {
                                          
                                                               
    for (const d of TOKEN_DEFIDS) {
      expect(cardKind(d), `${d} 的 cardKind 回落值`).toBe('unit')
    }
  })

  test('★对照组:真卡照常算 —— 免得上面两格靠"全 false"蒙混过关', () => {
    expect(isPlainEquipmentDef('SFD-153'), '先锋之眼是真装备').toBe(true)
    expect(isPlainEquipmentDef('OGN-063'), '真装备').toBe(true)
    expect(isPlainUnitDef('VEN-065'), '斯维因是真单位').toBe(true)
    expect(isPlainUnitDef('SFD-153'), '装备不是单位').toBe(false)
  })
})
