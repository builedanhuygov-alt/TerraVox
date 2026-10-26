import { NavLink, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard,
  Compass,
  AlertTriangle, 
  Layers, 
  FileText, 
  Sparkles, 
  Settings, 
  Users,
  LogOut,
  LogIn,
  ShieldCheck,
  Flame,
  Map,
  X,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useGeographyStore } from '../store/useGeographyStore'
import { useLang } from '../i18n'
import { currentUser, logout } from '../services/firebase'

export default function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const { activeRegion } = useGeographyStore()
  const { lang, setLang } = useLang()
  const nav = useNavigate()
  const [user, setUser] = useState(currentUser())
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tv_sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev
      try {
        localStorage.setItem('tv_sidebar_collapsed', String(next))
      } catch {}
      return next
    })
  }

  useEffect(() => {
    const syncUser = () => setUser(currentUser())
    window.addEventListener('ecochain-auth', syncUser)
    return () => window.removeEventListener('ecochain-auth', syncUser)
  }, [])

  const navItems = [
    { to: '/', label: 'Command Center', icon: LayoutDashboard, exact: true, tag: 'OPS' },
    { to: '/map', label: 'Map Explorer', icon: Map, tag: 'GIS' },
    { to: '/command', label: 'Wildfire Command', icon: Flame, tag: 'TAC' },
    { to: '/events', label: 'Incidents & Evidence', icon: AlertTriangle, tag: 'CAD' },
    { to: '/what-if', label: 'Risk Analysis', icon: Compass, tag: 'SIM' },
    { to: '/forest', label: 'Environmental Data', icon: Layers, tag: 'SAT' },
    { to: '/community', label: 'Community Reports', icon: Users, tag: 'PUB' },
    { to: '/reports', label: 'Situation Reports', icon: FileText, tag: 'DOC' },
    { to: '#ai-assistant', label: 'AI Assistant', icon: Sparkles, isAi: true, tag: 'AI' },
  ]

  const handleNavClick = (item: typeof navItems[0], e: React.MouseEvent) => {
    if (item.isAi) {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('ecochain-open-ai', { detail: {} }))
      onClose()
      return
    }
    onClose()
  }

  const handleLogout = () => {
    logout()
    setUser(null)
    nav('/')
  }

  return (
    <>
      <aside 
        className={`fixed inset-y-0 left-0 z-40 bg-[#080C12]/95 backdrop-blur-xl border-r border-[rgba(255,255,255,0.08)] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-[68px]' : 'lg:w-64'}`}
      >
        {/* Brand Header */}
        <div className={`p-3.5 flex items-center border-b border-[rgba(255,255,255,0.08)] ${
          isCollapsed ? 'justify-center' : 'justify-between'
        }`}>
          <NavLink to="/" className="flex items-center gap-3 group min-w-0">
            <div className="relative shrink-0">
              <img 
                src="/logo.svg" 
                alt="TERRAVOX" 
                className="w-8 h-8 rounded-lg shadow-md transition-transform duration-200 group-hover:scale-105" 
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#080C12] animate-pulse" />
            </div>
            
            {!isCollapsed && (
              <div className="min-w-0 transition-opacity duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold tracking-tight text-sm text-[#f0fdf4]">TERRAVOX</span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    4.4
                  </span>
                </div>
                <p className="text-[10px] text-[#718579] tracking-tight font-medium truncate">
                  Mission Control &amp; GIS
                </p>
              </div>
            )}
          </NavLink>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={toggleCollapse}
            className={`hidden lg:flex p-1.5 rounded-lg text-[#718579] hover:text-[#f0fdf4] hover:bg-white/5 transition-colors ${
              isCollapsed ? 'mt-2' : ''
            }`}
            title={isCollapsed ? 'Expand Navigation (Rail)' : 'Collapse Navigation (Rail)'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>

          {/* Mobile Close Button */}
          <button 
            onClick={onClose} 
            className="lg:hidden p-1.5 rounded-md text-[#718579] hover:text-[#f0fdf4] hover:bg-white/5"
            aria-label="Close navigation sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Primary Navigation Links */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden">
          {!isCollapsed && (
            <div className="px-3 pb-1 pt-2 text-[10px] font-mono uppercase tracking-wider text-[#5b6f64] font-semibold">
              Operations &amp; GIS
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className="relative group">
                <NavLink
                  to={item.to}
                  end={item.exact ?? false}
                  onClick={(e) => handleNavClick(item, e)}
                  className={({ isActive }) =>
                    `flex items-center rounded-xl text-xs font-medium transition-all duration-150 ${
                      isCollapsed 
                        ? 'justify-center p-2.5 mx-auto' 
                        : 'gap-3 px-3 py-2.5'
                    } ${
                      isActive && !item.isAi
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                        : 'text-[#8b9f94] hover:text-[#f0fdf4] hover:bg-white/5 border border-transparent'
                    }`
                  }
                >
                  <Icon size={17} strokeWidth={2} className="shrink-0" />
                  {!isCollapsed && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}
                  {!isCollapsed && item.tag && (
                    <span className="text-[9px] font-mono text-[#5b6f64] bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                      {item.tag}
                    </span>
                  )}
                </NavLink>

                {/* Sleek Floating Tooltip for Collapsed Rail Mode */}
                {isCollapsed && (
                  <div className="fixed left-[76px] top-auto z-50 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all duration-150 bg-[#0D1117] border border-[rgba(255,255,255,0.12)] shadow-2xl rounded-lg px-2.5 py-1.5 text-xs text-[#f0fdf4] font-medium whitespace-nowrap flex items-center gap-2">
                    <span>{item.label}</span>
                    {item.tag && (
                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
                        {item.tag}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {!isCollapsed && (
            <div className="pt-4 px-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-[#5b6f64] font-semibold">
              System Administration
            </div>
          )}

          <div className="relative group">
            <NavLink
              to="/admin"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center rounded-xl text-xs font-medium transition-all duration-150 ${
                  isCollapsed 
                    ? 'justify-center p-2.5 mx-auto' 
                    : 'gap-3 px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold shadow-xs'
                    : 'text-[#718579] hover:text-[#cbd5d1] hover:bg-white/5 border border-transparent'
                }`
              }
            >
              <Settings size={16} strokeWidth={2} className="shrink-0" />
              {!isCollapsed && (
                <span className="truncate">Administration &amp; Audit</span>
              )}
            </NavLink>

            {isCollapsed && (
              <div className="fixed left-[76px] top-auto z-50 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all duration-150 bg-[#0D1117] border border-[rgba(255,255,255,0.12)] shadow-2xl rounded-lg px-2.5 py-1.5 text-xs text-[#f0fdf4] font-medium whitespace-nowrap">
                Administration &amp; Audit
              </div>
            )}
          </div>
        </nav>

        {/* Bottom Section: Region Selector & Authentication Status */}
        <div className="p-2.5 border-t border-[rgba(255,255,255,0.08)] space-y-2 bg-[#060A0E]/80">
          {/* Pilot Region Indicator */}
          {!isCollapsed ? (
            <div className="w-full flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 text-left">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm leading-none">🇺🇸</span>
                <div className="truncate">
                  <div className="text-xs font-semibold text-[#f0fdf4] truncate">
                    California Pilot
                  </div>
                  <div className="text-[10px] text-[#718579] truncate font-mono">
                    CAL FIRE &amp; NASA FIRMS
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-mono text-emerald-400">
                ACTIVE
              </div>
            </div>
          ) : (
            <div className="relative group flex justify-center py-1">
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm cursor-default">
                🇺🇸
              </div>
              <div className="fixed left-[76px] bottom-16 z-50 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all duration-150 bg-[#0D1117] border border-[rgba(255,255,255,0.12)] shadow-2xl rounded-lg px-2.5 py-1 text-xs text-[#f0fdf4] whitespace-nowrap font-mono">
                California Pilot AOI (NAD83)
              </div>
            </div>
          )}

          {/* User Profile or Public Status */}
          {user ? (
            <div className={`flex items-center p-2 rounded-xl bg-white/5 border border-white/5 ${
              isCollapsed ? 'justify-center' : 'justify-between'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
                {!isCollapsed && (
                  <div className="truncate">
                    <div className="text-xs font-semibold text-[#f0fdf4] truncate">{user.username}</div>
                    <div className="text-[10px] text-emerald-400 font-mono truncate uppercase">{user.role}</div>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-[#718579] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut size={14} />
                </button>
              )}
            </div>
          ) : (
            !isCollapsed ? (
              <div className="p-2 rounded-xl bg-white/5 border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#8b9f94]">
                    <ShieldCheck size={13} className="text-emerald-400" />
                    <span>Public Guest Session</span>
                  </div>
                  <span className="text-[9px] font-mono text-[#5b6f64]">ANON</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#5b6f64]">Open Public Access</span>
                  <NavLink
                    to="/login"
                    className="text-cyan-400 hover:text-cyan-300 underline font-medium"
                  >
                    Admin Sign In
                  </NavLink>
                </div>
              </div>
            ) : (
              <div className="relative group flex justify-center py-1">
                <NavLink to="/login" className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#718579] hover:text-cyan-400 transition-colors">
                  <LogIn size={15} />
                </NavLink>
                <div className="fixed left-[76px] bottom-6 z-50 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all duration-150 bg-[#0D1117] border border-[rgba(255,255,255,0.12)] shadow-2xl rounded-lg px-2.5 py-1 text-xs text-[#f0fdf4] whitespace-nowrap">
                  Admin Sign In
                </div>
              </div>
            )
          )}
        </div>
      </aside>

      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
    </>
  )
}

