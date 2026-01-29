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
  final String _baseUrl = const String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:5000');
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  // Professional fields
  final TextEditingController currentCompanyController = TextEditingController();
  final TextEditingController currentPositionController = TextEditingController();
  final TextEditingController previousCompanyController = TextEditingController();
  final TextEditingController previousPositionController = TextEditingController();
  final TextEditingController placementCompanyController = TextEditingController();
  final TextEditingController placementYearController = TextEditingController();
  final TextEditingController totalExperienceController = TextEditingController();
  final TextEditingController fieldsWorkedController = TextEditingController();
  final TextEditingController headlineController = TextEditingController();
  final TextEditingController locationController = TextEditingController();

  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    currentCompanyController.dispose();
    currentPositionController.dispose();
    previousCompanyController.dispose();
    previousPositionController.dispose();
    placementCompanyController.dispose();
    placementYearController.dispose();
    totalExperienceController.dispose();
    fieldsWorkedController.dispose();
    headlineController.dispose();
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
            'headline': headlineController.text.trim(),
            'location': locationController.text.trim(),
            'privateInfo': {
              'currentCompany': currentCompanyController.text.trim(),
              'currentPosition': currentPositionController.text.trim(),
              'previousCompany': previousCompanyController.text.trim(),
              'previousPosition': previousPositionController.text.trim(),
              'placementCompany': placementCompanyController.text.trim(),
              'placementYear': placementYearController.text.trim(),
              'totalExperience': totalExperienceController.text.trim().isNotEmpty
                  ? int.tryParse(totalExperienceController.text.trim()) ?? 0
                  : 0,
              'fieldsWorked': fieldsWorkedController.text.trim().isNotEmpty
                  ? fieldsWorkedController.text.trim().split(',').map((e) => e.trim()).toList()
                  : [],
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

              // Headline
              TextFormField(
                controller: headlineController,
                decoration: _inputDecoration("Professional Headline *", Icons.title, 
                  hintText: "e.g., Software Engineer at Google"),
                validator: (value) => value!.isEmpty ? "Enter your professional headline" : null,
              ),
              const SizedBox(height: 12),

              // Location
              TextFormField(
                controller: locationController,
                decoration: _inputDecoration("Current Location *", Icons.location_on_outlined),
                validator: (value) => value!.isEmpty ? "Enter your current location" : null,
              ),
              const SizedBox(height: 24),

              // Current Company Section
              _buildSectionHeader("Current Employment", Icons.business_center),
              const SizedBox(height: 12),

              TextFormField(
                controller: currentCompanyController,
                decoration: _inputDecoration("Current Company *", Icons.business_center_outlined),
                validator: (value) => value!.isEmpty ? "Enter your current company" : null,
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: currentPositionController,
                decoration: _inputDecoration("Current Position/Designation *", Icons.badge_outlined),
                validator: (value) => value!.isEmpty ? "Enter your current position" : null,
              ),
              const SizedBox(height: 24),

              // Previous Company Section
              _buildSectionHeader("Previous Employment", Icons.history),
              const SizedBox(height: 12),

              TextFormField(
                controller: previousCompanyController,
                decoration: _inputDecoration("Previous Company *", Icons.business_outlined),
                validator: (value) => value!.isEmpty ? "Enter your previous company" : null,
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: previousPositionController,
                decoration: _inputDecoration("Previous Position/Designation *", Icons.work_outline),
                validator: (value) => value!.isEmpty ? "Enter your previous position" : null,
              ),
              const SizedBox(height: 24),

              // Experience & Other Details
              _buildSectionHeader("Experience & Other Details", Icons.info),
              const SizedBox(height: 12),

              TextFormField(
                controller: totalExperienceController,
                decoration: _inputDecoration("Total Years of Experience *", Icons.timer_outlined,
                  hintText: "e.g., 3"),
                keyboardType: TextInputType.number,
                validator: (value) => value!.isEmpty ? "Enter your total experience" : null,
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: fieldsWorkedController,
                decoration: _inputDecoration("Fields/Domains Worked In *", Icons.category_outlined,
                  hintText: "e.g., Web Development, Machine Learning (comma-separated)"),
                validator: (value) => value!.isEmpty ? "Enter fields you have worked in" : null,
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: placementCompanyController,
                decoration: _inputDecoration("Campus Placement Company", Icons.celebration_outlined,
                  hintText: "Company where you got placed (if any)"),
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: placementYearController,
                decoration: _inputDecoration("Placement Year", Icons.event,
                  hintText: "Year of campus placement"),
                keyboardType: TextInputType.number,
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
