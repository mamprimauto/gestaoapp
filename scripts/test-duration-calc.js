#!/usr/bin/env node

// Test duration calculation
function calculateDurationMinutes(startTime, endTime) {
  if (!startTime || !endTime) return 0

  // Parse times (HH:MM:SS)
  const parseTime = (timeStr) => {
    const parts = timeStr.split(':').map(Number)
    return {
      hours: parts[0] || 0,
      minutes: parts[1] || 0,
      seconds: parts[2] || 0
    }
  }

  const start = parseTime(startTime)
  const end = parseTime(endTime)

  console.log('Start:', start)
  console.log('End:', end)

  // Convert to total minutes for better precision
  const startTotalMinutes = start.hours * 60 + start.minutes + start.seconds / 60
  const endTotalMinutes = end.hours * 60 + end.minutes + end.seconds / 60

  console.log('Start total minutes:', startTotalMinutes)
  console.log('End total minutes:', endTotalMinutes)

  // Calculate difference in minutes
  let diffMinutes = endTotalMinutes - startTotalMinutes

  // Handle day rollover (if end time is before start time)
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60 // Add 24 hours in minutes
  }

  console.log('Difference in minutes:', diffMinutes)
  console.log('Rounded:', Math.round(diffMinutes))

  return Math.round(diffMinutes)
}

// Test cases
console.log('\n=== Test 1: 14:02:11 - 14:19:27 ===')
const result1 = calculateDurationMinutes('14:02:11', '14:19:27')
console.log('Expected: ~17 minutes')
console.log('Got:', result1, 'minutes')

console.log('\n=== Test 2: 14:01:37 - 14:20:28 ===')
const result2 = calculateDurationMinutes('14:01:37', '14:20:28')
console.log('Expected: ~19 minutes')
console.log('Got:', result2, 'minutes')

console.log('\n=== Test 3: 23:50:00 - 00:10:00 (day rollover) ===')
const result3 = calculateDurationMinutes('23:50:00', '00:10:00')
console.log('Expected: 20 minutes')
console.log('Got:', result3, 'minutes')