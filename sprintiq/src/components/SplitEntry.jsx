import { useState } from 'react'
import { analyzeRace } from '../utils/pacingModel'
import { saveRace } from '../utils/localStorage'

const SPLIT_LABELS = {
  400: ['0-100m', '100-200m', '200-300m', '300-400m'],
  200: ['0-100m (curve)', '100-200m (straight)'],
  100: ['0-50m (drive)', '50-100m (speed)'],
}

const SPLIT_COUNT = { 400: 4, 200: 2, 100: 2 }

export default function SplitEntry({ onSave }) {
  const [distance, setDistance] = useState(400)
  const [date, setDate] = useState('')
  const [meet, setMeet] = useState('')
  const [splits, setSplits] = useState(['', '', '', ''])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSplitChange = (i, val) => {
    const updated = [...splits]
    updated[i] = val
    setSplits(updated)
  }

  const handleDistanceChange = (d) => {
    setDistance(d)
    setSplits(['', '', '', ''])
    setError('')
  }

  const validate = () => {
    const count = SPLIT_COUNT[distance]
    for (let i = 0; i < count; i++) {
      const val = parseFloat(splits[i])
      if (!splits[i] || isNaN(val) || val <= 0) {
        return `Enter a valid time for ${SPLIT_LABELS[distance][i]}`
      }
    }
    if (!date) return 'Select a race date'
    return null
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const err = validate()
    if (err) {
      setError(err)
      return
    }

    const count = SPLIT_COUNT[distance]
    const parsedSplits = splits.slice(0, count).map(parseFloat)
    const analysis = analyzeRace(distance, parsedSplits)

    const race = saveRace({
      distance,
      date,
      meet: meet.trim() || null,
      splits: parsedSplits,
      ...analysis,
    })

    setSuccess(true)
    setTimeout(() => {
      setSuccess(false)
      setSplits(['', '', '', ''])
      setMeet('')
      setDate('')
      onSave(race)
    }, 600)
  }

  const count = SPLIT_COUNT[distance]

  return (
    <div className="max-w-2xl mx-auto px-4 pt-24 pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight mb-1">Log a Race</h1>
        <p className="text-white/40 text-sm">Enter your split times and get instant feedback on your pacing.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400/60"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
              Meet Name
            </label>
            <input
              type="text"
              value={meet}
              onChange={e => setMeet(e.target.value)}
              placeholder="Optional"
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-yellow-400/60"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">
            Splits (seconds)
          </label>
          <div className="grid grid-cols-2 gap-3">
            {SPLIT_LABELS[distance].slice(0, count).map((label, i) => (
              <div key={i}>
                <label className="block text-xs text-white/40 mb-1.5">{label}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={splits[i]}
                  onChange={e => handleSplitChange(i, e.target.value)}
                  placeholder="00.00"
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 text-white text-sm font-mono placeholder:text-white/20 focus:outline-none focus:border-yellow-400/60"
                />
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <button
          type="submit"
          className={`w-full py-3.5 rounded font-bold text-base transition-all ${
            success
              ? 'bg-green-500 text-white'
              : 'bg-yellow-400 text-black hover:bg-yellow-300'
          }`}
        >
          {success ? 'Saved' : 'Analyze Race'}
        </button>
      </form>
    </div>
  )
}
