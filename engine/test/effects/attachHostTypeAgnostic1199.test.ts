import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { canAttach, attachCard, attachedTo } from '../../src/state/attach'
import { attachmentBonuses } from '../../src/effects/attachmentMight'
import { equipDefaultTargets } from '../../src/keywords/equip'

                                                   
  
                                                     
                                                     
                                                 
  
                                                     
                                                                
                                                    
                          
                                                        
                                                             
                                           
                                                 
                                                       
                     
                                                                
                                                                           
                                                   
                                                      
  
                                         
                                 
                                       
  
                                                               
                                                   
                                          
                                                                      

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BASE = `base:${P1}`
const HAND = `hand:${P1}`

const mk = (
  oid: string, types: readonly string[], zone: string,
  extra: Record<string, unknown> = {},
): GameObject => ({
  oid: asObjId(oid), defId: `X-${oid}`, owner: P1, controller: P1, zone: asZoneId(zone),
  baseMight: 1, baseKeywords: [], baseTypes: types, damage: 0, counters: {}, status: {},
  ...extra,
} as unknown as GameObject)

function board(objs: readonly GameObject[]): GameState {
  const s = createInitialState([P1, P2], 2)
  const zones: Record<string, unknown> = { ...s.zones }
  for (const zid of [BASE, HAND]) {
    const z = s.zones[zid as never] as { contents?: unknown } | undefined
    if (z) zones[zid] = { ...z, contents: objs.filter((o) => String(o.zone) === zid).map((o) => o.oid) }
  }
  return {
    ...s,
    objects: { ...s.objects, ...Object.fromEntries(objs.map((o) => [String(o.oid), o])) },
    zones,
  } as unknown as GameState
}

                                                  
const SCENE = [
  mk('gear', ['equipment'], BASE, { basePowerBonus: 2 }),
  mk('rn', ['rune'], BASE),
  mk('u', ['unit'], BASE),
] as const

describe('★1199 共用件 canAttach 必须保持类型无关(§434.1 / §137.3.b / §178.1.a.1)', () => {
  test('⭐⭐⭐⭐⭐⭐⭐【口径一致 · §137.3.b 那条分支必须活着】贴在非单位宿主上 ⇒ 战力加成被无视', () => {
    const st = board(SCENE)
    expect(st.objects[asObjId('rn')]!.baseTypes).toEqual(['rune'])             
    const onRune = attachCard(st, asObjId('gear'), asObjId('rn'))
    expect(String(attachedTo(onRune.objects[asObjId('gear')]))).toBe('rn')           
                                                        
    expect(attachmentBonuses(onRune).map((b) => String(b.hostOid))).toEqual([])
  })

  test('⭐⭐⭐⭐⭐⭐【同一张加成卡贴到单位上就产出】—— 证明上一条不是「本来就空」', () => {
    const st = board(SCENE)
    const onUnit = attachCard(st, asObjId('gear'), asObjId('u'))
    expect(attachmentBonuses(onUnit).map((b) => [String(b.hostOid), b.delta])).toEqual([['u', 2]])
  })

  test('⭐⭐⭐⭐⭐⭐⭐【分工闸】同一局面、同一宿主:宣告侧【不列】它,共用件【接受】它', () => {
    const st = board(SCENE)
                                                   
    const targets = equipDefaultTargets(st, String(P1), asObjId('gear')).map(String)
    expect(targets).toContain('u')
    expect(targets).not.toContain('rn')
                                                   
    expect(canAttach(st, asObjId('gear'), asObjId('rn'))).toBe(true)
  })

  test('⭐⭐⭐⭐⭐【判别力对照 · 一】宿主不在场上就不行(§434.1「场上的」)', () => {
    const st = board([mk('gear', ['equipment'], BASE), mk('rn', ['rune'], HAND)])
    expect(canAttach(st, asObjId('gear'), asObjId('rn'))).toBe(false)
  })

  test('⭐⭐⭐⭐⭐【判别力对照 · 二】不能贴附到自己身上', () => {
    const st = board(SCENE)
    expect(canAttach(st, asObjId('rn'), asObjId('rn'))).toBe(false)
  })
})
