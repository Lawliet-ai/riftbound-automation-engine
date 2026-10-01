import { describe, expect, test } from 'vitest'
import { asPlayerId } from '../../src/state/ids'
import { InteractiveGame } from '../../src/session/interactiveGame'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, handPlaySpecs } from '../../data/registry'
import { servitorCopyDemo } from '../../data/demoScenes'
import { project } from '../../src/net/project'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const DEPS = { getTriggers: activeTriggers, handPlaySpecs }
const BF0 = 'battlefield:shared:0'

                                  
function drainToAction(g: InteractiveGame): void {
  for (let i = 0; i < 40; i++) {
    const p = g.pending()
    if (p.mode === 'action' || p.mode === 'gameover') return
    if (p.mode === 'choice') g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: p.request.candidates[0]!.id })
    else g.apply({ kind: 'PASS', player: p.player })
  }
  throw new Error('链未收敛')
}

function mirrors(g: InteractiveGame): GameObject[] {
                                     
  const servitor = Object.values(g.state.objects).find((o) => o.defId === 'UNL-081')
  const zone = servitor?.zone ?? BF0
  return g.state.zones[zone]!.contents.map((o) => g.state.objects[o]!).filter((o) => o.defId === 'token:映像')
}

describe('赐面守侍 内嵌复制触发(§387-388)', () => {
  test('打赐面守侍→打出触发→内嵌复制触发→2映像变复制体(1[M]待命瞬息)', () => {
    const g = new InteractiveGame(servitorCopyDemo(), DEPS)
                 
    const play = g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT')!
    g.apply(play)
                                   
    drainToAction(g)

    const ms = mirrors(g)
    expect(ms).toHaveLength(2)         
    for (const m of ms) {
      expect(m.derived!.might).toBe(1)                              
      expect(m.derived!.keywords).toContain('待命')
      expect(m.derived!.keywords).toContain('瞬息')
    }
    expect(g.pending()).toEqual({ mode: 'action', player: P1 })
    expect(g.state.chain).toHaveLength(0)
                                                         
    for (const m of ms) expect(m.derived!.copiedDefId).toBe('UNL-081')
    const view = project(g.state, P1)
    for (const m of ms) expect(view.objects[m.oid]!.defId).toBe('UNL-081')             
  })

  test('打出到内嵌复制之间存在反应窗口(非原子):打出触发结算后链上有独立的复制触发项', () => {
    const g = new InteractiveGame(servitorCopyDemo(), DEPS)
    g.apply(g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT')!)
                      
    let p = g.pending()
    expect(p.mode).toBe('window')
                        
    g.apply({ kind: 'PASS', player: P1 })
    g.apply({ kind: 'PASS', player: P2 })
                                              
    p = g.pending()
    expect(p.mode).toBe('window')
    const ms = mirrors(g)
    expect(ms).toHaveLength(2)
    expect(ms.every((m) => (m.derived?.might ?? m.baseMight) === 0)).toBe(true)              
    expect(g.state.chain.some((i) => i.id.includes('embed-copy'))).toBe(true)             
  })
})
