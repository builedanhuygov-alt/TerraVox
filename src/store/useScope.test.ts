import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useScope } from './useScope'

describe('useScope', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ([]) })))
    useScope.setState({
      scope: { province: 'California', role: 'province' },
      communes: ['Butte County Sector', 'Plumas Sector'],
      villages: [],
      loaded: true,
    })
  })

  it('starts at province scope', () => {
    const { scope } = useScope.getState()
    expect(scope.role).toBe('province')
  })

  it('setCommune narrows role', () => {
    useScope.getState().setCommune('Plumas Sector')
    const { scope } = useScope.getState()
    expect(scope.role).toBe('commune')
    expect(scope.commune).toBe('Plumas Sector')
  })

  it('setCommune(undefined) resets to province', () => {
    useScope.getState().setCommune('Plumas Sector')
    useScope.getState().setCommune(undefined)
    const { scope, villages } = useScope.getState()
    expect(scope.role).toBe('province')
    expect(villages).toEqual([])
  })

  it('setArea routes real communes to commune scope with coords', () => {
    useScope.getState().setArea('Butte County Sector', 39.75, -121.55)
    const { scope } = useScope.getState()
    expect(scope.role).toBe('commune')
    expect(scope.lat).toBe(39.75)
  })

  it('setArea keeps unknown names as focus labels, never crashes', () => {
    useScope.getState().setArea('Unknown Location')
    expect(useScope.getState().scope.village).toBe('Unknown Location')
  })

  it('loadHierarchy is idempotent once loaded', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    await useScope.getState().loadHierarchy()
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
