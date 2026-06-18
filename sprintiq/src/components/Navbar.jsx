export default function Navbar({ view, setView }) {
  const tabs = [
    { id: 'upload',  label: 'Analyze' },
    { id: 'history', label: 'History' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0a0a0a]">
      <div className="max-w-2xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-baseline gap-2.5">
          <span className="font-black text-lg text-yellow-400">SPRINTIQ</span>
          <span className="text-white/20 text-xs uppercase hidden sm:block">
            Running Injury Prevention
          </span>
        </div>
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`px-4 py-2 rounded text-sm ${
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
