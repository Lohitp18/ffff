import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';

class UserProfileViewPage extends StatefulWidget {
  final String userId;

  const UserProfileViewPage({super.key, required this.userId});

  @override
  State<UserProfileViewPage> createState() => _UserProfileViewPageState();
}

class _UserProfileViewPageState extends State<UserProfileViewPage> {
  final String _baseUrl = const String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000',
  );

  Map<String, dynamic>? _userProfile;
  bool _loading = true;
  String? _error;
  bool _loadingPosts = true;
  List<dynamic> _userPosts = [];
  bool _loadingEvents = true;
  bool _loadingOpportunities = true;
  List<dynamic> _userEvents = [];
  List<dynamic> _userOpportunities = [];
  String? _connectionStatus; // 'none', 'pending', 'accepted'
  bool _isFollowing = false;
  bool _followLoading = false;

  @override
  void initState() {
    super.initState();
    _loadUserProfile();
    _loadUserPosts();
    _loadUserEvents();
    _loadUserOpportunities();
    _checkConnectionStatus();
  }

  String? _normalizedUrl(dynamic url) {
    if (url == null) return null;
    final value = url.toString().trim();
    if (value.isEmpty) return null;
    if (value.startsWith('http')) return Uri.encodeFull(value);
    return Uri.encodeFull(_baseUrl + (value.startsWith('/') ? value : '/$value'));
  }

  Future<void> _loadUserProfile() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      final headers = {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

      final response = await http.get(
        Uri.parse('$_baseUrl/api/users/${widget.userId}'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        setState(() => _userProfile = jsonDecode(response.body));
      } else if (response.statusCode == 403) {
        setState(() => _error = 'This profile is private');
      } else if (response.statusCode == 404) {
        setState(() => _error = 'User not found');
      } else {
        setState(() => _error = 'Failed to load profile');
      }
    } catch (e) {
      setState(() => _error = 'Failed to load profile');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _loadUserPosts() async {
    setState(() {
      _loadingPosts = true;
    });

    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      final headers = {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

      final response = await http.get(
        Uri.parse('$_baseUrl/api/posts/user/${widget.userId}'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        setState(() {
          _userPosts = jsonDecode(response.body) as List<dynamic>;
        });
      }
    } catch (e) {
      // Silently fail - posts section will show empty
    } finally {
      setState(() {
        _loadingPosts = false;
      });
    }
  }

  bool _isUserMatch(dynamic postedBy) {
    if (postedBy == null) return false;
    final id = postedBy is Map ? postedBy['_id'] ?? postedBy['id'] : postedBy;
    return id?.toString() == widget.userId;
  }

  Future<void> _loadUserEvents() async {
    setState(() => _loadingEvents = true);
    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      final headers = {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };
      final response = await http.get(
        Uri.parse('$_baseUrl/api/content/events'),
        headers: headers,
      );
      if (response.statusCode == 200) {
        final items = jsonDecode(response.body) as List<dynamic>;
        setState(() {
          _userEvents = items.where((e) => _isUserMatch(e['postedBy'])).toList();
        });
      }
    } catch (_) {
      setState(() => _userEvents = []);
    } finally {
      setState(() => _loadingEvents = false);
    }
  }

  Future<void> _loadUserOpportunities() async {
    setState(() => _loadingOpportunities = true);
    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      final headers = {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };
      final response = await http.get(
        Uri.parse('$_baseUrl/api/content/opportunities'),
        headers: headers,
      );
      if (response.statusCode == 200) {
        final items = jsonDecode(response.body) as List<dynamic>;
        setState(() {
          _userOpportunities = items.where((o) => _isUserMatch(o['postedBy'])).toList();
        });
      }
    } catch (_) {
      setState(() => _userOpportunities = []);
    } finally {
      setState(() => _loadingOpportunities = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        backgroundColor: Colors.grey.shade100,
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null || _userProfile == null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Profile'),
          backgroundColor: Colors.white,
          elevation: 0,
        ),
        backgroundColor: Colors.grey.shade100,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.person_off, size: 64, color: Colors.grey.shade400),
              const SizedBox(height: 16),
              Text(
                _error ?? 'Profile not found',
                style: const TextStyle(fontSize: 18),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Go Back'),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.grey.shade100,
      appBar: AppBar(
        title: Text(_userProfile!['name'] ?? 'Profile'),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.more_vert),
            onPressed: _showOptionsDialog,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await _loadUserProfile();
          await _loadUserPosts();
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildProfileHeader(),
              _buildSection(_buildAboutContent(), title: 'About'),
              _buildSection(_buildHighlightsContent(), title: 'Highlights'),
              _buildSection(_buildExperienceContent(), title: 'Experience'),
              _buildSection(_buildEducationContent(), title: 'Education'),
              _buildSection(_buildSkillsContent(), title: 'Skills'),
              _buildSection(_buildContactLinksContent(), title: 'Contact & Links'),
              _buildSection(_buildEventsContent(), title: 'Events'),
              _buildSection(_buildOpportunitiesContent(), title: 'Opportunities'),
              _buildSection(_buildPostsContent(), title: 'Posts'),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  // ------------------ PROFILE HEADER (LinkedIn Style) ------------------
  Widget _buildProfileHeader() {
    return Container(
      color: Colors.white,
      child: Column(
        children: [
          // Enhanced Cover Image with Gradient Overlay
          Container(
            height: 200,
            width: double.infinity,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  const Color(0xFF0A66C2),
                  const Color(0xFF004182),
                ],
              ),
              image: _normalizedUrl(_userProfile!['coverImage']) != null
                  ? DecorationImage(
                      image: NetworkImage(_normalizedUrl(_userProfile!['coverImage'])!),
                      fit: BoxFit.cover,
                    )
                  : null,
            ),
            child: _normalizedUrl(_userProfile!['coverImage']) != null
                ? Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.transparent,
                          Colors.black.withOpacity(0.3),
                        ],
                      ),
                    ),
                  )
                : null,
          ),
          
          // Profile Info Section
          Container(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                // Profile Image (overlapping) - Enhanced with better error handling
                Transform.translate(
                  offset: const Offset(0, -60),
                  child: Container(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 4),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 20,
                          spreadRadius: 5,
                        ),
                      ],
                    ),
                    child: CircleAvatar(
                      radius: 60,
                      backgroundColor: Colors.grey.shade200,
                      child: _normalizedUrl(_userProfile!['profileImage']) != null
                          ? ClipOval(
                              child: Image.network(
                                _normalizedUrl(_userProfile!['profileImage'])!,
                                width: 120,
                                height: 120,
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) {
                                  print('Image load error: $error');
                                  return Container(
                                    width: 120,
                                    height: 120,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      gradient: LinearGradient(
                                        colors: [Colors.blue.shade300, Colors.blue.shade600],
                                        begin: Alignment.topLeft,
                                        end: Alignment.bottomRight,
                                      ),
                                    ),
                                    child: Icon(
                                      Icons.person,
                                      size: 60,
                                      color: Colors.white,
                                    ),
                                  );
                                },
                                loadingBuilder: (context, child, loadingProgress) {
                                  if (loadingProgress == null) return child;
                                  return Container(
                                    width: 120,
                                    height: 120,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: Colors.grey.shade200,
                                    ),
                                    child: Center(
                                      child: CircularProgressIndicator(
                                        value: loadingProgress.expectedTotalBytes != null
                                            ? loadingProgress.cumulativeBytesLoaded /
                                                loadingProgress.expectedTotalBytes!
                                            : null,
                                      ),
                                    ),
                                  );
                                },
                              ),
                            )
                          : Container(
                              width: 120,
                              height: 120,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: LinearGradient(
                                  colors: [Colors.blue.shade300, Colors.blue.shade600],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                ),
                              ),
                              child: Icon(
                                Icons.person,
                                size: 60,
                                color: Colors.white,
                              ),
                            ),
                    ),
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
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
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
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          if (_userProfile!['location'] != null) ...[
                  const SizedBox(height: 4),
                Text(
                  _userProfile!['location'],
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade600,
                    ),
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

                // Enhanced Action Buttons
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      Expanded(
                        flex: 2,
                        child: Container(
                          decoration: BoxDecoration(
                            gradient: _isFollowing
                                ? null
                                : LinearGradient(
                                    colors: [const Color(0xFF0A66C2), const Color(0xFF004182)],
                                  ),
                            borderRadius: BorderRadius.circular(25),
                          ),
                          child: ElevatedButton(
                            onPressed: _followLoading ? null : (_isFollowing ? _unfollow : _sendConnectionRequest),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _isFollowing ? Colors.grey.shade200 : Colors.transparent,
                              foregroundColor: _isFollowing ? Colors.black87 : Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(25),
                              ),
                              elevation: _isFollowing ? 0 : 3,
                              shadowColor: Colors.blue.withOpacity(0.3),
                            ),
                            child: _followLoading
                                ? SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                        _isFollowing ? Colors.blue : Colors.white,
                                      ),
                                    ),
                                  )
                                : Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        _isFollowing ? Icons.check : Icons.person_add,
                                        size: 18,
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        _isFollowing
                                            ? (_connectionStatus == 'pending' ? 'Pending' : 'Following')
                                            : 'Connect',
                                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                                      ),
                                    ],
                                  ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Container(
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(25),
                        ),
                        child: IconButton(
                          onPressed: _showOptionsDialog,
                          icon: const Icon(Icons.more_horiz, color: Colors.black54),
                          style: IconButton.styleFrom(
                            padding: const EdgeInsets.all(12),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 18, color: const Color(0xFF0A66C2)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                color: Colors.grey.shade800,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  // ------------------ ABOUT ------------------
  Widget _buildAboutContent() {
    final bio = _userProfile!['bio'] as String?;
    if (bio == null || bio.isEmpty) return const SizedBox.shrink();
    return Text(
      bio,
      style: const TextStyle(fontSize: 15, height: 1.5, color: Colors.black87),
    );
  }

  // ------------------ HIGHLIGHTS ------------------
  Widget _buildHighlightsContent() {
    final experience = _userProfile!['experience'] as List<dynamic>? ?? [];
    final education = _userProfile!['education'] as List<dynamic>? ?? [];
    final skills = _userProfile!['skills'] as List<dynamic>? ?? [];

    if (experience.isEmpty && education.isEmpty && skills.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (experience.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: RichText(
              text: TextSpan(
                style: const TextStyle(fontSize: 14, color: Colors.black54, height: 1.5),
                children: [
                  const TextSpan(text: 'Experience: ', style: TextStyle(fontWeight: FontWeight.w600, color: Colors.black87)),
                  TextSpan(text: '${experience.length} ${experience.length == 1 ? 'position' : 'positions'}'),
                ],
              ),
            ),
          ),
        if (education.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: RichText(
              text: TextSpan(
                style: const TextStyle(fontSize: 14, color: Colors.black54, height: 1.5),
                children: [
                  const TextSpan(text: 'Education: ', style: TextStyle(fontWeight: FontWeight.w600, color: Colors.black87)),
                  TextSpan(text: '${education.length} ${education.length == 1 ? 'school' : 'schools'}'),
                ],
              ),
            ),
          ),
        if (skills.isNotEmpty)
          RichText(
            text: TextSpan(
              style: const TextStyle(fontSize: 14, color: Colors.black54, height: 1.5),
              children: [
                const TextSpan(text: 'Skills: ', style: TextStyle(fontWeight: FontWeight.w600, color: Colors.black87)),
                TextSpan(text: '${skills.length} ${skills.length == 1 ? 'skill' : 'skills'}'),
              ],
            ),
          ),
      ],
    );
  }

  // ------------------ EXPERIENCE ------------------
  Widget _buildExperienceContent() {
    final experience = _userProfile!['experience'] as List<dynamic>? ?? [];
    if (experience.isEmpty) return const SizedBox.shrink();

    return Column(
      children: experience.map((exp) => _buildExperienceItem(exp)).toList(),
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
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  exp['company'] ?? 'No Company',
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF0A66C2),
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                if (exp['location'] != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    exp['location'],
                    style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                  ),
                ],
                Text(
                  _formatDateRange(exp['startDate'], exp['endDate'], exp['current']),
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                ),
                if (exp['description'] != null && exp['description'].toString().isNotEmpty) ...[
            const SizedBox(height: 8),
                  Text(
                    exp['description'],
                    style: TextStyle(fontSize: 14, color: Colors.grey.shade700, height: 1.4),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ------------------ EDUCATION ------------------
  Widget _buildEducationContent() {
    final education = _userProfile!['education'] as List<dynamic>? ?? [];
    if (education.isEmpty) return const SizedBox.shrink();

    return Column(
      children: education.map((edu) => _buildEducationItem(edu)).toList(),
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
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  '${edu['degree'] ?? 'No Degree'}${edu['fieldOfStudy'] != null ? ' in ${edu['fieldOfStudy']}' : ''}',
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF0A66C2),
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  _formatDateRange(edu['startDate'], edu['endDate'], edu['current']),
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                ),
                if (edu['description'] != null && edu['description'].toString().isNotEmpty) ...[
            const SizedBox(height: 8),
                  Text(
                    edu['description'],
                    style: TextStyle(fontSize: 14, color: Colors.grey.shade700, height: 1.4),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ------------------ SKILLS ------------------
  Widget _buildSkillsContent() {
    final skills = _userProfile!['skills'] as List<dynamic>? ?? [];
    if (skills.isEmpty) return const SizedBox.shrink();

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: skills.map((skill) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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
      )).toList(),
    );
  }

  // ------------------ CONTACT & LINKS ------------------
  Widget _buildContactLinksContent() {
    final website = _userProfile!['website'] as String?;
    final linkedin = _userProfile!['linkedin'] as String?;
    final twitter = _userProfile!['twitter'] as String?;
    final github = _userProfile!['github'] as String?;

    if (website == null && linkedin == null && twitter == null && github == null) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (website != null)
          _buildLinkTile(Icons.language, 'Website', website, () => _launchURL(website!)),
        if (linkedin != null)
          _buildLinkTile(Icons.business, 'LinkedIn', linkedin, () => _launchURL(linkedin!)),
        if (twitter != null)
          _buildLinkTile(Icons.chat_bubble_outline, 'Twitter', twitter, () => _launchURL(twitter!)),
        if (github != null)
          _buildLinkTile(Icons.code, 'GitHub', github, () => _launchURL(github!)),
      ],
    );
  }

  Widget _buildLinkTile(IconData icon, String title, String url, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: const Color(0xFF0A66C2), size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    url,
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey.shade600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey.shade400),
          ],
        ),
      ),
    );
  }

  Future<void> _launchURL(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  // ------------------ POSTS ------------------
  Widget _buildPostsContent() {
    if (_loadingPosts) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24.0),
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (_userPosts.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(16.0),
        child: Center(
          child: Column(
            children: [
              Icon(Icons.article_outlined, size: 48, color: Colors.grey.shade400),
              const SizedBox(height: 8),
              Text(
                'No posts yet.',
                style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      children: _userPosts.map((post) => _buildPostCard(post)).toList(),
    );
  }

  // ------------------ EVENTS ------------------
  Widget _buildEventsContent() {
    if (_loadingEvents) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(16.0),
          child: CircularProgressIndicator(),
        ),
      );
    }
    if (_userEvents.isEmpty) {
      return Text(
        'No events posted yet.',
        style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
      );
    }
    return Column(
      children: _userEvents.map((event) => _buildEventCard(event)).toList(),
    );
  }

  Widget _buildEventCard(Map<String, dynamic> event) {
    final title = event['title']?.toString() ?? '';
    final description = event['description']?.toString() ?? '';
    final date = event['date']?.toString() ?? '';
    final location = event['location']?.toString() ?? '';
    final imageUrl = _normalizedUrl(event['imageUrl']);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.08),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          if (date.isNotEmpty || location.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              [if (date.isNotEmpty) _formatPostDate(date), if (location.isNotEmpty) location]
                  .join(' • '),
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          if (imageUrl != null) ...[
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Image.network(
                imageUrl,
                height: 180,
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  height: 180,
                  color: Colors.grey.shade100,
                  child: const Icon(Icons.broken_image_outlined),
                ),
              ),
            ),
          ],
          if (description.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              description,
              style: TextStyle(fontSize: 14, color: Colors.grey.shade700, height: 1.4),
              maxLines: 4,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ),
    );
  }

  // ------------------ OPPORTUNITIES ------------------
  Widget _buildOpportunitiesContent() {
    if (_loadingOpportunities) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(16.0),
          child: CircularProgressIndicator(),
        ),
      );
    }
    if (_userOpportunities.isEmpty) {
      return Text(
        'No opportunities posted yet.',
        style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
      );
    }
    return Column(
      children: _userOpportunities.map((opp) => _buildOpportunityCard(opp)).toList(),
    );
  }

  Widget _buildOpportunityCard(Map<String, dynamic> opp) {
    final title = opp['title']?.toString() ?? '';
    final description = opp['description']?.toString() ?? '';
    final company = opp['company']?.toString() ?? '';
    final type = opp['type']?.toString() ?? '';
    final imageUrl = _normalizedUrl(opp['imageUrl']);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.08),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          if (company.isNotEmpty || type.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              [if (company.isNotEmpty) company, if (type.isNotEmpty) type].join(' • '),
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          if (imageUrl != null) ...[
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Image.network(
                imageUrl,
                height: 180,
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  height: 180,
                  color: Colors.grey.shade100,
                  child: const Icon(Icons.broken_image_outlined),
                ),
              ),
            ),
          ],
          if (description.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              description,
              style: TextStyle(fontSize: 14, color: Colors.grey.shade700, height: 1.4),
              maxLines: 4,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPostCard(Map<String, dynamic> post) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.08),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (post['title'] != null && post['title'].toString().isNotEmpty)
              Container(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  post['title'],
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            if (post['content'] != null && post['content'].toString().isNotEmpty)
              Container(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(
                  post['content'],
                  style: TextStyle(
                    fontSize: 15,
                    color: Colors.grey.shade700,
                    height: 1.6,
                  ),
                  maxLines: 4,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            if (post['imageUrl'] != null) ...[
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.network(
                    _normalizedUrl(post['imageUrl']) ?? '',
                    width: double.infinity,
                    height: 200,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Container(
                      height: 200,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        Icons.broken_image_outlined,
                        size: 48,
                        color: Colors.grey.shade400,
                      ),
                    ),
                  ),
                ),
              ),
            ],
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Icon(Icons.favorite_border, size: 14, color: Colors.red.shade400),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${post['likes']?.length ?? 0} likes',
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey.shade700,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Icon(Icons.access_time, size: 14, color: Colors.blue.shade400),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _formatPostDate(post['createdAt']),
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey.shade700,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatPostDate(dynamic date) {
    if (date == null) return '';
    try {
      final dateTime = DateTime.parse(date.toString());
      final now = DateTime.now();
      final difference = now.difference(dateTime);

      if (difference.inDays > 0) {
        return '${difference.inDays}d ago';
      } else if (difference.inHours > 0) {
        return '${difference.inHours}h ago';
      } else if (difference.inMinutes > 0) {
        return '${difference.inMinutes}m ago';
      } else {
        return 'Just now';
      }
    } catch (e) {
      return '';
    }
  }

  // ------------------ ENHANCED SECTION WRAPPER ------------------
  Widget _buildSection(Widget content, {required String title}) {
    if (content is SizedBox) return const SizedBox.shrink();
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 4,
                  height: 24,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [const Color(0xFF0A66C2), const Color(0xFF004182)],
                    ),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            content,
          ],
        ),
      ),
    );
  }

  // ------------------ HELPERS ------------------
  String _formatDateRange(String? startDate, String? endDate, bool? current) {
    final start = startDate != null ? DateTime.parse(startDate).year.toString() : '';
    final end = current == true ? 'Present' : (endDate != null ? DateTime.parse(endDate).year.toString() : '');
    if (start.isNotEmpty && end.isNotEmpty) return '$start - $end';
    if (start.isNotEmpty) return start;
    return '';
  }

  void _showOptionsDialog() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Options'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.block),
              title: const Text('Block User'),
              onTap: () { Navigator.pop(context); _blockUser(); },
            ),
            ListTile(
              leading: const Icon(Icons.flag),
              title: const Text('Report User'),
              onTap: () { Navigator.pop(context); _reportUser(); },
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        ],
      ),
    );
  }

  Future<void> _checkConnectionStatus() async {
    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      if (token == null || token.isEmpty) return;

      final response = await http.get(
        Uri.parse('$_baseUrl/api/connections'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final connections = jsonDecode(response.body) as List;
        final connection = connections.firstWhere(
          (conn) {
            final requesterId = conn['requester']?['_id'] ?? conn['requester'];
            final recipientId = conn['recipient']?['_id'] ?? conn['recipient'];
            return requesterId == widget.userId || recipientId == widget.userId;
          },
          orElse: () => null,
        );

        if (connection != null && mounted) {
          setState(() {
            _connectionStatus = connection['status'] ?? 'pending';
            _isFollowing = _connectionStatus == 'accepted' || _connectionStatus == 'pending';
          });
        } else if (mounted) {
          setState(() {
            _connectionStatus = 'none';
            _isFollowing = false;
          });
        }
      }
    } catch (e) {
      // Silently fail - connection status is optional
    }
  }

  Future<void> _sendConnectionRequest() async {
    if (_followLoading) return;
    setState(() => _followLoading = true);

    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      
      if (token == null || token.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Please login to send connection request')),
          );
        }
        return;
      }

      final response = await http.post(
        Uri.parse('$_baseUrl/api/connections/${widget.userId}'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        if (mounted) {
          setState(() {
            _isFollowing = true;
            _connectionStatus = 'pending';
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Connection request sent!'),
              backgroundColor: Colors.green,
            ),
          );
        }
        _checkConnectionStatus();
      } else {
        final errorData = jsonDecode(response.body);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(errorData['message'] ?? 'Failed to send connection request'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _followLoading = false);
    }
  }

  Future<void> _unfollow() async {
    if (_followLoading) return;
    setState(() => _followLoading = true);

    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      if (token == null || token.isEmpty) return;

      // Get connection ID first
      final connectionsResponse = await http.get(
        Uri.parse('$_baseUrl/api/connections'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (connectionsResponse.statusCode == 200) {
        final connections = jsonDecode(connectionsResponse.body) as List;
        final connection = connections.firstWhere(
          (conn) {
            final requesterId = conn['requester']?['_id'] ?? conn['requester'];
            final recipientId = conn['recipient']?['_id'] ?? conn['recipient'];
            return requesterId == widget.userId || recipientId == widget.userId;
          },
          orElse: () => null,
        );

        if (connection != null) {
          final connectionId = connection['_id'];
          final deleteResponse = await http.delete(
            Uri.parse('$_baseUrl/api/connections/$connectionId'),
            headers: {
              'Authorization': 'Bearer $token',
            },
          );

          if (deleteResponse.statusCode == 200 && mounted) {
            setState(() {
              _isFollowing = false;
              _connectionStatus = 'none';
            });
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Unfollowed successfully'),
                backgroundColor: Colors.green,
              ),
            );
          }
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to unfollow: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _followLoading = false);
    }
  }

  void _blockUser() => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('User blocked!')));
  void _reportUser() => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('User reported!')));
}
