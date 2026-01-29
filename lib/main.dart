import 'package:flutter/material.dart';
import 'pages/signin.dart';
import 'pages/signup.dart';
import 'pages/profile_completion.dart';
import 'main_app_page.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final Color primary = const Color(0xFF2F6BFF);
    final Color secondary = const Color(0xFF7B61FF);
    final Color surface = const Color(0xFFF7F8FA);

    return MaterialApp(
      title: 'Alumni Portal',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: primary,
          primary: primary,
          secondary: secondary,
          surface: surface,
          background: Colors.white,
        ),
        scaffoldBackgroundColor: surface,
        appBarTheme: const AppBarTheme(
          elevation: 0,
          centerTitle: false,
          backgroundColor: Colors.white,
          foregroundColor: Colors.black87,
        ),
        cardTheme: CardThemeData(
          color: Colors.white,
          elevation: 1,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          margin: EdgeInsets.zero,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          enabledBorder: const OutlineInputBorder(
            borderSide: BorderSide(color: Color(0xFFE6E8EF)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: primary, width: 1.5),
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: primary,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
        ),
        chipTheme: const ChipThemeData(
          side: BorderSide(color: Color(0xFFE6E8EF)),
        ),
      ),
      initialRoute: '/splash',
      routes: {
        '/splash': (context) => const _SplashPage(),
        '/': (context) => const SignInPage(),
        '/home': (context) => const MainAppPage(),
        '/signup': (context) => const SignUpPage(),
        '/profile-completion': (context) => const ProfileCompletionPage(),
      },
    );
  }
}

class _SplashPage extends StatefulWidget {
  const _SplashPage();
  @override
  State<_SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<_SplashPage> {
  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 1400), () {
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/');
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Image.asset(
              'assets/logo.png',
              height: 100,
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) {
                return const Icon(Icons.school, size: 100, color: Colors.blue);
              },
            ),
            const SizedBox(height: 12),
            const Text('Alva\'s Alumni', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
          ],
        ),
      ),
    );
  }
}
