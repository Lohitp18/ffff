import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SignUpPage extends StatefulWidget {
  const SignUpPage({Key? key}) : super(key: key);

  @override
  _SignUpPageState createState() => _SignUpPageState();
}

class _SignUpPageState extends State<SignUpPage> {
  final _formKey = GlobalKey<FormState>();

  // Basic fields
  final TextEditingController nameController = TextEditingController();
  final TextEditingController emailController = TextEditingController();
  final TextEditingController phoneController = TextEditingController();
  final TextEditingController dobController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();
  final TextEditingController confirmPasswordController = TextEditingController();

  // Status selection
  String? _status; // 'working', 'masters', 'entrepreneurs'

  // Conditional fields for "Currently Working"
  final TextEditingController jobLocationController = TextEditingController();
  final TextEditingController currentCompanyController = TextEditingController();
  final TextEditingController positionController = TextEditingController();
  final TextEditingController totalExperienceController = TextEditingController();

  // Conditional fields for "Masters"
  final TextEditingController mastersCollegeController = TextEditingController();
  final TextEditingController mastersCourseController = TextEditingController();

  // Conditional fields for "Entrepreneurs"
  final TextEditingController entrepreneurCompanyController = TextEditingController();
  final TextEditingController companyTypeController = TextEditingController();

  // Optional fields
  final TextEditingController socialMediaController = TextEditingController();

  String? _institution;
  String? _course;
  String? _year; // year of passed out

  final List<String> _institutions = <String>[
    "Alva's institute of engineering and technology",
    "Alva's homeopathic college",
    "Alva's nursing college",
    "Alva's college of naturopathy",
    "Alva's college of allied health sciences",
    "Alva's law college",
    "Alva's physiotherapy",
    "Alva's physical education",
    "Alva's degree college",
    "Alva's pu college",
    "Alva's mba",
  ];

  final List<String> _courses = <String>[
    'Bcs nursing',
    'Msc nursing',
    'PhD nursing',
    'Llb',
    'Bcom llb',
    'Bballb',
    'Ballb',
    'Bnys',
    'Md clinical naturopathy',
    'Md clinical yoga',
    'CSE',
    'Ise',
    'Ece',
    'Aiml',
    'Csd',
    'Cs datascience',
    'Cs iot',
    'Mechanical',
    'Civil',
    'Agriculture',
    'Electronics',
  ];
  final List<String> _years = List<String>.generate(30, (i) => (DateTime.now().year - i).toString());

