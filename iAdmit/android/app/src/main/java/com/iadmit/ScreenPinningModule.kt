package com.iadmit

import android.app.Activity
import android.os.Build
import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.util.Log
import android.view.WindowManager
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.graphics.Color
import android.graphics.Typeface
import android.view.Gravity
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.view.accessibility.AccessibilityManager
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.modules.core.DeviceEventManagerModule

class ScreenPinningModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "ScreenPinning"
  
  private var customOverlay: View? = null
  private var systemOverlayMonitor: Handler? = null
  private var systemOverlayRunnable: Runnable? = null

  private fun getActivitySafe(): Activity? {
    val activity = reactContext.currentActivity
    if (activity == null) {
      Log.w("ScreenPinning", "No current activity available")
    }
    return activity
  }

  @ReactMethod
  fun start(promise: Promise) {
    try {
      val activity = getActivitySafe()
      if (activity == null) {
        promise.reject("E_NO_ACTIVITY", "No active Activity to start screen pinning")
        return
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        activity.runOnUiThread {
          try {
            // Try to suppress system overlay before starting screen pinning
            try {
              val window = activity.window
              window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
              window.addFlags(WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD)
              window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED)
              window.addFlags(WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
              
              // Try to hide system UI elements that might show instructions
              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                window.insetsController?.hide(android.view.WindowInsets.Type.systemBars())
              } else {
                @Suppress("DEPRECATION")
                window.decorView.systemUiVisibility = (
                  android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                  or android.view.View.SYSTEM_UI_FLAG_FULLSCREEN
                  or android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                )
              }
            } catch (e: Exception) {
              Log.w("ScreenPinning", "Could not suppress system UI", e)
            }
            
            // Start screen pinning with strict mode
            activity.startLockTask()
            sendEvent("ScreenPinningState", true)
            Log.i("ScreenPinning", "Screen pinning started successfully - exam mode activated")
            promise.resolve(true)
          } catch (e: SecurityException) {
            Log.e("ScreenPinning", "SecurityException starting screen pinning", e)
            promise.reject("E_SECURITY", "Screen pinning is not enabled. Please enable it in device settings.")
          } catch (e: Exception) {
            Log.e("ScreenPinning", "Error starting screen pinning (UI thread)", e)
            promise.reject("E_UNKNOWN", e.message)
          }
        }
      } else {
        promise.reject("E_UNSUPPORTED", "Screen pinning requires Android 5.0+")
      }
    } catch (e: SecurityException) {
      Log.e("ScreenPinning", "SecurityException starting screen pinning", e)
      promise.reject("E_SECURITY", "Screen pinning is not enabled. Please enable it in device settings.")
    } catch (e: Exception) {
      Log.e("ScreenPinning", "Error starting screen pinning", e)
      promise.reject("E_UNKNOWN", e.message)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    try {
      val activity = getActivitySafe()
      if (activity == null) {
        promise.reject("E_NO_ACTIVITY", "No active Activity to stop screen pinning")
        return
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        activity.runOnUiThread {
          try {
            // Stop system overlay monitoring first
            stopMonitoringSystemOverlay()
            
            // Stop screen pinning
            activity.stopLockTask()
            
            // Restore system UI after stopping screen pinning
            try {
              val window = activity.window
              window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
              window.clearFlags(WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD)
              window.clearFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED)
              window.clearFlags(WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
              
              // Restore system UI elements
              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                window.insetsController?.show(android.view.WindowInsets.Type.systemBars())
              } else {
                @Suppress("DEPRECATION")
                window.decorView.systemUiVisibility = android.view.View.SYSTEM_UI_FLAG_VISIBLE
              }
            } catch (e: Exception) {
              Log.w("ScreenPinning", "Could not restore system UI", e)
            }
            
            sendEvent("ScreenPinningState", false)
            Log.i("ScreenPinning", "Screen pinning stopped successfully - exam mode deactivated")
            promise.resolve(true)
          } catch (e: Exception) {
            Log.e("ScreenPinning", "Error stopping screen pinning (UI thread)", e)
            promise.reject("E_UNKNOWN", e.message)
          }
        }
      } else {
        promise.reject("E_UNSUPPORTED", "Screen pinning requires Android 5.0+")
      }
    } catch (e: Exception) {
      Log.e("ScreenPinning", "Error stopping screen pinning", e)
      promise.reject("E_UNKNOWN", e.message)
    }
  }

  @ReactMethod
  fun isPinned(promise: Promise) {
    try {
      promise.resolve(isPinnedInternal())
    } catch (e: Exception) {
      promise.reject("E_UNKNOWN", e.message)
    }
  }

  @ReactMethod
  fun ensure(promise: Promise) {
    try {
      if (isPinnedInternal()) {
        promise.resolve(true)
      } else {
        start(promise)
      }
    } catch (e: Exception) {
      promise.reject("E_UNKNOWN", e.message)
    }
  }

  private fun isPinnedInternal(): Boolean {
    return try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        val am = reactContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val state = am.lockTaskModeState
        state != ActivityManager.LOCK_TASK_MODE_NONE
      } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        // No reliable API pre-M to query; return false and rely on start()
        false
      } else {
        false
      }
    } catch (e: Exception) {
      false
    }
  }

  @ReactMethod
  fun openSecuritySettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_SECURITY_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      Log.e("ScreenPinning", "Failed to open security settings", e)
      promise.reject("E_SETTINGS", e.message)
    }
  }

  @ReactMethod
  fun dismissSystemOverlay(promise: Promise) {
    try {
      val activity = getActivitySafe()
      if (activity == null) {
        promise.reject("E_NO_ACTIVITY", "No active Activity to dismiss overlay")
        return
      }

      activity.runOnUiThread {
        try {
          // Try to dismiss any system overlays
          val window = activity.window
          
          // Hide system UI elements
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.hide(android.view.WindowInsets.Type.systemBars())
          } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
              android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
              or android.view.View.SYSTEM_UI_FLAG_FULLSCREEN
              or android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            )
          }
          
          // Try to hide any system dialogs
          activity.sendBroadcast(Intent(Intent.ACTION_CLOSE_SYSTEM_DIALOGS))
          
          // Try to find and hide the system overlay immediately
          val rootView = activity.findViewById<ViewGroup>(android.R.id.content)
          val systemOverlay = findSystemOverlay(rootView)
          if (systemOverlay != null) {
            Log.i("ScreenPinning", "Found system overlay, attempting to hide it")
            systemOverlay.visibility = View.GONE
          }
          
          promise.resolve(true)
        } catch (e: Exception) {
          Log.e("ScreenPinning", "Error dismissing system overlay", e)
          promise.reject("E_UNKNOWN", e.message)
        }
      }
    } catch (e: Exception) {
      Log.e("ScreenPinning", "Error dismissing system overlay", e)
      promise.reject("E_UNKNOWN", e.message)
    }
  }

  @ReactMethod
  fun showCustomPinningOverlay(promise: Promise) {
    try {
      val activity = getActivitySafe()
      if (activity == null) {
        promise.reject("E_NO_ACTIVITY", "No active Activity to show overlay")
        return
      }

      activity.runOnUiThread {
        try {
          hideCustomOverlay()
          createCustomOverlay(activity)
          promise.resolve(true)
        } catch (e: Exception) {
          Log.e("ScreenPinning", "Error showing custom overlay", e)
          promise.reject("E_UNKNOWN", e.message)
        }
      }
    } catch (e: Exception) {
      Log.e("ScreenPinning", "Error showing custom overlay", e)
      promise.reject("E_UNKNOWN", e.message)
    }
  }

  @ReactMethod
  fun hideCustomPinningOverlay(promise: Promise) {
    try {
      val activity = getActivitySafe()
      if (activity == null) {
        promise.reject("E_NO_ACTIVITY", "No active Activity to hide overlay")
        return
      }

      activity.runOnUiThread {
        try {
          hideCustomOverlay()
          promise.resolve(true)
        } catch (e: Exception) {
          Log.e("ScreenPinning", "Error hiding custom overlay", e)
          promise.reject("E_UNKNOWN", e.message)
        }
      }
    } catch (e: Exception) {
      Log.e("ScreenPinning", "Error hiding custom overlay", e)
      promise.reject("E_UNKNOWN", e.message)
    }
  }

  @ReactMethod
  fun startSystemOverlayMonitor(promise: Promise) {
    try {
      val activity = getActivitySafe()
      if (activity == null) {
        promise.reject("E_NO_ACTIVITY", "No active Activity to monitor overlay")
        return
      }

      activity.runOnUiThread {
        try {
          startMonitoringSystemOverlay(activity)
          promise.resolve(true)
        } catch (e: Exception) {
          Log.e("ScreenPinning", "Error starting system overlay monitor", e)
          promise.reject("E_UNKNOWN", e.message)
        }
      }
    } catch (e: Exception) {
      Log.e("ScreenPinning", "Error starting system overlay monitor", e)
      promise.reject("E_UNKNOWN", e.message)
    }
  }

  @ReactMethod
  fun stopSystemOverlayMonitor(promise: Promise) {
    try {
      stopMonitoringSystemOverlay()
      promise.resolve(true)
    } catch (e: Exception) {
      Log.e("ScreenPinning", "Error stopping system overlay monitor", e)
      promise.reject("E_UNKNOWN", e.message)
    }
  }

  @ReactMethod
  fun enableSecureFlag(promise: Promise) {
    try {
      val activity = getActivitySafe()
      if (activity == null) {
        promise.reject("E_NO_ACTIVITY", "No active Activity to enable secure flag")
        return
      }
      activity.runOnUiThread {
        try {
          activity.window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
          Log.i("ScreenPinning", "FLAG_SECURE enabled (screenshots/recording blocked)")
          promise.resolve(true)
        } catch (e: Exception) {
          Log.e("ScreenPinning", "Error enabling FLAG_SECURE", e)
          promise.reject("E_UNKNOWN", e.message)
        }
      }
    } catch (e: Exception) {
      Log.e("ScreenPinning", "Error enabling FLAG_SECURE", e)
      promise.reject("E_UNKNOWN", e.message)
    }
  }

  @ReactMethod
  fun disableSecureFlag(promise: Promise) {
    try {
      val activity = getActivitySafe()
      if (activity == null) {
        promise.reject("E_NO_ACTIVITY", "No active Activity to disable secure flag")
        return
      }
      activity.runOnUiThread {
        try {
          activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
          Log.i("ScreenPinning", "FLAG_SECURE cleared")
          promise.resolve(true)
        } catch (e: Exception) {
          Log.e("ScreenPinning", "Error disabling FLAG_SECURE", e)
          promise.reject("E_UNKNOWN", e.message)
        }
      }
    } catch (e: Exception) {
      Log.e("ScreenPinning", "Error disabling FLAG_SECURE", e)
      promise.reject("E_UNKNOWN", e.message)
    }
  }

  private fun createCustomOverlay(activity: Activity) {
    try {
      val rootView = activity.findViewById<ViewGroup>(android.R.id.content)
      
      // Create main container
      val overlay = LinearLayout(activity).apply {
        orientation = LinearLayout.VERTICAL
        setBackgroundColor(Color.parseColor("#1a1a2e"))
        gravity = Gravity.CENTER
        setPadding(40, 60, 40, 60)
      }
      
      // Create title
      val title = TextView(activity).apply {
        text = "Your screen will be pinned during the exam"
        textSize = 20f
        setTextColor(Color.WHITE)
        typeface = Typeface.DEFAULT_BOLD
        gravity = Gravity.CENTER
        setPadding(0, 0, 0, 30)
      }
      
      // Create description
      val description = TextView(activity).apply {
        text = "Navigation and other functions will not be used during the exam.\n\nMake sure you have:\n• Enabled airplane mode\n• Found a quiet environment\n• Have enough battery\n\nYou cannot pause or restart once begun."
        textSize = 16f
        setTextColor(Color.parseColor("#9ca3af"))
        gravity = Gravity.CENTER
        setPadding(0, 0, 0, 40)
        setLineSpacing(4f, 1.2f)
      }
      
      // Create button container
      val buttonContainer = LinearLayout(activity).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER
        setPadding(0, 20, 0, 0)
      }
      
      // Create "Back to Dashboard" button
      val backButton = Button(activity).apply {
        text = "Back to Dashboard"
        setBackgroundColor(Color.parseColor("#6b7280"))
        setTextColor(Color.WHITE)
        setPadding(30, 20, 30, 20)
        textSize = 16f
        setOnClickListener {
          hideCustomOverlay()
          // Send event to React Native to handle navigation
          sendEvent("CustomOverlayAction", "back_to_dashboard")
        }
      }
      
      // Create "Yes, Proceed with Exam" button
      val proceedButton = Button(activity).apply {
        text = "Yes, Proceed with Exam"
        setBackgroundColor(Color.parseColor("#a855f7"))
        setTextColor(Color.WHITE)
        setPadding(30, 20, 30, 20)
        textSize = 16f
        setOnClickListener {
          hideCustomOverlay()
          // Send event to React Native to handle exam start
          sendEvent("CustomOverlayAction", "proceed_with_exam")
        }
      }
      
      // Add buttons to container
      buttonContainer.addView(backButton)
      buttonContainer.addView(proceedButton)
      
      // Add all views to overlay
      overlay.addView(title)
      overlay.addView(description)
      overlay.addView(buttonContainer)
      
      // Add overlay to root view
      rootView.addView(overlay, ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT
      ))
      
      customOverlay = overlay
      Log.i("ScreenPinning", "Custom overlay created and shown")
      
    } catch (e: Exception) {
      Log.e("ScreenPinning", "Error creating custom overlay", e)
    }
  }

  private fun hideCustomOverlay() {
    try {
      customOverlay?.let { overlay ->
        val parent = overlay.parent as? ViewGroup
        parent?.removeView(overlay)
        customOverlay = null
        Log.i("ScreenPinning", "Custom overlay hidden")
      }
    } catch (e: Exception) {
      Log.e("ScreenPinning", "Error hiding custom overlay", e)
    }
  }

  private fun startMonitoringSystemOverlay(activity: Activity) {
    try {
      stopMonitoringSystemOverlay() // Stop any existing monitoring
      
      systemOverlayMonitor = Handler(Looper.getMainLooper())
      systemOverlayRunnable = object : Runnable {
        override fun run() {
          try {
            checkForSystemOverlay(activity)
            systemOverlayMonitor?.postDelayed(this, 200) // Check every 200ms for faster detection
          } catch (e: Exception) {
            Log.e("ScreenPinning", "Error in system overlay monitoring", e)
          }
        }
      }
      
      systemOverlayMonitor?.post(systemOverlayRunnable!!)
      Log.i("ScreenPinning", "Started monitoring for system overlay")
    } catch (e: Exception) {
      Log.e("ScreenPinning", "Error starting system overlay monitoring", e)
    }
  }

  private fun stopMonitoringSystemOverlay() {
    try {
      systemOverlayRunnable?.let { runnable ->
        systemOverlayMonitor?.removeCallbacks(runnable)
      }
      systemOverlayMonitor = null
      systemOverlayRunnable = null
      Log.i("ScreenPinning", "Stopped monitoring for system overlay")
    } catch (e: Exception) {
      Log.e("ScreenPinning", "Error stopping system overlay monitoring", e)
    }
  }

  private fun checkForSystemOverlay(activity: Activity) {
    try {
      val rootView = activity.findViewById<ViewGroup>(android.R.id.content)
      val systemOverlay = findSystemOverlay(rootView)
      
      if (systemOverlay != null) {
        Log.i("ScreenPinning", "✅ System overlay/dialog detected! Intercepting buttons...")
        Log.i("ScreenPinning", "System overlay child count: ${systemOverlay.childCount}")
        interceptSystemOverlayButtons(systemOverlay)
      }
      // Removed the "No system overlay detected" log to reduce console spam
    } catch (e: Exception) {
      Log.e("ScreenPinning", "Error checking for system overlay", e)
    }
  }

  private fun findSystemOverlay(rootView: ViewGroup): ViewGroup? {
    try {
      for (i in 0 until rootView.childCount) {
        val child = rootView.getChildAt(i)
        if (child is ViewGroup) {
          // Check if this looks like the system overlay
          if (isSystemOverlay(child)) {
            return child
          }
          // Recursively search in child views
          val found = findSystemOverlay(child)
          if (found != null) return found
        }
      }
    } catch (e: Exception) {
      Log.e("ScreenPinning", "Error finding system overlay", e)
    }
    return null
  }

  private fun isSystemOverlay(view: ViewGroup): Boolean {
    try {
      // Look for characteristic elements of system dialogs/overlays
      for (i in 0 until view.childCount) {
        val child = view.getChildAt(i)
        if (child is TextView) {
          val text = child.text.toString().lowercase()
          // Permission dialog text (shown BEFORE pinning)
          if (text.contains("pin this app") ||
              text.contains("screen pinning") ||
              // Instruction overlay text (shown AFTER pinning)
              text.contains("app is pinned") || 
              text.contains("touch & hold back") ||
              text.contains("this keeps it in view") ||
              text.contains("personal data may be accessible") ||
              text.contains("pinned app may open")) {
            Log.i("ScreenPinning", "Detected system overlay/dialog with text: ${child.text}")
            return true
          }
        }
        if (child is ViewGroup) {
          if (isSystemOverlay(child)) return true
        }
      }
    } catch (e: Exception) {
      Log.e("ScreenPinning", "Error checking if view is system overlay", e)
    }
    return false
  }

  private fun interceptSystemOverlayButtons(overlay: ViewGroup) {
    try {
      // First, try to hide the unpin instructions
      hideUnpinInstructions(overlay)
      
      for (i in 0 until overlay.childCount) {
        val child = overlay.getChildAt(i)
        if (child is Button) {
          val buttonText = child.text.toString().lowercase()
          Log.i("ScreenPinning", "Found button with text: '$buttonText'")
          when {
            // Permission dialog buttons (shown BEFORE pinning)
            buttonText.contains("no thanks") || buttonText.contains("cancel") || buttonText.contains("no") -> {
              Log.i("ScreenPinning", "Intercepted 'No thanks/Cancel/No' button - setting custom click listener")
              child.setOnClickListener {
                Log.i("ScreenPinning", "User declined pinning - sending 'no_thanks' event to React Native")
                sendEvent("SystemOverlayAction", "no_thanks")
                overlay.visibility = View.GONE
                Log.i("ScreenPinning", "System overlay hidden after declining")
              }
            }
            // Instruction overlay buttons (shown AFTER pinning)
            buttonText.contains("got it") || buttonText.contains("ok") || buttonText.contains("yes") -> {
              Log.i("ScreenPinning", "Intercepted 'Got it/OK/Yes' button - setting custom click listener")
              child.setOnClickListener {
                Log.i("ScreenPinning", "User accepted - sending 'got_it' event to React Native")
                sendEvent("SystemOverlayAction", "got_it")
                overlay.visibility = View.GONE
                Log.i("ScreenPinning", "System overlay hidden after accepting")
              }
            }
          }
        }
        if (child is ViewGroup) {
          interceptSystemOverlayButtons(child)
        }
      }
    } catch (e: Exception) {
      Log.e("ScreenPinning", "Error intercepting system overlay buttons", e)
    }
  }
  
  private fun hideUnpinInstructions(overlay: ViewGroup) {
    try {
      for (i in 0 until overlay.childCount) {
        val child = overlay.getChildAt(i)
        if (child is TextView) {
          val text = child.text.toString().lowercase()
          // Hide text that contains unpin instructions
          if (text.contains("touch & hold back") || 
              text.contains("to unpin") ||
              text.contains("this keeps it in view until you unpin")) {
            Log.i("ScreenPinning", "Hiding unpin instruction text: ${child.text}")
            child.visibility = View.GONE
          }
        }
        if (child is ViewGroup) {
          hideUnpinInstructions(child)
        }
      }
    } catch (e: Exception) {
      Log.e("ScreenPinning", "Error hiding unpin instructions", e)
    }
  }

  private fun sendEvent(eventName: String, pinned: Boolean) {
    try {
      val params = Arguments.createMap()
      params.putBoolean("pinned", pinned)
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(eventName, params)
    } catch (e: Exception) {
      Log.w("ScreenPinning", "Failed to send event: $eventName", e)
    }
  }

  private fun sendEvent(eventName: String, action: String) {
    try {
      val params = Arguments.createMap()
      params.putString("action", action)
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(eventName, params)
    } catch (e: Exception) {
      Log.w("ScreenPinning", "Failed to send event: $eventName", e)
    }
  }
}


