import { useState, useRef } from 'react'

const ACCEPTED = '.mp4,.mov,.avi,.webm,.mkv'

export default function UploadScreen({ onAnalyze, error }) {
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  const pick = (f) => {
    if (f) setFile(f)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    pick(e.dataTransfer.files[0])
  }

  const sizeMB = file ? (file.size / (1024 * 1024)).toFixed(1) : null

  return (
    <div className="max-w-2xl mx-auto px-4 pt-24 pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-2">Analyze Your Run</h1>
        <p className="text-white/40 text-sm">
          Upload a video of yourself running. MediaPipe Pose extracts biomechanical
          keypoints frame by frame - ankle dorsiflexion, knee flexion, hip drive - and a
          Random Forest model trained on sports medicine literature flags injury risk patterns.
        </p>
      </div>

      <div
        onClick={() => inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`
          cursor-pointer rounded-xl border-2 border-dashed p-10
          flex flex-col items-center justify-center text-center
          ${dragging
            ? 'border-yellow-400 bg-yellow-400/5'
            : file
              ? 'border-yellow-400/40 bg-white/5'
              : 'border-white/20 bg-white/5 hover:border-white/30'}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={e => pick(e.target.files[0])}
        />

        {file ? (
          <>
            <div className="w-12 h-12 rounded-full bg-yellow-400/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-bold text-white mb-2">{file.name}</p>
            <p className="text-white/40 text-sm">{sizeMB} MB &middot; click to change</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <p className="font-semibold text-white mb-1">Drop your video here</p>
            <p className="text-white/30 text-sm">or click to browse &middot; mp4, mov, avi, webm</p>
          </>
        )}
      </div>

      {file && (
        <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10 text-xs text-white/40">
          For best results: film from the side at hip height, full body visible, good lighting.
          Slow-motion (120fps+) improves ground contact detection.
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={() => file && onAnalyze(file)}
        disabled={!file}
        className={`mt-6 w-full py-4 rounded-xl font-bold ${
          file
            ? 'bg-yellow-400 text-black hover:bg-yellow-300'
            : 'bg-white/5 text-white/20 cursor-not-allowed'
        }`}
      >
        Analyze Run
      </button>
    </div>
  )
}
