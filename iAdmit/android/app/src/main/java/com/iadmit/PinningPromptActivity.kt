package com.iadmit

import android.app.Activity
import android.graphics.Color
import android.graphics.Typeface
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.content.Intent

class PinningPromptActivity : Activity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    try {
      // Make the activity full screen and immersive
      val window = window
      window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
      window.addFlags(WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD)
      window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED)
      window.addFlags(WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        window.insetsController?.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
      } else {
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
          View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
          View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
          View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
          View.SYSTEM_UI_FLAG_FULLSCREEN or
          View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
          View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        )
      }

      val root = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setBackgroundColor(Color.parseColor("#1a1a2e"))
        gravity = Gravity.CENTER
        setPadding(60, 80, 60, 80)
        layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
      }

      val title = TextView(this).apply {
        text = "Your screen is about to be pinned"
        textSize = 22f
        setTextColor(Color.WHITE)
        typeface = Typeface.DEFAULT_BOLD
        gravity = Gravity.CENTER
        setPadding(0, 0, 0, 24)
      }

      val description = TextView(this).apply {
        text = "Navigation and other functions will be limited while pinned.\n\nProceed?"
        textSize = 16f
        setTextColor(Color.parseColor("#9ca3af"))
        gravity = Gravity.CENTER
        setPadding(0, 0, 0, 36)
      }

      val buttonsRow = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER
      }

      val negative = Button(this).apply {
        text = "No thanks"
        setBackgroundColor(Color.parseColor("#6b7280"))
        setTextColor(Color.WHITE)
        textSize = 16f
        setPadding(36, 22, 36, 22)
        setOnClickListener {
          setResult(RESULT_CANCELED, Intent().putExtra("action", "no_thanks"))
          finish()
        }
      }

      val positive = Button(this).apply {
        text = "Yes"
        setBackgroundColor(Color.parseColor("#a855f7"))
        setTextColor(Color.WHITE)
        textSize = 16f
        setPadding(36, 22, 36, 22)
        setOnClickListener {
          setResult(RESULT_OK, Intent().putExtra("action", "got_it"))
          finish()
        }
      }

      // spacing between buttons
      val spacer = View(this).apply {
        layoutParams = LinearLayout.LayoutParams(24, 1)
      }

      buttonsRow.addView(negative)
      buttonsRow.addView(spacer)
      buttonsRow.addView(positive)

      root.addView(title)
      root.addView(description)
      root.addView(buttonsRow)

      setContentView(root)
    } catch (_: Exception) {
      // In case of any unexpected UI error, just return canceled
      setResult(RESULT_CANCELED, Intent().putExtra("action", "no_thanks"))
      finish()
    }
  }
}


