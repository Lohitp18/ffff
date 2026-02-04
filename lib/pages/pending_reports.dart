import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class PendingReportsPage extends StatefulWidget {
  const PendingReportsPage({super.key});

  @override
  State<PendingReportsPage> createState() => _PendingReportsPageState();
}

class _PendingReportsPageState extends State<PendingReportsPage> {
  final String _baseUrl = const String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://alvasglobalalumni.org',
  );

  bool _loading = true;
  String? _error;
  List<dynamic> _reports = [];
  String _selectedStatus = 'pending';

  @override
  void initState() {
    super.initState();
    _loadReports();
  }

  Future<void> _loadReports() async {
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
        Uri.parse('$_baseUrl/api/reports?status=$_selectedStatus'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _reports = data['reports'] ?? [];
        });
      } else {
        throw Exception('Failed to load reports');
      }
    } catch (e) {
      setState(() {
        _error = 'Failed to load reports';
      });
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  Future<void> _updateReportStatus(String reportId, String status, {String? adminNotes}) async {
    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      
      if (token == null || token.isEmpty) {
        throw Exception('Authentication required');
      }

      final response = await http.patch(
        Uri.parse('$_baseUrl/api/reports/$reportId/status'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'status': status,
          if (adminNotes != null) 'adminNotes': adminNotes,
        }),
      );

      if (response.statusCode == 200) {
        _loadReports(); // Refresh the list
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Report status updated to $status')),
        );
      } else {
        throw Exception('Failed to update report status');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update status: $e')),
      );
    }
  }

  void _showStatusDialog(Map<String, dynamic> report) {
    final TextEditingController notesController = TextEditingController();
    String selectedStatus = report['status'];

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Update Report Status'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            DropdownButtonFormField<String>(
              value: selectedStatus,
              decoration: const InputDecoration(
                labelText: 'Status',
                border: OutlineInputBorder(),
              ),
              items: const [
                DropdownMenuItem(value: 'pending', child: Text('Pending')),
                DropdownMenuItem(value: 'reviewed', child: Text('Reviewed')),
                DropdownMenuItem(value: 'resolved', child: Text('Resolved')),
                DropdownMenuItem(value: 'dismissed', child: Text('Dismissed')),
              ],
              onChanged: (value) {
                selectedStatus = value!;
              },
            ),
            const SizedBox(height: 16),
            TextField(
              controller: notesController,
              decoration: const InputDecoration(
                labelText: 'Admin Notes (Optional)',
                border: OutlineInputBorder(),
                hintText: 'Add notes about this report...',
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _updateReportStatus(
                report['_id'],
                selectedStatus,
                adminNotes: notesController.text.trim().isNotEmpty ? notesController.text.trim() : null,
              );
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
  }

  Widget _buildReportItem(Map<String, dynamic> report) {
    final reportedItem = report['reportedItem'];
    final reporter = report['reporterId'];

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _getStatusColor(report['status']).withOpacity(0.2),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    report['status'].toUpperCase(),
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: _getStatusColor(report['status']),
                    ),
                  ),
                ),
                const Spacer(),
                Text(
                  _formatDate(DateTime.parse(report['createdAt'])),
                  style: const TextStyle(
                    fontSize: 12,
                    color: Colors.grey,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 12),
            
            // Reporter info
            Text(
              'Reported by: ${reporter['name'] ?? 'Unknown User'}',
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
            
            const SizedBox(height: 8),
            
            // Report reason
            Text(
              'Reason: ${_formatReason(report['reason'])}',
              style: const TextStyle(fontSize: 14),
            ),
            
            if (report['description'] != null && report['description'].isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                'Description: ${report['description']}',
                style: const TextStyle(fontSize: 14),
              ),
            ],
            
            const SizedBox(height: 12),
            
            // Reported item info
            if (reportedItem != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Reported ${report['reportedItemType']}:',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      reportedItem['title'] ?? 'Untitled',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (reportedItem['content'] != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        reportedItem['content'],
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12),
                      ),
                    ],
                  ],
                ),
              ),
            ],
            
            const SizedBox(height: 12),
            
            // Action buttons
            Row(
              children: [
                ElevatedButton.icon(
                  onPressed: () => _showStatusDialog(report),
                  icon: const Icon(Icons.edit, size: 16),
                  label: const Text('Update Status'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue,
                    foregroundColor: Colors.white,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'pending':
        return Colors.orange;
      case 'reviewed':
        return Colors.blue;
      case 'resolved':
        return Colors.green;
      case 'dismissed':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _formatReason(String reason) {
    switch (reason) {
      case 'spam':
        return 'Spam';
      case 'inappropriate_content':
        return 'Inappropriate Content';
      case 'harassment':
        return 'Harassment';
      case 'false_information':
        return 'False Information';
      case 'copyright_violation':
        return 'Copyright Violation';
      case 'other':
        return 'Other';
      default:
        return reason;
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
            Icons.flag_outlined,
            size: 80,
            color: Colors.grey.shade300,
          ),
          const SizedBox(height: 16),
          Text(
            'No reports found',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w500,
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'No reports with status: $_selectedStatus',
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
        title: const Text('Reports'),
        actions: [
          DropdownButton<String>(
            value: _selectedStatus,
            items: const [
              DropdownMenuItem(value: 'pending', child: Text('Pending')),
              DropdownMenuItem(value: 'reviewed', child: Text('Reviewed')),
              DropdownMenuItem(value: 'resolved', child: Text('Resolved')),
              DropdownMenuItem(value: 'dismissed', child: Text('Dismissed')),
            ],
            onChanged: (value) {
              setState(() {
                _selectedStatus = value!;
              });
              _loadReports();
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadReports,
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
                        onPressed: _loadReports,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : _reports.isEmpty
                  ? _buildEmptyState()
                  : RefreshIndicator(
                      onRefresh: _loadReports,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _reports.length,
                        itemBuilder: (context, index) {
                          return _buildReportItem(
                            _reports[index] as Map<String, dynamic>,
                          );
                        },
                      ),
                    ),
    );
  }
}
