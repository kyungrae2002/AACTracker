package com.example.aac_tracker_app

import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.util.Log

class CustomWebChromeClient : WebChromeClient() {
    override fun onPermissionRequest(request: PermissionRequest?) {
        request?.let {
            Log.d("WebViewPermission", "Permission requested: ${it.resources.joinToString()}")
            // 자동으로 모든 권한 승인
            it.grant(it.resources)
            Log.d("WebViewPermission", "Permissions granted automatically")
        }
    }
}
