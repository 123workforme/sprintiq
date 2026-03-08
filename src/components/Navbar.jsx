export default function Navbar({ view, setView }) {
  const tabs = [
    { id: 'entry', label: 'Log Race' },
    { id: 'tracker', label: 'PR Tracker' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0a0a0a]">
      <div className="max-w-2xl mx-auto px-4 flex items-center justify-between h-14">
        <span className="font-black tracking-tight text-lg text-yellow-400">SPRINTIQ</span>
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`px-4 py-1.5 rounded text-sm font-semibold transition-colors ${
                view === tab.id
                  ? 'bg-yellow-400 text-black'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
