const API_URL = 'http://localhost:8000'

export async function analyzeVideo(file) {
  const formData = new FormData()
  formData.append('video', file)

  const response = await fetch(`${API_URL}/analyze`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || `Server error ${response.status}`)
  }

  return response.json()
}
