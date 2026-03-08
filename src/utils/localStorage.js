const KEY = 'sprintiq_races'

export const getRaces = () => {
  return JSON.parse(localStorage.getItem(KEY) || '[]')
}

export const saveRace = (race) => {
  const races = getRaces()
  const entry = { ...race, id: Date.now() }
  races.push(entry)
  localStorage.setItem(KEY, JSON.stringify(races))
  return entry
}

export const deleteRace = (id) => {
  const races = getRaces().filter(r => r.id !== id)
  localStorage.setItem(KEY, JSON.stringify(races))
}
