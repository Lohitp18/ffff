import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ProfileCompletionPage extends StatefulWidget {
  const ProfileCompletionPage({Key? key}) : super(key: key);

  @override
  _ProfileCompletionPageState createState() => _ProfileCompletionPageState();
}

class _ProfileCompletionPageState extends State<ProfileCompletionPage> {
  final _formKey = GlobalKey<FormState>();
  final String _baseUrl = const String.fromEnvironment('API_BASE_URL', defaultValue: 'https://alvasglobalalumni.org');
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  // Professional fields
  final TextEditingController currentCompanyController = TextEditingController();
  final TextEditingController previousCompanyController = TextEditingController();
  final TextEditingController totalExperienceController = TextEditingController();
  final TextEditingController locationController = TextEditingController();

  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    currentCompanyController.dispose();
    previousCompanyController.dispose();
    totalExperienceController.dispose();
    locationController.dispose();
    super.dispose();
  }

  Future<void> _submitProfile() async {
    if (_formKey.currentState!.validate()) {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      try {
        final token = await _secureStorage.read(key: 'auth_token');
        if (token == null) {
          setState(() {
            _error = 'Authentication required. Please login again.';
            _isLoading = false;
          });
          return;
        }

        final response = await http.put(
          Uri.parse('$_baseUrl/api/users/profile'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
          body: jsonEncode({
            'location': locationController.text.trim(),
            'privateInfo': {
              'currentCompany': currentCompanyController.text.trim(),
              'previousCompanies': [
                {'company': previousCompanyController.text.trim()}
              ],
              'totalExperience': totalExperienceController.text.trim().isNotEmpty
                  ? int.tryParse(totalExperienceController.text.trim()) ?? 0
                  : 0,
            },
          }),
        );

        if (!mounted) return;

        if (response.statusCode == 200) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Profile completed successfully!')),
          );
          Navigator.pushReplacementNamed(context, '/home');
        } else {
          final Map<String, dynamic>? err = response.body.isNotEmpty ? jsonDecode(response.body) : null;
          setState(() {
            _error = err != null && err['message'] is String ? err['message'] as String : 'Failed to update profile';
          });
        }
      } catch (e) {
        if (!mounted) return;
        setState(() {
          _error = 'Network error. Please try again.';
        });
      } finally {
        if (mounted) {
          setState(() {
            _isLoading = false;
          });
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Complete Your Profile"),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
        automaticallyImplyLeading: false, // Prevent going back
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 8),
              const Text(
                "Professional Information Required",
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87),
              ),
              const SizedBox(height: 4),
              Text(
                "Please complete your profile to continue",
                style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 16),
              
              if (_error != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    border: Border.all(color: Colors.redAccent),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(_error!, style: const TextStyle(color: Colors.red)),
                ),
                const SizedBox(height: 16),
              ],

              // Location
              TextFormField(
                controller: locationController,
                decoration: _inputDecoration("Job Location *", Icons.location_on_outlined),
                validator: (value) => value!.trim().isEmpty ? "Enter your job location" : null,
              ),
              const SizedBox(height: 24),

              TextFormField(
                controller: currentCompanyController,
                decoration: _inputDecoration("Current Company *", Icons.business_center_outlined),
                validator: (value) => value!.trim().isEmpty ? "Enter your current company" : null,
              ),
              const SizedBox(height: 24),

              TextFormField(
                controller: previousCompanyController,
                decoration: _inputDecoration("Previous Company *", Icons.business_outlined),
                validator: (value) => value!.trim().isEmpty ? "Enter your previous company" : null,
              ),
              const SizedBox(height: 24),

              TextFormField(
                controller: totalExperienceController,
                decoration: _inputDecoration("Years of Experience *", Icons.timer_outlined, hintText: "e.g., 3"),
                keyboardType: TextInputType.number,
                validator: (value) => value!.trim().isEmpty ? "Enter your years of experience" : null,
              ),
              const SizedBox(height: 24),

              // Submit Button
              _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed: _submitProfile,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue.shade700,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text(
                          "Complete Profile",
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.blue.shade200),
      ),
      child: Row(
        children: [
          Icon(icon, color: Colors.blue.shade700, size: 20),
          const SizedBox(width: 8),
          Text(
            title,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.blue.shade700,
            ),
          ),
        ],
      ),
    );
  }

  InputDecoration _inputDecoration(String label, IconData icon, {String? hintText}) {
    return InputDecoration(
      labelText: label,
      hintText: hintText,
      prefixIcon: Icon(icon, color: Colors.blue.shade600),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: Colors.blue.shade700, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    );
  }
}
