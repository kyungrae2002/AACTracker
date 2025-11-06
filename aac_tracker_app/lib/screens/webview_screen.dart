import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:permission_handler/permission_handler.dart';

class WebViewScreen extends StatefulWidget {
  const WebViewScreen({super.key});

  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  InAppWebViewController? _webViewController;
  bool _isLoading = true;
  bool _hasError = false;
  double _progress = 0;
  bool _showAppBar = false; // 상단바 표시 여부

  // 배포된 웹 URL
  final String webUrl = 'https://bgleeexion.vercel.app/';

  @override
  void initState() {
    super.initState();
    _requestPermissions();
  }

  Future<void> _requestPermissions() async {
    // 카메라와 마이크 권한 요청
    await Permission.camera.request();
    await Permission.microphone.request();
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        // 웹뷰에서 뒤로가기 처리
        if (_webViewController != null) {
          final canGoBack = await _webViewController!.canGoBack();
          if (canGoBack) {
            _webViewController!.goBack();
            return false;
          }
        }
        return true;
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: GestureDetector(
          onTap: () {
            // 화면 탭하면 상단바 토글
            setState(() {
              _showAppBar = !_showAppBar;
            });
            // 3초 후 자동으로 숨김
            if (_showAppBar) {
              Future.delayed(const Duration(seconds: 3), () {
                if (mounted) {
                  setState(() {
                    _showAppBar = false;
                  });
                }
              });
            }
          },
          child: Stack(
            children: [
              // InAppWebView (전체 화면 사용)
              InAppWebView(
                initialUrlRequest: URLRequest(
                  url: WebUri(webUrl),
                ),
                initialSettings: InAppWebViewSettings(
                  javaScriptEnabled: true,
                  mediaPlaybackRequiresUserGesture: false,
                  allowsInlineMediaPlayback: true,
                  javaScriptCanOpenWindowsAutomatically: true,
                  useHybridComposition: true,
                ),
                onWebViewCreated: (controller) {
                  _webViewController = controller;
                },
                onLoadStart: (controller, url) {
                  setState(() {
                    _isLoading = true;
                    _hasError = false;
                  });
                },
                onLoadStop: (controller, url) async {
                  setState(() {
                    _isLoading = false;
                  });
                },
                onProgressChanged: (controller, progress) {
                  setState(() {
                    _progress = progress / 100;
                    if (progress == 100) {
                      _isLoading = false;
                    }
                  });
                },
                onReceivedError: (controller, request, error) {
                  setState(() {
                    _isLoading = false;
                    _hasError = true;
                  });
                  debugPrint('WebView error: ${error.description}');
                },
                // 🎯 핵심: WebView 권한 처리 (카메라/마이크)
                onPermissionRequest: (controller, request) async {
                  debugPrint('WebView permission requested: ${request.resources}');

                  // 자동으로 권한 승인
                  return PermissionResponse(
                    resources: request.resources,
                    action: PermissionResponseAction.GRANT,
                  );
                },
                onGeolocationPermissionsShowPrompt: (controller, origin) async {
                  // 위치 권한도 자동 승인 (필요시)
                  return GeolocationPermissionShowPromptResponse(
                    origin: origin,
                    allow: true,
                    retain: true,
                  );
                },
              ),

              // 로딩 인디케이터
              if (_isLoading)
                Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const CircularProgressIndicator(
                        color: Color(0xFFFF6B35),
                        strokeWidth: 4,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        '로딩 중... ${(_progress * 100).toInt()}%',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
                ),

              // 에러 화면
              if (_hasError && !_isLoading)
                Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFF6B35).withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.error_outline,
                          size: 64,
                          color: Color(0xFFFF6B35),
                        ),
                      ),
                      const SizedBox(height: 24),
                      const Text(
                        '페이지를 불러올 수 없습니다',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        webUrl,
                        style: const TextStyle(
                          color: Color(0xFF9CA3AF),
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 32),
                      ElevatedButton(
                        onPressed: () {
                          setState(() {
                            _hasError = false;
                            _isLoading = true;
                          });
                          _webViewController?.reload();
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFFF6B35),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text(
                          '다시 시도',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

              // 상단 컨트롤 바 (조건부 표시)
              if (_showAppBar)
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: SafeArea(
                    child: AnimatedOpacity(
                      opacity: _showAppBar ? 1.0 : 0.0,
                      duration: const Duration(milliseconds: 200),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.95),
                          border: Border(
                            bottom: BorderSide(
                              color: const Color(0xFFFF6B35).withOpacity(0.3),
                              width: 1,
                            ),
                          ),
                        ),
                        child: Row(
                          children: [
                            // 뒤로가기 버튼
                            Container(
                              decoration: BoxDecoration(
                                color: const Color(0xFFFF6B35).withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: IconButton(
                                icon: const Icon(Icons.arrow_back, color: Color(0xFFFF6B35)),
                                onPressed: () async {
                                  if (_webViewController != null) {
                                    final canGoBack = await _webViewController!.canGoBack();
                                    if (canGoBack) {
                                      _webViewController!.goBack();
                                    } else {
                                      if (mounted) Navigator.of(context).pop();
                                    }
                                  } else {
                                    if (mounted) Navigator.of(context).pop();
                                  }
                                },
                              ),
                            ),
                            const SizedBox(width: 8),
                            // 새로고침 버튼
                            Container(
                              decoration: BoxDecoration(
                                color: const Color(0xFFFF6B35).withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: IconButton(
                                icon: const Icon(Icons.refresh, color: Color(0xFFFF6B35)),
                                onPressed: () {
                                  _webViewController?.reload();
                                },
                              ),
                            ),
                            const Spacer(),
                            // 홈으로 버튼
                            Container(
                              decoration: BoxDecoration(
                                color: const Color(0xFFFF6B35).withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: IconButton(
                                icon: const Icon(Icons.home, color: Color(0xFFFF6B35)),
                                onPressed: () {
                                  if (mounted) Navigator.of(context).pop();
                                },
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
