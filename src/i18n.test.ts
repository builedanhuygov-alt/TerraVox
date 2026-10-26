import { describe, expect, it } from 'vitest'
import { LANGS, tFor } from './i18n'

describe('i18n', () => {
  it('supports English as default and primary', () => {
    expect(LANGS.map(l => l.id)).toEqual(['en'])
  })

  it('returns localized English strings and echoes unknown keys', () => {
    expect(tFor('en', 'com.post')).toBe('Submit Report')
    expect(tFor('vi', 'com.post')).toBe('Submit Report')
    expect(tFor('en', 'hdr.search')).toBe('Search county, ranger station, fire hotspot, GPS...')
    expect(tFor('en', 'no.such.key')).toBe('no.such.key')
  })
})
