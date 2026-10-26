import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'vi'
export const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English (US)' },
]

const enDict: Record<string, string> = {
  'brand.name': 'TERRAVOX',
  'brand.category': 'Environmental Intelligence Platform',
  'brand.tagline': 'Listen to the Earth. Understand the Signals. Act with Confidence.',
  'nav.main': 'COMMAND & SURVEILLANCE',
  'nav.command': 'Command Center',
  'nav.map': 'Map Explorer',
  'nav.risk': 'Risk Analysis',
  'nav.eco': 'Forest-Fire Early Warning Map',
  'nav.events': 'Thermal Events & Signals',
  'nav.whatif': 'What-If Simulation Lab',
  'nav.missions': 'Field Missions & Dispatch',
  'nav.modules': 'INTELLIGENCE DOMAINS',
  'nav.forest': 'Forestry & Canopy',
  'nav.disaster': 'Disaster Mitigation',
  'nav.agriculture': 'Agriculture & Watershed',
  'nav.carbon': 'Carbon MRV Engine',
  'nav.eudr': 'EUDR Deforestation Due Diligence',
  'nav.twin': 'Environmental Digital Twin',
  'nav.community': 'Field Ranger Network',
  'nav.actions': 'Governance & Interventions',
  'nav.reports': 'Intelligence Reports',
  'nav.settings': 'System Settings',
  'nav.help': 'Technical Docs',
  'nav.adminName': 'Regional Ops Center',
  'hdr.search': 'Search county, ranger station, fire hotspot, GPS...',
  'hdr.live': 'Live Feed',
  'hdr.assistant': 'TERRAVOX AI Copilot',
  'hdr.notif': 'Priority Alerts',
  'hdr.region': 'California, United States',
  'com.title': 'Field Intelligence & Ranger Reports',
  'com.need': 'Pending Verification',
  'com.done': 'Verified',
  'com.all': 'All Reports',
  'com.reload': 'Refresh',
  'com.composerPh': 'Field observation: coordinates, smoke, wind, fuel bed...',
  'com.areaPh': 'Location (e.g., Butte County, Paradise WUI, Sonoma Ridge)',
  'com.post': 'Submit Report',
  'com.confirm': 'Confirm',
  'com.object': 'Dispute',
  'com.details': 'Details',
  'com.photo': 'Field Photo',
  'com.commentPh': 'Field ranger verification notes...',
  'com.fire': 'fire risk',
  'com.village': 'sector',
}

export function tFor(_lang: Lang, key: string): string {
  return enDict[key] ?? key
}

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string }>({
  lang: 'en',
  setLang: () => {},
  t: (k: string) => tFor('en', k),
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    try { localStorage.setItem('terravox_lang', 'en') } catch {}
  }, [])

  return (
    <LangCtx.Provider value={{ lang, setLang: setLangState, t: (k: string) => tFor(lang, k) }}>
      {children}
    </LangCtx.Provider>
  )
}

export const useLang = () => useContext(LangCtx)
