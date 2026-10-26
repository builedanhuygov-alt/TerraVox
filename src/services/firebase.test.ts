import { describe, expect, it } from 'vitest'
import {
  getFirebaseConfigStatus,
  isFirebaseConfigured,
  registerWithEmailPassword,
  loginWithEmailPassword,
  resetPassword,
  logoutFirebase
} from './firebase'

describe('firebase authentication service', () => {
  it('reports configuration status with diagnostic keys', () => {
    const status = getFirebaseConfigStatus()
    expect(typeof status.isConfigured).toBe('boolean')
    expect(Array.isArray(status.missingKeys)).toBe(true)
  })

  it('fails gracefully and informatively when unconfigured without crashing or faking success', async () => {
    if (!isFirebaseConfigured()) {
      await expect(
        registerWithEmailPassword('test@calfire.ca.gov', 'password123')
      ).rejects.toThrow('Firebase Authentication is not configured')

      await expect(
        loginWithEmailPassword('test@calfire.ca.gov', 'password123')
      ).rejects.toThrow('Firebase Authentication is not configured')

      await expect(
        resetPassword('test@calfire.ca.gov')
      ).rejects.toThrow('Firebase Auth is not configured')
    }
  })

  it('logout succeeds cleanly without throwing', async () => {
    await expect(logoutFirebase()).resolves.toBeUndefined()
  })
})
