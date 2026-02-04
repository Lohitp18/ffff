import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'post_event.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter/services.dart';

class EventsPage extends StatefulWidget {
  const EventsPage({super.key});

  @override
  State<EventsPage> createState() => _EventsPageState();
}

class _EventsPageState extends State<EventsPage> {
  final String _baseUrl = const String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://alvasglobalalumni.org',
  );
  bool _loading = true;
  String? _error;
  List<dynamic> _items = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      final headers = {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };
      
      final res = await http.get(
        Uri.parse('$_baseUrl/api/content/events'),
        headers: headers,
      );
      if (res.statusCode != 200) throw Exception('failed');
      setState(() {
        _items = jsonDecode(res.body) as List<dynamic>;
      });
    } catch (_) {
      setState(() {
        _error = 'Failed to load';
      });
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Events'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
        elevation: 0,
        automaticallyImplyLeading: false,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemBuilder: (_, i) {
                      final e = _items[i] as Map<String, dynamic>;
                      return _buildEventCard(e);
                    },
                    separatorBuilder: (_, __) => const SizedBox(height: 16),
                    itemCount: _items.length,
                  ),
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const PostEventPage()),
          ).then((_) => _load());
        },
        icon: const Icon(Icons.add),
        label: const Text('Post Event'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
      ),
    );
  }

  Widget _buildEventCard(Map<String, dynamic> event) {
    final title = (event['title'] ?? '').toString();
    final description = (event['description'] ?? '').toString();
    final dateStr = (event['date'] ?? '').toString();
    final location = (event['location'] ?? '').toString();
    final imageUrl = (event['imageUrl'] ?? '').toString();
    final author = (event['author'] ?? event['createdBy'] ?? '').toString();
    final authorName = (event['authorName'] ?? '').toString();
    final authorInstitution = (event['authorInstitution'] ?? '').toString();
    final authorYear = (event['authorYear'] ?? '').toString();
    final authorProfileImage = (event['authorProfileImage'] ?? '').toString();
    final createdAt = event['createdAt']?.toString() ?? '';
    final formattedDate = _formatDate(dateStr);

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Author info with profile photo
            Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: Colors.blue.shade100,
                  backgroundImage: authorProfileImage.isNotEmpty
                      ? NetworkImage(authorProfileImage.startsWith('http')
                          ? authorProfileImage
                          : '$_baseUrl$authorProfileImage')
                      : null,
                  child: authorProfileImage.isEmpty
                      ? const Icon(Icons.person, color: Colors.blue, size: 24)
                      : null,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        authorName.isNotEmpty ? authorName : author,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      if (authorInstitution.isNotEmpty || authorYear.isNotEmpty)
                        Text(
                          [authorInstitution, authorYear]
                              .where((e) => e.isNotEmpty)
                              .join(' • '),
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade600,
                          ),
                        ),
                    ],
                  ),
                ),
                Text(
                  _formatTime(createdAt),
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade500,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Event title
            Text(
              title,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),

            // Date info
            if (formattedDate.isNotEmpty) ...[
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.event, size: 16, color: Colors.blue),
                    const SizedBox(width: 8),
                    Text(
                      formattedDate,
                      style: const TextStyle(
                        color: Colors.blue,
                        fontWeight: FontWeight.w500,
                        fontSize: 16,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
            ],

            // Location
            if (location.isNotEmpty) ...[
              Row(
                children: [
                  const Icon(Icons.location_on,
                      size: 16, color: Colors.grey),
                  const SizedBox(width: 4),
                  Text(
                    location,
                    style: const TextStyle(color: Colors.grey),
                  ),
                ],
              ),
              const SizedBox(height: 12),
            ],

            // Description
            if (description.isNotEmpty) ...[
              Text(
                description,
                style: const TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 12),
            ],

            // Image display
            if (imageUrl.isNotEmpty) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(
                  imageUrl.startsWith('http')
                      ? imageUrl
                      : '$_baseUrl$imageUrl',
                  height: 200,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
              ),
            ],

            const SizedBox(height: 16),
            Row(
              children: [
                _buildLikeButton(event),
                const SizedBox(width: 16),
                _buildActionButton(
                    Icons.share, 'Share', () => _handleShare(event)),
                const Spacer(),
                _buildActionButton(Icons.flag_outlined, 'Report',
                    () => _handleReport(event)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
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
    } catch (_) {
      return dateStr;
    }
  }

  Widget _buildActionButton(
      IconData icon, String label, VoidCallback onPressed) {
    return InkWell(
      onTap: onPressed,
      borderRadius: BorderRadius.circular(20),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 20, color: Colors.grey.shade600),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                color: Colors.grey.shade600,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLikeButton(Map<String, dynamic> event) {
    final isLiked = event['isLiked'] ?? false;
    final likeCount = event['likeCount'] ?? event['likes']?.length ?? 0;
    
    return InkWell(
      onTap: () => _handleLike(event),
      borderRadius: BorderRadius.circular(20),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isLiked ? Icons.thumb_up : Icons.thumb_up_outlined,
              size: 20,
              color: isLiked ? Colors.blue : Colors.grey.shade600,
            ),
            const SizedBox(width: 4),
            Text(
              likeCount > 0 ? '$likeCount' : 'Like',
              style: TextStyle(
                color: isLiked ? Colors.blue : Colors.grey.shade600,
                fontSize: 14,
                fontWeight: isLiked ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleLike(Map<String, dynamic> item) async {
    try {
      final storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      if (token == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please login to like events')),
        );
        return;
      }

      final response = await http.patch(
        Uri.parse('$_baseUrl/api/content/events/${item['_id']}/like'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final result = jsonDecode(response.body);
        setState(() {
          // Update the item in the list
          final index = _items.indexWhere((e) => e['_id'] == item['_id']);
          if (index != -1) {
            _items[index]['isLiked'] = result['liked'];
            _items[index]['likeCount'] = result['likeCount'];
          }
        });
      } else {
        throw Exception('Failed to toggle like');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to like: $e')),
      );
    }
  }

  Future<void> _handleShare(Map<String, dynamic> item) async {
    try {
      final title = item['title']?.toString() ?? 'Check this event!';
      final date = item['date']?.toString() ?? '';
      final location = item['location']?.toString() ?? '';
      final shareText = '$title\n\nDate: $date\nLocation: $location';
      
      showModalBottomSheet(
        context: context,
        builder: (context) => Container(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Share Event',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildShareOption(
                    context: context,
                    icon: Icons.share,
                    label: 'WhatsApp',
                    color: Colors.green,
                    onTap: () => _shareToWhatsApp(shareText),
                  ),
                  _buildShareOption(
                    context: context,
                    icon: Icons.g_mobiledata,
                    label: 'Google',
                    color: Colors.blue,
                    onTap: () => _shareToGoogle(shareText),
                  ),
                  _buildShareOption(
                    context: context,
                    icon: Icons.email,
                    label: 'Email',
                    color: Colors.red,
                    onTap: () => _shareToEmail(shareText),
                  ),
                  _buildShareOption(
                    context: context,
                    icon: Icons.copy,
                    label: 'Copy',
                    color: Colors.grey,
                    onTap: () => _copyToClipboard(shareText),
                  ),
                ],
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to share: $e')),
      );
    }
  }

  Widget _buildShareOption({
    required BuildContext context,
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: () {
        Navigator.pop(context);
        onTap();
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          children: [
            Icon(icon, size: 32, color: color),
            const SizedBox(height: 8),
            Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w500)),
          ],
        ),
      ),
    );
  }

  Future<void> _shareToWhatsApp(String text) async {
    final encodedText = Uri.encodeComponent(text);
    final url = 'whatsapp://send?text=$encodedText';
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('WhatsApp not installed')),
      );
    }
  }

  Future<void> _shareToGoogle(String text) async {
    final encodedText = Uri.encodeComponent(text);
    final url = 'https://plus.google.com/share?text=$encodedText';
    final uri = Uri.parse(url);
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _shareToEmail(String text) async {
    final encodedText = Uri.encodeComponent(text);
    final url = 'mailto:?subject=Check this event!&body=$encodedText';
    final uri = Uri.parse(url);
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _copyToClipboard(String text) async {
    await Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Copied to clipboard!')),
    );
  }

  Future<void> _handleReport(Map<String, dynamic> item) async {
    try {
      final storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      if (token == null) return;

      final reportData = await showDialog<Map<String, String>>(
        context: context,
        builder: (context) => _EventReportDialog(),
      );

      if (reportData != null) {
        final response = await http.post(
          Uri.parse('$_baseUrl/api/content/events/${item['_id']}/report'),
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
          body: jsonEncode({
            'reason': reportData['reason'],
            'description': reportData['description'],
          }),
        );

        if (response.statusCode == 201) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Report submitted to admin successfully')),
          );
        } else {
          final data = jsonDecode(response.body);
          throw Exception(data['message'] ?? 'Failed to submit report');
        }
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to report: $e')),
      );
    }
  }

  String _formatDate(String raw) {
    try {
      final dt = DateTime.parse(raw);
      return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
    } catch (_) {
      return raw;
    }
  }
}

