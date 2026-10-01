import { describe, expect, test } from 'vitest'
import { CARD_FACTS } from '../../data/cardFacts'
import { cardFacts, validateDeck } from '../../data/registry'
import { DEMO_DECK_A } from '../../data/decks'

                                                         
                          

                                                   
const distinctNames = (skip: readonly string[] = []): string[] => {
  const seen = new Set(skip.map((id) => CARD_FACTS[id]?.name ?? id))
  const out: string[] = []
  for (const [no, r] of Object.entries(CARD_FACTS)) {
    if (r.solitary || seen.has(r.name)) continue
    seen.add(r.name)
    out.push(no)
  }
  return out
}
const fill = (n: number, id?: string, skip: readonly string[] = []): string[] => {
  if (id) return Array.from({ length: n }, () => id)
  const pool = distinctNames(skip)
  const out: string[] = []
  for (let i = 0; out.length < n; i++) out.push(pool[Math.floor(i / 3) % pool.length]!)           
  return out.slice(0, n)
}

describe('卡面事实表', () => {
  test('★§132.4 完整名称是「简称 - 副标」,不是简称', () => {
    expect(cardFacts('OGN-121').name).toBe('提莫 - 军事家')
    expect(cardFacts('OGN-197').name).toBe('提莫 - 斥候')
  })

  test('★两张提莫的完整名称【不同】(拿简称当同名判据会把它们错并)', () => {
    expect(cardFacts('OGN-121').name).not.toBe(cardFacts('OGN-197').name)
  })

  test('查不到的卡号退回卡号当名字(不会误判成同名)', () => {
    expect(cardFacts('ZZZ-999').name).toBe('ZZZ-999')
    expect(cardFacts('ZZZ-998').name).not.toBe(cardFacts('ZZZ-999').name)
  })

  test('唯我/专属/英雄单位三个标记都有数据', () => {
    const rows = Object.values(CARD_FACTS)
    expect(rows.some((r) => r.solitary)).toBe(true)
    expect(rows.some((r) => r.exclusive)).toBe(true)
    expect(rows.some((r) => r.heroUnit)).toBe(true)
  })

  test('再版号沿用正画的事实(异画提莫仍是"提莫 - 军事家")', () => {
    expect(cardFacts('SFD-230').name).toBe(cardFacts('OGN-121').name)
  })
})

describe('★validateDeck 真能抓出违规(此前无人调用)', () => {
                              
  const BF3 = ['OGN-280', 'UNL-214', 'OGN-288']
  const ok = { mainDeck: fill(40), battlefields: BF3 }

  test('40 张白板 + 一处战场 → 合法', () => {
    expect(validateDeck(ok)).toEqual([])
  })

  test('§103.2 不足 40 张 → 报违规', () => {
    const v = validateDeck({ ...ok, mainDeck: fill(39) })
    expect(v.some((x) => x.rule === '§103.2')).toBe(true)
  })

  test('★§103.2.b 同名超过三张 → 报违规,且明细里是【完整名称】', () => {
    const v = validateDeck({ mainDeck: [...fill(4, 'OGN-121'), ...fill(36)], battlefields: BF3 })
    const hit = v.find((x) => x.rule === '§103.2.b')
    expect(hit).toBeDefined()
    expect(hit!.detail).toContain('提莫 - 军事家')
  })

  test('★同名判定按完整名称:两张军事家 + 两张斥候【合法】(简称都叫提莫)', () => {
    const v = validateDeck({
                                         
      mainDeck: [...fill(2, 'OGN-121'), ...fill(2, 'OGN-197'), ...fill(36, undefined, ['OGN-121', 'OGN-197'])],
      battlefields: BF3,
    })
    expect(v.filter((x) => x.rule === '§103.2.b')).toEqual([])
  })

  test('★§825.3.a 带[唯我]的卡两张 → 报违规(唯我只在构筑期生效,§825.4)', () => {
    const solo = Object.entries(CARD_FACTS).find(([, r]) => r.solitary)![0]
    const v = validateDeck({ mainDeck: [...fill(2, solo), ...fill(38)], battlefields: BF3 })
    expect(v.some((x) => x.rule === '§825.3.a')).toBe(true)
  })

  test('§103.4.c 同名战场重复 → 报违规', () => {
    const v = validateDeck({ ...ok, battlefields: ['OGN-280', 'OGN-280', 'UNL-214'] })
    expect(v.some((x) => x.rule === '§103.4.c')).toBe(true)
  })
})

