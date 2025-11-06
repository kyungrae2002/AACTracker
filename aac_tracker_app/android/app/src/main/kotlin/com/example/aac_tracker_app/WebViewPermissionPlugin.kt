package com.example.aac_tracker_app

import android.webkit.PermissionRequest
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel

class WebViewPermissionPlugin : FlutterPlugin, MethodChannel.MethodCallHandler {
    private lateinit var channel: MethodChannel

    companion object {
        var pendingPermissionRequest: PermissionRequest? = null
    }

    override fun onAttachedToEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        channel = MethodChannel(binding.binaryMessenger, "webview_permission")
        channel.setMethodCallHandler(this)
    }

    override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "grantPermission" -> {
                pendingPermissionRequest?.grant(pendingPermissionRequest?.resources)
                pendingPermissionRequest = null
                result.success(true)
            }
            "denyPermission" -> {
                pendingPermissionRequest?.deny()
                pendingPermissionRequest = null
                result.success(true)
            }
            else -> result.notImplemented()
        }
    }

    override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        channel.setMethodCallHandler(null)
    }
}
