import { test } from 'node:test'
import assert from 'node:assert/strict'
import { containsScore, fold, fuzzyScore } from '../src/lib/fuzzy.ts'

test('fold strips case and diacritics', () => {
  assert.equal(fold('Übungsblatt ÄÖ'), 'ubungsblatt ao')
})

test('substring beats word-initial beats nothing', () => {
  const sub = fuzzyScore('stat', 'Statistik II')
  const initials = fuzzyScore('s2', 'Statistik 2')
  assert.ok(sub > 1000)
  assert.ok(initials > 0 && initials < sub)
  assert.equal(fuzzyScore('xyz', 'Statistik II'), 0)
})

test('word starts match, mid-word scatter does not', () => {
  assert.ok(fuzzyScore('lw', 'Lena Weber') > 0)
  assert.ok(fuzzyScore('ub4', 'Übungsblatt 4') > 0)
  assert.equal(fuzzyScore('tsi', 'Statistik'), 0)
})

test('all query words in any order', () => {
  assert.ok(fuzzyScore('weber lena', 'Lena Weber') > 0)
})

test('empty query matches everything weakly; containsScore is plain substring', () => {
  assert.equal(fuzzyScore('  ', 'x'), 1)
  assert.ok(containsScore('lern', 'Lerngruppe Statistik') > 0)
  assert.equal(containsScore('lg', 'Lerngruppe'), 0)
})