describe('演示牌组:【有意】不满 40 张,所以不能拿校验当硬闸', () => {
  test('DEMO_DECK_A 确实校验不过(记录事实,不是要修它)', () => {
    const v = validateDeck({
      mainDeck: [...DEMO_DECK_A.mainDeck],
      battlefields: [...DEMO_DECK_A.battlefields],
      legend: DEMO_DECK_A.legend,
      hero: DEMO_DECK_A.hero,
    })
    expect(v.some((x) => x.rule === '§103.2')).toBe(true)           
  })
})

                                                    
describe('★§103.2.c/§103.3/§485.4.a 此前无人校验的四条', () => {
  const BF3X = ['OGN-280', 'UNL-214', 'OGN-288']
  const runes = (color: string, n: number): string[] => Array.from({ length: n }, () => `rune:${color}`)
                                                      
  const LEGEND = 'UNL-197'

  test('★§103.3.a 符文牌堆必须 12 张', () => {
    const v = validateDeck({ mainDeck: fill(40), battlefields: BF3X, runeDeck: runes('purple', 11) })
    expect(v.map((x) => x.rule)).toContain('§103.3.a')
    const ok = validateDeck({ mainDeck: fill(40), battlefields: BF3X, runeDeck: runes('purple', 12) })
    expect(ok.map((x) => x.rule)).not.toContain('§103.3.a')
  })

  test('★不传 runeDeck = 调用方还没管符文,【不校验】(传空数组才报)', () => {
    const none = validateDeck({ mainDeck: fill(40), battlefields: BF3X })
    expect(none.map((x) => x.rule)).not.toContain('§103.3.a')
    const empty = validateDeck({ mainDeck: fill(40), battlefields: BF3X, runeDeck: [] })
    expect(empty.map((x) => x.rule)).toContain('§103.3.a')
  })

  test('★§103.3.a.1 符文必须符合传奇的符文特性', () => {
                              
    const bad = validateDeck({ mainDeck: fill(40), battlefields: BF3X, legend: LEGEND, runeDeck: runes('red', 12) })
    expect(bad.map((x) => x.rule)).toContain('§103.3.a.1')
    const good = validateDeck({ mainDeck: fill(40), battlefields: BF3X, legend: LEGEND, runeDeck: runes('purple', 12) })
    expect(good.map((x) => x.rule)).not.toContain('§103.3.a.1')
  })

  test('★§103.2.c 主卡组的卡也必须符合卡组符文特性', () => {
                                              
    const v = validateDeck({ mainDeck: [...fill(1, 'OGN-001'), ...fill(39)], battlefields: BF3X, legend: LEGEND })
    expect(v.map((x) => x.rule)).toContain('§103.2.c')
  })

  test('没选传奇时不判特性(卡组符文特性由传奇定义,无从判起)', () => {
    const v = validateDeck({ mainDeck: [...fill(1, 'OGN-001'), ...fill(39)], battlefields: BF3X })
    expect(v.map((x) => x.rule)).not.toContain('§103.2.c')
  })

  test('★§485.4.a 1v1 每人三个战场:少一个或多一个都报', () => {
    expect(validateDeck({ mainDeck: fill(40), battlefields: ['OGN-280'] }).map((x) => x.rule)).toContain('§485.4.a')
    expect(validateDeck({ mainDeck: fill(40), battlefields: [...BF3X, 'OGN-283'] }).map((x) => x.rule)).toContain('§485.4.a')
    expect(validateDeck({ mainDeck: fill(40), battlefields: BF3X }).map((x) => x.rule)).not.toContain('§485.4.a')
  })

  test('★§103.4.a 张数随模式:传 battlefieldCount:null 就不判张数', () => {
    const v = validateDeck({ mainDeck: fill(40), battlefields: ['OGN-280'] }, { battlefieldCount: null })
    expect(v.map((x) => x.rule)).not.toContain('§485.4.a')
  })
})
