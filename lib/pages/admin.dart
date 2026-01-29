import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'institution.dart';

class AdminPage extends StatefulWidget {
  const AdminPage({super.key});

  @override
  State<AdminPage> createState() => _AdminPageState();
}

class _AdminPageState extends State<AdminPage> with SingleTickerProviderStateMixin {
  final String _baseUrl = const String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000',
  );
  late TabController _tabController;
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _authChecked = false;
  bool _isAuthenticated = false;
  bool _loggingIn = false;
  String? _loginError;

  static const String _superAdminEmail = 'patgarlohit818@gmail.com';
  static const String _superAdminPassword = 'Lohit@2004';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    const storage = FlutterSecureStorage();
    final v = await storage.read(key: 'super_admin_authenticated');
    if (!mounted) return;
    setState(() {
      _isAuthenticated = v == 'true';
      _authChecked = true;
    });
  }

  Future<void> _login() async {
    setState(() {
      _loggingIn = true;
      _loginError = null;
    });
    try {
      final email = _emailCtrl.text.trim();
      final password = _passwordCtrl.text;
      if (email != _superAdminEmail || password != _superAdminPassword) {
        setState(() {
          _loginError = 'Invalid admin credentials';
        });
        return;
      }

      // Persist a local gate so the admin tabs are not open to everyone.
      const storage = FlutterSecureStorage();
      await storage.write(key: 'super_admin_authenticated', value: 'true');
      if (!mounted) return;
      setState(() {
        _isAuthenticated = true;
      });
    } finally {
      if (mounted) {
        setState(() {
          _loggingIn = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_authChecked) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (!_isAuthenticated) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Admin Login'),
          backgroundColor: Colors.blue,
          foregroundColor: Colors.white,
          automaticallyImplyLeading: false,
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 16),
              const Text(
                'Super Admin',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                'Sign in to manage users, posts, and institution profiles.',
                style: TextStyle(color: Colors.grey.shade700),
              ),
              const SizedBox(height: 16),
              if (_loginError != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.08),
                    border: Border.all(color: Colors.redAccent),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(_loginError!, style: const TextStyle(color: Colors.red)),
                ),
                const SizedBox(height: 12),
              ],
              TextField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _passwordCtrl,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Password',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed: _loggingIn ? null : _login,
                  child: _loggingIn
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Sign In'),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Dashboard'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
        elevation: 0,
        automaticallyImplyLeading: false,
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          labelStyle: const TextStyle(fontWeight: FontWeight.w600),
          tabs: const [
            Tab(text: 'Users'),
            Tab(text: 'Posts'),
            Tab(text: 'Events'),
            Tab(text: 'Opportunities'),
            Tab(text: 'Institutions'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _UsersAdmin(baseUrl: _baseUrl),
          _PostsAdmin(baseUrl: _baseUrl),
          _PendingEvents(baseUrl: _baseUrl),
          _PendingOpportunities(baseUrl: _baseUrl),
          _InstitutionUsersAdmin(baseUrl: _baseUrl),
        ],
      ),
    );
  }
}

class _UsersAdmin extends StatefulWidget {
  final String baseUrl;
  const _UsersAdmin({required this.baseUrl});

  @override
  State<_UsersAdmin> createState() => _UsersAdminState();
}

class _UsersAdminState extends State<_UsersAdmin> {
  bool loading = true;
  String? error;
  bool showApproved = false;
  List<dynamic> items = [];

