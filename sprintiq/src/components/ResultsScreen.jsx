import { useState, useEffect } from 'react'

const SEVERITY_STYLE = {
  high:   { bar: 'bg-red-500',    badge: 'bg-red-500/10 text-red-400 border-red-500/20',    icon: '⚠' },
  medium: { bar: 'bg-yellow-400', badge: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20', icon: '▲' },
}

const RISK_STYLE = {
  low:    { color: 'text-green-400',  label: 'Low Risk',    ring: 'border-green-400/30' },
  medium: { color: 'text-yellow-400', label: 'Medium Risk', ring: 'border-yellow-400/30' },
  high:   { color: 'text-red-400',    label: 'High Risk',   ring: 'border-red-400/30' },
}

const SIDE_LABEL = { left: 'Left', right: 'Right', bilateral: 'Both sides' }

function FlagCard({ flag }) {
  const s = SEVERITY_STYLE[flag.severity] || SEVERITY_STYLE.medium
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <div className={`h-0.5 w-full ${s.bar}`} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-base mt-0.5">{s.icon}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className={`text-xs px-2 py-1 rounded border ${s.badge}`}>
                {flag.severity.toUpperCase()}
              </span>
              <span className="text-xs px-2 py-1 rounded border border-white/10 text-white/40">
                {SIDE_LABEL[flag.side] || flag.side}
              </span>
            </div>
            <p className="text-white text-sm font-semibold mb-2">{flag.message}</p>
            <p className="text-white/50 text-sm mb-3">{flag.recommendation}</p>
            {flag.citation && (
              <p className="text-white/20 text-xs font-mono border-t border-white/10 pt-2">
                📄 {flag.citation}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/10">
      <span className="text-white/40 text-xs font-mono">{label}</span>
      <span className="text-white/70 text-xs font-mono font-semibold">{value}</span>
    </div>
  )
}

const API = 'https://sprintiq-production-d589.up.railway.app'

function useVideoReady(sessionId) {
  const [videoUrl, setVideoUrl] = useState(null)

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false

    const poll = async () => {
      while (!cancelled) {
        await new Promise(r => setTimeout(r, 2500))
        try {
          const res = await fetch(`${API}/video/${sessionId}/status`)
          const data = await res.json()
          if (data.ready && data.url && !cancelled) {
            setVideoUrl(data.url)
            return
          }
        } catch { /* server still processing */ }
      }
    }
    poll()
    return () => { cancelled = true }
  }, [sessionId])

  return videoUrl
}

export default function ResultsScreen({ result, onReset }) {
  const [showRaw, setShowRaw] = useState(false)
  const { risk_score, risk_level, flags, features, session_id } = result
  const videoUrl = useVideoReady(session_id)
  const rs = RISK_STYLE[risk_level] || RISK_STYLE.medium

  const highFlags  = flags.filter(f => f.severity === 'high')
  const medFlags   = flags.filter(f => f.severity === 'medium')
  const orderedFlags = [...highFlags, ...medFlags]

  return (
    <div className="max-w-2xl mx-auto px-4 pt-24 pb-12">
      <div className={`mb-8 p-5 rounded-xl border ${rs.ring} bg-white/5`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-white/30 uppercase mb-1">Injury Risk Score</p>
            <p className={`text-6xl font-black ${rs.color}`}>{risk_score}</p>
            <p className={`text-sm mt-1 ${rs.color}`}>{rs.label}</p>
          </div>
          <div className="text-right text-white/30 text-xs">
            <p>{features.total_frames} frames analyzed</p>
            <p>{features.duration_s}s @ {features.fps}fps</p>
            <p>{flags.length} {flags.length === 1 ? 'flag' : 'flags'} raised</p>
          </div>
        </div>

        {result.class_probabilities && (
          <div className="space-y-2">
            {[
              { label: 'Low Risk',    key: 'low',    color: 'bg-green-400' },
              { label: 'Medium Risk', key: 'medium', color: 'bg-yellow-400' },
              { label: 'High Risk',   key: 'high',   color: 'bg-red-500' },
            ].map(({ label, key, color }) => {
              const pct = Math.round(result.class_probabilities[key] * 100)
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-white/30 text-xs w-20">{label}</span>
                  <div className="flex-1 h-2 bg-white/10 rounded-full">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-white/40 text-xs">{pct}%</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mb-8">
        <p className="text-sm text-white/30 mb-2">Pose Overlay</p>
        {videoUrl ? (
          <video
            src={videoUrl}
            controls
            loop
            autoPlay
            muted
            playsInline
            className="w-full rounded-xl border border-white/10 bg-black"
          />
        ) : (
          <div className="w-full h-40 rounded-xl border border-white/10 flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-yellow-400/40 border-t-yellow-400 animate-spin" />
            <p className="text-white/30 text-xs">Rendering skeleton overlay…</p>
          </div>
        )}
      </div>

      {orderedFlags.length > 0 ? (
        <div className="space-y-3 mb-8">
          <p className="text-sm text-white/30 mb-3">Findings</p>
          {orderedFlags.map((f, i) => <FlagCard key={i} flag={f} />)}
        </div>
      ) : (
        <div className="mb-8 p-5 rounded-xl border border-green-400/20 bg-green-400/5 text-center">
          <p className="text-green-400 font-bold text-lg mb-1">No flags raised</p>
          <p className="text-white/40 text-sm">Your mechanics look balanced in this clip. Focus on raw speed development.</p>
        </div>
      )}

      <button
        onClick={() => setShowRaw(v => !v)}
        className="w-full py-2 rounded-lg border border-white/10 text-white/30 text-xs mb-3"
      >
        {showRaw ? 'Hide' : 'Show'} raw biomechanical data
      </button>

      {showRaw && (
        <div className="rounded-xl border border-white/10 p-4 mb-8">
          {Object.entries(features).map(([k, v]) => (
            <FeatureRow key={k} label={k} value={typeof v === 'number' ? v.toFixed ? v.toFixed(2) : v : v} />
          ))}
        </div>
      )}

      <button
        onClick={onReset}
        className="w-full py-4 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300"
      >
        Analyze Another Video
      </button>
    </div>
  )
}
