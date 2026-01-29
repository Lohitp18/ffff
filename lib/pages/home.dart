import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'user_profile_view.dart';
import 'institution.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'package:http_parser/http_parser.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final String _baseUrl = const String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000',
  );

  String? _resolveImageUrl(dynamic url) {
    if (url == null) return null;
    final value = url.toString().trim();
    if (value.isEmpty) return null;
    if (value.startsWith('http')) return Uri.encodeFull(value);
    return Uri.encodeFull(_baseUrl + (value.startsWith('/') ? value : '/$value'));
  }

  bool _loading = true;
  String? _error;
  List<dynamic> _posts = [];

  Future<void> _logout(BuildContext context) async {
    const storage = FlutterSecureStorage();
    await storage.delete(key: 'auth_token');
    if (context.mounted) {
      Navigator.pushReplacementNamed(context, '/');
    }
  }

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  Future<void> _loadAll() async {
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

      final responses = await Future.wait([
        http.get(Uri.parse('$_baseUrl/api/content/events'), headers: headers),
        http.get(Uri.parse('$_baseUrl/api/content/opportunities'), headers: headers),
        http.get(Uri.parse('$_baseUrl/api/content/posts'), headers: headers),
        http.get(Uri.parse('$_baseUrl/api/content/institution-posts'), headers: headers),
      ]);

      if (responses.any((r) => r.statusCode != 200)) {
        throw Exception('Failed to fetch content');
      }

      List<dynamic> events = jsonDecode(responses[0].body) as List<dynamic>;
      List<dynamic> opportunities =
      jsonDecode(responses[1].body) as List<dynamic>;
      List<dynamic> posts = jsonDecode(responses[2].body) as List<dynamic>;
      List<dynamic> institutionPosts =
      jsonDecode(responses[3].body) as List<dynamic>;

      List<dynamic> allPosts = []
        ..addAll(events)
        ..addAll(opportunities)
        ..addAll(posts)
        ..addAll(institutionPosts);

      allPosts.sort((a, b) {
        DateTime dateA = DateTime.tryParse(a['date']?.toString() ??
            a['createdAt']?.toString() ??
            '') ??
            DateTime.now();
        DateTime dateB = DateTime.tryParse(b['date']?.toString() ??
            b['createdAt']?.toString() ??
            '') ??
            DateTime.now();
        return dateB.compareTo(dateA);
      });

      setState(() {
        _posts = allPosts;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load content';
      });
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  Widget _getBody() {
    if (_loading) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(
                Theme.of(context).colorScheme.primary,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Loading posts...',
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 14,
              ),
            ),
          ],
        ),
      );
    } else if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.error_outline,
                size: 64,
                color: Colors.grey[400],
              ),
              const SizedBox(height: 16),
              Text(
                _error!,
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey[700],
                  fontWeight: FontWeight.w500,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _loadAll,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                ),
              ),
            ],
          ),
        ),
      );
    } else if (_posts.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.article_outlined,
                size: 64,
                color: Colors.grey[400],
              ),
              const SizedBox(height: 16),
              Text(
                'No posts yet',
                style: TextStyle(
                  fontSize: 18,
                  color: Colors.grey[700],
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Be the first to share something!',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[600],
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    } else {
      return RefreshIndicator(
        onRefresh: _loadAll,
        child: Stack(
          children: [
            ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
              itemCount: _posts.length,
              itemBuilder: (context, index) {
                final item = _posts[index] as Map<String, dynamic>;
                final title = (item['title'] ?? '').toString();
                // Don't show email in subtitle - filter out author if it's an email
                final authorValue = item['author'];
                final subtitleValue = item['date'] ??
                    item['company'] ??
                    (authorValue != null && !authorValue.toString().contains('@') ? authorValue : null) ??
                    item['institution'] ??
                    '';
                final subtitle = subtitleValue.toString();
                final type = item['category'] ?? item['type'] ?? 'Post';

                return Container(
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 10,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Post header with user info (clickable)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
                        child: _buildUserInfoHeader(item),
                      ),

                      // Divider
                      const Divider(height: 1, thickness: 0.5),

                      // Post content section
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Post type badge
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: Theme.of(context).colorScheme.primary.withOpacity(0.3),
                                  width: 1,
                                ),
                              ),
                              child: Text(
                                type.toString().toUpperCase(),
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.5,
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                              ),
                            ),

                            const SizedBox(height: 12),

                            // Title
                            Text(
                              title,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                                color: Colors.black87,
                                height: 1.3,
                              ),
                            ),

                            const SizedBox(height: 8),

                            // Subtitle (date/author/institution/etc.)
                            Row(
                              children: [
                                Icon(
                                  Icons.access_time,
                                  size: 14,
                                  color: Colors.grey[600],
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  subtitle,
                                  style: TextStyle(
                                    color: Colors.grey[600],
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),

                            const SizedBox(height: 12),

                            // Post content
                            if (item['content'] != null &&
                                item['content'].toString().isNotEmpty)
                              Text(
                                item['content'],
                                style: TextStyle(
                                  fontSize: 15,
                                  color: Colors.grey[800],
                                  height: 1.5,
                                ),
                              ),

                            const SizedBox(height: 12),

                            // Show image if exists (supports images[0] or imageUrl)
                            if (item['images'] != null &&
                                item['images'] is List &&
                                (item['images'] as List).isNotEmpty)
                              ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Image.network(
                                  item['images'][0],
                                  fit: BoxFit.cover,
                                  height: 250,
                                  width: double.infinity,
                                  errorBuilder: (context, error, stackTrace) {
                                    return Container(
                                      height: 250,
                                      color: Colors.grey[200],
                                      child: const Center(
                                        child: Icon(Icons.broken_image, size: 50, color: Colors.grey),
                                      ),
                                    );
                                  },
                                ),
                              )
                            else if (item['imageUrl'] != null &&
                                item['imageUrl'].toString().isNotEmpty)
                              ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Image.network(
                                  '$_baseUrl${item['imageUrl']}',
                                  fit: BoxFit.cover,
                                  height: 250,
                                  width: double.infinity,
                                  errorBuilder: (context, error, stackTrace) {
                                    return Container(
                                      height: 250,
                                      color: Colors.grey[200],
                                      child: const Center(
                                        child: Icon(Icons.broken_image, size: 50, color: Colors.grey),
                                      ),
                                    );
                                  },
                                ),
                              ),

                            // Show video if exists (institution posts may contain videoUrl)
                            if (item['videoUrl'] != null && item['videoUrl'].toString().isNotEmpty) ...[
                              const SizedBox(height: 12),
                              _VideoPlayerWidget(
                                url: _resolveImageUrl(item['videoUrl']),
                                baseUrl: _baseUrl,
                              ),
                            ],

                            // Apply button for opportunities
                            if (item['applyLink'] != null && item['applyLink'].toString().isNotEmpty) ...[
                              const SizedBox(height: 12),
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton.icon(
                                  onPressed: () async {
                                    final url = item['applyLink'].toString();
                                    final uri = Uri.tryParse(url);
                                    if (uri != null) {
                                      await launchUrl(uri, mode: LaunchMode.externalApplication);
                                    }
                                  },
                                  icon: const Icon(Icons.launch, size: 18),
                                  label: const Text(
                                    'Apply Now',
                                    style: TextStyle(fontWeight: FontWeight.w600),
                                  ),
                                  style: ElevatedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),

                      // Divider
                      const Divider(height: 1, thickness: 0.5),

                      // Action buttons section - Show for ALL post types
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: [
                            _LikeButton(
                              postId: item['_id'],
                              postType: item['category'] ?? item['type'] ?? 'Post',
                              baseUrl: _baseUrl,
                              initialLiked: item['isLiked'] ?? false,
                              initialLikeCount:
                              item['likeCount'] ?? item['likes']?.length ?? 0,
                            ),
                            _ShareButton(
                              post: item,
                              baseUrl: _baseUrl,
                            ),
                            _ReportButton(
                              postId: item['_id'],
                              postType: item['category'] ?? item['type'] ?? 'Post',
                              baseUrl: _baseUrl,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),

            Positioned(
              right: 20,
              bottom: 20,
              child: FloatingActionButton.extended(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const _CreatePostPage()),
                  ).then((_) => _loadAll());
                },
                icon: const Icon(Icons.add_circle_outline, size: 24),
                label: const Text(
                  'Create Post',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 16,
                  ),
                ),
                backgroundColor: Theme.of(context).colorScheme.primary,
                foregroundColor: Colors.white,
                elevation: 4,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
          ],
        ),
      );
    }
  }

  Widget _buildUserInfoHeader(Map<String, dynamic> item) {
    // Get user information from the populated data
    final author = item['authorId'] ?? item['postedBy'];
    final authorName = author?['name'] ?? item['author'] ?? 'Unknown User';
    final authorImage = _resolveImageUrl(author?['profileImage']);
    final authorId = author?['_id'];

    // For InstitutionPost, show institution name instead of user
    if (item['institution'] != null) {
      return Row(
        children: [
          // Institution logo
          Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: Colors.blue.shade200, width: 2),
            ),
            child: CircleAvatar(
              radius: 20,
              backgroundColor: Colors.blue.shade50,
              child: ClipOval(
                child: Image.asset(
                  'assets/logo1.png',
                  width: 28,
                  height: 28,
                  fit: BoxFit.cover,
                ),
              ),
            ),
          ),

          const SizedBox(width: 12),

          // Institution name
          Expanded(
            child: GestureDetector(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => InstitutionDetailPage(institutionName: item['institution']),
                  ),
                );
              },
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item['institution'],
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                      color: Colors.black87,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    'Institution',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      );
    }

    // For regular posts with user information (show avatar + name)
    if (authorId != null) {
      return GestureDetector(
        onTap: () => _navigateToUserProfile(authorId),
        child: Row(
          children: [
            Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: Colors.blue.shade200, width: 2),
              ),
              child: CircleAvatar(
                radius: 20,
                backgroundColor: Colors.blue.shade50,
                backgroundImage: authorImage != null ? NetworkImage(authorImage) : null,
                child: authorImage == null
                    ? Text(
                        (authorName.toString().isNotEmpty ? authorName.toString()[0] : 'U').toUpperCase(),
                        style: TextStyle(
                          color: Colors.blue.shade700,
                          fontWeight: FontWeight.bold,
                        ),
                      )
                    : null,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                authorName.toString(),
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 15,
                  color: Colors.black87,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      );
    }

    // Fallback for posts without user information
    return const SizedBox.shrink();
  }

  void _navigateToUserProfile(String? userId) {
    if (userId != null) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => UserProfileViewPage(userId: userId),
        ),
      );
    }
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _getBody(),
    );
  }
}

