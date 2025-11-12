import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'screens/splash_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // 상태바 스타일 설정
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ),
  );

  // 화면 방향 고정 (가로 모드)
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AAC Tracker',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primaryColor: const Color(0xFFFF6B35), // 주황색
        scaffoldBackgroundColor: Colors.black,
        colorScheme: ColorScheme.dark(
          primary: const Color(0xFFFF6B35), // 주황색
          secondary: const Color(0xFFFF6B35),
          surface: Colors.black,
        ),
        useMaterial3: true,
      ),
      home: const SplashScreen(),
    );
  }
}