  bool _isLoading = false;
  String? _error;
  static const String _baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'https://alvasglobalalumni.org');
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  void _signUp() async {
    if (_formKey.currentState!.validate()) {
      if (_status == null) {
        setState(() { _error = 'Please select your current status'; });
        return;
      }

      setState(() {
        _isLoading = true;
      });
      setState(() { _error = null; });

      try {
        // Build request body based on status
        Map<String, dynamic> requestBody = {
          'name': nameController.text.trim(),
          'email': emailController.text.trim(),
          'phone': phoneController.text.trim(),
          'dob': DateTime.tryParse(dobController.text) != null ? dobController.text : DateTime.now().toIso8601String(),
          'institution': _institution ?? '',
          'course': _course ?? '',
          'year': _year ?? '',
          'password': passwordController.text,
          'socialMedia': socialMediaController.text.trim(),
        };

        // Add conditional fields based on status
        if (_status == 'working') {
          requestBody['location'] = jobLocationController.text.trim();
          requestBody['currentCompany'] = currentCompanyController.text.trim();
          requestBody['position'] = positionController.text.trim();
          requestBody['totalExperience'] = totalExperienceController.text.trim();
          requestBody['previousCompany'] = '';
        } else if (_status == 'masters') {
          requestBody['location'] = mastersCollegeController.text.trim();
          requestBody['currentCompany'] = mastersCourseController.text.trim();
          requestBody['previousCompany'] = '';
          requestBody['totalExperience'] = '0';
        } else if (_status == 'entrepreneurs') {
          requestBody['location'] = '';
          requestBody['currentCompany'] = entrepreneurCompanyController.text.trim();
          requestBody['previousCompany'] = companyTypeController.text.trim();
          requestBody['totalExperience'] = '0';
        }

        final uri = Uri.parse('$_baseUrl/api/auth/signup');
        final response = await http.post(
          uri,
          headers: { 'Content-Type': 'application/json' },
          body: jsonEncode(requestBody),
        );

        if (!mounted) return;

        if (response.statusCode == 201) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Account created! Awaiting admin approval.')),
          );
          // Navigate back to sign in - admin approval required
          Navigator.pop(context);
        } else {
          final Map<String, dynamic>? err = response.body.isNotEmpty ? jsonDecode(response.body) : null;
          setState(() { _error = err != null && err['message'] is String ? err['message'] as String : 'Sign up failed'; });
        }
      } catch (e) {
        if (!mounted) return;
        setState(() { _error = 'Network error. Please try again.'; });
      } finally {
        if (mounted) {
          setState(() { _isLoading = false; });
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Create Account"),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
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
                "Join the Alumni Community",
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87),
              ),
              const SizedBox(height: 4),
              Text(
                "Fill in all required details to create your profile",
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

              // ===== BASIC INFORMATION SECTION =====
              _buildSectionHeader("Basic Information", Icons.person),
              const SizedBox(height: 12),
              
              // Name
              TextFormField(
                controller: nameController,
                decoration: _inputDecoration("Full Name *", Icons.person_outline),
                validator: (value) => value!.isEmpty ? "Enter your full name" : null,
              ),
              const SizedBox(height: 12),

              // Email
              TextFormField(
                controller: emailController,
                decoration: _inputDecoration("Email *", Icons.email_outlined),
                keyboardType: TextInputType.emailAddress,
                validator: (value) {
                  if (value!.isEmpty) return "Enter your email";
                  if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
                    return "Enter a valid email";
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),

              // Phone
              TextFormField(
                controller: phoneController,
                decoration: _inputDecoration("Phone Number *", Icons.phone_outlined),
                keyboardType: TextInputType.phone,
                validator: (value) => value!.isEmpty ? "Enter your phone number" : null,
              ),
              const SizedBox(height: 12),

              // DOB
              TextFormField(
                controller: dobController,
                decoration: _inputDecoration("Date of Birth *", Icons.calendar_today_outlined),
                readOnly: true,
                onTap: () async {
                  FocusScope.of(context).requestFocus(FocusNode());
                  DateTime? pickedDate = await showDatePicker(
                    context: context,
                    initialDate: DateTime(2000),
                    firstDate: DateTime(1950),
                    lastDate: DateTime.now(),
                  );
                  if (pickedDate != null) {
                    dobController.text = "${pickedDate.day.toString().padLeft(2, '0')}-${pickedDate.month.toString().padLeft(2, '0')}-${pickedDate.year}";
                  }
                },
                validator: (value) => value!.isEmpty ? "Select your date of birth" : null,
              ),
              const SizedBox(height: 12),

              // ===== EDUCATION SECTION =====
              _buildSectionHeader("Education Details", Icons.school),
              const SizedBox(height: 12),

              // Institution dropdown
              DropdownButtonFormField<String>(
                value: _institution,
                items: [
                  ..._institutions.map((i) => DropdownMenuItem(value: i, child: Text(i)))
                ],
                onChanged: (v) => setState(() { _institution = v; }),
                decoration: _inputDecoration("Institution *", Icons.business),
                validator: (v) => (v == null || v.isEmpty) ? 'Select your institution' : null,
              ),
              const SizedBox(height: 12),

              // Course dropdown
              DropdownButtonFormField<String>(
                value: _course,
                items: [
                  ..._courses.map((c) => DropdownMenuItem(value: c, child: Text(c)))
                ],
                onChanged: (v) => setState(() { _course = v; }),
                decoration: _inputDecoration("Course *", Icons.menu_book),
                validator: (v) => (v == null || v.isEmpty) ? 'Select your course' : null,
              ),
              const SizedBox(height: 12),

              // Year of passed-out dropdown
              DropdownButtonFormField<String>(
                value: _year,
                items: [
                  ..._years.map((y) => DropdownMenuItem(value: y, child: Text(y)))
                ],
                onChanged: (v) => setState(() { _year = v; }),
                decoration: _inputDecoration("Year of Graduation *", Icons.date_range),
                validator: (v) => (v == null || v.isEmpty) ? 'Select your graduation year' : null,
              ),
              const SizedBox(height: 24),

              // ===== CURRENT STATUS SECTION =====
              _buildSectionHeader("Current Status", Icons.info_outline),
              const SizedBox(height: 12),

              DropdownButtonFormField<String>(
                value: _status,
                items: const [
                  DropdownMenuItem(value: 'working', child: Text('Currently Working')),
                  DropdownMenuItem(value: 'masters', child: Text('Doing Masters')),
                  DropdownMenuItem(value: 'entrepreneurs', child: Text('Entrepreneurs')),
                ],
                onChanged: (v) => setState(() { _status = v; }),
                decoration: _inputDecoration("Current Status *", Icons.work_outline),
                validator: (v) => (v == null) ? 'Select your current status' : null,
              ),
              const SizedBox(height: 24),

              // Conditional fields based on status
              if (_status == 'working') ...[
                _buildSectionHeader("Professional Details", Icons.work),
                const SizedBox(height: 12),
                TextFormField(
                  controller: jobLocationController,
                  decoration: _inputDecoration("Job Location *", Icons.location_on_outlined),
                  validator: (value) => value!.trim().isEmpty ? "Enter your job location" : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: currentCompanyController,
                  decoration: _inputDecoration("Company Name *", Icons.business_center_outlined),
                  validator: (value) => value!.trim().isEmpty ? "Enter your company name" : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: positionController,
                  decoration: _inputDecoration("Position *", Icons.badge_outlined),
                  validator: (value) => value!.trim().isEmpty ? "Enter your position" : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: totalExperienceController,
                  decoration: _inputDecoration(
                    "Years of Experience *",
                    Icons.timer_outlined,
                    hintText: "e.g., 3",
                  ),
                  keyboardType: TextInputType.number,
                  validator: (value) => value!.trim().isEmpty ? "Enter your years of experience" : null,
                ),
                const SizedBox(height: 24),
              ],

              if (_status == 'masters') ...[
                _buildSectionHeader("Masters Details", Icons.school),
                const SizedBox(height: 12),
                TextFormField(
                  controller: mastersCollegeController,
                  decoration: _inputDecoration("College Name *", Icons.business),
                  validator: (value) => value!.trim().isEmpty ? "Enter college name" : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: mastersCourseController,
                  decoration: _inputDecoration("Course Name *", Icons.menu_book),
                  validator: (value) => value!.trim().isEmpty ? "Enter course name" : null,
                ),
                const SizedBox(height: 24),
              ],

              if (_status == 'entrepreneurs') ...[
                _buildSectionHeader("Entrepreneur Details", Icons.business),
                const SizedBox(height: 12),
                TextFormField(
                  controller: entrepreneurCompanyController,
                  decoration: _inputDecoration("Company Name *", Icons.business_center_outlined),
                  validator: (value) => value!.trim().isEmpty ? "Enter your company name" : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: companyTypeController,
                  decoration: _inputDecoration("Company Type *", Icons.category_outlined, hintText: "e.g., Tech, Healthcare"),
                  validator: (value) => value!.trim().isEmpty ? "Enter company type" : null,
                ),
                const SizedBox(height: 24),
              ],

              // ===== SOCIAL & SECURITY SECTION =====
              _buildSectionHeader("Social & Security", Icons.lock),
              const SizedBox(height: 12),

              // Social Media
              TextFormField(
                controller: socialMediaController,
                decoration: _inputDecoration("LinkedIn Profile URL", Icons.link),
              ),
              const SizedBox(height: 12),

              // Password
              TextFormField(
                controller: passwordController,
                obscureText: true,
                decoration: _inputDecoration("Password *", Icons.lock_outline),
                validator: (value) {
                  if (value!.isEmpty) return "Enter a password";
                  if (value.length < 6) return "Password must be at least 6 characters";
                  return null;
                },
              ),
              const SizedBox(height: 12),

              // Confirm Password
              TextFormField(
                controller: confirmPasswordController,
                obscureText: true,
                decoration: _inputDecoration("Confirm Password *", Icons.lock_outline),
                validator: (value) => value != passwordController.text ? "Passwords don't match" : null,
              ),
              const SizedBox(height: 24),

              // Submit Button
              _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed: _signUp,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue.shade700,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text(
                          "Create Account",
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
              const SizedBox(height: 16),
              
              // Login link
              Center(
                child: TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: RichText(
                    text: TextSpan(
                      text: "Already have an account? ",
                      style: TextStyle(color: Colors.grey.shade600),
                      children: [
                        TextSpan(
                          text: "Sign In",
                          style: TextStyle(
                            color: Colors.blue.shade700,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
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
