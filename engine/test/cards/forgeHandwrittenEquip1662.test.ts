   
                                                               
  
            
                                                                           
                                                          
                                    
  
        
                                                                          
                                                              
                                                                                                           
                                                                                                      
                                                         
  
               
                                                                                         
                                                                                                        
  
             
                                                                                      
   
import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { activeTriggers, activatedFor, defHasTag } from '../../data/registry'
import { applyEvents } from '../../src/loop/reduce'
import { forgeChoices } from '../../src/keywords/forge'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const obj = (oid: string, defId: string, zone: string, types: GameObject['baseTypes'], kws: readonly string[] = []): GameObject => ({
  oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(zone),
  baseMight: (types ?? []).includes('unit') ? 3 : 0, baseKeywords: kws, baseTypes: types, damage: 0, counters: {}, status: {},
} as unknown as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return recomputeContinuous({
    ...base, activePlayer: P1, priority: P1, phase: 'main', feprPasses: 0, objects, zones,
    runePools: { ...base.runePools, [P1]: { mana: 9, runes: { red: 3, yellow: 3, purple: 3 } } },
    experience: { ...base.experience, [P1]: 5 },
  } as unknown as GameState)
}

const HANDWRITTEN = ['UNL-158', 'SFD-178', 'SFD-150'] as const

function forgeCandidates(s: GameState): readonly string[] {
  const t = activeTriggers(s).find((x) => x.id.startsWith('forge:forger:'))
  const ev = { kind: 'playUnit', unit: asObjId('forger'), player: P1 } as unknown as GameEvent
  const req = t?.nextChoice?.(s, ev, {}) as { candidates: readonly { id: string }[] } | null | undefined
  return (req?.candidates ?? []).map((c) => c.id)
}

describe('🔴★1662 缺陷 213(★1663 已修):百炼够得着手写装配规格的三件武装', () => {
  const s = scene([
    obj('forger', 'SFD-116', 'base:P1', ['unit'], ['百炼']),
    obj('ally', 'BLK', 'base:P1', ['unit']),
    obj('sword', 'SFD-022', 'base:P1', ['equipment']),
    ...HANDWRITTEN.map((d) => obj(`g-${d}`, d, 'base:P1', ['equipment'])),
    obj('d1', 'BLK', 'discard:P1', ['unit']), obj('d2', 'BLK', 'discard:P1', ['unit']),
  ])

  test('① 🛑★★★★★【前提 + 对照组:三件确实是手写装配规格;百炼触发在;纯资源费用的长剑在候选里】', () => {
    for (const d of HANDWRITTEN) expect(activatedFor(d).length, `★${d} 有手写装配规格(正常装配走得通)`).toBeGreaterThan(0)
                                                  
    const tagged = forgeChoices(s, P1, defHasTag).map((g) => g.oid as string)
    expect(HANDWRITTEN.map((d) => tagged.includes(`g-${d}`)), '★三件都过了武装标签筛').toEqual([true, true, true])
    const cands = forgeCandidates(s)
    expect(cands.length, '📄百炼问到了候选(触发与造景有效)').toBeGreaterThan(0)
    expect(cands, '★对照组:长剑(装配{{红色}},资源费用)在候选里 ⇒ 资源够、候选是真算的').toContain('sword')
  })

  test('② 🔴★★★★★【缺陷 213 已修:三件都在百炼候选里(★1662 现状是 [false, false, false])】', () => {
    const cands = forgeCandidates(s)
    expect(HANDWRITTEN.map((d) => cands.includes(`g-${d}`)), '★★★§821.1.c:有装配费用(含非资源部分)就能选').toEqual([true, true, true])
  })

  test('③ 🔴★★★★★【端到端:选中 → 非资源费用真的付了 → 贴到百炼单位】', () => {
    const t = activeTriggers(s).find((x) => x.id.startsWith('forge:forger:'))!
    const ev = { kind: 'playUnit', unit: asObjId('forger'), player: P1 } as unknown as GameEvent
    const run = (gear: string): { readonly after: GameState; readonly asked: readonly string[] } => {
      const chosen: Record<string, string> = { forge0: gear }
      const second = t.nextChoice?.(s, ev, chosen) as { key: string; candidates: readonly { id: string }[] } | null | undefined
      const asked = second ? second.candidates.map((c) => c.id) : []
      if (second) chosen[second.key] = second.candidates.find((c) => c.id === 'ally')?.id ?? second.candidates[0]!.id
      const evs = (t.effect?.(s, ev, chosen) ?? []) as readonly GameEvent[]
      return { after: applyEvents(s, evs, {}).state, asked }
    }
    const xp = run('g-UNL-158')
    expect(xp.asked, '★牧人的传家宝:消耗经验不用选 ⇒ 不追问').toEqual([])
    expect(xp.after.experience[P1], '★★消耗 1 经验(5 → 4)').toBe(4)
    expect(xp.after.objects[asObjId('g-UNL-158')]?.status.attachedTo, '★★贴到百炼单位').toBe(asObjId('forger'))

    const cleave = run('g-SFD-178')
    expect(cleave.asked, '★破败王者之刃:追问摧毁哪名友方(候选含 ally)').toContain('ally')
    expect(cleave.after.objects[asObjId('ally')]?.zone === asZoneId('base:P1'), '★★ally 被摧毁、离开基地').toBe(false)
    expect(cleave.after.objects[asObjId('g-SFD-178')]?.status.attachedTo, '★★贴到百炼单位').toBe(asObjId('forger'))

    const rites = run('g-SFD-150')
    expect(rites.asked.length, '★临终仪式:追问回收哪两张').toBeGreaterThan(0)
    const discard = rites.after.zones[asZoneId('discard:P1')]?.contents ?? []
    expect(['d1', 'd2'].filter((d) => discard.includes(asObjId(d))), '★★废牌堆两张被回收').toEqual([])
    expect(rites.after.objects[asObjId('g-SFD-150')]?.status.attachedTo, '★★贴到百炼单位').toBe(asObjId('forger'))
  })
})
