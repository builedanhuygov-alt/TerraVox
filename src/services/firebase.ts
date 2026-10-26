/**
 * TERRAVOX Firebase Authentication Integration Service
 * 
 * Provides robust authentication management using Firebase Auth:
 * - Registration, Login, Logout
 * - Password Reset
 * - Email Verification
 * - Session Restoration via onAuthStateChanged
 * - Fail-safe graceful fallback when Firebase credentials are not configured in environment
 * 
 * Strict Compliance:
 * - NEVER hardcode Firebase credentials.
 * - NEVER fake successful authentication when unconfigured.
 * - Fails gracefully with explicit user-friendly diagnostics and setup instructions.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import {
  getAuth,
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  User,
  getIdToken
} from 'firebase/auth'

export interface FirebaseConfigStatus {
  isConfigured: boolean
  missingKeys: string[]
  projectId?: string
  authDomain?: string
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

export function getFirebaseConfigStatus(): FirebaseConfigStatus {
  const missingKeys: string[] = []
  if (!firebaseConfig.apiKey) missingKeys.push('VITE_FIREBASE_API_KEY')
  if (!firebaseConfig.authDomain) missingKeys.push('VITE_FIREBASE_AUTH_DOMAIN')
  if (!firebaseConfig.projectId) missingKeys.push('VITE_FIREBASE_PROJECT_ID')
  if (!firebaseConfig.appId) missingKeys.push('VITE_FIREBASE_APP_ID')

  return {
    isConfigured: missingKeys.length === 0,
    missingKeys,
    projectId: firebaseConfig.projectId || undefined,
    authDomain: firebaseConfig.authDomain || undefined,
  }
}

let app: FirebaseApp | null = null
let auth: Auth | null = null

const status = getFirebaseConfigStatus()
if (status.isConfigured) {
  try {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig)
    auth = getAuth(app)
  } catch (err) {
    console.warn('Firebase initialization error:', err)
    app = null
    auth = null
  }
}

export function isFirebaseConfigured(): boolean {
  return auth !== null
}

export function getFirebaseAuth(): Auth | null {
  return auth
}

/**
 * Register a new operator account via Firebase Auth
 */
export async function registerWithEmailPassword(email: string, pass: string): Promise<User> {
  if (!auth) {
    const missing = getFirebaseConfigStatus().missingKeys.join(', ')
    throw new Error(
      `Firebase Authentication is not configured. Missing environment variables: ${missing}. Please set them in your .env file or use backend database authentication.`
    )
  }
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass)
  // Automatically trigger email verification for newly registered operators
  try {
    await sendEmailVerification(userCredential.user)
  } catch (err) {
    console.warn('Failed to send verification email automatically:', err)
  }
  return userCredential.user
}

/**
 * Sign in an operator account via Firebase Auth
 */
export async function loginWithEmailPassword(email: string, pass: string): Promise<User> {
  if (!auth) {
    const missing = getFirebaseConfigStatus().missingKeys.join(', ')
    throw new Error(
      `Firebase Authentication is not configured. Missing environment variables: ${missing}. Please configure Firebase Console credentials in your .env file.`
    )
  }
  const userCredential = await signInWithEmailAndPassword(auth, email, pass)
  return userCredential.user
}

/**
 * Sign out current operator
 */
export async function logoutFirebase(): Promise<void> {
  if (auth) {
    await signOut(auth)
  }
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('ecogl_firebase_token')
      sessionStorage.removeItem('ecogl_user')
    }
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ecochain-auth'))
  }
}

/**
 * Trigger password reset email
 */
export async function resetPassword(email: string): Promise<void> {
  if (!auth) {
    const missing = getFirebaseConfigStatus().missingKeys.join(', ')
    throw new Error(`Firebase Auth is not configured. Missing: ${missing}`)
  }
  await sendPasswordResetEmail(auth, email)
}

/**
 * Send email verification to active user
 */
export async function sendVerificationEmail(user: User): Promise<void> {
  if (!auth) {
    throw new Error('Firebase Auth is not configured.')
  }
  await sendEmailVerification(user)
}

/**
 * Subscribe to authentication state changes (Session Restoration)
 */
export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  if (!auth) {
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const token = await getIdToken(user)
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('ecogl_firebase_token', token)
          sessionStorage.setItem(
            'ecogl_user',
            JSON.stringify({
              username: user.email || user.displayName || 'Operator',
              role: 'commander',
              emailVerified: user.emailVerified,
              uid: user.uid,
            })
          )
        }
      } catch {}
    } else {
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('ecogl_firebase_token')
        }
      } catch {}
    }
    callback(user)
  })
}

/**
 * Retrieve current valid bearer token for authorized backend API calls
 */
export async function getAuthToken(): Promise<string | null> {
  if (auth && auth.currentUser) {
    try {
      return await getIdToken(auth.currentUser)
    } catch {
      if (typeof sessionStorage !== 'undefined') {
        return sessionStorage.getItem('ecogl_admin_token') || sessionStorage.getItem('ecogl_firebase_token')
      }
      return null
    }
  }
  if (typeof sessionStorage !== 'undefined') {
    return sessionStorage.getItem('ecogl_admin_token') || sessionStorage.getItem('ecogl_firebase_token')
  }
  return null
}

export function currentUser(): { username: string; role: string; emailVerified?: boolean } | null {
  try {
    const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('ecogl_user') : null
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function logout() {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('ecogl_admin_token')
      sessionStorage.removeItem('ecogl_firebase_token')
      sessionStorage.removeItem('ecogl_user')
    }
  } catch {}
  logoutFirebase().catch(() => {})
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ecochain-auth'))
  }
}


