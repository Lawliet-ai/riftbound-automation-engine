import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../src/state/ids'
import type { GameObject } from '../src/state/object'
import { actualMightOf, mightOf, readMight } from '../src/state/might'

const unit = (baseMight: number): GameObject => ({
  oid: asObjId('o1'),
  defId: 'U',
  owner: asPlayerId('P1'),
  controller: asPlayerId('P1'),
  zone: asZoneId('battlefield:shared:0'),
  baseMight,
  damage: 0,
  counters: {},
  status: {},
})

describe('might 双读数(§143.2.b / §143.2.b.1,DK-16)', () => {
  test('正战力:两读数相等', () => {
    expect(readMight(5)).toEqual({ actual: 5, reference: 5 })
  })
  test('负战力:实际保留(可负),引用下钳 0', () => {
    expect(readMight(-2)).toEqual({ actual: -2, reference: 0 })
  })
  test('增减用实际值:base3 + 效果层-5 = 实际-2,引用0', () => {
    const u = unit(3)
    expect(actualMightOf(u, -5)).toBe(-2)                        
    expect(mightOf(u, -5)).toEqual({ actual: -2, reference: 0 })               
  })
  test('再叠正效果:实际从-2回到实际值,不因曾钳0而少算', () => {
    const u = unit(3)
                                       
    expect(actualMightOf(u, -5 + 4)).toBe(2)
  })
})