class _VideoPlayerWidget extends StatelessWidget {
  final String? url;
  final String baseUrl;
  const _VideoPlayerWidget({required this.url, required this.baseUrl});

  @override
  Widget build(BuildContext context) {
    final safeUrl = url?.trim();
    if (safeUrl == null || safeUrl.isEmpty) return const SizedBox.shrink();

    // Check if URL is a direct video file or a link
    final isVideoFile = safeUrl.toLowerCase().endsWith('.mp4') || 
                        safeUrl.toLowerCase().endsWith('.mov') ||
                        safeUrl.toLowerCase().endsWith('.avi') ||
                        safeUrl.toLowerCase().endsWith('.webm') ||
                        safeUrl.toLowerCase().contains('/video/') ||
                        safeUrl.startsWith(baseUrl);

    if (isVideoFile) {
      // For direct video files, show a playable video widget
      return Container(
        height: 250,
        width: double.infinity,
        decoration: BoxDecoration(
          color: Colors.black,
          borderRadius: BorderRadius.circular(12),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Video thumbnail/preview
              Container(
                color: Colors.black87,
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.play_circle_filled, size: 64, color: Colors.white.withOpacity(0.9)),
                      const SizedBox(height: 8),
                      Text(
                        'Tap to play video',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.9),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              // Tap to open video
              Positioned.fill(
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () async {
                      final uri = Uri.tryParse(safeUrl);
                      if (uri != null) {
                        await launchUrl(uri, mode: LaunchMode.externalApplication);
                      }
                    },
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    } else {
      // For external video links, open in browser
      return InkWell(
        onTap: () async {
          final uri = Uri.tryParse(safeUrl);
          if (uri != null) {
            await launchUrl(uri, mode: LaunchMode.externalApplication);
          }
        },
        borderRadius: BorderRadius.circular(12),
        child: Container(
          height: 200,
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.black12,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.play_circle_fill, size: 64, color: Colors.blue.shade700),
              const SizedBox(height: 8),
              Text(
                'Tap to play video',
                style: TextStyle(
                  color: Colors.grey.shade800,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      );
    }
  }
}

class _CreatePostPage extends StatefulWidget {
  const _CreatePostPage();
  @override
  State<_CreatePostPage> createState() => _CreatePostPageState();
}

class _CreatePostPageState extends State<_CreatePostPage> {
  final String _baseUrl = const String.fromEnvironment('API_BASE_URL',
      defaultValue: 'http://10.0.2.2:5000');
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _contentCtrl = TextEditingController();
  bool _loading = false;
  File? _imageFile;

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery);
    if (picked != null) {
      setState(() { _imageFile = File(picked.path); });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
    });
    try {
      final token =
          await const FlutterSecureStorage().read(key: 'auth_token') ?? '';
      http.StreamedResponse streamed;
      if (_imageFile != null) {
        final req = http.MultipartRequest('POST', Uri.parse('$_baseUrl/api/posts'));
        req.fields['title'] = _titleCtrl.text.trim();
        req.fields['content'] = _contentCtrl.text.trim();
        if (token.isNotEmpty) req.headers['Authorization'] = 'Bearer $token';
        final ext = _imageFile!.path.split('.').last.toLowerCase();
        final subtype = (ext == 'jpg') ? 'jpeg' : ext;
        req.files.add(await http.MultipartFile.fromPath(
          'image',
          _imageFile!.path,
          contentType: MediaType('image', subtype),
        ));
        streamed = await req.send();
      } else {
        final res = await http.post(
          Uri.parse('$_baseUrl/api/posts'),
          headers: {
            'Content-Type': 'application/json',
            if (token.isNotEmpty) 'Authorization': 'Bearer $token',
          },
          body: jsonEncode({
            'title': _titleCtrl.text.trim(),
            'content': _contentCtrl.text.trim(),
          }),
        );
        // Convert to StreamedResponse-like handling
        streamed = http.StreamedResponse(
          Stream.value(res.bodyBytes),
          res.statusCode,
          headers: res.headers,
          reasonPhrase: res.reasonPhrase,
          request: res.request,
        );
      }
      if (streamed.statusCode == 201) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
              content: Text('Post submitted for verification')));
          Navigator.pop(context);
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: ${streamed.statusCode}')));
        }
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Network error')));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create Post')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              TextFormField(
                controller: _titleCtrl,
                decoration: const InputDecoration(
                    labelText: 'Title', border: OutlineInputBorder()),
                validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _contentCtrl,
                decoration: const InputDecoration(
                    labelText: 'Content', border: OutlineInputBorder()),
                maxLines: 5,
                validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: _pickImage,
                  icon: const Icon(Icons.add_a_photo),
                  label: const Text('Add image (optional)'),
                ),
              ),
              if (_imageFile != null)
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.file(
                    _imageFile!,
                    height: 180,
                    width: double.infinity,
                    fit: BoxFit.cover,
                  ),
                ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? const CircularProgressIndicator()
                      : const Text('Submit'),
                ),
              )
            ],
          ),
        ),
      ),
    );
  }
}

