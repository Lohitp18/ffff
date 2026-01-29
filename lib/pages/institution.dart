import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:http_parser/http_parser.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class InstitutionsPage extends StatefulWidget {
  const InstitutionsPage({super.key});

  @override
  State<InstitutionsPage> createState() => _InstitutionsPageState();
}

class _InstitutionsPageState extends State<InstitutionsPage> {
  final List<String> _institutions = const [
    "Alva's Pre-University College, Vidyagiri",
    "Alva's Degree College, Vidyagiri",
    "Alva's Centre for Post Graduate Studies and Research, Vidyagiri",
    "Alva's College of Education, Vidyagiri",
    "Alva's College of Physical Education, Vidyagiri",
    // Professional & Medical Institutions
    "Alva's Institute of Engineering & Technology (AIET), Mijar",
    "Alva's Ayurvedic Medical College, Vidyagiri",
    "Alva's Homeopathic Medical College, Mijar",
    "Alva's College of Naturopathy and Yogic Science, Mijar",
    "Alva's College of Physiotherapy, Moodbidri",
    "Alva's College of Nursing, Moodbidri",
    "Alva's Institute of Nursing, Moodbidri",
    "Alva's College of Medical Laboratory Technology, Moodbidri",
    "Alva's Law College, Moodbidri",
    // Other Notable
    "Alva's College, Moodbidri (Affiliated with Mangalore University)",
    "Alva's College of Nursing (Affiliated with Rajiv Gandhi University of Health Sciences, Bangalore)",
    "Alva's Institute of Engineering & Technology (AIET) (Affiliated with Visvesvaraya Technological University, Belgaum)",
  ];

  String _query = '';

