const TARGETS = {
  400: [
    { label: '0-100m', green: [24.5, 26.0], yellow: [26.0, 27.0] },
    { label: '100-200m', green: [22.5, 24.0], yellow: [24.0, 25.0] },
    { label: '200-300m', green: [24.0, 25.0], yellow: [25.0, 26.0] },
    { label: '300-400m', green: [26.0, 28.5], yellow: [28.5, 30.0] },
  ],
  200: [
    { label: '0-100m', green: [51.0, 53.0], yellow: [53.0, 55.0] },
    { label: '100-200m', green: [47.0, 49.0], yellow: [45.0, 47.0] },
  ],
  100: [
    { label: '0-50m', green: [55.0, 58.0], yellow: [58.0, 60.0] },
    { label: '50-100m', green: [42.0, 45.0], yellow: [45.0, 47.0] },
  ],
}

const MESSAGES = {
  400: {
    0: {
      green: 'Solid start off the blocks.',
      yellow: 'Start was slightly off target.',
      red_fast: 'First 100 was too aggressive, this cost you later.',
      red_slow: 'Too conservative out of the blocks, you left time on the table.',
    },
    1: {
      green: 'Peak velocity phase was on point.',
      yellow: 'Speed phase was slightly off optimal.',
      red_fast: 'You went out too hard at 100m, this is where most of your race fell apart.',
      red_slow: 'You never hit full gear, acceleration carried too far into this phase.',
    },
    2: {
      green: 'Held your speed through 200m well.',
      yellow: 'Minor fade at 200m, manageable.',
      red_fast: 'Energy system gave out early, the 300m wall hit hard.',
      red_slow: 'Unusual slowdown at 300m, something technical broke down here.',
    },
    3: {
      green: 'Strong finish, held your form through the line.',
      yellow: 'Slight fade at the end but within range.',
      red_fast: 'The final 100 cost you significantly, first half was too fast.',
      red_slow: 'Unusual pace drop at the end, likely a mechanical issue.',
    },
  },
  200: {
    0: {
      green: 'Curve was well managed.',
      yellow: 'Curve split was slightly high.',
      red_fast: 'Curve was too conservative, you left the straight with nothing to build on.',
      red_slow: 'Curve was too aggressive, common cause of dying on the straight.',
    },
    1: {
      green: 'Straight was strong, speed held.',
      yellow: 'Slight drop on the straight.',
      red_fast: 'The straight speed dropped sharply, your curve hurt you.',
      red_slow: 'You came off the curve with too much speed and ran out of gas.',
    },
  },
  100: {
    0: {
      green: 'Drive phase was efficient.',
      yellow: 'Acceleration phase was slightly long.',
      red_fast: 'Drive phase was short, you hit top speed too early.',
      red_slow: 'Drive phase dragged too long, max velocity came late.',
    },
    1: {
      green: 'Top end speed was excellent.',
      yellow: 'Slight deceleration in the second half.',
      red_fast: 'Significant deceleration in the second half, drive phase was rushed.',
      red_slow: 'Speed phase underperformed relative to your start.',
    },
  },
}

const RECOMMENDATIONS = {
  400: {
    0: {
      red_fast: 'Drill race-pace 200s at controlled effort to build patience off the line.',
      red_slow: 'Work on block starts and acceleration mechanics to build a sharper first step.',
    },
    1: {
      red_fast: 'Focus on pace discipline through 150m, your body wants to go faster than it should.',
      red_slow: 'Add 100-150m acceleration runs to sharpen your speed transition.',
    },
    2: {
      red_fast: 'Build lactate tolerance with 300m repeats at race pace to push your wall back past 200m.',
      red_slow: 'Record your form at 250m and look for a technical breakdown, something mechanical is happening here.',
    },
    3: {
      red_fast: 'Run practice 400s at 10% above race pace first 200m to train your body to handle the fatigue.',
      red_slow: 'Focus on relaxing your upper body through the final straight, tension kills speed when you are tired.',
    },
  },
  200: {
    0: {
      red_fast: 'Practice curve relaxation drills, an overly tense curve bleeds speed.',
      red_slow: 'Run isolated 100m curve efforts at race pace to build curve-specific speed.',
    },
    1: {
      red_fast: 'Reduce curve pace by 2-3% and redirect that energy to the straight.',
      red_slow: 'Add 120m fly runs at max effort to build straight-line top speed.',
    },
  },
  100: {
    0: {
      red_fast: 'Extend your drive phase angle to 45 degrees and stay low through 30m.',
      red_slow: 'Shorten your drive phase and transition to upright mechanics around 20-25m.',
    },
    1: {
      red_fast: 'Practice deceleration runs to train max-velocity maintenance from 50-100m.',
      red_slow: 'Add resisted sled pulls at 80-90% effort to build top-speed power output.',
    },
  },
}

const getSplitStatus = (pct, target) => {
  const [gLow, gHigh] = target.green
  const [yLow, yHigh] = target.yellow

  if (pct >= gLow && pct <= gHigh) return 'green'

  if (target.yellow[0] > target.green[1]) {
    if (pct > gHigh && pct <= yHigh) return 'yellow'
    if (pct < gLow && pct >= yLow) return 'yellow'
  } else {
    if (pct < gLow && pct >= yLow) return 'yellow'
    if (pct > gHigh && pct <= yHigh) return 'yellow'
  }

  return 'red'
}

const getRedDirection = (pct, target) => {
  const mid = (target.green[0] + target.green[1]) / 2
  return pct < mid ? 'red_slow' : 'red_fast'
}

const gradeFromStatuses = (statuses) => {
  const reds = statuses.filter(s => s === 'red').length
  const yellows = statuses.filter(s => s === 'yellow').length

  if (reds === 0 && yellows === 0) return 'S'
  if (reds === 0 && yellows <= 2) return 'A'
  if (reds === 0) return 'B'
  if (reds === 1) return 'C'
  return 'D'
}

export const analyzeRace = (distance, splits) => {
  const total = splits.reduce((a, b) => a + b, 0)
  const targets = TARGETS[distance]
  const messages = MESSAGES[distance]
  const recs = RECOMMENDATIONS[distance]

  const splitFeedback = splits.map((t, i) => {
    const pct = (t / total) * 100
    const status = getSplitStatus(pct, targets[i])
    const key = status === 'red' ? getRedDirection(pct, targets[i]) : status
    return {
      label: targets[i].label,
      time: t,
      pct: Math.round(pct * 10) / 10,
      status,
      message: messages[i][key],
    }
  })

  const statuses = splitFeedback.map(s => s.status)
  const grade = gradeFromStatuses(statuses)

  const worstIndex = splitFeedback.reduce((worst, s, i) => {
    const rank = { red: 2, yellow: 1, green: 0 }
    return rank[s.status] > rank[splitFeedback[worst].status] ? i : worst
  }, 0)

  const worstStatus = splitFeedback[worstIndex].status
  let recommendation = 'Your pacing was clean across the board. Focus on raw speed development now.'

  if (worstStatus === 'red' || worstStatus === 'yellow') {
    const dir = getRedDirection(splitFeedback[worstIndex].pct, targets[worstIndex])
    recommendation = recs[worstIndex]?.[dir] || recommendation
  }

  return { splitFeedback, grade, recommendation, total }
}