class _LikeButton extends StatefulWidget {
  final String postId;
  final String postType;
  final String baseUrl;
  final bool initialLiked;
  final int initialLikeCount;

  const _LikeButton({
    required this.postId,
    required this.postType,
    required this.baseUrl,
    required this.initialLiked,
    required this.initialLikeCount,
  });

  @override
  State<_LikeButton> createState() => _LikeButtonState();
}

class _LikeButtonState extends State<_LikeButton> {
  late bool _isLiked;
  late int _likeCount;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _isLiked = widget.initialLiked;
    _likeCount = widget.initialLikeCount;
  }

  Future<void> _toggleLike() async {
    if (_isLoading) return;

    setState(() {
      _isLoading = true;
    });

    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');

      if (token == null || token.isEmpty) {
        throw Exception('Authentication required');
      }

      // Determine the correct endpoint based on post type
      String endpoint;
      final lowerType = widget.postType.toLowerCase();
      if (lowerType == 'event') {
        endpoint = '${widget.baseUrl}/api/content/events/${widget.postId}/like';
      } else if (lowerType == 'opportunity') {
        endpoint = '${widget.baseUrl}/api/content/opportunities/${widget.postId}/like';
      } else if (lowerType == 'institutionpost' || lowerType == 'institution_post') {
        endpoint = '${widget.baseUrl}/api/content/institution-posts/${widget.postId}/like';
      } else {
        // Regular Post
        endpoint = '${widget.baseUrl}/api/posts/${widget.postId}/like';
      }

      final response = await http.patch(
        Uri.parse(endpoint),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _isLiked = data['liked'];
          _likeCount = data['likeCount'];
        });
      } else {
        throw Exception('Failed to toggle like');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update like: $e')),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: _isLoading ? null : _toggleLike,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (_isLoading)
                SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      _isLiked ? Colors.blue : Colors.grey,
                    ),
                  ),
                )
              else
                Icon(
                  _isLiked ? Icons.thumb_up_rounded : Icons.thumb_up_outlined,
                  size: 20,
                  color: _isLiked ? Colors.blue : Colors.grey[600],
                ),
              const SizedBox(width: 6),
              Text(
                _likeCount > 0 ? '$_likeCount' : 'Like',
                style: TextStyle(
                  color: _isLiked ? Colors.blue : Colors.grey[700],
                  fontWeight: _isLiked ? FontWeight.w600 : FontWeight.w500,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ShareButton extends StatelessWidget {
  final Map<String, dynamic> post;
  final String baseUrl;

  const _ShareButton({
    required this.post,
    required this.baseUrl,
  });

  Future<void> _handleShare(BuildContext context) async {
    try {
      final title = post['title']?.toString() ?? 'Check this post!';
      final content = post['content']?.toString() ?? '';
      final author = post['authorId']?['name'] ?? post['author'] ?? 'Someone';
      final shareText = '$title\n\n$content\n\n- Shared from Alumni Portal by $author';
      
      showModalBottomSheet(
        context: context,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        builder: (context) => Container(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const Text(
                'Share Post',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildShareOption(
                    context: context,
                    icon: Icons.public,
                    label: 'Share to Portal',
                    color: Theme.of(context).colorScheme.primary,
                    onTap: () => _shareToPortal(context),
                  ),
                  _buildShareOption(
                    context: context,
                    icon: Icons.share,
                    label: 'WhatsApp',
                    color: const Color(0xFF25D366),
                    onTap: () => _shareToWhatsApp(context, shareText),
                  ),
                  _buildShareOption(
                    context: context,
                    icon: Icons.copy,
                    label: 'Copy',
                    color: Colors.grey,
                    onTap: () => _copyToClipboard(context, shareText),
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
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 32, color: color),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _shareToWhatsApp(BuildContext context, String text) async {
    try {
      final encodedText = Uri.encodeComponent(text);
      final url = 'whatsapp://send?text=$encodedText';
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      } else {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('WhatsApp not installed')),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to share: $e')),
        );
      }
    }
  }

  Future<void> _shareToEmail(BuildContext context, String text) async {
    try {
      final encodedText = Uri.encodeComponent(text);
      final url = 'mailto:?subject=Check this post from Alumni Portal!&body=$encodedText';
      final uri = Uri.parse(url);
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to share: $e')),
        );
      }
    }
  }

  Future<void> _copyToClipboard(BuildContext context, String text) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Copied to clipboard!'),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _shareToPortal(BuildContext context) async {
    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');

      if (token == null || token.isEmpty) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Authentication required')),
          );
        }
        return;
      }

      final title = post['title']?.toString() ?? 'Shared Post';
      final content = post['content']?.toString() ?? post['description']?.toString() ?? '';
      final originalType = post['category'] ?? post['type'] ?? 'Post';
      
      // Create a shared post that goes to admin for approval
      final response = await http.post(
        Uri.parse('${baseUrl}/api/posts/share'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'title': 'Shared: $title',
          'content': content.isNotEmpty 
              ? '$content\n\n[Shared from $originalType]'
              : '[Shared from $originalType]',
          'originalPostId': post['_id'],
          'originalPostType': originalType,
        }),
      );

      if (response.statusCode == 201) {
        if (context.mounted) {
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Post shared! It will be visible after admin approval.'),
              duration: Duration(seconds: 3),
            ),
          );
        }
      } else {
        throw Exception('Failed to share post');
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to share: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: () => _handleShare(context),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.share_outlined,
                size: 20,
                color: Colors.grey[700],
              ),
              const SizedBox(width: 6),
              Text(
                'Share',
                style: TextStyle(
                  color: Colors.grey[700],
                  fontWeight: FontWeight.w500,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ReportButton extends StatelessWidget {
  final String postId;
  final String postType;
  final String baseUrl;

  const _ReportButton({
    required this.postId,
    required this.postType,
    required this.baseUrl,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: () => _showReportDialog(context),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.flag_outlined,
                size: 20,
                color: Colors.grey[700],
              ),
              const SizedBox(width: 6),
              Text(
                'Report',
                style: TextStyle(
                  color: Colors.grey[700],
                  fontWeight: FontWeight.w500,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showReportDialog(BuildContext context) {
    final TextEditingController descriptionController = TextEditingController();
    final formKey = GlobalKey<FormState>();
    final ValueNotifier<String?> selectedReason = ValueNotifier<String?>(null);

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) => ValueListenableBuilder<String?>(
            valueListenable: selectedReason,
            builder: (context, reason, _) => AlertDialog(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              title: Row(
                children: [
                  Icon(Icons.flag, color: Colors.red[600], size: 24),
                  const SizedBox(width: 8),
                  const Text(
                    'Report Post',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              content: Form(
                key: formKey,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Please select a reason for reporting this post:',
                        style: TextStyle(
                          color: Colors.grey[700],
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 16),
                      DropdownButtonFormField<String>(
                        value: reason,
                        decoration: InputDecoration(
                          labelText: 'Reason',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          filled: true,
                          fillColor: Colors.grey[50],
                        ),
                        items: const [
                          DropdownMenuItem(value: 'spam', child: Text('Spam')),
                          DropdownMenuItem(value: 'inappropriate_content', child: Text('Inappropriate Content')),
                          DropdownMenuItem(value: 'harassment', child: Text('Harassment')),
                          DropdownMenuItem(value: 'false_information', child: Text('False Information')),
                          DropdownMenuItem(value: 'copyright_violation', child: Text('Copyright Violation')),
                          DropdownMenuItem(value: 'other', child: Text('Other')),
                        ],
                        onChanged: (value) {
                          selectedReason.value = value;
                        },
                        validator: (value) {
                          if (value == null) {
                            return 'Please select a reason';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: descriptionController,
                        decoration: InputDecoration(
                          labelText: 'Additional Details (Optional)',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          filled: true,
                          fillColor: Colors.grey[50],
                          hintText: 'Please provide more details...',
                        ),
                        maxLines: 3,
                      ),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text(
                    'Cancel',
                    style: TextStyle(color: Colors.grey[700]),
                  ),
                ),
                ElevatedButton(
                  onPressed: () {
                    if (formKey.currentState!.validate()) {
                      Navigator.pop(context);
                      _submitReport(context, reason, descriptionController.text);
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red[600],
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: const Text(
                    'Submit Report',
                    style: TextStyle(color: Colors.white),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _submitReport(BuildContext context, String? reason, String description) async {
    if (reason == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a reason')),
      );
      return;
    }

    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');

      if (token == null || token.isEmpty) {
        throw Exception('Authentication required');
      }

      // Determine the correct endpoint based on post type
      String endpoint;
      final lowerType = postType.toLowerCase();
      if (lowerType == 'event') {
        endpoint = '$baseUrl/api/content/events/$postId/report';
      } else if (lowerType == 'opportunity') {
        endpoint = '$baseUrl/api/content/opportunities/$postId/report';
      } else if (lowerType == 'institutionpost' || lowerType == 'institution_post') {
        endpoint = '$baseUrl/api/content/institution-posts/$postId/report';
      } else {
        // Regular Post
        endpoint = '$baseUrl/api/posts/$postId/report';
      }

      final response = await http.post(
        Uri.parse(endpoint),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'reason': reason,
          'description': description,
        }),
      );

      if (response.statusCode == 201) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Report submitted successfully')),
        );
      } else {
        final data = jsonDecode(response.body);
        throw Exception(data['message'] ?? 'Failed to submit report');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to submit report: $e')),
      );
    }
  }
}