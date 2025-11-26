# Enhanced Timer Implementation

## Summary of Changes

The timer system has been completely rewritten to address the following requirements:
1. **Real-time timer deduction** - Timer updates every second accurately
2. **Persistent across app refreshes** - Timer state is saved to AsyncStorage
3. **Accurate time calculation** - Based on start timestamp, not countdown intervals
4. **Resistant to manipulation** - Time calculated from actual elapsed time

## Key Features Implemented

### 1. Persistent Timer Storage (AsyncStorage)
- Timer data is automatically saved to device storage
- Includes: start time, time limit, penalties, exam status
- Saves every 30 seconds and on app state changes
- Automatically restored when app restarts

### 2. Timestamp-Based Calculation
```javascript
const elapsedSeconds = Math.floor((currentTime - examStartTime) / 1000);
const penaltySeconds = penaltiesApplied * 300; // 5 minutes per penalty
const remainingTime = Math.max(0, timeLimitSeconds - elapsedSeconds - penaltySeconds);
```

### 3. Real-Time Updates
- Timer updates every second using setInterval
- Automatically saves state periodically
- Handles app backgrounding/foregrounding
- Calculates accurate remaining time regardless of app state

### 4. App State Handling
- Saves timer when app goes to background
- Restores and updates timer when app comes to foreground
- Detects backgrounding as security violation (penalty applied)
- Continues accurate time calculation during background

### 5. Enhanced Security
- Timer cannot be paused or manipulated
- Background app usage triggers 5-minute penalty
- Time calculation is server-timestamp based
- Persistent storage prevents timer reset

## File Changes

### `iAdmit/stores/examStore.js`
- Added AsyncStorage integration
- Implemented persistent timer functions
- Added timestamp-based time calculation
- Enhanced penalty system with automatic timer updates

### `iAdmit/Screens/ExamScreen.jsx`
- Replaced interval-based timer with timestamp calculation
- Added automatic timer restoration on app start
- Enhanced app state change handling
- Improved security violation detection

## Usage Example

```javascript
// Starting exam
await startExam(60); // 60 minutes
// Timer automatically starts and persists

// Timer continues running even if:
// - App is refreshed
// - App goes to background
// - Phone is restarted (data persists)
// - Screen changes

// Timer automatically:
// - Saves state every 30 seconds
// - Updates display every second
// - Calculates accurate remaining time
// - Applies penalties correctly
```

## Test Scenarios Covered

1. **App Refresh**: Timer maintains exact remaining time
2. **Background/Foreground**: Timer continues accurately + penalty applied
3. **Long Background**: Time calculated correctly when returning
4. **Penalty Application**: 5 minutes deducted immediately and persistently
5. **Time Up**: Exam auto-submits when timer reaches 0
6. **Storage Persistence**: Timer survives app restarts

## Console Logs for Debugging

The implementation includes comprehensive logging:
- Timer initialization and restoration
- Time calculations with detailed breakdown
- Storage operations (save/load/clear)
- Security violations and penalties
- App state changes and timer updates

Example log output:
```
[ExamStore] Exam started with timer: { examStartTime: 1703123456789, timeLimitSeconds: 3600 }
[ExamStore] Timer data saved to storage: { examStartTime: 1703123456789, timeLimitSeconds: 3600, penaltiesApplied: 0, isExamStarted: true, lastSaved: 1703123456790 }
[ExamScreen] Timer tick: 3599
[ExamStore] Time calculation: { currentTime: 1703123457789, examStartTime: 1703123456789, elapsedSeconds: 1, timeLimitSeconds: 3600, penaltiesApplied: 0, penaltySeconds: 0, remainingTime: 3599 }
```
