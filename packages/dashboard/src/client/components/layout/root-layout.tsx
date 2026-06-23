import { Outlet } from 'react-router-dom'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { NebulaBackground } from '../three/NebulaBackground'

export function RootLayout() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#030305' }}>
      <NebulaBackground opacity={0.45} />

      <div className="relative z-10 flex h-full">
        <Sidebar />
      </div>
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
