import * as maplibregl from 'maplibre-gl'

/**
 * Ensures MapLibre GL JS web worker is correctly resolved across
 * Vite dev server, production preview, and sandboxed iframes.
 */
export function initMapLibreWorker(): void {
  if (typeof window === 'undefined') return

  try {
    const setWorkerUrl = (maplibregl as any).setWorkerUrl
    if (typeof setWorkerUrl === 'function') {
      // In Vite, files in public/ are served at root
      // Providing the full origin ensures unambiguous resolution in all iframe environments
      const origin = window.location.origin && window.location.origin !== 'null'
        ? window.location.origin
        : ''
      const workerUrl = `${origin}/maplibre-gl-worker.mjs`
      setWorkerUrl(workerUrl)
    }
  } catch (err) {
    console.warn('[TERRAVOX] MapLibre worker init notice:', err)
  }
}

// Auto-run on module evaluation
initMapLibreWorker()
