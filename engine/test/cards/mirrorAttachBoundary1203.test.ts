import { describe, expect, test } from 'vitest'
import { firstCandidates, attachOrDetach } from '../../data/cards/two-target-spells'
import { objectCardTags } from '../../data/cardTagQuery'
import { specLookup } from '../../data/decks'
import { CARD_CATEGORIES } from '../../data/cardCategories'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'

                                                
  
                                                                  
                                                                                                      
                                                                                
                                                         
                                                        
                         
  
                                                        
                                                               
                                                           
  
                                                     
                                                                 
                                                 
                                                                
                                                                      
                                                     

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const firstOf = (cat: string): string =>
  Object.entries(CARD_CATEGORIES as Record<string, string>).find(([, c]) => c === cat)![0]

const sp = (defId: string) => specLookup(defId) as unknown as { baseMight: number; baseTypes?: readonly string[] }

function obj(oid: string, defId: string, declared?: readonly string[], extra: Record<string, unknown> = {}): GameObject {
  return {
    oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: 0, baseKeywords: [], ...(declared ? { baseTypes: declared } : {}),
    damage: 0, counters: {}, status: {}, ...extra,
  } as unknown as GameObject
}

function board(objs: readonly GameObject[]): GameState {
  const s = createInitialState([P1, P2], 2)
  const z = s.zones[BF0 as never] as { contents?: unknown } | undefined
  return {
    ...s,
    objects: { ...s.objects, ...Object.fromEntries(objs.map((o) => [String(o.oid), o])) },
    zones: z ? { ...s.zones, [BF0]: { ...z, contents: objs.map((o) => o.oid) } } : s.zones,
  } as unknown as GameState
}

                                      
function equipmentWithTag(): string {
  const id = Object.entries(CARD_CATEGORIES as Record<string, string>)
    .filter(([, c]) => c === 'equipment').map(([i]) => i)
    .find((i) => (objectCardTags({ defId: i } as never) ?? []).length > 0)
  expect(id).toBeDefined()
  return id!
}

const scene = (): GameState => board([
  obj('mir', 'token:映像'), // 故意不声明 baseTypes —— 真局里映像就是这样
  obj('u', firstOf('unit'), sp(firstOf('unit')).baseTypes),
  obj('eq', firstOf('equipment'), sp(firstOf('equipment')).baseTypes),
])

describe('★1203 ★1202 余波:attach 那一处的宿主 + §185.3.b「指示物没有特性」这条边界', () => {
  test('⭐⭐⭐⭐⭐⭐⭐⭐【★1202 余波 · 那条 attach 的候选】anyUnit 现在收得到映像', () => {
    expect(firstCandidates(scene(), P1, 'anyUnit').map(String).sort()).toEqual(['mir', 'u'])
  })

  test('⭐⭐⭐⭐⭐⭐⭐【端到端】取放自如真的把武装贴到映像身上(§185.2.d)', () => {
    const st = scene()
    const evs = attachOrDetach('mir', 'eq', st, P1)
    expect(evs.map((e) => (e as { kind: string }).kind)).toEqual(['attach'])
    expect(evs.map((e) => String((e as { to?: unknown }).to))).toEqual(['mir'])
  })

  test('⭐⭐⭐⭐⭐⭐【判别力对照】装备进不了 anyUnit 候选 —— 放宽的只是「指示物单位」这一档', () => {
    expect(firstCandidates(scene(), P1, 'anyUnit').map(String)).not.toContain('eq')
  })

  test('⭐⭐⭐⭐⭐⭐⭐⭐【§185.3.b 边界】裸映像【没有特性】—— 按特性筛的效果仍然选不中它', () => {
                                             
                                     
    expect(objectCardTags(obj('mir', 'token:映像'))).toEqual([])
  })

  test('⭐⭐⭐⭐⭐⭐⭐⭐【§185.3.b.1 边界的另一半】复制之后就【获得】了源的特性', () => {
    const src = equipmentWithTag()
    const clone = obj('mir', 'token:映像', undefined, {
      derived: { might: 0, keywords: [], restrictions: [], controller: P1, copiedDefId: src },
    })
    expect(objectCardTags({ defId: src } as never)).not.toEqual([])               
    expect(objectCardTags(clone)).toEqual(objectCardTags({ defId: src } as never))
  })
})
