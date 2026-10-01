import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import {
  foresightTriggerCount, foresightPeek, FORESIGHT_INSIGHT_AMOUNT,
} from '../../src/keywords/foresight'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function card(id: string, zone: string): GameObject {
  return {
    oid: asObjId(id), defId: 'BLK', owner: P1, controller: P1, zone: asZoneId(zone),
    baseMight: 1, baseKeywords: [], damage: 0, counters: {}, status: {},
  }
}

                                   
function scene(deck: number): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const ids: string[] = []
  for (let i = 0; i < deck; i++) { const id = `d${i}`; objects[id] = card(id, 'mainDeck:P1'); ids.push(id) }
  return {
    ...base, objects,
    zones: { ...base.zones, ['mainDeck:P1']: { ...base.zones['mainDeck:P1']!, contents: ids.map(asObjId) } },
  }
}

describe('§817 预知:进场时进行洞察', () => {
  test('§817.3 是常驻牌的特性', () => {
                                               
                                                                           
    expect(foresightTriggerCount(['预知'])).toBe(1)
    expect(foresightTriggerCount(['洞察'])).toBe(0)
    expect(foresightTriggerCount(undefined)).toBe(0)
  })

  test('§817.1.b 每次预知做的是【洞察1】(§436.3.a X 缺省为 1)', () => {
    expect(FORESIGHT_INSIGHT_AMOUNT).toBe(1)
  })

  test('§817.2 每一个[预知]效果都【分别】触发', () => {
    expect(foresightTriggerCount(['预知'])).toBe(1)
    expect(foresightTriggerCount(['预知', '预知'])).toBe(2)
    expect(foresightTriggerCount([])).toBe(0)
  })

  test('§817.2 与 §819.2 灵便相反、与 §821.1.d 百炼同侧(三者并排锁住,防套错模型)', () => {
                            
    expect(foresightTriggerCount(['预知', '预知', '预知'])).toBe(3)
  })

  test('§817.2.b 不回收时,连续两次预知看到【同一张】牌', () => {
    const s = scene(3)
    const first = foresightPeek(s, P1)
    const second = foresightPeek(s, P1)           
    expect(first).toBe(second)
    expect(first).toBe('d2')       
  })

  test('§436.4 牌堆空时看不到牌;§436.4.a 也不燃尽(不送对手分)', () => {
    const s = scene(0)
    expect(foresightPeek(s, P1)).toBeUndefined()
    expect(s.scores['P2'] ?? 0).toBe(0)         
  })

  test('看的是【自己】的主牌堆顶', () => {
    const s = scene(2)
    expect(foresightPeek(s, P1)).toBe('d1')
    expect(foresightPeek(s, P2)).toBeUndefined()            
  })
})
