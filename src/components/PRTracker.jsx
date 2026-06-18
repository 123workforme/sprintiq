import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid
} from 'recharts'
import { getRaces } from '../utils/localStorage'

const GRADE_COLOR = {
  S: '#facc15',
  A: '#22c55e',
  B: '#60a5fa',
  C: '#fb923c',
  D: '#ef4444',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#111] border border-white/10 rounded px-3 py-2 text-sm">
      <p className="text-white/50 text-xs mb-1">{label}</p>
      <p className="font-bold text-white">{payload[0].value.toFixed(2)}s</p>
    </div>
  )
}

export default function PRTracker({ onViewRace }) {
  const races = getRaces()

  if (races.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-12">
        <h1 className="text-3xl font-black tracking-tight mb-2">PR Tracker</h1>
        <p className="text-white/30 text-sm">No races logged yet. Log your first race to start tracking.</p>
      </div>
    )
  }

  const byDistance = { 100: [], 200: [], 400: [] }
  races.forEach(r => {
    if (byDistance[r.distance]) byDistance[r.distance].push(r)
  })

  Object.keys(byDistance).forEach(d => {
    byDistance[d].sort((a, b) => new Date(a.date) - new Date(b.date))
  })

  const PRs = {}
  Object.entries(byDistance).forEach(([d, list]) => {
    if (list.length) {
      PRs[d] = list.reduce((best, r) => r.total < best.total ? r : best)
    }
  })

  const chart400 = byDistance[400].map(r => ({
    date: new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    total: r.total,
  }))

  const distances = [400, 200, 100].filter(d => byDistance[d].length > 0)

  return (
    <div className="max-w-2xl mx-auto px-4 pt-24 pb-12">
      <h1 className="text-3xl font-black tracking-tight mb-8">PR Tracker</h1>

      <div className="grid grid-cols-3 gap-3 mb-10">
        {[100, 200, 400].map(d => (
          <div
            key={d}
            className={`p-4 rounded-xl border ${PRs[d] ? 'border-yellow-400/20 bg-yellow-400/5' : 'border-white/5 bg-white/3'}`}
          >
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-1">{d}m PR</p>
            {PRs[d] ? (
              <>
                <p className="text-2xl font-black text-yellow-400">{PRs[d].total.toFixed(2)}</p>
                <p className="text-white/30 text-xs mt-1">
                  {new Date(PRs[d].date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </p>
              </>
            ) : (
              <p className="text-white/20 text-sm">No races</p>
            )}
          </div>
        ))}
      </div>

      {chart400.length >= 2 && (
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-4">400m Progression</h2>
          <div className="bg-white/3 rounded-xl p-4">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chart400} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#ffffff50', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#ffffff40', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#facc15"
                  strokeWidth={2}
                  dot={{ fill: '#facc15', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {distances.map(d => (
          <div key={d}>
            <h2 className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-3">{d}m Races</h2>
            <div className="space-y-2">
              {[...byDistance[d]].reverse().map(race => (
                <button
                  key={race.id}
                  onClick={() => onViewRace(race)}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-white/3 border border-white/5 hover:border-white/15 transition-colors text-left"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{race.total.toFixed(2)}s</span>
                      {PRs[d]?.id === race.id && (
                        <span className="text-[10px] font-bold bg-yellow-400 text-black px-1.5 py-0.5 rounded">PR</span>
                      )}
                      {race.meet && (
                        <span className="text-white/40 text-sm">{race.meet}</span>
                      )}
                    </div>
                    <p className="text-white/30 text-xs mt-0.5">
                      {new Date(race.date + 'T00:00:00').toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </p>
                  </div>
                  <span
                    className="text-xl font-black"
                    style={{ color: GRADE_COLOR[race.grade] }}
                  >
                    {race.grade}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
