import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import { getSessions, deleteSession } from '../utils/history'

const RISK_COLOR = { low: '#4ade80', medium: '#facc15', high: '#f87171' }
const LEVEL_STYLE = {
  low:    'text-green-400 border-green-400/20 bg-green-400/5',
  medium: 'text-yellow-400 border-yellow-400/20 bg-yellow-400/5',
  high:   'text-red-400 border-red-400/20 bg-red-400/5',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#111] border border-white/10 rounded px-3 py-2 text-sm">
      <p className="text-white/40 text-xs mb-1">{label}</p>
      <p className="font-bold text-white">Risk: {payload[0].value}</p>
      {payload[1] && (
        <p className="text-yellow-400/70 text-xs">Ankle asym: {payload[1].value}°</p>
      )}
    </div>
  )
}

export default function HistoryScreen({ onViewSession }) {
  const [sessions, setSessions] = useState(getSessions)

  const handleDelete = (id, e) => {
    e.stopPropagation()
    deleteSession(id)
    setSessions(getSessions())
  }

  if (sessions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-12">
        <h1 className="text-3xl font-black mb-2">History</h1>
        <p className="text-white/30 text-sm">No sessions yet. Analyze a run to start tracking your progress.</p>
      </div>
    )
  }

  const sorted = [...sessions].sort((a, b) => a.id - b.id)

  const chartData = sorted.map(s => ({
    date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    risk: s.risk_score,
    ankle_asym: s.features?.ankle_asymmetry_peak_deg ?? null,
  }))

  return (
    <div className="max-w-2xl mx-auto px-4 pt-24 pb-12">
      <h1 className="text-3xl font-black mb-8">History</h1>

      {sorted.length >= 2 && (
        <div className="mb-8 space-y-5">
          <div>
            <p className="text-sm text-white/30 mb-2">Risk Score Over Time</p>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#ffffff50', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#ffffff40', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="risk" stroke="#facc15" strokeWidth={2}
                    dot={{ fill: '#facc15', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <p className="text-sm text-white/30 mb-2">
              Ankle Dorsiflexion Asymmetry (°) - lower is better
            </p>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#ffffff50', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#ffffff40', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="ankle_asym" stroke="#60a5fa" strokeWidth={2}
                    dot={{ fill: '#60a5fa', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <p className="text-sm text-white/30 mb-2">Sessions</p>
      <div className="space-y-2">
        {[...sorted].reverse().map(s => (
          <button
            key={s.id}
            onClick={() => onViewSession(s)}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-left"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-white text-lg">{s.risk_score}</span>
                <span className={`text-xs px-2 py-1 rounded border ${LEVEL_STYLE[s.risk_level]}`}>
                  {s.risk_level.toUpperCase()}
                </span>
              </div>
              <p className="text-white/30 text-xs">
                {new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' · '}{s.flags.length} flag{s.flags.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center"
                style={{ borderColor: RISK_COLOR[s.risk_level] }}>
                <span className="text-xs font-black" style={{ color: RISK_COLOR[s.risk_level] }}>
                  {s.risk_score}
                </span>
              </div>
              <button
                onClick={e => handleDelete(s.id, e)}
                className="text-white/20 hover:text-red-400 text-xs px-2 py-1"
              >
                ✕
              </button>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