class _EventReportDialog extends StatefulWidget {
  @override
  State<_EventReportDialog> createState() => _EventReportDialogState();
}

class _EventReportDialogState extends State<_EventReportDialog> {
  final _formKey = GlobalKey<FormState>();
  final _descriptionCtrl = TextEditingController();
  String? _selectedReason;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Report Event'),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Why are you reporting this event?'),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _selectedReason,
              decoration: const InputDecoration(
                labelText: 'Reason *',
                border: OutlineInputBorder(),
              ),
              items: const [
                DropdownMenuItem(value: 'spam', child: Text('Spam')),
                DropdownMenuItem(value: 'inappropriate', child: Text('Inappropriate Content')),
                DropdownMenuItem(value: 'fake', child: Text('Fake Information')),
                DropdownMenuItem(value: 'cancelled', child: Text('Event Cancelled')),
                DropdownMenuItem(value: 'other', child: Text('Other')),
              ],
              onChanged: (value) => setState(() => _selectedReason = value),
              validator: (value) => value == null ? 'Please select a reason' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _descriptionCtrl,
              decoration: const InputDecoration(
                labelText: 'Description (Optional)',
                border: OutlineInputBorder(),
                hintText: 'Provide additional details...',
              ),
              maxLines: 3,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () {
            if (_formKey.currentState!.validate()) {
              Navigator.pop(context, {
                'reason': _selectedReason,
                'description': _descriptionCtrl.text.trim(),
              });
            }
          },
          child: const Text('Submit Report'),
        ),
      ],
    );
  }
}
