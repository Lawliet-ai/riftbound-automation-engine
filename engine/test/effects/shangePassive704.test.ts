import { afterEach, describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { recomputeContinuous, type StaticEffect } from '../../src/effects/continuousView'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'

                                                    
                                                        
                            
                                                  

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const unit = (oid: string, defId: string, might: number): GameObject => ({
  oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(BF0),
  baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as GameObject)
const gear = (oid: string, defId: string, host: string): GameObject => ({
  oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(BF0),
  baseMight: 0, baseKeywords: [], baseTypes: ['equipment'], damage: 0, counters: {},
  status: { attachedTo: asObjId(host) },
} as GameObject)
const discarded = (oid: string): GameObject => ({
  oid: asObjId(oid), defId: 'X', owner: P1, controller: P1, zone: asZoneId(`discard:${P1}`),
  baseMight: 0, baseKeywords: [], baseTypes: ['spell'], damage: 0, counters: {}, status: {},
} as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

afterEach(() => setCardPassiveProvider(null))

describe('★★★★★★★ 尚歌复制被动(QA L227 蒙多案例)', () => {
  test('★★★★★★印刷6+废1 ⇒ 被动+1;贴一尚歌 ⇒ 复制份再+1 = 8;无尚歌=7;两尚歌=9', () => {
                                                                                       
    setCardPassiveProvider((o, s) => o.defId === 'OGN-109'
      ? [{
          id: `OGN-109:discardMight:${o.oid as string}`, duration: 'permanent', fromPassive: true,
          predicate: (x: GameObject) => x.oid === o.oid,
          modification: { kind: 'addMight', delta: (s.zones[`discard:${P1}` as never]?.contents ?? []).length },
        } as unknown as StaticEffect]
      : [])
    const mundo = unit('md', 'OGN-109', 6)
    const base = [mundo, discarded('d1')]
    const plain = recomputeContinuous(scene(base)).objects[asObjId('md')]!
    expect(plain.derived!.might, '★无尚歌:6+1=7').toBe(7)
    const one = recomputeContinuous(scene([...base, gear('s1', 'SFD-059', 'md')])).objects[asObjId('md')]!
    expect(one.derived!.might, '★★QA L227:一尚歌复制被动一份 ⇒ 6+1+1=8').toBe(8)
    const two = recomputeContinuous(scene([...base, gear('s1', 'SFD-059', 'md'), gear('s2', 'SFD-059', 'md')])).objects[asObjId('md')]!
    expect(two.derived!.might, '★两尚歌 ⇒ 6+1+1+1=9').toBe(9)
  })

  test('★★★★★★反例:别的武装不复制;贴别人身上的尚歌不算;无被动的单位贴尚歌无事', () => {
    setCardPassiveProvider((o, s) => o.defId === 'OGN-109'
      ? [{
          id: `OGN-109:discardMight:${o.oid as string}`, duration: 'permanent', fromPassive: true,
          predicate: (x: GameObject) => x.oid === o.oid,
          modification: { kind: 'addMight', delta: (s.zones[`discard:${P1}` as never]?.contents ?? []).length },
        } as unknown as StaticEffect]
      : [])
    const mundo = unit('md', 'OGN-109', 6)
    const other = unit('ot', 'U-plain', 3)
    const s = scene([mundo, other, discarded('d1'), gear('x1', 'SFD-090', 'md'), gear('s1', 'SFD-059', 'ot')])
    const v = recomputeContinuous(s)
    expect(v.objects[asObjId('md')]!.derived!.might, '★SFD-090 不是尚歌 ⇒ 6+1=7').toBe(7)
    expect(v.objects[asObjId('ot')]!.derived!.might, '★无被动的单位贴尚歌 ⇒ 印刷不变').toBe(3)
  })
})
