import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const isMapRoute = location.pathname === '/command' || location.pathname === '/map'
  const isCommandCenter = location.pathname === '/' || location.pathname === '/dashboard' || location.pathname === '/command-center'

  return (
    <div className="flex min-h-screen bg-[#07090E] text-[#e6ede9]">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header onMenu={() => setMobileOpen(true)} />
        <main className={
          isMapRoute
            ? 'flex-1 w-full relative overflow-hidden flex flex-col'
            : isCommandCenter
            ? 'flex-1 p-3 lg:p-4 xl:p-5 max-w-[1740px] w-full mx-auto overflow-y-auto overflow-x-hidden'
            : 'flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto overflow-y-auto overflow-x-hidden'
        }>
          {children}
        </main>
      </div>
    </div>
  )
}

