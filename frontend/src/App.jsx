import React from 'react'
import ChatBox from './components/ChatBox'
import StarField from './components/StarField'
import Globe3D from './components/Globe3D'

function App() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <StarField />
      <Globe3D />

      {/* 顶部导航栏 */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-panel-bg border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-tech-blue via-tech-cyan to-tech-purple bg-clip-text text-transparent">
            🌍 GitHub Repo Q&A
          </h1>
        </div>
      </nav>

      {/* 主内容区 */}
      <main className="relative z-10 pt-24 pb-32 px-4">
        <ChatBox />
      </main>
    </div>
  )
}

export default App
