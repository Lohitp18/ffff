import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'pages/home.dart';
import 'pages/alumini.dart';
import 'pages/opportunities.dart';
import 'pages/event.dart';
import 'pages/institution.dart';
import 'pages/notifications.dart';
import 'profile_page.dart';
import 'pages/admin.dart';

class MainAppPage extends StatefulWidget {
  const MainAppPage({super.key});

  @override
  State<MainAppPage> createState() => _MainAppPageState();
}

class _MainAppPageState extends State<MainAppPage> {
  int _currentIndex = 0;
  int _unreadNotificationCount = 0;

  final List<Widget> _pages = [
    HomePage(),
    AlumniPage(),
    OpportunitiesPage(),
    EventsPage(),
    InstitutionsPage(),
  ];

  @override
  void initState() {
    super.initState();
    _loadUnreadNotificationCount();
  }

  Future<void> _loadUnreadNotificationCount() async {
    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      
      if (token != null && token.isNotEmpty) {
        final response = await http.get(
          Uri.parse('${const String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:5000')}/api/notifications/unread-count'),
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
        );

        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          if (mounted) {
            setState(() {
              _unreadNotificationCount = data['unreadCount'] ?? 0;
            });
          }
        }
      }
    } catch (e) {
      // Silently fail - notifications are not critical
    }
  }

  void _onTabTapped(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Image.asset(
              'assets/logo.png',
              height: 40,
              errorBuilder: (context, error, stackTrace) {
                return const Icon(Icons.school, size: 40);
              },
            ),
            const SizedBox(width: 10),
            const Text('Alumni Portal'),
          ],
        ),
        actions: [
          // Notification Icon with badge
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.notifications),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const NotificationsPage()),
                  ).then((_) => _loadUnreadNotificationCount()); // Refresh count when returning
                },
              ),
              if (_unreadNotificationCount > 0)
                Positioned(
                  right: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.all(2),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    constraints: const BoxConstraints(
                      minWidth: 16,
                      minHeight: 16,
                    ),
                    child: Text(
                      _unreadNotificationCount > 99 ? '99+' : _unreadNotificationCount.toString(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),

          // Profile Popup Menu
          PopupMenuButton<String>(
            icon: const Icon(Icons.person),
            onSelected: (value) async {
              switch (value) {
                case 'profile':
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => ProfilePage()),
                  );
                  break;
                case 'signout':
                  const storage = FlutterSecureStorage();
                  await storage.delete(key: 'auth_token');
                  if (mounted) {
                    Navigator.pushReplacementNamed(context, '/');
                  }
                  break;
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'profile', child: Text('Profile')),
              const PopupMenuItem(value: 'signout', child: Text('Sign out')),
            ],
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: _pages,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: _onTabTapped,
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.group),
            label: 'Alumni',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.work),
            label: 'Opportunities',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.event),
            label: 'Events',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.school),
            label: 'Institutions',
          ),
        ],
      ),
    );
  }
}

