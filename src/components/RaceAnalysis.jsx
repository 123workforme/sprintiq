import {
  BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip
} from 'recharts'
import { deleteRace } from '../utils/localStorage'

const STATUS_COLOR = {
  green: '#22c55e',
  yellow: '#facc15',
  red: '#ef4444',
}

const GRADE_COLOR = {
  S: '#facc15',
  A: '#22c55e',
  B: '#60a5fa',
  C: '#fb923c',
  D: '#ef4444',
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-[#111] border border-white/10 rounded px-3 py-2 text-sm">
      <p className="font-bold text-white">{d.label}</p>
      <p className="text-white/60">{d.time}s ({d.pct}%)</p>
    </div>
  )
}

export default function RaceAnalysis({ race, onBack, onDelete }) {
  if (!race) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-24 text-center">
        <p className="text-white/40">No race selected.</p>
        <button onClick={onBack} className="mt-4 text-yellow-400 text-sm font-semibold">
          Back to Log
        </button>
      </div>
    )
  }

  const { splitFeedback, grade, recommendation, total, distance, date, meet } = race

  const chartData = splitFeedback.map(s => ({
    label: s.label,
    time: s.time,
    pct: s.pct,
    status: s.status,
  }))

  const handleDelete = () => {
    deleteRace(race.id)
    onDelete()
  }

  const formattedDate = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      })
    : ''

  return (
    <div className="max-w-2xl mx-auto px-4 pt-24 pb-12">
      <button
        onClick={onBack}
        className="text-white/40 text-sm font-semibold hover:text-white mb-6 flex items-center gap-1"
      >
        <span>&#8592;</span> Back
      </button>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            {distance}m {meet ? <span className="text-white/40 font-normal text-xl">{meet}</span> : ''}
          </h1>
          <p className="text-white/40 text-sm mt-1">{formattedDate} &middot; {total.toFixed(2)}s total</p>
        </div>
        <div className="text-right">
          <span className="text-5xl font-black" style={{ color: GRADE_COLOR[grade] }}>{grade}</span>
          <p className="text-white/30 text-xs mt-1 uppercase tracking-widest">Grade</p>
        </div>
      </div>

      <div className="mb-8 bg-white/3 rounded-xl p-4">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: '#ffffff60', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#ffffff40', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="time" radius={[4, 4, 0, 0]} maxBarSize={60}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={STATUS_COLOR[entry.status]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3 mb-8">
        {splitFeedback.map((s, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-lg bg-white/3 border border-white/5"
          >
            <span
              className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: STATUS_COLOR[s.status], marginTop: '6px' }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-bold text-white">{s.label}</span>
                <span className="text-white/40 text-sm font-mono">{s.time}s</span>
              </div>
              <p className="text-white/50 text-sm">{s.message}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border border-yellow-400/20 rounded-xl p-4 mb-8 bg-yellow-400/5">
        <p className="text-xs font-semibold text-yellow-400/60 uppercase tracking-widest mb-2">Focus Point</p>
        <p className="text-white/80 text-sm leading-relaxed">{recommendation}</p>
      </div>

      <button
        onClick={handleDelete}
        className="text-red-400/50 text-xs hover:text-red-400 transition-colors"
      >
        Delete this race
      </button>
    </div>
  )
}