  Future<Map<String, String>> _authHeaders() async {
    const storage = FlutterSecureStorage();
    final token = await storage.read(key: 'auth_token');
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final headers = await _authHeaders();
      final uri = showApproved
          ? Uri.parse('${widget.baseUrl}/api/admin/users?status=approved')
          : Uri.parse('${widget.baseUrl}/api/admin/users?status=pending');
      final res = await http.get(uri, headers: headers);
      if (res.statusCode != 200) throw Exception('failed');
      items = jsonDecode(res.body) as List<dynamic>;
    } catch (_) {
      error = 'Failed to load users';
    } finally {
      if (mounted) {
        setState(() {
          loading = false;
        });
      }
    }
  }

  Future<void> _act(String id, String action) async {
    try {
      final headers = await _authHeaders();
      final res = await http.patch(
        Uri.parse('${widget.baseUrl}/api/admin/$action/$id'),
        headers: headers,
      );
      if (res.statusCode == 200) _load();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: LayoutBuilder(
            builder: (context, constraints) {
              return Wrap(
                spacing: 8,
                runSpacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  _StatCard(label: showApproved ? 'Approved' : 'Pending', value: items.length),
                  ChoiceChip(
                    label: const Text('Pending'),
                    selected: !showApproved,
                    onSelected: (v) { setState(() { showApproved = false; }); _load(); },
                  ),
                  ChoiceChip(
                    label: const Text('Approved'),
                    selected: showApproved,
                    onSelected: (v) { setState(() { showApproved = true; }); _load(); },
                  ),
                  ElevatedButton.icon(
                    icon: const Icon(Icons.post_add),
                    label: const Text('Post to Institution'),
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => _CreateInstitutionPostPage(baseUrl: widget.baseUrl),
                        ),
                      );
                    },
                  ),
                ],
              );
            },
          ),
        ),
        Expanded(
          child: loading
              ? const Center(child: CircularProgressIndicator())
              : error != null
                  ? Center(child: Text(error!))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (_, i) {
                          final u = items[i] as Map<String, dynamic>;
                          return Card(
                            child: ListTile(
                              leading: const CircleAvatar(child: Icon(Icons.person)),
                              title: Text((u['name'] ?? 'Unknown User').toString()),
                              subtitle: Text([
                                (u['institution'] ?? '').toString(),
                                (u['course'] ?? '').toString(),
                                (u['year'] ?? '').toString(),
                              ].where((s) => s.isNotEmpty).join(' • ')),
                              trailing: showApproved
                                  ? null
                                  : Wrap(spacing: 4, children: [
                                      IconButton(icon: const Icon(Icons.check, color: Colors.green), onPressed: () => _act(u['_id'].toString(), 'approve')),
                                      IconButton(icon: const Icon(Icons.close, color: Colors.red), onPressed: () => _act(u['_id'].toString(), 'reject')),
                                    ]),
                            ),
                          );
                        },
                      ),
                    ),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final int value;
  const _StatCard({required this.label, required this.value});
  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 12, color: Colors.black54)),
            const SizedBox(height: 4),
            Text(value.toString(), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}

class _CreateInstitutionPostPage extends StatefulWidget {
  final String baseUrl;
  const _CreateInstitutionPostPage({required this.baseUrl});

  @override
  State<_CreateInstitutionPostPage> createState() =>
      _CreateInstitutionPostPageState();
}

