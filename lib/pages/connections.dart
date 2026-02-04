import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ConnectionsPage extends StatefulWidget {
  const ConnectionsPage({super.key});

  @override
  State<ConnectionsPage> createState() => _ConnectionsPageState();
}

class _ConnectionsPageState extends State<ConnectionsPage> {
  final String _baseUrl = const String.fromEnvironment('API_BASE_URL', defaultValue: 'https://alvasglobalalumni.org');
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
      final token = await const FlutterSecureStorage().read(key: 'auth_token') ?? '';
      final res = await http.get(
        Uri.parse('$_baseUrl/api/connections'),
        headers: { 'Authorization': 'Bearer $token' },
      );
      if (res.statusCode != 200) throw Exception('failed');
      setState(() { _items = jsonDecode(res.body) as List<dynamic>; });
    } catch (e) {
      setState(() { _error = 'Failed to load connections'; });
    } finally {
      setState(() { _loading = false; });
    }
  }

  bool _isIncoming(Map<String, dynamic> c, String myId) => (c['recipient']?['_id']?.toString() ?? '') == myId;

  Future<void> _actOn(String id, String status) async {
    try {
      final token = await const FlutterSecureStorage().read(key: 'auth_token') ?? '';
      final res = await http.put(
        Uri.parse('$_baseUrl/api/connections/$id'),
        headers: { 'Authorization': 'Bearer $token', 'Content-Type': 'application/json' },
        body: jsonEncode({ 'status': status }),
      );
      if (res.statusCode == 200) {
        _load();
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Connections')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemBuilder: (_, i) {
                      final c = _items[i] as Map<String, dynamic>;
                      final requester = c['requester'] as Map<String, dynamic>;
                      final recipient = c['recipient'] as Map<String, dynamic>;
                      final status = (c['status'] ?? '').toString();
                      // Show who is who
                      return ListTile(
                        leading: const CircleAvatar(child: Icon(Icons.person)),
                        title: Text('${requester['name']} → ${recipient['name']}'),
                        subtitle: Text(status),
                        trailing: status == 'pending'
                            ? Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.check, color: Colors.green),
                                    onPressed: () => _actOn(c['_id'].toString(), 'accepted'),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.close, color: Colors.red),
                                    onPressed: () => _actOn(c['_id'].toString(), 'rejected'),
                                  ),
                                ],
                              )
                            : null,
                      );
                    },
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemCount: _items.length,
                  ),
                ),
    );
  }
}












