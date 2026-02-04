import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key});

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  final String _baseUrl = const String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://alvasglobalalumni.org',
  );

  bool _loading = true;
  String? _error;
  List<dynamic> _notifications = [];

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      
      if (token == null || token.isEmpty) {
        throw Exception('Authentication required');
      }

      // Fetch notifications from backend
      final response = await http.get(
        Uri.parse('$_baseUrl/api/notifications'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to fetch notifications');
      }

      final data = jsonDecode(response.body);
      setState(() {
        _notifications = data['notifications'] ?? [];
      });

    } catch (e) {
      setState(() {
        _error = 'Failed to load notifications';
      });
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  Widget _buildNotificationItem(Map<String, dynamic> notification) {
    final type = notification['type'] ?? 'post';
    final title = notification['title'] ?? 'Untitled';
    final message = notification['message'] ?? 'No description available';
    final isRead = notification['isRead'] ?? false;
    final createdAt = DateTime.tryParse(
      notification['createdAt']?.toString() ?? ''
    );

    // Get appropriate icon and color for each type
    IconData icon;
    Color color;
    String typeLabel;
    switch (type) {
      case 'event':
        icon = Icons.event;
        color = Colors.blue;
        typeLabel = 'Event';
        break;
      case 'opportunity':
        icon = Icons.work;
        color = Colors.green;
        typeLabel = 'Opportunity';
        break;
      case 'institution_post':
        icon = Icons.school;
        color = Colors.purple;
        typeLabel = 'Institution Post';
        break;
      default:
        icon = Icons.article;
        color = Colors.orange;
        typeLabel = 'Post';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isRead ? Colors.grey.shade50 : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(isRead ? 0.1 : 0.2)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isRead ? 0.02 : 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Type icon
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(isRead ? 0.05 : 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          
          const SizedBox(width: 12),
          
          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header with type and time
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: color.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        typeLabel,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: color,
                        ),
                      ),
                    ),
                    const Spacer(),
                    if (createdAt != null)
                      Text(
                        _formatDate(createdAt),
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),
                  ],
                ),
                
                const SizedBox(height: 8),
                
                // Title
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: isRead ? FontWeight.w500 : FontWeight.w600,
                    color: isRead ? Colors.grey.shade700 : Colors.black,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                
                const SizedBox(height: 4),
                
                // Message
                Text(
                  message,
                  style: TextStyle(
                    fontSize: 14,
                    color: isRead ? Colors.grey.shade500 : Colors.grey.shade600,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                
                // Additional info from metadata
                if (notification['metadata'] != null) ...[
                  const SizedBox(height: 4),
                  if (notification['metadata']['institution'] != null)
                    Text(
                      'Institution: ${notification['metadata']['institution']}',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.purple,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                ],
              ],
            ),
          ),
          
          // Mark as read button
          if (!isRead)
            IconButton(
              icon: Icon(Icons.mark_email_read, color: Colors.grey.shade400),
              onPressed: () => _markAsRead(notification['_id']),
            ),
        ],
      ),
    );
  }

  Future<void> _markAsRead(String notificationId) async {
    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      
      if (token == null || token.isEmpty) {
        throw Exception('Authentication required');
      }

      final response = await http.patch(
        Uri.parse('$_baseUrl/api/notifications/$notificationId/read'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        // Update local state
        setState(() {
          final index = _notifications.indexWhere((n) => n['_id'] == notificationId);
          if (index != -1) {
            _notifications[index]['isRead'] = true;
          }
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to mark as read: $e')),
      );
    }
  }

  Future<void> _markAllAsRead() async {
    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      
      if (token == null || token.isEmpty) {
        throw Exception('Authentication required');
      }

      final response = await http.patch(
        Uri.parse('$_baseUrl/api/notifications/mark-all-read'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        // Update local state
        setState(() {
          for (var notification in _notifications) {
            notification['isRead'] = true;
          }
        });
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('All notifications marked as read')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to mark all as read: $e')),
      );
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.notifications_none,
            size: 80,
            color: Colors.grey.shade300,
          ),
          const SizedBox(height: 16),
          Text(
            'No new notifications',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w500,
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'You\'re all caught up!',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade500,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (_notifications.any((n) => !n['isRead']))
            IconButton(
              icon: const Icon(Icons.done_all),
              onPressed: _markAllAsRead,
              tooltip: 'Mark all as read',
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadNotifications,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        _error!,
                        style: const TextStyle(color: Colors.red),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadNotifications,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : _notifications.isEmpty
                  ? _buildEmptyState()
                  : RefreshIndicator(
                      onRefresh: _loadNotifications,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _notifications.length,
                        itemBuilder: (context, index) {
                          return _buildNotificationItem(
                            _notifications[index] as Map<String, dynamic>,
                          );
                        },
                      ),
                    ),
    );
  }
}