class _CreateInstitutionPostPageState
    extends State<_CreateInstitutionPostPage> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _contentCtrl = TextEditingController();
  String? _institution;
  bool _submitting = false;

  final List<String> _institutions = const [
    "Alva’s Pre-University College, Vidyagiri",
    "Alva’s Degree College, Vidyagiri",
    "Alva’s Centre for Post Graduate Studies and Research, Vidyagiri",
    "Alva’s College of Education, Vidyagiri",
    "Alva’s College of Physical Education, Vidyagiri",
    "Alva’s Institute of Engineering & Technology (AIET), Mijar",
    "Alva’s Ayurvedic Medical College, Vidyagiri",
    "Alva’s Homeopathic Medical College, Mijar",
    "Alva’s College of Naturopathy and Yogic Science, Mijar",
    "Alva’s College of Physiotherapy, Moodbidri",
    "Alva’s College of Nursing, Moodbidri",
    "Alva’s Institute of Nursing, Moodbidri",
    "Alva’s College of Medical Laboratory Technology, Moodbidri",
    "Alva’s Law College, Moodbidri",
    "Alva’s College, Moodbidri (Affiliated with Mangalore University)",
    "Alva’s College of Nursing (Affiliated with Rajiv Gandhi University of Health Sciences, Bangalore)",
    "Alva’s Institute of Engineering & Technology (AIET) (Affiliated with Visvesvaraya Technological University, Belgaum)",
  ];

  Future<Map<String, String>> _authHeaders() async {
    const storage = FlutterSecureStorage();
    final token = await storage.read(key: 'auth_token');
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
    });
    try {
      final headers = await _authHeaders();
      final res = await http.post(
        Uri.parse('${widget.baseUrl}/api/content/institution-posts'),
        headers: headers,
        body: jsonEncode({
          'institution': _institution,
          'title': _titleCtrl.text.trim(),
          'content': _contentCtrl.text.trim(),
          'status': 'approved',
        }),
      );
      if (res.statusCode == 201 && mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Institution post created')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: ${res.statusCode}')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Request failed')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Post to Institution')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              DropdownButtonFormField<String>(
                value: _institution, // ✅ shows current selection
                items: _institutions
                    .map((e) =>
                    DropdownMenuItem(value: e, child: Text(e)))
                    .toList(),
                onChanged: (v) {
                  setState(() {
                    _institution = v;
                  });
                },
                decoration: const InputDecoration(labelText: 'Institution'),
                validator: (v) =>
                v == null || v.isEmpty ? 'Select institution' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _titleCtrl,
                decoration: const InputDecoration(labelText: 'Title'),
                validator: (v) =>
                (v == null || v.trim().isEmpty) ? 'Title required' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _contentCtrl,
                decoration: const InputDecoration(labelText: 'Content'),
                minLines: 3,
                maxLines: 6,
                validator: (v) => (v == null || v.trim().isEmpty)
                    ? 'Content required'
                    : null,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _submitting ? null : _submit,
                child: _submitting
                    ? const CircularProgressIndicator()
                    : const Text('Publish'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// -------------------- POSTS ADMIN --------------------

class _PostsAdmin extends StatefulWidget {
  final String baseUrl;
  const _PostsAdmin({required this.baseUrl});

  @override
  State<_PostsAdmin> createState() => _PostsAdminState();
}

class _PostsAdminState extends State<_PostsAdmin> {
  bool loading = true;
  String? error;
  bool showApproved = false;
  List<dynamic> items = [];

  Future<Map<String, String>> _authHeaders() async {
    const storage = FlutterSecureStorage();
    final token = await storage.read(key: 'auth_token');
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final headers = await _authHeaders();
      final uri = showApproved
          ? Uri.parse('${widget.baseUrl}/api/posts?status=approved')
          : Uri.parse('${widget.baseUrl}/api/posts?status=pending');
      final res = await http.get(uri, headers: headers);
      if (res.statusCode != 200) throw Exception('failed');
      items = jsonDecode(res.body) as List<dynamic>;
    } catch (_) {
      error = 'Failed to load posts';
    } finally {
      if (mounted) {
        setState(() {
          loading = false;
        });
      }
    }
  }

  Future<void> _act(String id, String status) async {
    try {
      final headers = await _authHeaders();
      final res = await http.put(
        Uri.parse('${widget.baseUrl}/api/posts/$id/status'),
        headers: headers,
        body: jsonEncode({'status': status}),
      );
      if (res.statusCode == 200) _load();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ChoiceChip(
              label: const Text('Pending'),
              selected: !showApproved,
              onSelected: (v) {
                setState(() {
                  showApproved = false;
                });
                _load();
              },
            ),
            const SizedBox(width: 8),
            ChoiceChip(
              label: const Text('Approved'),
              selected: showApproved,
              onSelected: (v) {
                setState(() {
                  showApproved = true;
                });
                _load();
              },
            ),
          ],
        ),
        Expanded(
          child: loading
              ? const Center(child: CircularProgressIndicator())
              : error != null
              ? Center(child: Text(error!))
              : RefreshIndicator(
            onRefresh: _load,
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, i) {
                final p = items[i] as Map<String, dynamic>;
                return ListTile(
                  leading: const Icon(Icons.article),
                  title: Text((p['title'] ?? '').toString()),
                  subtitle: Text((p['author'] ?? '').toString()),
                  trailing: showApproved
                      ? null
                      : Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.check,
                            color: Colors.green),
                        onPressed: () => _act(
                            p['_id'].toString(), 'approved'),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close,
                            color: Colors.red),
                        onPressed: () => _act(
                            p['_id'].toString(), 'rejected'),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}

// -------------------- PENDING EVENTS --------------------

class _PendingEvents extends StatefulWidget {
  final String baseUrl;
  const _PendingEvents({required this.baseUrl});

  @override
  State<_PendingEvents> createState() => _PendingEventsState();
}

class _PendingEventsState extends State<_PendingEvents> {
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
          Uri.parse('${widget.baseUrl}/api/content/events?status=pending'), headers: headers);
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

  Future<void> _act(String id, String status) async {
    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      final headers = {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };
      final res = await http.put(
        Uri.parse('${widget.baseUrl}/api/content/events/$id/status'),
        headers: headers,
        body: jsonEncode({'status': status}),
      );
      if (res.statusCode == 200) _load();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) return Center(child: Text(_error!));
    if (_items.isEmpty) return const Center(child: Text('No pending events'));
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _items.length,
        separatorBuilder: (_, __) => const Divider(height: 1),
        itemBuilder: (_, i) {
          final e = _items[i] as Map<String, dynamic>;
          return ListTile(
            title: Text((e['title'] ?? '').toString()),
            subtitle: Text((e['description'] ?? '').toString()),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.check, color: Colors.green),
                  onPressed: () =>
                      _act(e['_id'].toString(), 'approved'),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.red),
                  onPressed: () =>
                      _act(e['_id'].toString(), 'rejected'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _PendingOpportunities extends StatefulWidget {
  final String baseUrl;
  const _PendingOpportunities({required this.baseUrl});

  @override
  State<_PendingOpportunities> createState() => _PendingOpportunitiesState();
}

class _PendingOpportunitiesState extends State<_PendingOpportunities> {
  bool _loading = true;
  String? _error;
  List<dynamic> _items = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      final headers = {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };
      final res = await http.get(Uri.parse('${widget.baseUrl}/api/content/opportunities?status=pending'), headers: headers);
      if (res.statusCode != 200) throw Exception('failed');
      setState(() { _items = jsonDecode(res.body) as List<dynamic>; });
    } catch (_) {
      setState(() { _error = 'Failed to load'; });
    } finally {
      setState(() { _loading = false; });
    }
  }

  Future<void> _act(String id, String status) async {
    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      final headers = {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };
      final res = await http.put(
        Uri.parse('${widget.baseUrl}/api/content/opportunities/$id/status'),
        headers: headers,
        body: jsonEncode({ 'status': status }),
      );
      if (res.statusCode == 200) _load();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) return Center(child: Text(_error!));
    if (_items.isEmpty) return const Center(child: Text('No pending opportunities'));
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _items.length,
        separatorBuilder: (_, __) => const Divider(height: 1),
        itemBuilder: (_, i) {
          final e = _items[i] as Map<String, dynamic>;
          return ListTile(
            title: Text((e['title'] ?? '').toString()),
            subtitle: Text((e['company'] ?? '').toString()),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(icon: const Icon(Icons.check, color: Colors.green), onPressed: () => _act(e['_id'].toString(), 'approved')),
                IconButton(icon: const Icon(Icons.close, color: Colors.red), onPressed: () => _act(e['_id'].toString(), 'rejected')),
              ],
            ),
          );
        },
      ),
    );
  }
}

