import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { makeMilitaristTrigger, militaristDefendEffect, militaristEffectEvents, OGN_121, OGN_121_CARD_EFFECT } from '../../data/cards/OGN-121'
import { detectTriggers } from '../../src/dsl/trigger'
import type { DefendEvent } from '../../src/loop/events'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function card(id: string, keywords: string[]): GameObject {
  return { oid: asObjId(id), defId: 'C', owner: P1, controller: P1, zone: asZoneId('mainDeck:P1'), baseKeywords: keywords, baseMight: 0, damage: 0, counters: {}, status: {} }
}
                                   
function scene(standbyCards: number): GameState {
  const base = createInitialState([P1, P2])
  const top5 = Array.from({ length: 5 }, (_, i) => card(`d${i}`, i < standbyCards ? ['待命'] : ['据守']))
  const enemy: GameObject = { oid: asObjId('enemy'), defId: 'E', owner: P2, controller: P2, zone: asZoneId('battlefield:shared:0'), baseMight: 10, damage: 0, counters: {}, status: {} }
  const objects: Record<string, GameObject> = { enemy }
  for (const c of top5) objects[c.oid] = c
  const deckZ = base.zones['mainDeck:P1']!
  const bfZ = base.zones['battlefield:shared:0']!
  return { ...base, objects, zones: { ...base.zones, 'mainDeck:P1': { ...deckZ, contents: top5.map((c) => c.oid) }, 'battlefield:shared:0': { ...bfZ, contents: [asObjId('enemy')] } } }
}

describe('军事家 OGN-121(errata)', () => {
  test('errata 文本(仅防守触发+集火同一目标)', () => {
    expect(OGN_121_CARD_EFFECT).toContain('当我防守时')
    expect(OGN_121_CARD_EFFECT).toContain('选择一名此处的敌方单位')
    expect(OGN_121.keywords).toContain('待命')
  })

  test('防守触发§383.4.f:仅"我"防守时', () => {
    const s = scene(3)
    const t = makeMilitaristTrigger(asObjId('me'), P1)
    const myDefend: DefendEvent = { kind: 'defend', unit: asObjId('me') }
    const otherDefend: DefendEvent = { kind: 'defend', unit: asObjId('other') }
    expect(detectTriggers(s, myDefend, [t], P1)).toHaveLength(1)
    expect(detectTriggers(s, otherDefend, [t], P1)).toHaveLength(0)           
  })

  test('顶5中3张待命 → 对选定敌方单位造成3点伤害(集火)', () => {
    const s = scene(3)
    const after = militaristDefendEffect(s, asObjId('enemy'), P1)
    expect(after.objects['enemy']!.damage).toBe(3)               
  })

  test('顶5全非待命 → 0伤;展示的5张回收到牌堆底', () => {
    const s = scene(0)
    const after = militaristDefendEffect(s, asObjId('enemy'), P1)
    expect(after.objects['enemy']!.damage).toBe(0)
    expect(after.zones['mainDeck:P1']!.contents).toHaveLength(5)                 
  })

  test('★854 伤害要带上【来源物件】—— 战报才写得出是军事家打的', () => {
                                                                           
                                                                
                                                
    const evs = militaristEffectEvents(scene(3), asObjId('enemy'), P1, undefined, asObjId('me'))
    const dmg = evs.find((e) => e.kind === 'damage') as unknown as { source?: string; amount?: number }
    expect(dmg, '应当发出一发集火伤害').toBeDefined()
    expect(dmg.amount).toBe(3)
    expect(dmg.source, '★来源 = 军事家自己').toBe('me')
                                                    
    const old = militaristEffectEvents(scene(3), asObjId('enemy'), P1)
    const oldDmg = old.find((e) => e.kind === 'damage') as unknown as { source?: string }
    expect(oldDmg.source, '★缺省不传时不该凭空多出 source').toBeUndefined()
  })

  test('伤害集火同一目标(非分散)', () => {
    const s = scene(5)         
    const after = militaristDefendEffect(s, asObjId('enemy'), P1)
    expect(after.objects['enemy']!.damage).toBe(5)                      
  })
})
