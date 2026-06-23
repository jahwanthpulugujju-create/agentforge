import { Outlet } from 'react-router-dom'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { NeuralBackground } from '../three/NeuralBackground'

export function RootLayout() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#030712' }}>
      <NeuralBackground opacity={0.55} />

      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 212, 255, 0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 255, 0.025) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: 'radial-gradient(ellipse 80% 40% at 50% -10%, rgba(0, 212, 255, 0.06) 0%, transparent 70%)',
        }}
      />

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
