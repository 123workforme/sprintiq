import { useState } from 'react'
import { getTargetSplits } from '../utils/pacingModel'

const SPLIT_COUNT = { 400: 4, 200: 2, 100: 2 }

export default function GoalPlanner() {
  const [distance, setDistance] = useState(400)
  const [goalTime, setGoalTime] = useState('')
  const [splits, setSplits] = useState(null)
  const [error, setError] = useState('')

  const handleDistanceChange = (d) => {
    setDistance(d)
    setSplits(null)
    setError('')
  }

  const handleCalculate = (e) => {
    e.preventDefault()
    const t = parseFloat(goalTime)
    if (!goalTime || isNaN(t) || t <= 0) {
      setError('Enter a valid goal time in seconds')
      return
    }
    const minTime = { 400: 40, 200: 18, 100: 9 }
    const maxTime = { 400: 120, 200: 60, 100: 30 }
    if (t < minTime[distance] || t > maxTime[distance]) {
      setError(`Enter a realistic ${distance}m time`)
      return
    }
    setError('')
    setSplits(getTargetSplits(distance, t))
  }

  const placeholder = { 400: '48.00', 200: '22.50', 100: '10.80' }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-24 pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight mb-1">Goal Planner</h1>
        <p className="text-white/40 text-sm">Enter a goal time and get the optimal split targets to run it.</p>
      </div>

      <form onSubmit={handleCalculate} className="space-y-6 mb-8">
        <div>
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">
            Distance
          </label>
          <div className="flex gap-3">
            {[100, 200, 400].map(d => (
              <button
                key={d}
                type="button"
                onClick={() => handleDistanceChange(d)}
                className={`flex-1 py-3 rounded font-bold text-lg transition-colors ${
                  distance === d
                    ? 'bg-yellow-400 text-black'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {d}m
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
            Goal Time (seconds)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={goalTime}
            onChange={e => { setGoalTime(e.target.value); setSplits(null); setError('') }}
            placeholder={placeholder[distance]}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-white text-sm font-mono placeholder:text-white/20 focus:outline-none focus:border-yellow-400/60"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          className="w-full py-3.5 rounded font-bold text-base bg-yellow-400 text-black hover:bg-yellow-300 transition-colors"
        >
          Calculate Splits
        </button>
      </form>

      {splits && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
            Target Splits - {parseFloat(goalTime).toFixed(2)}s {distance}m
          </p>
          {splits.map((s, i) => {
            const goalSeconds = parseFloat(goalTime)
            const greenLow = (s.greenRange[0] / 100) * goalSeconds
            const greenHigh = (s.greenRange[1] / 100) * goalSeconds
            return (
              <div
                key={i}
                className="p-4 rounded-xl bg-white/3 border border-white/5 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-sm font-semibold text-white mb-0.5">{s.label}</p>
                  <p className="text-white/40 text-xs">
                    Green zone: {greenLow.toFixed(2)}s – {greenHigh.toFixed(2)}s
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-black text-yellow-400 font-mono">{s.time.toFixed(2)}</p>
                  <p className="text-white/30 text-xs">{s.pct}% of race</p>
                </div>
              </div>
            )
          })}

          <div className="mt-6 border border-white/5 rounded-xl p-4 bg-white/2">
            <p className="text-xs text-white/30 leading-relaxed">
              Targets are based on elite pacing ratios from IAAF biomechanical research.
              The green zone shows the range considered optimal at this distance.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