// -------------------- INSTITUTION USERS ADMIN --------------------

class _InstitutionUsersAdmin extends StatefulWidget {
  final String baseUrl;
  const _InstitutionUsersAdmin({required this.baseUrl});

  @override
  State<_InstitutionUsersAdmin> createState() => _InstitutionUsersAdminState();
}

class _InstitutionUsersAdminState extends State<_InstitutionUsersAdmin> {
  bool _loading = true;
  String? _error;
  List<dynamic> _users = [];

  final List<String> _institutions = const [
    "Alva's Pre-University College, Vidyagiri",
    "Alva's Degree College, Vidyagiri",
    "Alva's Centre for Post Graduate Studies and Research, Vidyagiri",
    "Alva's College of Education, Vidyagiri",
    "Alva's College of Physical Education, Vidyagiri",
    "Alva's Institute of Engineering & Technology (AIET), Mijar",
    "Alva's Ayurvedic Medical College, Vidyagiri",
    "Alva's Homeopathic Medical College, Mijar",
    "Alva's College of Naturopathy and Yogic Science, Mijar",
    "Alva's College of Physiotherapy, Moodbidri",
    "Alva's College of Nursing, Moodbidri",
    "Alva's Institute of Nursing, Moodbidri",
    "Alva's College of Medical Laboratory Technology, Moodbidri",
    "Alva's Law College, Moodbidri",
    "Alva's College, Moodbidri (Affiliated with Mangalore University)",
    "Alva's College of Nursing (Affiliated with Rajiv Gandhi University of Health Sciences, Bangalore)",
    "Alva's Institute of Engineering & Technology (AIET) (Affiliated with Visvesvaraya Technological University, Belgaum)",
  ];

