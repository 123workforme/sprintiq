import { useEffect, useState } from 'react'

const STEPS = [
  'Extracting pose keypoints frame by frame…',
  'Computing ankle dorsiflexion angles…',
  'Measuring knee flexion at ground contact…',
  'Comparing left and right hip drive…',
  'Detecting ground contact timing…',
  'Running injury risk analysis…',
  'Generating recommendations…',
]

export default function LoadingScreen() {
  const [stepIdx, setStepIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setStepIdx(i => (i + 1) % STEPS.length)
    }, 2800)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-4 pt-24 pb-12 flex flex-col items-center text-center">
      {/* Spinner */}
      <div className="relative w-20 h-20 mb-10">
        <div className="absolute inset-0 rounded-full border-2 border-white/5" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-yellow-400 animate-spin" />
        <div className="absolute inset-3 rounded-full border-2 border-transparent border-t-yellow-400/40 animate-spin [animation-duration:1.5s] [animation-direction:reverse]" />
      </div>

      <h1 className="text-2xl font-black tracking-tight mb-3">Analyzing your mechanics</h1>
      <p className="text-white/40 text-sm mb-12">This takes 15–45 seconds depending on video length</p>

      {/* Step indicator */}
      <div className="w-full max-w-sm">
        <p className="text-yellow-400 text-sm font-semibold mb-6 min-h-[20px] transition-all">
          {STEPS[stepIdx]}
        </p>
        <div className="flex gap-1.5 justify-center">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i <= stepIdx ? 'bg-yellow-400' : 'bg-white/10'
              } ${i === stepIdx ? 'w-6' : 'w-2'}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-16 grid grid-cols-3 gap-4 w-full text-center">
        {[
          ['33', 'keypoints tracked'],
          ['every', 'frame analyzed'],
          ['6', 'biomechanical features'],
        ].map(([val, label]) => (
          <div key={label} className="p-4 rounded-xl bg-white/3 border border-white/5">
            <p className="text-xl font-black text-yellow-400">{val}</p>
            <p className="text-white/30 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
