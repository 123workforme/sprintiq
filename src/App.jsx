import { useState } from 'react'
import Navbar from './components/Navbar'
import SplitEntry from './components/SplitEntry'
import RaceAnalysis from './components/RaceAnalysis'
import PRTracker from './components/PRTracker'

export default function App() {
  const [view, setView] = useState('entry')
  const [selectedRace, setSelectedRace] = useState(null)

  const handleSave = (race) => {
    setSelectedRace(race)
    setView('analysis')
  }

  const handleViewRace = (race) => {
    setSelectedRace(race)
    setView('analysis')
  }

  const handleDeleteRace = () => {
    setSelectedRace(null)
    setView('tracker')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar view={view} setView={setView} />
      {view === 'entry' && <SplitEntry onSave={handleSave} />}
      {view === 'analysis' && (
        <RaceAnalysis
          race={selectedRace}
          onBack={() => setView('entry')}
          onDelete={handleDeleteRace}
        />
      )}
      {view === 'tracker' && <PRTracker onViewRace={handleViewRace} />}
    </div>
  )
}
