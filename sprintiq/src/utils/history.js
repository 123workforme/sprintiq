const KEY = 'sprintiq_sessions'

export const getSessions = () =>
  JSON.parse(localStorage.getItem(KEY) || '[]')

export const saveSession = (result) => {
  const sessions = getSessions()
  const entry = {
    id: Date.now(),
    date: new Date().toISOString(),
    session_id: result.session_id,
    risk_score: result.risk_score,
    risk_level: result.risk_level,
    class_probabilities: result.class_probabilities,
    top_contributors: result.top_contributors,
    flags: result.flags,
    features: result.features,
  }
  sessions.push(entry)
  localStorage.setItem(KEY, JSON.stringify(sessions))
  return entry
}

export const updateSessionVideoUrl = (sessionId, videoUrl) => {
  const sessions = getSessions().map(s =>
    s.session_id === sessionId ? { ...s, video_url: videoUrl } : s
  )
  localStorage.setItem(KEY, JSON.stringify(sessions))
}

export const deleteSession = (id) => {
  const sessions = getSessions().filter(s => s.id !== id)
  localStorage.setItem(KEY, JSON.stringify(sessions))
}