  @override
  Widget build(BuildContext context) {
    final List<String> filtered = _institutions
        .where((i) => i.toLowerCase().contains(_query.toLowerCase()))
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Institutions'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
        elevation: 0,
        automaticallyImplyLeading: false,
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.blue.shade700, Colors.blue.shade400],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: TextField(
              decoration: InputDecoration(
                labelText: 'Search institutions',
                prefixIcon: const Icon(Icons.search, color: Colors.white),
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(25),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
              ),
              onChanged: (v) => setState(() { _query = v; }),
            ),
          ),
          Expanded(
            child: GridView.builder(
        padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 1,
                childAspectRatio: 2.5,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
              ),
              itemCount: filtered.length,
        itemBuilder: (_, i) {
                final name = filtered[i];
                return _buildInstitutionCard(name);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInstitutionCard(String name) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => InstitutionDetailPage(institutionName: name)),
              );
            },
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: LinearGradient(
              colors: [Colors.white, Colors.blue.shade50],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(30),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.blue.withOpacity(0.2),
                        blurRadius: 8,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: ClipOval(
                    child: Image.asset(
                      'assets/logo1.png',
                      width: 40,
                      height: 40,
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        name,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(Icons.location_on, size: 16, color: Colors.grey.shade600),
                          const SizedBox(width: 4),
                        Text(
                          'Alva\'s Education Foundation',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        ],
                      ),
                    ],
                  ),
                ),
                Icon(
                  Icons.arrow_forward_ios,
                  color: Colors.blue.shade700,
                  size: 20,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class InstitutionDetailPage extends StatefulWidget {
  final String institutionName;
  const InstitutionDetailPage({super.key, required this.institutionName});

  @override
  State<InstitutionDetailPage> createState() => _InstitutionDetailPageState();
}

class _InstitutionDetailPageState extends State<InstitutionDetailPage> {
  final String _baseUrl = const String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:5000');
  bool _loading = true;
  String? _error;
  List<dynamic> _posts = [];
  bool _isAdmin = false;
  Map<String, dynamic>? _institutionProfile;

  @override
  void initState() {
    super.initState();
    _checkAdminStatus();
    _load();
    _loadInstitutionProfile();
  }

  Future<void> _loadInstitutionProfile() async {
    try {
      final res = await http.get(
        Uri.parse('$_baseUrl/api/institutions/${Uri.encodeComponent(widget.institutionName)}'),
      );
      if (res.statusCode == 200) {
        setState(() {
          _institutionProfile = jsonDecode(res.body) as Map<String, dynamic>;
        });
      }
    } catch (_) {
      // Institution profile doesn't exist yet, that's okay
    }
  }

  Future<void> _checkAdminStatus() async {
    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      if (token != null) {
        final res = await http.get(
          Uri.parse('$_baseUrl/api/users/profile'),
          headers: {'Authorization': 'Bearer $token'},
        );
        if (res.statusCode == 200) {
          final user = jsonDecode(res.body) as Map<String, dynamic>;
          setState(() {
            // Check both isAdmin field and role field for compatibility
            _isAdmin = user['isAdmin'] == true || user['role'] == 'admin';
          });
        }
      }
    } catch (_) {}
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final res = await http.get(Uri.parse('$_baseUrl/api/content/institution-posts'));
      if (res.statusCode != 200) throw Exception('failed');
      final all = jsonDecode(res.body) as List<dynamic>;
      setState(() {
        _posts = all.where((p) => (p as Map<String, dynamic>)['institution']?.toString() == widget.institutionName).toList();
      });
    } catch (_) {
      setState(() { _error = 'Failed to load'; });
    } finally {
      setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.institutionName),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
        elevation: 0,
        automaticallyImplyLeading: false,
        actions: _isAdmin ? [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () => _showEditProfileDialog(),
            tooltip: 'Edit Profile',
          ),
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showCreatePostDialog(),
            tooltip: 'Create Post',
          ),
        ] : null,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _buildInstitutionHeader(),
                      const SizedBox(height: 16),
                      if (_posts.isEmpty)
                        Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              ClipOval(
                                child: Image.asset(
                                  'assets/logo1.png',
                                  width: 80,
                                  height: 80,
                                  fit: BoxFit.cover,
                                ),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'No posts yet',
                                style: TextStyle(
                                  fontSize: 18,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                              if (_isAdmin) ...[
                                const SizedBox(height: 16),
                                ElevatedButton.icon(
                                  onPressed: () => _showCreatePostDialog(),
                                  icon: const Icon(Icons.add),
                                  label: const Text('Create First Post'),
                                ),
                              ],
                            ],
                          ),
                        )
                      else
                        ..._posts.map((m) => Padding(
                              padding: const EdgeInsets.only(bottom: 16),
                              child: _buildPostCard(m as Map<String, dynamic>),
                            )),
                    ],
                  ),
                ),
    );
  }

  Widget _buildInstitutionHeader() {
    final profile = _institutionProfile;
    final coverImage = profile?['coverImage'];
    final image = profile?['image'];
    final email = profile?['email'] ?? '';
    final phone = profile?['phone'] ?? '';
    final address = profile?['address'] ?? '';
    final website = profile?['website'] ?? '';
    
    return Column(
      children: [
        // Cover Image Section
        Container(
          height: 200,
          decoration: BoxDecoration(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            gradient: coverImage == null
                ? LinearGradient(
                    colors: [Colors.blue.shade700, Colors.blue.shade400],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  )
                : null,
            image: coverImage != null
                ? DecorationImage(
                    image: NetworkImage(
                      coverImage.toString().startsWith('http')
                          ? coverImage.toString()
                          : '$_baseUrl$coverImage',
                    ),
                    fit: BoxFit.cover,
                  )
                : null,
          ),
          child: Stack(
            children: [
              if (_isAdmin)
                Positioned(
                  top: 8,
                  right: 8,
                  child: IconButton(
                    icon: const Icon(Icons.camera_alt, color: Colors.white),
                    onPressed: () => _pickCoverImage(),
                    tooltip: 'Change Cover Image',
                  ),
                ),
            ],
          ),
        ),
        // Profile Content Section
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
            boxShadow: [
              BoxShadow(
                color: Colors.blue.withOpacity(0.2),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Logo and Name Row
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Stack(
                    children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.blue.shade300, width: 3),
                          color: Colors.white,
                        ),
                        child: ClipOval(
                          child: image != null && image.toString().isNotEmpty
                              ? Image.network(
                                  image.toString().startsWith('http')
                                      ? image.toString()
                                      : '$_baseUrl$image',
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Image.asset(
                                    'assets/logo1.png',
                                    fit: BoxFit.cover,
                                  ),
                                )
                              : Image.asset(
                                  'assets/logo1.png',
                                  fit: BoxFit.cover,
                                ),
                        ),
                      ),
                      if (_isAdmin)
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: Container(
                            decoration: const BoxDecoration(
                              color: Colors.blue,
                              shape: BoxShape.circle,
                            ),
                            child: IconButton(
                              icon: const Icon(Icons.camera_alt, size: 16, color: Colors.white),
                              onPressed: () => _pickProfileImage(),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.institutionName,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (profile?['type'] != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            profile!['type'],
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              // Contact Information
              if (email.isNotEmpty || phone.isNotEmpty || address.isNotEmpty || website.isNotEmpty) ...[
                const Divider(),
                const SizedBox(height: 12),
                if (email.isNotEmpty)
                  _buildInfoRow(Icons.email, email),
                if (phone.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  _buildInfoRow(Icons.phone, phone),
                ],
                if (address.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  _buildInfoRow(Icons.location_on, address),
                ],
                if (website.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  _buildInfoRow(Icons.language, website),
                ],
              ] else if (!_isAdmin) ...[
                const Text(
                  'Profile information coming soon',
                  style: TextStyle(color: Colors.grey, fontStyle: FontStyle.italic),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildInfoRow(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 18, color: Colors.grey.shade600),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: TextStyle(fontSize: 14, color: Colors.grey.shade700),
          ),
        ),
      ],
    );
  }

  Future<void> _pickProfileImage() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery);
    if (file != null) {
      await _uploadInstitutionImage(file, isCover: false);
    }
  }

  Future<void> _pickCoverImage() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery);
    if (file != null) {
      await _uploadInstitutionImage(file, isCover: true);
    }
  }

  Future<void> _uploadInstitutionImage(XFile file, {required bool isCover}) async {
    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      if (token == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Authentication required')),
        );
        return;
      }

      final institutionId = _institutionProfile?['_id'];
      if (institutionId == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please create institution profile first')),
        );
        return;
      }

      final request = http.MultipartRequest(
        'PUT',
        Uri.parse('$_baseUrl/api/institutions/$institutionId${isCover ? '/cover-image' : ''}'),
      );
      request.headers['Authorization'] = 'Bearer $token';
      request.files.add(await http.MultipartFile.fromPath(
        'image',
        file.path,
        contentType: MediaType.parse('image/${file.path.split('.').last.toLowerCase()}'),
      ));

      final streamed = await request.send();
      final response = await http.Response.fromStream(streamed);

      if (response.statusCode == 200) {
        await _loadInstitutionProfile();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${isCover ? 'Cover' : 'Profile'} image updated')),
        );
      } else {
        throw Exception('Failed to upload image');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to upload: $e')),
      );
    }
  }

  void _showEditProfileDialog() {
    showDialog(
      context: context,
      builder: (context) => _EditInstitutionProfileDialog(
        institutionName: widget.institutionName,
        institutionProfile: _institutionProfile,
        baseUrl: _baseUrl,
        onProfileUpdated: _loadInstitutionProfile,
      ),
    );
  }

  Widget _buildPostCard(Map<String, dynamic> post) {
    final title = (post['title'] ?? '').toString();
    final content = (post['content'] ?? post['description'] ?? '').toString();
    final imageUrl = (post['imageUrl'] ?? '').toString();
    final videoUrl = (post['videoUrl'] ?? '').toString();
    final createdAt = post['createdAt']?.toString() ?? '';
    final postId = post['_id']?.toString() ?? '';
    
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.blue.shade100),
                      ),
                      child: ClipOval(
                        child: Image.asset(
                          'assets/logo1.png',
                          width: 24,
                          height: 24,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.institutionName,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (createdAt.isNotEmpty)
                            Text(
                              _formatDate(createdAt),
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey.shade600,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 18,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                if (imageUrl.isNotEmpty) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(
                      imageUrl.startsWith('http') ? imageUrl : '$_baseUrl$imageUrl',
                      height: 200,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        height: 200,
                        color: Colors.grey.shade200,
                        child: const Center(child: Icon(Icons.broken_image)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
                if (videoUrl.isNotEmpty) ...[
                  Container(
                    height: 200,
                    decoration: BoxDecoration(
                      color: Colors.black12,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Stack(
                      children: [
                        Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.play_circle_filled,
                                size: 60,
                                color: Colors.blue.shade700,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Video Content',
                                style: TextStyle(
                                  color: Colors.blue.shade700,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
                Text(
                  content,
                  style: const TextStyle(fontSize: 16),
                  maxLines: 5,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          // Action buttons for like, share, report
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _InstitutionPostLikeButton(
                  postId: postId,
                  baseUrl: _baseUrl,
                  initialLiked: post['isLiked'] ?? false,
                  initialLikeCount: post['likeCount'] ?? post['likes']?.length ?? 0,
                ),
                _InstitutionPostShareButton(
                  post: post,
                  institutionName: widget.institutionName,
                  baseUrl: _baseUrl,
                ),
                _InstitutionPostReportButton(
                  postId: postId,
                  baseUrl: _baseUrl,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day}/${date.month}/${date.year}';
    } catch (_) {
      return dateStr;
    }
  }

  void _showCreatePostDialog() {
    showDialog(
      context: context,
      builder: (context) => _CreateInstitutionPostDialog(
        institutionName: widget.institutionName,
        baseUrl: _baseUrl,
        onPostCreated: _load,
      ),
    );
  }
}

class _CreateInstitutionPostDialog extends StatefulWidget {
  final String institutionName;
  final String baseUrl;
  final VoidCallback onPostCreated;

  const _CreateInstitutionPostDialog({
    required this.institutionName,
    required this.baseUrl,
    required this.onPostCreated,
  });

  @override
  State<_CreateInstitutionPostDialog> createState() => _CreateInstitutionPostDialogState();
}

class _CreateInstitutionPostDialogState extends State<_CreateInstitutionPostDialog> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _contentCtrl = TextEditingController();
  bool _submitting = false;
  XFile? _selectedImage;
  XFile? _selectedVideo;

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery);
    if (file != null) {
      setState(() {
        _selectedImage = file;
        _selectedVideo = null; // Clear video if image is selected
      });
    }
  }

  Future<void> _pickVideo() async {
    final picker = ImagePicker();
    final file = await picker.pickVideo(source: ImageSource.gallery);
    if (file != null) {
      setState(() {
        _selectedVideo = file;
        _selectedImage = null; // Clear image if video is selected
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      if (token == null) throw Exception('Authentication required');

      final request = http.MultipartRequest(
        'POST',
        Uri.parse('${widget.baseUrl}/api/content/institution-posts'),
      );
      request.headers['Authorization'] = 'Bearer $token';
      request.fields['institution'] = widget.institutionName;
      request.fields['title'] = _titleCtrl.text.trim();
      request.fields['content'] = _contentCtrl.text.trim();
      request.fields['status'] = 'approved';

      if (_selectedImage != null) {
        final mimeType = 'image/${_selectedImage!.path.split('.').last.toLowerCase()}';
        request.files.add(await http.MultipartFile.fromPath(
          'image',
          _selectedImage!.path,
          contentType: MediaType.parse(mimeType),
        ));
      }

      if (_selectedVideo != null) {
        final mimeType = 'video/${_selectedVideo!.path.split('.').last.toLowerCase()}';
        request.files.add(await http.MultipartFile.fromPath(
          'video',
          _selectedVideo!.path,
          contentType: MediaType.parse(mimeType),
        ));
      }

      final streamed = await request.send();
      final response = await http.Response.fromStream(streamed);
      
      if (response.statusCode == 201) {
        widget.onPostCreated();
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Post created successfully')),
        );
      } else {
        throw Exception('Failed to create post');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      child: Container(
        width: MediaQuery.of(context).size.width * 0.9,
        height: MediaQuery.of(context).size.height * 0.8,
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              Text(
                'Create Post for ${widget.institutionName}',
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 20),
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      TextFormField(
                        controller: _titleCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Title',
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) => v?.trim().isEmpty == true ? 'Title required' : null,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _contentCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Content',
                          border: OutlineInputBorder(),
                        ),
                        maxLines: 4,
                        validator: (v) => v?.trim().isEmpty == true ? 'Content required' : null,
                      ),
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: _pickImage,
                              icon: const Icon(Icons.image),
                              label: const Text('Add Image'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: _selectedImage != null ? Colors.green : null,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: _pickVideo,
                              icon: const Icon(Icons.videocam),
                              label: const Text('Add Video'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: _selectedVideo != null ? Colors.green : null,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (_selectedImage != null || _selectedVideo != null) ...[
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                _selectedImage != null ? Icons.image : Icons.videocam,
                                color: Colors.blue,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _selectedImage?.name ?? _selectedVideo?.name ?? '',
                                  style: const TextStyle(fontWeight: FontWeight.w500),
                                ),
                              ),
                              IconButton(
                                onPressed: () {
                                  setState(() {
                                    _selectedImage = null;
                                    _selectedVideo = null;
                                  });
                                },
                                icon: const Icon(Icons.close, color: Colors.red),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                  ElevatedButton(
                    onPressed: _submitting ? null : _submit,
                    child: _submitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Create Post'),
                  ),
                ],
              ),
            ],
          ),
                  ),
                ),
    );
  }
}

class _EditInstitutionProfileDialog extends StatefulWidget {
  final String institutionName;
  final Map<String, dynamic>? institutionProfile;
  final String baseUrl;
  final VoidCallback onProfileUpdated;

  const _EditInstitutionProfileDialog({
    required this.institutionName,
    required this.institutionProfile,
    required this.baseUrl,
    required this.onProfileUpdated,
  });

  @override
  State<_EditInstitutionProfileDialog> createState() => _EditInstitutionProfileDialogState();
}

// ===== INSTITUTION POST ACTION BUTTONS =====

class _InstitutionPostLikeButton extends StatefulWidget {
  final String postId;
  final String baseUrl;
  final bool initialLiked;
  final int initialLikeCount;

  const _InstitutionPostLikeButton({
    required this.postId,
    required this.baseUrl,
    required this.initialLiked,
    required this.initialLikeCount,
  });

  @override
  State<_InstitutionPostLikeButton> createState() => _InstitutionPostLikeButtonState();
}

class _InstitutionPostLikeButtonState extends State<_InstitutionPostLikeButton> {
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
    setState(() => _isLoading = true);

    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      if (token == null) throw Exception('Authentication required');

      final response = await http.patch(
        Uri.parse('${widget.baseUrl}/api/content/institution-posts/${widget.postId}/like'),
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
        throw Exception('Failed to like');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: _isLoading ? null : _toggleLike,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _isLoading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Icon(
                      _isLiked ? Icons.thumb_up : Icons.thumb_up_outlined,
                      size: 20,
                      color: _isLiked ? Colors.blue : Colors.grey.shade600,
                    ),
              const SizedBox(width: 6),
              Text(
                _likeCount > 0 ? '$_likeCount' : 'Like',
                style: TextStyle(
                  color: _isLiked ? Colors.blue : Colors.grey.shade700,
                  fontWeight: _isLiked ? FontWeight.w600 : FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InstitutionPostShareButton extends StatelessWidget {
  final Map<String, dynamic> post;
  final String institutionName;
  final String baseUrl;

  const _InstitutionPostShareButton({
    required this.post,
    required this.institutionName,
    required this.baseUrl,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: () => _showShareSheet(context),
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.share_outlined, size: 20, color: Colors.grey.shade600),
              const SizedBox(width: 6),
              Text(
                'Share',
                style: TextStyle(color: Colors.grey.shade700, fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showShareSheet(BuildContext context) {
    final title = post['title']?.toString() ?? '';
    final content = post['content']?.toString() ?? '';
    final shareText = '$title\n\n$content\n\n- Shared from $institutionName via Alumni Portal';

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
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
                _shareOption(
                  context: ctx,
                  icon: Icons.copy,
                  label: 'Copy',
                  color: Colors.grey,
                  onTap: () async {
                    Navigator.pop(ctx);
                    await Clipboard.setData(ClipboardData(text: shareText));
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Copied to clipboard!')),
                      );
                    }
                  },
                ),
              ],
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _shareOption({
    required BuildContext context,
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 32, color: color),
            const SizedBox(height: 8),
            Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}

class _InstitutionPostReportButton extends StatelessWidget {
  final String postId;
  final String baseUrl;

  const _InstitutionPostReportButton({
    required this.postId,
    required this.baseUrl,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: () => _showReportDialog(context),
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.flag_outlined, size: 20, color: Colors.grey.shade600),
              const SizedBox(width: 6),
              Text(
                'Report',
                style: TextStyle(color: Colors.grey.shade700, fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showReportDialog(BuildContext context) {
    final reasonNotifier = ValueNotifier<String?>(null);
    final descController = TextEditingController();
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (ctx) => ValueListenableBuilder<String?>(
        valueListenable: reasonNotifier,
        builder: (_, reason, __) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              Icon(Icons.flag, color: Colors.red.shade600),
              const SizedBox(width: 8),
              const Text('Report Post'),
            ],
          ),
          content: Form(
            key: formKey,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField<String>(
                    value: reason,
                    decoration: InputDecoration(
                      labelText: 'Reason',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'spam', child: Text('Spam')),
                      DropdownMenuItem(value: 'inappropriate', child: Text('Inappropriate Content')),
                      DropdownMenuItem(value: 'harassment', child: Text('Harassment')),
                      DropdownMenuItem(value: 'false_info', child: Text('False Information')),
                      DropdownMenuItem(value: 'other', child: Text('Other')),
                    ],
                    onChanged: (v) => reasonNotifier.value = v,
                    validator: (v) => v == null ? 'Select a reason' : null,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: descController,
                    decoration: InputDecoration(
                      labelText: 'Details (optional)',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    maxLines: 3,
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (formKey.currentState!.validate()) {
                  Navigator.pop(ctx);
                  await _submitReport(context, reason!, descController.text);
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red.shade600),
              child: const Text('Report', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submitReport(BuildContext context, String reason, String description) async {
    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      if (token == null) throw Exception('Authentication required');

      final response = await http.post(
        Uri.parse('$baseUrl/api/content/institution-posts/$postId/report'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({'reason': reason, 'description': description}),
      );

      if (response.statusCode == 201) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Report submitted successfully')),
          );
        }
      } else {
        final data = jsonDecode(response.body);
        throw Exception(data['message'] ?? 'Failed to report');
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e')),
        );
      }
    }
  }
}

class _EditInstitutionProfileDialogState extends State<_EditInstitutionProfileDialog> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameCtrl;
  late TextEditingController _phoneCtrl;
  late TextEditingController _emailCtrl;
  late TextEditingController _addressCtrl;
  late TextEditingController _cityCtrl;
  late TextEditingController _stateCtrl;
  late TextEditingController _pincodeCtrl;
  late TextEditingController _websiteCtrl;
  late TextEditingController _establishedYearCtrl;
  late TextEditingController _typeCtrl;
  late TextEditingController _affiliationCtrl;
  late TextEditingController _descriptionCtrl;
  late TextEditingController _contactPersonCtrl;
  late TextEditingController _contactPersonEmailCtrl;
  late TextEditingController _contactPersonPhoneCtrl;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final profile = widget.institutionProfile;
    _nameCtrl = TextEditingController(text: profile?['name'] ?? widget.institutionName);
    _phoneCtrl = TextEditingController(text: profile?['phone'] ?? '');
    _emailCtrl = TextEditingController(text: profile?['email'] ?? '');
    _addressCtrl = TextEditingController(text: profile?['address'] ?? '');
    _cityCtrl = TextEditingController(text: profile?['city'] ?? '');
    _stateCtrl = TextEditingController(text: profile?['state'] ?? '');
    _pincodeCtrl = TextEditingController(text: profile?['pincode'] ?? '');
    _websiteCtrl = TextEditingController(text: profile?['website'] ?? '');
    _establishedYearCtrl = TextEditingController(text: profile?['establishedYear'] ?? '');
    _typeCtrl = TextEditingController(text: profile?['type'] ?? '');
    _affiliationCtrl = TextEditingController(text: profile?['affiliation'] ?? '');
    _descriptionCtrl = TextEditingController(text: profile?['description'] ?? '');
    _contactPersonCtrl = TextEditingController(text: profile?['contactPerson'] ?? '');
    _contactPersonEmailCtrl = TextEditingController(text: profile?['contactPersonEmail'] ?? '');
    _contactPersonPhoneCtrl = TextEditingController(text: profile?['contactPersonPhone'] ?? '');
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _addressCtrl.dispose();
    _cityCtrl.dispose();
    _stateCtrl.dispose();
    _pincodeCtrl.dispose();
    _websiteCtrl.dispose();
    _establishedYearCtrl.dispose();
    _typeCtrl.dispose();
    _affiliationCtrl.dispose();
    _descriptionCtrl.dispose();
    _contactPersonCtrl.dispose();
    _contactPersonEmailCtrl.dispose();
    _contactPersonPhoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _saving = true);
    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      if (token == null) throw Exception('Authentication required');

      final payload = {
        'name': _nameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'email': _emailCtrl.text.trim(),
        'address': _addressCtrl.text.trim(),
        'city': _cityCtrl.text.trim(),
        'state': _stateCtrl.text.trim(),
        'pincode': _pincodeCtrl.text.trim(),
        'website': _websiteCtrl.text.trim(),
        'establishedYear': _establishedYearCtrl.text.trim(),
        'type': _typeCtrl.text.trim(),
        'affiliation': _affiliationCtrl.text.trim(),
        'description': _descriptionCtrl.text.trim(),
        'contactPerson': _contactPersonCtrl.text.trim(),
        'contactPersonEmail': _contactPersonEmailCtrl.text.trim(),
        'contactPersonPhone': _contactPersonPhoneCtrl.text.trim(),
      };

      final response = widget.institutionProfile == null
          ? await http.post(
              Uri.parse('${widget.baseUrl}/api/institutions'),
              headers: {
                'Authorization': 'Bearer $token',
                'Content-Type': 'application/json',
              },
              body: jsonEncode(payload),
            )
          : await http.put(
              Uri.parse('${widget.baseUrl}/api/institutions/${widget.institutionProfile!['_id']}'),
              headers: {
                'Authorization': 'Bearer $token',
                'Content-Type': 'application/json',
              },
              body: jsonEncode(payload),
            );

      if (response.statusCode == 200 || response.statusCode == 201) {
        widget.onProfileUpdated();
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Institution profile saved successfully')),
        );
      } else {
        throw Exception('Failed to save profile');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      child: Container(
        width: MediaQuery.of(context).size.width * 0.9,
        height: MediaQuery.of(context).size.height * 0.9,
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              Text(
                widget.institutionProfile == null
                    ? 'Create Institution Profile'
                    : 'Edit Institution Profile',
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 20),
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      TextFormField(
                        controller: _nameCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Institution Name *',
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) => v?.trim().isEmpty == true ? 'Required' : null,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _phoneCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Phone Number',
                          border: OutlineInputBorder(),
                        ),
                        keyboardType: TextInputType.phone,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _emailCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Email',
                          border: OutlineInputBorder(),
                        ),
                        keyboardType: TextInputType.emailAddress,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _addressCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Address',
                          border: OutlineInputBorder(),
                        ),
                        maxLines: 2,
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _cityCtrl,
                              decoration: const InputDecoration(
                                labelText: 'City',
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _stateCtrl,
                              decoration: const InputDecoration(
                                labelText: 'State',
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _pincodeCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Pincode',
                          border: OutlineInputBorder(),
                        ),
                        keyboardType: TextInputType.number,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _websiteCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Website',
                          border: OutlineInputBorder(),
                        ),
                        keyboardType: TextInputType.url,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _establishedYearCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Established Year',
                          border: OutlineInputBorder(),
                        ),
                        keyboardType: TextInputType.number,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _typeCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Type (e.g., Engineering, Medical, Arts)',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _affiliationCtrl,
                        decoration: const InputDecoration(
                          labelText: 'University Affiliation',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _descriptionCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Description',
                          border: OutlineInputBorder(),
                        ),
                        maxLines: 4,
                      ),
                      const SizedBox(height: 20),
                      const Divider(),
                      const SizedBox(height: 16),
                      const Text(
                        'Contact Person Details',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _contactPersonCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Contact Person Name',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _contactPersonEmailCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Contact Person Email',
                          border: OutlineInputBorder(),
                        ),
                        keyboardType: TextInputType.emailAddress,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _contactPersonPhoneCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Contact Person Phone',
                          border: OutlineInputBorder(),
                        ),
                        keyboardType: TextInputType.phone,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                  ElevatedButton(
                    onPressed: _saving ? null : _submit,
                    child: _saving
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Save'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}