  Future<Map<String, String>> _authHeaders() async {
    const storage = FlutterSecureStorage();
    final token = await storage.read(key: 'auth_token');
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

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
      final headers = await _authHeaders();
      final res = await http.get(
        Uri.parse('${widget.baseUrl}/api/admin/institution-users'),
        headers: headers,
      );
      if (res.statusCode != 200) throw Exception('Failed to load');
      setState(() {
        _users = jsonDecode(res.body) as List<dynamic>;
      });
    } catch (_) {
      setState(() {
        _error = 'Failed to load institution users';
      });
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  Future<void> _deleteUser(String id) async {
    try {
      final headers = await _authHeaders();
      final res = await http.delete(
        Uri.parse('${widget.baseUrl}/api/admin/institution-users/$id'),
        headers: headers,
      );
      if (res.statusCode == 200) {
        _load();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Institution user deleted')),
          );
        }
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to delete user')),
        );
      }
    }
  }

  void _showCreateDialog() {
    showDialog(
      context: context,
      builder: (context) => _CreateInstitutionUserDialog(
        baseUrl: widget.baseUrl,
        institutions: _institutions,
        onCreated: () {
          _load();
          Navigator.pop(context);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Institution Users: ${_users.length}',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              ElevatedButton.icon(
                onPressed: _showCreateDialog,
                icon: const Icon(Icons.add),
                label: const Text('Create User'),
              ),
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? Center(child: Text(_error!))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: _users.isEmpty
                          ? const Center(child: Text('No institution users yet'))
                          : ListView.separated(
                              padding: const EdgeInsets.all(16),
                              itemCount: _users.length,
                              separatorBuilder: (_, __) => const Divider(height: 1),
                              itemBuilder: (_, i) {
                                final user = _users[i] as Map<String, dynamic>;
                                final institutionName = user['institution']?.toString() ?? 'Unknown';
                                return ListTile(
                                  leading: const CircleAvatar(
                                    child: Icon(Icons.school),
                                  ),
                                  title: Text(user['name'] ?? institutionName),
                                  subtitle: Text(institutionName),
                                  trailing: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      IconButton(
                                        icon: const Icon(Icons.edit, color: Colors.blue),
                                        tooltip: 'Manage Institution Profile',
                                        onPressed: () {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (_) => InstitutionDetailPage(
                                                institutionName: institutionName,
                                                isFromAdmin: true,
                                              ),
                                            ),
                                          );
                                        },
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.delete, color: Colors.red),
                                        onPressed: () {
                                      showDialog(
                                        context: context,
                                        builder: (context) => AlertDialog(
                                          title: const Text('Delete User'),
                                          content: const Text('Are you sure you want to delete this institution user?'),
                                          actions: [
                                            TextButton(
                                              onPressed: () => Navigator.pop(context),
                                              child: const Text('Cancel'),
                                            ),
                                            ElevatedButton(
                                              onPressed: () {
                                                Navigator.pop(context);
                                                _deleteUser(user['_id'].toString());
                                              },
                                              style: ElevatedButton.styleFrom(
                                                backgroundColor: Colors.red,
                                              ),
                                              child: const Text('Delete', style: TextStyle(color: Colors.white)),
                                            ),
                                          ],
                                        ),
                                      );
                                    },
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                    ),
        ),
      ],
    );
  }
}

class _CreateInstitutionUserDialog extends StatefulWidget {
  final String baseUrl;
  final List<String> institutions;
  final VoidCallback onCreated;

  const _CreateInstitutionUserDialog({
    required this.baseUrl,
    required this.institutions,
    required this.onCreated,
  });

  @override
  State<_CreateInstitutionUserDialog> createState() => _CreateInstitutionUserDialogState();
}

class _CreateInstitutionUserDialogState extends State<_CreateInstitutionUserDialog> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  String? _selectedInstitution;
  bool _submitting = false;
  bool _obscurePassword = true;

  Future<Map<String, String>> _authHeaders() async {
    const storage = FlutterSecureStorage();
    final token = await storage.read(key: 'auth_token');
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _submitting = true;
    });

    try {
      final headers = await _authHeaders();
      final res = await http.post(
        Uri.parse('${widget.baseUrl}/api/admin/institution-users'),
        headers: headers,
        body: jsonEncode({
          'institution': _selectedInstitution,
          'email': _emailCtrl.text.trim(),
          'password': _passwordCtrl.text,
        }),
      );

      if (res.statusCode == 201) {
        widget.onCreated();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Institution user created successfully')),
          );
        }
      } else {
        final error = jsonDecode(res.body);
        throw Exception(error['error'] ?? 'Failed to create user');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Create Institution User'),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                value: _selectedInstitution,
                decoration: const InputDecoration(
                  labelText: 'Institution',
                  border: OutlineInputBorder(),
                ),
                items: widget.institutions
                    .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                    .toList(),
                onChanged: (v) => setState(() => _selectedInstitution = v),
                validator: (v) => v == null ? 'Select institution' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _emailCtrl,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return 'Email required';
                  if (!v.contains('@')) return 'Invalid email';
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _passwordCtrl,
                decoration: InputDecoration(
                  labelText: 'Password',
                  border: const OutlineInputBorder(),
                  suffixIcon: IconButton(
                    icon: Icon(_obscurePassword ? Icons.visibility : Icons.visibility_off),
                    onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                  ),
                ),
                obscureText: _obscurePassword,
                validator: (v) {
                  if (v == null || v.length < 6) return 'Password must be at least 6 characters';
                  return null;
                },
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _submitting ? null : () => Navigator.pop(context),
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
              : const Text('Create'),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }
}


