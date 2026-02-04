import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'post_opportunity.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/services.dart';

class OpportunitiesPage extends StatefulWidget {
  const OpportunitiesPage({super.key});

  @override
  State<OpportunitiesPage> createState() => _OpportunitiesPageState();
}

class _OpportunitiesPageState extends State<OpportunitiesPage> {
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
        Uri.parse('$_baseUrl/api/content/opportunities'),
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
        title: const Text('Opportunities'),
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
                      return _buildOpportunityCard(e);
                    },
                    separatorBuilder: (_, __) => const SizedBox(height: 16),
                    itemCount: _items.length,
                  ),
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const PostOpportunityPage(),
            ),
          ).then((_) => _load()); // Refresh after returning
        },
        icon: const Icon(Icons.add),
        label: const Text('Post Opportunity'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
      ),
    );
  }

  Widget _buildOpportunityCard(Map<String, dynamic> opportunity) {
    final title = (opportunity['title'] ?? '').toString();
    final company = (opportunity['company'] ?? '').toString();
    final apply = (opportunity['applyLink'] ?? '').toString();
    final location = (opportunity['location'] ?? '').toString();
    final description = (opportunity['description'] ?? '').toString();
    final author =
        (opportunity['author'] ?? opportunity['createdBy'] ?? '').toString();
    final authorName = (opportunity['authorName'] ?? '').toString();
    final authorInstitution = (opportunity['authorInstitution'] ?? '').toString();
    final authorYear = (opportunity['authorYear'] ?? '').toString();
    final authorProfileImage =
        (opportunity['authorProfileImage'] ?? '').toString();
    final createdAt = opportunity['createdAt']?.toString() ?? '';

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
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
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
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
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
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Opportunity title
            Text(
              title,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 8),

            // Company info
            if (company.isNotEmpty) ...[
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.business, size: 16, color: Colors.green),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        company,
                        style: const TextStyle(
                          color: Colors.green,
                          fontWeight: FontWeight.w500,
                          fontSize: 16,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
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
                  const Icon(Icons.location_on, size: 16, color: Colors.grey),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      location,
                      style: const TextStyle(color: Colors.grey),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
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
                maxLines: 10,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 16),
            ],

            // Apply button
            if (apply.isNotEmpty) ...[
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () async {
                    final uri = Uri.tryParse(apply);
                    if (uri != null) {
                      await launchUrl(uri,
                          mode: LaunchMode.externalApplication);
                    }
                  },
                  icon: const Icon(Icons.launch),
                  label: const Text('Apply Now'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],

            const SizedBox(height: 16),
            Row(
              children: [
                _buildLikeButton(opportunity),
                const SizedBox(width: 16),
                _buildActionButton(
                    Icons.share, 'Share', () => _handleShare(opportunity)),
                const Spacer(),
                _buildActionButton(Icons.flag_outlined, 'Report',
                    () => _handleReport(opportunity)),
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

  Widget _buildLikeButton(Map<String, dynamic> opportunity) {
    final isLiked = opportunity['isLiked'] ?? false;
    final likeCount = opportunity['likeCount'] ?? opportunity['likes']?.length ?? 0;
    
    return InkWell(
      onTap: () => _handleLike(opportunity),
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
          const SnackBar(content: Text('Please login to like opportunities')),
        );
        return;
      }

      final response = await http.patch(
        Uri.parse('$_baseUrl/api/content/opportunities/${item['_id']}/like'),
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
      final title = item['title']?.toString() ?? 'Check this opportunity!';
      final company = item['company']?.toString() ?? '';
      final shareText = '$title\n\nCompany: $company';
      
      showModalBottomSheet(
        context: context,
        builder: (context) => Container(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Share Opportunity',
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
    final url = 'mailto:?subject=Check this opportunity!&body=$encodedText';
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
        builder: (context) => _OpportunityReportDialog(),
      );

      if (reportData != null) {
        final response = await http.post(
          Uri.parse('$_baseUrl/api/content/opportunities/${item['_id']}/report'),
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
}

class OpportunitiePage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Text(
        'Opportunities Page Content',
        style: TextStyle(fontSize: 24),
      ),
    );
  }
}

class _OpportunityReportDialog extends StatefulWidget {
  @override
  State<_OpportunityReportDialog> createState() => _OpportunityReportDialogState();
}

class _OpportunityReportDialogState extends State<_OpportunityReportDialog> {
  final _formKey = GlobalKey<FormState>();
  final _descriptionCtrl = TextEditingController();
  String? _selectedReason;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Report Opportunity'),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Why are you reporting this opportunity?'),
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
                DropdownMenuItem(value: 'expired', child: Text('Expired Opportunity')),
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
