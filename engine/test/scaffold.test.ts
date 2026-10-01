import { expect, test } from 'vitest'
import { ENGINE_VERSION, RULESET_VERSION } from '../src/index'

test('引擎骨架可加载', () => {
  expect(ENGINE_VERSION).toBe('0.0.0')
})

test('规则版本钉死 260717', () => {
  expect(RULESET_VERSION).toBe('260717')
})
