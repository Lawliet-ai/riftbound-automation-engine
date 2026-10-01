import { describe, expect, test } from 'vitest'
import { asObjId } from '../../src/state/ids'
import { assignDamage, type DamageTarget } from '../../src/combat/damageAssign'

const t = (id: string, lethal: number, extra: Partial<DamageTarget> = {}): DamageTarget =>
  ({ oid: asObjId(id), lethalNeeded: lethal, ...extra })

const got = (m: Map<ReturnType<typeof asObjId>, number>, id: string): number | undefined =>
  m.get(asObjId(id))

                                                                      
                                                   
                                                 
                                  
                                                 
                                                      
                                           
                                      
                                    
describe('§826 后排:非后排单位全部吃到致命之前,后排是无效分配对象', () => {
  test('§826.4.b 非后排没吃到致命 → 后排一点都分不到', () => {
                                       
    const m = assignDamage(3, [t('normal', 5), t('back', 1, { backline: true })])
    expect(got(m, 'normal')).toBe(3)
    expect(got(m, 'back')).toBeUndefined()
  })

  test('§826.3 非后排吃到致命之后,后排才开始吃', () => {
    const m = assignDamage(7, [t('normal', 5), t('back', 2, { backline: true })])
    expect(got(m, 'normal')).toBe(5)      
    expect(got(m, 'back')).toBe(2)
  })

  test('§826.4.b 有多个非后排时:【全部】非后排吃到致命前,后排都无效', () => {
                                                            
    const m = assignDamage(5, [t('n1', 3), t('n2', 3), t('back', 1, { backline: true })])
    expect(got(m, 'n1')).toBe(3)
    expect(got(m, 'n2')).toBe(2)
    expect(got(m, 'back')).toBeUndefined()
  })

  test('§826.4.b 多个后排:非后排清完后,后排之间可任意分配', () => {
    const m = assignDamage(8, [t('n', 4), t('b1', 2, { backline: true }), t('b2', 2, { backline: true })])
    expect(got(m, 'n')).toBe(4)
    expect((got(m, 'b1') ?? 0) + (got(m, 'b2') ?? 0)).toBe(4)               
  })

  test('场上【只有】后排单位时:它们照常可以吃伤害(没有非后排要先清)', () => {
    const m = assignDamage(3, [t('b1', 2, { backline: true }), t('b2', 5, { backline: true })])
    expect(got(m, 'b1')).toBe(2)
    expect(got(m, 'b2')).toBe(1)
  })

  test('§465.2.c.6 壁垒【先】于普通、普通先于后排(三档齐全)', () => {
    const m = assignDamage(6, [
      t('back', 1, { backline: true }),
      t('normal', 2),
      t('barrier', 3, { barrier: true }),
    ])
    expect(got(m, 'barrier')).toBe(3)        
    expect(got(m, 'normal')).toBe(2)
    expect(got(m, 'back')).toBe(1)        
  })

  test('§826.5 多个[后排]只生效一次:标志是布尔,不叠加不改变顺序', () => {
                                       
                                     
    const one = assignDamage(4, [t('n', 2), t('b', 2, { backline: true })])
    expect(got(one, 'b')).toBe(2)
  })

  test('§465.2.c.10 免疫伤害的单位被排除,且不挡住后排', () => {
    const m = assignDamage(3, [t('imm', 9, { immune: true }), t('back', 2, { backline: true })])
    expect(got(m, 'imm')).toBeUndefined()
    expect(got(m, 'back')).toBe(3)                                                                                  
  })

  test('§826.3「控制者与我相同」:同一次分配里的目标本就同属一个控制者(战斗按方分配)', () => {
                                                                          
                                            
                                 
    const m = assignDamage(5, [t('a', 2), t('b', 2)])
    expect((got(m, 'a') ?? 0) + (got(m, 'b') ?? 0)).toBe(5)                                                                         
  })
})
