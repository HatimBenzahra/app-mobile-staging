package com.prowin.kioskbridge

import android.content.Context
import android.content.Intent
import android.util.Log
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Bridges the Expo/React-Native app to the Device-Owner "kiosk" companion app
 * (package `com.prowin.kiosk`) running on the same tablet.
 *
 * It sends explicit, package-targeted broadcasts so the kiosk app learns which
 * commercial is currently logged in. Broadcasting to an absent package is a no-op
 * on Android, so this is always safe to call even when the kiosk app is missing.
 */
class KioskBridgeModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("KioskBridge")

    Function("sendOperator") { id: String, name: String ->
      try {
        val intent = Intent(ACTION_SET_OPERATOR)
          .setPackage(KIOSK_PACKAGE)
          .putExtra(EXTRA_COMMERCIAL_ID, id)
          .putExtra(EXTRA_COMMERCIAL_NAME, name)
        context.sendBroadcast(intent)
      } catch (e: Exception) {
        Log.w(TAG, "sendOperator broadcast failed", e)
      }
    }

    Function("clearOperator") {
      try {
        val intent = Intent(ACTION_CLEAR_OPERATOR)
          .setPackage(KIOSK_PACKAGE)
        context.sendBroadcast(intent)
      } catch (e: Exception) {
        Log.w(TAG, "clearOperator broadcast failed", e)
      }
    }
  }

  companion object {
    private const val TAG = "KioskBridge"
    private const val KIOSK_PACKAGE = "com.prowin.kiosk"
    private const val ACTION_SET_OPERATOR = "com.prowin.kiosk.SET_OPERATOR"
    private const val ACTION_CLEAR_OPERATOR = "com.prowin.kiosk.CLEAR_OPERATOR"
    private const val EXTRA_COMMERCIAL_ID = "commercialId"
    private const val EXTRA_COMMERCIAL_NAME = "commercialName"
  }
}
