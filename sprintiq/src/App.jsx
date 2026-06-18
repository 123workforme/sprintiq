import { useState } from 'react'
import Navbar from './components/Navbar'
import UploadScreen from './components/UploadScreen'
import LoadingScreen from './components/LoadingScreen'
import ResultsScreen from './components/ResultsScreen'
import HistoryScreen from './components/HistoryScreen'
import { analyzeVideo } from './utils/api'
import { saveSession } from './utils/history'

export default function App() {
  const [view, setView] = useState('upload')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleAnalyze = async (file) => {
    setError('')
    setView('loading')
    try {
      const data = await analyzeVideo(file)
      saveSession(data)
      setResult(data)
      setView('results')
    } catch (e) {
      setError(e.message || 'Analysis failed. Make sure the backend server is running.')
      setView('upload')
    }
  }

  const handleReset = () => {
    setResult(null)
    setError('')
    setView('upload')
  }

  const handleViewSession = (session) => {
    setResult(session)
    setView('results')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar view={view} setView={setView} />
      {view === 'upload'   && <UploadScreen onAnalyze={handleAnalyze} error={error} />}
      {view === 'loading'  && <LoadingScreen />}
      {view === 'results'  && <ResultsScreen result={result} onReset={handleReset} onBack={() => setView('upload')} />}
      {view === 'history'  && <HistoryScreen onViewSession={handleViewSession} />}
    </div>
  )
}
