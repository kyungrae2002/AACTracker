import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter_tts/flutter_tts.dart';

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
  late FlutterTts _flutterTts;

  // 배포된 웹 URL
  final String webUrl = 'https://bgleeexion.vercel.app/';

  @override
  void initState() {
    super.initState();
    _requestPermissions();
    _initTts();
  }

  Future<void> _requestPermissions() async {
    // 카메라와 마이크 권한 요청
    await Permission.camera.request();
    await Permission.microphone.request();
  }

  // TTS 초기화
  Future<void> _initTts() async {
    _flutterTts = FlutterTts();

    // Android 전용 설정
    await _flutterTts.setLanguage("ko-KR");
    await _flutterTts.setSpeechRate(0.5); // 말하기 속도
    await _flutterTts.setVolume(1.0); // 볼륨
    await _flutterTts.setPitch(1.0); // 음높이

    // TTS 이벤트 핸들러
    _flutterTts.setStartHandler(() {
      debugPrint('🔊 네이티브 TTS 시작');
    });

    _flutterTts.setCompletionHandler(() {
      debugPrint('✅ 네이티브 TTS 완료');
    });

    _flutterTts.setErrorHandler((msg) {
      debugPrint('❌ 네이티브 TTS 에러: $msg');
    });
  }

  // 네이티브 TTS로 텍스트 읽기
  Future<void> _speak(String text) async {
    try {
      await _flutterTts.stop(); // 이전 TTS 중지
      await _flutterTts.speak(text);
      debugPrint('🎤 네이티브 TTS 재생: $text');
    } catch (e) {
      debugPrint('❌ TTS 재생 실패: $e');
    }
  }

  @override
  void dispose() {
    _flutterTts.stop();
    super.dispose();
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
                  // TTS 작동을 위한 추가 설정
                  domStorageEnabled: true,
                  databaseEnabled: true,
                  allowFileAccessFromFileURLs: true,
                  allowUniversalAccessFromFileURLs: true,
                  mixedContentMode: MixedContentMode.MIXED_CONTENT_ALWAYS_ALLOW,
                  // 하드웨어 가속
                  hardwareAcceleration: true,
                  // 자동재생 허용
                  allowsBackForwardNavigationGestures: true,
                ),
                onWebViewCreated: (controller) {
                  _webViewController = controller;

                  // JavaScript 핸들러 추가 (웹 -> 네이티브 통신)
                  controller.addJavaScriptHandler(
                    handlerName: 'FlutterTTS',
                    callback: (args) {
                      // 웹에서 JavaScript 핸들러로 TTS 요청 시 처리
                      if (args.isNotEmpty) {
                        final text = args[0].toString();
                        debugPrint('📱 웹에서 네이티브 TTS 요청: $text');
                        _speak(text);
                      }
                    },
                  );
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
