import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:http_parser/http_parser.dart';
import 'pages/connections.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final String _baseUrl = const String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000',
  );

  Map<String, dynamic>? _userProfile;
  bool _loading = true;
  String? _error;
  bool _loadingPosts = true;
  List<dynamic> _myPosts = [];

  @override
  void initState() {
    super.initState();
    _loadProfile();
    _loadMyPosts();
  }

  Future<void> _loadProfile() async {
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

      final response = await http.get(
        Uri.parse('$_baseUrl/api/users/profile'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        setState(() {
          _userProfile = jsonDecode(response.body);
        });
      } else {
        throw Exception('Failed to load profile');
      }
    } catch (e) {
      setState(() {
        _error = 'Failed to load profile';
      });
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  Future<void> _pickAndUploadImage({required bool isProfile}) async {
    try {
      final ImagePicker picker = ImagePicker();
      final XFile? file = await picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
      );
      if (file == null) return;

      await _uploadImage(file, isProfile: isProfile);
      await _loadProfile();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            isProfile ? 'Profile photo updated' : 'Cover photo updated',
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Image update failed: $e')));
    }
  }

  Future<void> _uploadImage(XFile file, {required bool isProfile}) async {
    const storage = FlutterSecureStorage();
    final token = await storage.read(key: 'auth_token');
    if (token == null || token.isEmpty)
      throw Exception('Authentication required');

    final uri = Uri.parse(
      '${_baseUrl}${isProfile ? '/api/users/profile-image' : '/api/users/cover-image'}',
    );
    final request = http.MultipartRequest('PUT', uri);
    request.headers['Authorization'] = 'Bearer $token';
    final mimeType = 'image/${file.path.split('.').last.toLowerCase()}';
    request.files.add(
      await http.MultipartFile.fromPath(
        'image',
        file.path,
        contentType: MediaType.parse(mimeType),
      ),
    );
    final streamed = await request.send();
    final response = await http.Response.fromStream(streamed);
    if (response.statusCode != 200) {
      throw Exception(jsonDecode(response.body)['message'] ?? 'Upload failed');
    }
  }

  Future<void> _updateProfile(Map<String, dynamic> updatedData) async {
    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');

      if (token == null || token.isEmpty) {
        throw Exception('Authentication required');
      }

      final response = await http.put(
        Uri.parse('$_baseUrl/api/users/profile'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode(updatedData),
      );

      if (response.statusCode == 200) {
        setState(() {
          _userProfile = jsonDecode(response.body);
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated successfully')),
        );
      } else {
        throw Exception('Failed to update profile');
      }
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to update profile: $e')));
    }
  }

  Future<void> _loadMyPosts() async {
    setState(() {
      _loadingPosts = true;
    });
    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      if (token == null || token.isEmpty)
        throw Exception('Authentication required');

      final res = await http.get(
        Uri.parse('$_baseUrl/api/posts/mine'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );
      if (res.statusCode != 200) throw Exception('Failed');
      setState(() {
        _myPosts = jsonDecode(res.body) as List<dynamic>;
      });
    } catch (_) {
      // keep silent; section will show empty/error state
    } finally {
      if (mounted)
        setState(() {
          _loadingPosts = false;
        });
    }
  }

  Future<void> _deletePost(String postId) async {
    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      if (token == null || token.isEmpty)
        throw Exception('Authentication required');
      final res = await http.delete(
        Uri.parse('$_baseUrl/api/posts/$postId'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );
      if (res.statusCode == 200) {
        setState(() {
          _myPosts.removeWhere((p) => p['_id'] == postId);
        });
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Post deleted')));
      } else {
        throw Exception('Failed');
      }
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Delete failed: $e')));
    }
  }

  void _showEditPostDialog(Map<String, dynamic> post) {
    final titleCtrl = TextEditingController(text: post['title'] ?? '');
    final contentCtrl = TextEditingController(text: post['content'] ?? '');
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit Post'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: titleCtrl,
              decoration: const InputDecoration(
                labelText: 'Title',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: contentCtrl,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Content',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              try {
                const storage = FlutterSecureStorage();
                final token = await storage.read(key: 'auth_token');
                if (token == null || token.isEmpty)
                  throw Exception('Authentication required');
                final res = await http.put(
                  Uri.parse('$_baseUrl/api/posts/${post['_id']}'),
                  headers: {
                    'Authorization': 'Bearer $token',
                    'Content-Type': 'application/json',
                  },
                  body: jsonEncode({
                    'title': titleCtrl.text.trim(),
                    'content': contentCtrl.text.trim(),
                  }),
                );
                if (res.statusCode == 200) {
                  final updated = jsonDecode(res.body) as Map<String, dynamic>;
                  final idx = _myPosts.indexWhere(
                    (p) => p['_id'] == post['_id'],
                  );
                  if (idx != -1) {
                    setState(() {
                      _myPosts[idx] = updated;
                    });
                  }
                  if (mounted) Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Post updated (pending approval)'),
                    ),
                  );
                } else {
                  throw Exception('Failed');
                }
              } catch (e) {
                ScaffoldMessenger.of(
                  context,
                ).showSnackBar(SnackBar(content: Text('Update failed: $e')));
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_error != null || _userProfile == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Profile')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(_error ?? 'Profile not found'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loadProfile,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.grey.shade100,
      appBar: AppBar(
        title: const Text('Profile'),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () => _showEditProfileDialog(),
            tooltip: 'Edit Profile',
          ),
          IconButton(
            icon: const Icon(Icons.privacy_tip),
            onPressed: () => _showPrivacySettingsDialog(),
            tooltip: 'Privacy Settings',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await _loadProfile();
          await _loadMyPosts();
        },
        child: SingleChildScrollView(
          child: Column(
            children: [
              _buildProfileHeader(),
              _buildProfileCompletionBanner(),
              _buildPersonalDetailsSection(),
              _buildAcademicDetailsSection(),
              _buildContactSection(),
              _buildAboutSection(),
              _buildHighlightsSection(),
              _buildExperienceSection(),
              _buildEducationSection(),
              _buildSkillsSection(),
              _buildConnectionsSection(),
              _buildMyPostsSection(),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProfileHeader() {
    return Container(
      color: Colors.white,
      child: Column(
        children: [
          // Cover Image with edit button
          Stack(
            children: [
              Container(
                height: 200,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: const Color(0xFF0A66C2),
                  image: _userProfile!['coverImage'] != null
                      ? DecorationImage(
                          image: NetworkImage(
                            _normalizedUrl(_userProfile!['coverImage']),
                          ),
                          fit: BoxFit.cover,
                        )
                      : null,
                ),
              ),
              Positioned(
                right: 12,
                bottom: 12,
                child: ElevatedButton.icon(
                  onPressed: () => _pickAndUploadImage(isProfile: false),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.black.withOpacity(0.6),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(24),
                    ),
                  ),
                  icon: const Icon(Icons.camera_alt, size: 18),
                  label: const Text(
                    'Edit cover',
                    style: TextStyle(fontSize: 14),
                  ),
                ),
              ),
            ],
          ),

          // Profile Info Section
          Container(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                // Profile Image (overlapping)
                Transform.translate(
                  offset: const Offset(0, -60),
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      CircleAvatar(
                        radius: 60,
                        backgroundColor: Colors.white,
                        child: CircleAvatar(
                          radius: 56,
                          backgroundColor: Colors.grey.shade200,
                          backgroundImage: _userProfile!['profileImage'] != null
                              ? NetworkImage(
                                  _normalizedUrl(_userProfile!['profileImage']),
                                )
                              : null,
                          child: _userProfile!['profileImage'] == null
                              ? const Icon(
                                  Icons.person,
                                  size: 60,
                                  color: Colors.grey,
                                )
                              : null,
                        ),
                      ),
                      Positioned(
                        right: -2,
                        bottom: -2,
                        child: InkWell(
                          onTap: () => _pickAndUploadImage(isProfile: true),
                          child: Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0A66C2),
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 2),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.2),
                                  blurRadius: 4,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: const Icon(
                              Icons.camera_alt,
                              color: Colors.white,
                              size: 16,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),

                // Name and Headline - LinkedIn Style
                Text(
                  _userProfile!['name'] ?? 'No Name',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w600,
                    color: Colors.black87,
                  ),
                ),
                if (_userProfile!['headline'] != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    _userProfile!['headline'],
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.grey.shade700,
                      fontWeight: FontWeight.w400,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
                if (_userProfile!['location'] != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    _userProfile!['location'],
                    style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
                    textAlign: TextAlign.center,
                  ),
                ],
                const SizedBox(height: 8),
                // Contact info link
                GestureDetector(
                  onTap: () {
                    // Show contact info
                  },
                  child: const Text(
                    'Contact info',
                    style: TextStyle(
                      fontSize: 14,
                      color: Color(0xFF0A66C2),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                // Stats
                const Text(
                  '500+ connections',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.black54,
                    fontWeight: FontWeight.w400,
                  ),
                ),
                const SizedBox(height: 16),

                // Action Buttons - LinkedIn Style
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    ElevatedButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const ConnectionsPage(),
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0A66C2),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 6,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(24),
                        ),
                        elevation: 0,
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '+',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w300,
                            ),
                          ),
                          SizedBox(width: 4),
                          Text(
                            'Follow',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton(
                      onPressed: () {
                        // Message action
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.black54,
                        side: const BorderSide(color: Colors.black26),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 6,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(24),
                        ),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.lock_outline, size: 16),
                          SizedBox(width: 4),
                          Text(
                            'Message',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton(
                      onPressed: () {
                        // More options
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.black54,
                        side: const BorderSide(color: Colors.black26),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 6,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(24),
                        ),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.more_horiz, size: 16),
                          SizedBox(width: 4),
                          Text(
                            'More',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileCompletionBanner() {
    final completion = _calculateProfileCompletion();
    final missing = _missingProfileFields();

    return Container(
      margin: const EdgeInsets.only(top: 12, bottom: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.check_circle_outline, color: Color(0xFF0A66C2)),
              const SizedBox(width: 8),
              Text(
                'Profile completeness $completion%',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.black87,
                ),
              ),
              const Spacer(),
              TextButton(
                onPressed: _showDetailsEditor,
                child: const Text('Complete now'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          LinearProgressIndicator(
            value: completion / 100,
            minHeight: 6,
            borderRadius: BorderRadius.circular(8),
            color: const Color(0xFF0A66C2),
            backgroundColor: Colors.grey.shade200,
          ),
          if (missing.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              'Next steps',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade700,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: missing
                  .take(4)
                  .map(
                    (item) => Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        item,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF0A66C2),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPersonalDetailsSection() {
    return _SectionCard(
      title: 'Personal details',
      action: TextButton.icon(
        onPressed: _showDetailsEditor,
        icon: const Icon(Icons.edit, size: 18),
        label: const Text('Update'),
      ),
      child: Column(
        children: [
          _detailLine('Email', _userProfile!['email'], Icons.mail_outline),
          _detailLine(
            'Phone number',
            _userProfile!['phone'],
            Icons.call_outlined,
          ),
          _detailLine(
            'Date of birth',
            _formatDob(_userProfile!['dob']),
            Icons.cake_outlined,
          ),
          _detailLine(
            'Current location',
            _userProfile!['location'],
            Icons.location_on_outlined,
          ),
        ],
      ),
    );
  }

  Widget _buildAcademicDetailsSection() {
    return _SectionCard(
      title: 'Academic snapshot',
      action: TextButton.icon(
        onPressed: _showDetailsEditor,
        icon: const Icon(Icons.description_outlined, size: 18),
        label: const Text('Edit info'),
      ),
      child: Column(
        children: [
          _detailLine(
            'Institution',
            _userProfile!['institution'],
            Icons.apartment_outlined,
          ),
          _detailLine(
            'Course / Department',
            _userProfile!['course'],
            Icons.menu_book_outlined,
          ),
          _detailLine(
            'Graduation year',
            _userProfile!['year'],
            Icons.calendar_month_outlined,
          ),
          _detailLine(
            'Favourite faculty',
            _userProfile!['favouriteTeacher'],
            Icons.person_outline,
          ),
        ],
      ),
    );
  }

  Widget _buildContactSection() {
    return _SectionCard(
      title: 'Contact & social',
      action: TextButton.icon(
        onPressed: _showEditProfileDialog,
        icon: const Icon(Icons.open_in_new, size: 18),
        label: const Text('Manage links'),
      ),
      child: Column(
        children: [
          _detailLine('Website', _userProfile!['website'], Icons.link_outlined),
          _detailLine(
            'LinkedIn',
            _userProfile!['linkedin'],
            Icons.business_center_outlined,
          ),
          _detailLine(
            'Twitter',
            _userProfile!['twitter'],
            Icons.alternate_email,
          ),
          _detailLine('GitHub', _userProfile!['github'], Icons.code),
          _detailLine(
            'Other socials',
            _userProfile!['socialMedia'],
            Icons.language,
          ),
        ],
      ),
    );
  }

  String _normalizedUrl(String url) {
    if (url.startsWith('http')) return url;
    return _baseUrl + (url.startsWith('/') ? url : '/$url');
  }

  String _formatDob(dynamic dob) {
    if (dob == null || dob.toString().isEmpty) return 'Add date of birth';
    try {
      final date = DateTime.parse(dob.toString());
      return '${date.day.toString().padLeft(2, '0')} '
          '${_monthLabel(date.month)} ${date.year}';
    } catch (_) {
      return dob.toString();
    }
  }

  String _monthLabel(int month) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    if (month < 1 || month > 12) return '';
    return months[month - 1];
  }

  Widget _detailLine(String label, dynamic value, IconData icon) {
    final hasValue = value != null && value.toString().trim().isNotEmpty;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: const Color(0xFF0A66C2)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey.shade600,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  hasValue ? value.toString() : 'Add $label'.toLowerCase(),
                  style: TextStyle(
                    fontSize: 15,
                    color: hasValue ? Colors.black87 : Colors.grey.shade400,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  int _calculateProfileCompletion() {
    final fields = [
      _userProfile!['headline'],
      _userProfile!['bio'],
      _userProfile!['phone'],
      _userProfile!['location'],
      _userProfile!['institution'],
      _userProfile!['course'],
      _userProfile!['skills'],
      _userProfile!['experience'],
      _userProfile!['education'],
      _userProfile!['linkedin'],
    ];
    int filled = 0;
    for (final field in fields) {
      if (field is List) {
        if (field.isNotEmpty) filled++;
      } else if (field != null && field.toString().trim().isNotEmpty) {
        filled++;
      }
    }
    return ((filled / fields.length) * 100).round();
  }

  List<String> _missingProfileFields() {
    final Map<String, dynamic> mapping = {
      'Add a headline': _userProfile!['headline'],
      'Write your About section': _userProfile!['bio'],
      'Add phone number': _userProfile!['phone'],
      'Pin your location': _userProfile!['location'],
      'Mention institution': _userProfile!['institution'],
      'Add course information': _userProfile!['course'],
      'Showcase skills': _userProfile!['skills'],
      'Log experience': _userProfile!['experience'],
      'Update education': _userProfile!['education'],
      'Link LinkedIn profile': _userProfile!['linkedin'],
    };
    final missing = <String>[];
    mapping.forEach((label, value) {
      if (value == null) {
        missing.add(label);
      } else if (value is List && value.isEmpty) {
        missing.add(label);
      } else if (value is String && value.trim().isEmpty) {
        missing.add(label);
      }
    });
    return missing;
  }

  void _showDetailsEditor() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
          ),
          child: _ProfileDetailsSheet(
            profile: _userProfile!,
            onSave: (payload) async {
              await _updateProfile(payload);
              if (!mounted) return;
              Navigator.of(context).pop();
            },
          ),
        );
      },
    );
  }

  Widget _buildAboutSection() {
    if (_userProfile!['bio'] == null || _userProfile!['bio'].isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'About',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              _userProfile!['bio'],
              style: const TextStyle(
                fontSize: 15,
                height: 1.5,
                color: Colors.black87,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHighlightsSection() {
    final experience = _userProfile!['experience'] as List<dynamic>? ?? [];
    final education = _userProfile!['education'] as List<dynamic>? ?? [];
    final skills = _userProfile!['skills'] as List<dynamic>? ?? [];

    if (experience.isEmpty && education.isEmpty && skills.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Highlights',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 16),
            if (experience.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: RichText(
                  text: TextSpan(
                    style: const TextStyle(
                      fontSize: 14,
                      color: Colors.black54,
                      height: 1.5,
                    ),
                    children: [
                      const TextSpan(
                        text: 'Experience: ',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: Colors.black87,
                        ),
                      ),
                      TextSpan(
                        text:
                            '${experience.length} ${experience.length == 1 ? 'position' : 'positions'}',
                      ),
                    ],
                  ),
                ),
              ),
            if (education.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: RichText(
                  text: TextSpan(
                    style: const TextStyle(
                      fontSize: 14,
                      color: Colors.black54,
                      height: 1.5,
                    ),
                    children: [
                      const TextSpan(
                        text: 'Education: ',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: Colors.black87,
                        ),
                      ),
                      TextSpan(
                        text:
                            '${education.length} ${education.length == 1 ? 'school' : 'schools'}',
                      ),
                    ],
                  ),
                ),
              ),
            if (skills.isNotEmpty)
              RichText(
                text: TextSpan(
                  style: const TextStyle(
                    fontSize: 14,
                    color: Colors.black54,
                    height: 1.5,
                  ),
                  children: [
                    const TextSpan(
                      text: 'Skills: ',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: Colors.black87,
                      ),
                    ),
                    TextSpan(
                      text:
                          '${skills.length} ${skills.length == 1 ? 'skill' : 'skills'}',
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildExperienceSection() {
    final experience = _userProfile!['experience'] as List<dynamic>? ?? [];

    if (experience.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Experience',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 16),
            ...experience.map((exp) => _buildExperienceItem(exp)),
          ],
        ),
      ),
    );
  }

  Widget _buildExperienceItem(Map<String, dynamic> exp) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.work_outline, color: Color(0xFF0A66C2)),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  exp['title'] ?? 'No Title',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  exp['company'] ?? 'No Company',
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF0A66C2),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (exp['location'] != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    exp['location'],
                    style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                  ),
                ],
                Text(
                  _formatDateRange(
                    exp['startDate'],
                    exp['endDate'],
                    exp['current'],
                  ),
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                ),
                if (exp['description'] != null &&
                    exp['description'].toString().isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    exp['description'],
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade700,
                      height: 1.4,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEducationSection() {
    final education = _userProfile!['education'] as List<dynamic>? ?? [];

    if (education.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Education',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 16),
            ...education.map((edu) => _buildEducationItem(edu)),
          ],
        ),
      ),
    );
  }

  Widget _buildEducationItem(Map<String, dynamic> edu) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.school_outlined, color: Color(0xFF0A66C2)),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  edu['school'] ?? 'No School',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${edu['degree'] ?? 'No Degree'}${edu['fieldOfStudy'] != null ? ' in ${edu['fieldOfStudy']}' : ''}',
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF0A66C2),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  _formatDateRange(
                    edu['startDate'],
                    edu['endDate'],
                    edu['current'],
                  ),
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                ),
                if (edu['description'] != null &&
                    edu['description'].toString().isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    edu['description'],
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade700,
                      height: 1.4,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSkillsSection() {
    final skills = _userProfile!['skills'] as List<dynamic>? ?? [];

    if (skills.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Skills',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: skills
                  .map(
                    (skill) => Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.blue.shade200),
                      ),
                      child: Text(
                        skill.toString(),
                        style: const TextStyle(
                          color: Color(0xFF0A66C2),
                          fontWeight: FontWeight.w500,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildConnectionsSection() {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: Colors.blue.shade50,
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(Icons.group, color: Color(0xFF0A66C2)),
        ),
        title: const Text(
          'Connections',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
        ),
        subtitle: const Text(
          'Manage your professional connections',
          style: TextStyle(fontSize: 14),
        ),
        trailing: const Icon(
          Icons.arrow_forward_ios,
          size: 16,
          color: Colors.grey,
        ),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const ConnectionsPage()),
          );
        },
      ),
    );
  }

  Widget _buildMyPostsSection() {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Text(
                  'My Posts',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.refresh, color: Color(0xFF0A66C2)),
                  onPressed: _loadMyPosts,
                  tooltip: 'Refresh',
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (_loadingPosts)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(24.0),
                  child: CircularProgressIndicator(),
                ),
              )
            else if (_myPosts.isEmpty)
              Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.article_outlined,
                      size: 48,
                      color: Colors.grey.shade400,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'You have not posted anything yet.',
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              )
            else
              Column(children: _myPosts.map((p) => _buildPostCard(p)).toList()),
          ],
        ),
      ),
    );
  }

  Widget _buildPostCard(Map<String, dynamic> post) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (post['title'] != null &&
                        post['title'].toString().isNotEmpty)
                      Text(
                        post['title'],
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                    if (post['title'] != null && post['content'] != null)
                      const SizedBox(height: 8),
                    if (post['content'] != null &&
                        post['content'].toString().isNotEmpty)
                      Text(
                        post['content'],
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade700,
                          height: 1.5,
                        ),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: post['status'] == 'approved'
                      ? Colors.green.shade50
                      : Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  post['status'] ?? 'pending',
                  style: TextStyle(
                    fontSize: 12,
                    color: post['status'] == 'approved'
                        ? Colors.green.shade700
                        : Colors.orange.shade700,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const Spacer(),
              IconButton(
                icon: const Icon(
                  Icons.edit,
                  color: Color(0xFF0A66C2),
                  size: 20,
                ),
                onPressed: () => _showEditPostDialog(post),
                tooltip: 'Edit',
              ),
              IconButton(
                icon: const Icon(Icons.delete, color: Colors.red, size: 20),
                onPressed: () => _deletePost(post['_id'].toString()),
                tooltip: 'Delete',
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _formatDateRange(String? startDate, String? endDate, bool? current) {
    String start = startDate != null
        ? DateTime.parse(startDate).year.toString()
        : '';
    String end = current == true
        ? 'Present'
        : endDate != null
        ? DateTime.parse(endDate).year.toString()
        : '';

    if (start.isNotEmpty && end.isNotEmpty) {
      return '$start - $end';
    } else if (start.isNotEmpty) {
      return start;
    } else {
      return '';
    }
  }

  void _showEditProfileDialog() {
    showDialog(
      context: context,
      builder: (context) => _EditProfileDialog(
        userProfile: _userProfile!,
        onSave: _updateProfile,
      ),
    );
  }

  void _showPrivacySettingsDialog() {
    showDialog(
      context: context,
      builder: (context) => _PrivacySettingsDialog(
        privacySettings: _userProfile!['privacySettings'] ?? {},
        onSave: (settings) async {
          try {
            const storage = FlutterSecureStorage();
            final token = await storage.read(key: 'auth_token');

            if (token == null || token.isEmpty) {
              throw Exception('Authentication required');
            }

            final response = await http.put(
              Uri.parse('$_baseUrl/api/users/privacy-settings'),
              headers: {
                'Authorization': 'Bearer $token',
                'Content-Type': 'application/json',
              },
              body: jsonEncode(settings),
            );

            if (response.statusCode == 200) {
              setState(() {
                _userProfile!['privacySettings'] = settings;
              });
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Privacy settings updated')),
              );
            } else {
              throw Exception('Failed to update privacy settings');
            }
          } catch (e) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Failed to update settings: $e')),
            );
          }
        },
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final Widget child;
  final Widget? action;

  const _SectionCard({required this.title, required this.child, this.action});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              const Spacer(),
              if (action != null) action!,
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

class _EditProfileDialog extends StatefulWidget {
  final Map<String, dynamic> userProfile;
  final Future<void> Function(Map<String, dynamic>) onSave;

  const _EditProfileDialog({required this.userProfile, required this.onSave});

  @override
  State<_EditProfileDialog> createState() => _EditProfileDialogState();
}

class _EditProfileDialogState extends State<_EditProfileDialog> {
  final _formKey = GlobalKey<FormState>();
  late Map<String, dynamic> _formData;
  late TextEditingController _currentTitleCtrl;
  late TextEditingController _currentCompanyCtrl;
  late TextEditingController _currentLocationCtrl;

  @override
  void initState() {
    super.initState();
    _formData = Map.from(widget.userProfile);
    final experience =
        (widget.userProfile['experience'] as List<dynamic>?) ?? [];
    final currentExp = experience.cast<Map<String, dynamic>?>().firstWhere(
      (e) => (e?['current'] == true),
      orElse: () => null,
    );
    _currentTitleCtrl = TextEditingController(text: currentExp?['title'] ?? '');
    _currentCompanyCtrl = TextEditingController(
      text: currentExp?['company'] ?? '',
    );
    _currentLocationCtrl = TextEditingController(
      text: currentExp?['location'] ?? '',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      child: Container(
        width: MediaQuery.of(context).size.width * 0.9,
        height: MediaQuery.of(context).size.height * 0.8,
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const Text(
              'Edit Profile',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: Form(
                key: _formKey,
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      TextFormField(
                        initialValue: _formData['headline'] ?? '',
                        decoration: const InputDecoration(
                          labelText: 'Professional Headline',
                          border: OutlineInputBorder(),
                        ),
                        onChanged: (value) => _formData['headline'] = value,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        initialValue: _formData['bio'] ?? '',
                        decoration: const InputDecoration(
                          labelText: 'About (Bio)',
                          border: OutlineInputBorder(),
                        ),
                        maxLines: 3,
                        onChanged: (value) => _formData['bio'] = value,
                      ),
                      const SizedBox(height: 16),
                      // Current Position
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          'Current Position',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.grey.shade800,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _currentTitleCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Title (e.g., Software Engineer)',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _currentCompanyCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Company/Organization',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _currentLocationCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Location',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        initialValue: _formData['location'] ?? '',
                        decoration: const InputDecoration(
                          labelText: 'Location',
                          border: OutlineInputBorder(),
                        ),
                        onChanged: (value) => _formData['location'] = value,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        initialValue: _formData['website'] ?? '',
                        decoration: const InputDecoration(
                          labelText: 'Website',
                          border: OutlineInputBorder(),
                        ),
                        onChanged: (value) => _formData['website'] = value,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        initialValue: _formData['linkedin'] ?? '',
                        decoration: const InputDecoration(
                          labelText: 'LinkedIn',
                          border: OutlineInputBorder(),
                        ),
                        onChanged: (value) => _formData['linkedin'] = value,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        initialValue: _formData['twitter'] ?? '',
                        decoration: const InputDecoration(
                          labelText: 'Twitter',
                          border: OutlineInputBorder(),
                        ),
                        onChanged: (value) => _formData['twitter'] = value,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        initialValue: _formData['github'] ?? '',
                        decoration: const InputDecoration(
                          labelText: 'GitHub',
                          border: OutlineInputBorder(),
                        ),
                        onChanged: (value) => _formData['github'] = value,
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () async {
                    // Merge current position into experience array
                    final title = _currentTitleCtrl.text.trim();
                    final company = _currentCompanyCtrl.text.trim();
                    final loc = _currentLocationCtrl.text.trim();
                    List<dynamic> experience = List<dynamic>.from(
                      _formData['experience'] ?? [],
                    );
                    final currentIndex = experience.indexWhere(
                      (e) => (e is Map && e['current'] == true),
                    );
                    final payload = {
                      'title': title,
                      'company': company,
                      'location': loc,
                      'current': true,
                    };
                    if (title.isNotEmpty ||
                        company.isNotEmpty ||
                        loc.isNotEmpty) {
                      if (currentIndex >= 0) {
                        // Replace current
                        experience[currentIndex] = {
                          ...Map<String, dynamic>.from(
                            experience[currentIndex] as Map,
                          ),
                          ...payload,
                        };
                      } else {
                        experience.insert(0, payload);
                      }
                    } else if (currentIndex >= 0) {
                      // Remove if fields all empty
                      experience.removeAt(currentIndex);
                    }
                    _formData['experience'] = experience;
                    await widget.onSave(_formData);
                    Navigator.pop(context);
                  },
                  child: const Text('Save'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileDetailsSheet extends StatefulWidget {
  final Map<String, dynamic> profile;
  final Future<void> Function(Map<String, dynamic>) onSave;

  const _ProfileDetailsSheet({required this.profile, required this.onSave});

  @override
  State<_ProfileDetailsSheet> createState() => _ProfileDetailsSheetState();
}

class _ProfileDetailsSheetState extends State<_ProfileDetailsSheet> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _phoneCtrl;
  late TextEditingController _locationCtrl;
  late TextEditingController _institutionCtrl;
  late TextEditingController _courseCtrl;
  late TextEditingController _yearCtrl;
  late TextEditingController _favTeacherCtrl;
  late TextEditingController _socialCtrl;
  late DateTime? _dob;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _phoneCtrl = TextEditingController(text: widget.profile['phone'] ?? '');
    _locationCtrl = TextEditingController(
      text: widget.profile['location'] ?? '',
    );
    _institutionCtrl = TextEditingController(
      text: widget.profile['institution'] ?? '',
    );
    _courseCtrl = TextEditingController(text: widget.profile['course'] ?? '');
    _yearCtrl = TextEditingController(text: widget.profile['year'] ?? '');
    _favTeacherCtrl = TextEditingController(
      text: widget.profile['favouriteTeacher'] ?? '',
    );
    _socialCtrl = TextEditingController(
      text: widget.profile['socialMedia'] ?? '',
    );
    _dob = widget.profile['dob'] != null
        ? DateTime.tryParse(widget.profile['dob'])
        : null;
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 44,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(24),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Complete your profile',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 12),
          Text(
            'Share personal, academic and contact details so alumni can discover you easily.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey.shade600, height: 1.4),
          ),
          const SizedBox(height: 20),
          Form(
            key: _formKey,
            child: SingleChildScrollView(
              child: Column(
                children: [
                  _buildTextField(
                    controller: _phoneCtrl,
                    label: 'Phone number',
                    keyboardType: TextInputType.phone,
                  ),
                  _buildDatePickerField(),
                  _buildTextField(
                    controller: _locationCtrl,
                    label: 'Current location',
                  ),
                  _buildTextField(
                    controller: _institutionCtrl,
                    label: 'Institution',
                  ),
                  _buildTextField(
                    controller: _courseCtrl,
                    label: 'Course / Department',
                  ),
                  _buildTextField(
                    controller: _yearCtrl,
                    label: 'Graduation year',
                    keyboardType: TextInputType.number,
                  ),
                  _buildTextField(
                    controller: _favTeacherCtrl,
                    label: 'Favourite faculty',
                  ),
                  _buildTextField(
                    controller: _socialCtrl,
                    label: 'Other social handles',
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _saving ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0A66C2),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: _saving
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text(
                              'Save details',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        decoration: InputDecoration(
          labelText: label,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }

  Widget _buildDatePickerField() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GestureDetector(
        onTap: () async {
          final now = DateTime.now();
          final initial = _dob ?? DateTime(now.year - 18, now.month, now.day);
          final picked = await showDatePicker(
            context: context,
            initialDate: initial,
            firstDate: DateTime(1950),
            lastDate: DateTime(now.year - 10),
          );
          if (picked != null) {
            setState(() {
              _dob = picked;
            });
          }
        },
        child: InputDecorator(
          decoration: InputDecoration(
            labelText: 'Date of birth',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                _dobLabel,
                style: TextStyle(
                  color: _dob != null ? Colors.black87 : Colors.grey.shade500,
                ),
              ),
              const Icon(
                Icons.calendar_month_outlined,
                color: Color(0xFF0A66C2),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submit() async {
    setState(() => _saving = true);
    final payload = {
      'phone': _phoneCtrl.text.trim(),
      'dob': _dob?.toIso8601String(),
      'location': _locationCtrl.text.trim(),
      'institution': _institutionCtrl.text.trim(),
      'course': _courseCtrl.text.trim(),
      'year': _yearCtrl.text.trim(),
      'favouriteTeacher': _favTeacherCtrl.text.trim(),
      'socialMedia': _socialCtrl.text.trim(),
    };
    await widget.onSave(payload);
    if (mounted) setState(() => _saving = false);
  }

  String get _dobLabel {
    if (_dob == null) return 'Tap to select date';
    final date = _dob!;
    return '${date.day.toString().padLeft(2, '0')} '
        '${_monthLabel(date.month)} ${date.year}';
  }

  String _monthLabel(int month) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    if (month < 1 || month > 12) return '';
    return months[month - 1];
  }
}

class _PrivacySettingsDialog extends StatefulWidget {
  final Map<String, dynamic> privacySettings;
  final Function(Map<String, dynamic>) onSave;

  const _PrivacySettingsDialog({
    required this.privacySettings,
    required this.onSave,
  });

  @override
  State<_PrivacySettingsDialog> createState() => _PrivacySettingsDialogState();
}

class _PrivacySettingsDialogState extends State<_PrivacySettingsDialog> {
  late Map<String, dynamic> _settings;

  @override
  void initState() {
    super.initState();
    _settings = Map.from(widget.privacySettings);

    // Set defaults if not present
    _settings['profileVisibility'] ??= 'public';
    _settings['showEmail'] ??= false;
    _settings['showPhone'] ??= false;
    _settings['showExperience'] ??= true;
    _settings['showEducation'] ??= true;
    _settings['showSkills'] ??= true;
    _settings['showConnections'] ??= true;
    _settings['allowMessages'] ??= true;
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      child: Container(
        width: MediaQuery.of(context).size.width * 0.9,
        height: MediaQuery.of(context).size.height * 0.7,
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const Text(
              'Privacy Settings',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Profile Visibility',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: _settings['profileVisibility'],
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'public',
                          child: Text('Public'),
                        ),
                        DropdownMenuItem(
                          value: 'private',
                          child: Text('Private'),
                        ),
                      ],
                      onChanged: (value) {
                        setState(() {
                          _settings['profileVisibility'] = value;
                        });
                      },
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'What others can see',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    SwitchListTile(
                      title: const Text('Show Email'),
                      subtitle: const Text('Allow others to see your email'),
                      value: _settings['showEmail'],
                      onChanged: (value) {
                        setState(() {
                          _settings['showEmail'] = value;
                        });
                      },
                    ),
                    SwitchListTile(
                      title: const Text('Show Phone'),
                      subtitle: const Text(
                        'Allow others to see your phone number',
                      ),
                      value: _settings['showPhone'],
                      onChanged: (value) {
                        setState(() {
                          _settings['showPhone'] = value;
                        });
                      },
                    ),
                    SwitchListTile(
                      title: const Text('Show Experience'),
                      subtitle: const Text(
                        'Allow others to see your work experience',
                      ),
                      value: _settings['showExperience'],
                      onChanged: (value) {
                        setState(() {
                          _settings['showExperience'] = value;
                        });
                      },
                    ),
                    SwitchListTile(
                      title: const Text('Show Education'),
                      subtitle: const Text(
                        'Allow others to see your education',
                      ),
                      value: _settings['showEducation'],
                      onChanged: (value) {
                        setState(() {
                          _settings['showEducation'] = value;
                        });
                      },
                    ),
                    SwitchListTile(
                      title: const Text('Show Skills'),
                      subtitle: const Text('Allow others to see your skills'),
                      value: _settings['showSkills'],
                      onChanged: (value) {
                        setState(() {
                          _settings['showSkills'] = value;
                        });
                      },
                    ),
                    SwitchListTile(
                      title: const Text('Show Connections'),
                      subtitle: const Text(
                        'Allow others to see your connections',
                      ),
                      value: _settings['showConnections'],
                      onChanged: (value) {
                        setState(() {
                          _settings['showConnections'] = value;
                        });
                      },
                    ),
                    SwitchListTile(
                      title: const Text('Allow Messages'),
                      subtitle: const Text('Allow others to send you messages'),
                      value: _settings['allowMessages'],
                      onChanged: (value) {
                        setState(() {
                          _settings['allowMessages'] = value;
                        });
                      },
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () {
                    widget.onSave(_settings);
                    Navigator.pop(context);
                  },
                  child: const Text('Save'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
