import { describe, expect, test } from 'vitest'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { resolveImplDefId, variantSiblings } from '../../data/variantAlias'
import { specLookup } from '../../data/decks'
import { cardCost, cardKeywords, cardKind, activatedFor } from '../../data/registry'

                                      
                                           

describe('别名表本身的不变量', () => {
  test('表非空,且每个键的值都【含自己】', () => {
    expect(Object.keys(VARIANT_GROUPS).length).toBeGreaterThan(0)
    for (const [no, grp] of Object.entries(VARIANT_GROUPS)) {
      expect(grp, `${no} 的组里没有自己`).toContain(no)
    }
  })

  test('组是【对称】的:A 的组里有 B,B 的组里就必须有 A', () => {
    const bad: string[] = []
    for (const [no, grp] of Object.entries(VARIANT_GROUPS)) {
      for (const sib of grp) if (!(VARIANT_GROUPS[sib] ?? []).includes(no)) bad.push(`${no}↔${sib}`)
    }
    expect(bad).toEqual([])
  })

  test('单卡号不成组(只有一个成员的不该进表)', () => {
    for (const [no, grp] of Object.entries(VARIANT_GROUPS)) {
      expect(grp.length, `${no} 只有自己却进了表`).toBeGreaterThan(1)
    }
  })

  test('非再版卡:siblings 只有自己', () => {
    expect(variantSiblings('OGN-054')).toEqual(['OGN-054'])
  })
})

describe('resolveImplDefId 回退语义', () => {
  const has = (id: string): boolean => id === 'OGN-121'

  test('自己有实现 → 原样返回(不乱跳到别的号)', () => {
    expect(resolveImplDefId('OGN-121', has)).toBe('OGN-121')
  })

  test('★自己没实现、同组有 → 跳到同组那个', () => {
    expect(resolveImplDefId('SFD-230', has)).toBe('OGN-121')
  })

  test('整组都没实现 → 原样返回(不静默换号)', () => {
    expect(resolveImplDefId('SFD-230', () => false)).toBe('SFD-230')
  })

  test('不在表里的卡号 → 原样返回', () => {
    expect(resolveImplDefId('ZZZ-999', () => false)).toBe('ZZZ-999')
  })
})

describe('查表点接线:再版号拿到的必须和正画号一模一样', () => {
                                         
  test('specLookup 战力/关键词一致', () => {
    const a = specLookup('OGN-121')
    const b = specLookup('SFD-230')
    expect(b.baseMight).toBe(a.baseMight)
    expect(b.baseKeywords).toEqual(a.baseKeywords)
    expect(a.baseKeywords).toContain('待命')                         
  })

  test('cardKeywords / cardCost / cardKind 一致', () => {
    expect(cardKeywords('SFD-230')).toEqual(cardKeywords('OGN-121'))
    expect(cardCost('SFD-230')).toEqual(cardCost('OGN-121'))
    expect(cardKind('SFD-230')).toBe(cardKind('OGN-121'))
  })

  test('activatedFor 一致', () => {
    expect(activatedFor('SFD-230').map((s) => s.key)).toEqual(activatedFor('OGN-121').map((s) => s.key))
  })

  test('★不改 defId 本身:specLookup 返回的还是你查的那个号(异画不显示成正画)', () => {
    expect(specLookup('SFD-230').defId).toBe('SFD-230')
  })

  test('无关的卡不受影响(别名只在自己没实现时才回退)', () => {
    expect(specLookup('OGN-054').baseKeywords).toEqual(['坚守', '壁垒'])
  })
})
