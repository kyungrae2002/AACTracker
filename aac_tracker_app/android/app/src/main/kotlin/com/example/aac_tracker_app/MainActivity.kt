package com.example.aac_tracker_app

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // WebView 권한 플러그인 등록
        flutterEngine.plugins.add(WebViewPermissionPlugin())
    }
}
