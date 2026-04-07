import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SignInPage extends StatefulWidget {
  const SignInPage({Key? key}) : super(key: key);

  @override
  _SignInPageState createState() => _SignInPageState();
}

class _SignInPageState extends State<SignInPage> {
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();

  bool _isLoading = false;
  String? _error;
  static const String _baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'https://alvasglobalalumni.org');
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  @override
  void initState() {
    super.initState();
  }

  void _signIn() async {
    setState(() {
      _isLoading = true;
    });
    setState(() { _error = null; });

    try {
      // Validate inputs
      if (emailController.text.trim().isEmpty) {
        setState(() { _error = 'Email is required'; });
        setState(() { _isLoading = false; });
        return;
      }
      if (passwordController.text.isEmpty) {
        setState(() { _error = 'Password is required'; });
        setState(() { _isLoading = false; });
        return;
      }

      final uri = Uri.parse('$_baseUrl/api/auth/signin');
      final response = await http.post(
        uri,
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({
          'email': emailController.text.trim(),
          'password': passwordController.text,
        }),
      ).timeout(
        const Duration(seconds: 30),
        onTimeout: () {
          throw Exception('Request timeout. Please check your connection.');
        },
      );

      if (!mounted) return;

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        final String? token = data['token'] as String?;
        if (token != null && token.isNotEmpty) {
          await _secureStorage.write(key: 'auth_token', value: token);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Signed in successfully')),
          );
          
          // Check if profile is complete
          final profileResponse = await http.get(
            Uri.parse('$_baseUrl/api/users/profile'),
            headers: {
              'Authorization': 'Bearer $token',
              'Content-Type': 'application/json',
            },
          );
          
          if (profileResponse.statusCode == 200) {
            final profileData = jsonDecode(profileResponse.body) as Map<String, dynamic>;
            final privateInfo = profileData['privateInfo'] as Map<String, dynamic>?;
            final hasCurrentCompany = privateInfo?['currentCompany']?.toString().trim().isNotEmpty ?? false;
            final hasLocation = profileData['location']?.toString().trim().isNotEmpty ?? false;
            final exp = privateInfo?['totalExperience'];
            final hasExperience = (exp is num ? exp : num.tryParse(exp?.toString() ?? '')) != null;
            final previousCompanies = privateInfo?['previousCompanies'];
            final hasPreviousCompany = (previousCompanies is List && previousCompanies.isNotEmpty)
                ? (previousCompanies.first is Map &&
                    (previousCompanies.first['company']?.toString().trim().isNotEmpty ?? false))
                : false;
            
            // If profile is incomplete, redirect to completion page
            if (!hasCurrentCompany || !hasPreviousCompany || !hasExperience || !hasLocation) {
              Navigator.pushReplacementNamed(context, '/profile-completion');
            } else {
              Navigator.pushReplacementNamed(context, '/home');
            }
          } else {
            // If profile fetch fails, go to home
            Navigator.pushReplacementNamed(context, '/home');
          }
        } else {
          setState(() { _error = 'Invalid response from server'; });
        }
      } else {
        String errorMessage = 'Sign in failed';
        if (response.body.isNotEmpty) {
          try {
            final Map<String, dynamic> err = jsonDecode(response.body);
            errorMessage = err['message'] is String ? err['message'] as String : errorMessage;
          } catch (_) {
            errorMessage = 'Sign in failed (${response.statusCode})';
          }
        } else {
          errorMessage = 'Sign in failed (${response.statusCode})';
        }
        setState(() { _error = errorMessage; });
      }
    } catch (e) {
      if (!mounted) return;
      String errorMsg = 'Network error. Please try again.';
      if (e.toString().contains('timeout')) {
        errorMsg = 'Connection timeout. Please check your internet connection.';
      } else if (e.toString().contains('Failed host lookup') || e.toString().contains('SocketException')) {
        errorMsg = 'Cannot connect to server. Please check your connection and server URL.';
      } else if (e.toString().isNotEmpty) {
        errorMsg = 'Error: ${e.toString()}';
      }
      setState(() { _error = errorMsg; });
    } finally {
      if (mounted) {
        setState(() { _isLoading = false; });
      }
    }
  }

  Widget _buildEnrollmentSelectors() {
    return Column(
      children: [
        DropdownButtonFormField<String>(
          value: _institution,
          isExpanded: true,
          decoration: _inputDecoration('Institution', Icons.business),
          items: _institutions.map((String value) {
            return DropdownMenuItem<String>(value: value, child: Text(value, style: const TextStyle(fontSize: 13)));
          }).toList(),
          onChanged: _onInstitutionChanged,
        ),
        if (_institution != null) ...[
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _program,
            isExpanded: true,
            decoration: _inputDecoration('Program', Icons.category),
            items: _programs.map((String value) {
              return DropdownMenuItem<String>(value: value, child: Text(value, style: const TextStyle(fontSize: 13)));
            }).toList(),
            onChanged: _onProgramChanged,
          ),
        ],
        if (_program != null) ...[
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _course,
            isExpanded: true,
            decoration: _inputDecoration('Course', Icons.menu_book),
            items: _courses.map((String value) {
              return DropdownMenuItem<String>(value: value, child: Text(value, style: const TextStyle(fontSize: 13)));
            }).toList(),
            onChanged: _onCourseChanged,
          ),
        ],
        if (_course != null && _specializations.isNotEmpty) ...[
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _specialization,
            isExpanded: true,
            decoration: _inputDecoration('Specialization', Icons.star_border),
            items: _specializations.map((String value) {
              return DropdownMenuItem<String>(value: value, child: Text(value, style: const TextStyle(fontSize: 13)));
            }).toList(),
            onChanged: (v) => setState(() => _specialization = v),
          ),
        ],
        if (_course != null) ...[
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _year,
            isExpanded: true,
            decoration: _inputDecoration('Year', Icons.calendar_today),
            items: _years.map((String value) {
              return DropdownMenuItem<String>(value: value, child: Text(value, style: const TextStyle(fontSize: 13)));
            }).toList(),
            onChanged: (v) => setState(() => _year = v),
          ),
        ],
      ],
    );
  }

  InputDecoration _inputDecoration(String label, IconData icon) {
    return InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon),
      border: const OutlineInputBorder(),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            children: [
              const SizedBox(height: 32),
              Center(
                child: Column(
                  children: [
                    Image.asset('assets/logo.png', height: 96),
                    const SizedBox(height: 12),
                    const Text(
                      'Welcome to Alva\'s Alumni',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28),

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

              TextField(
                controller: emailController,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  border: OutlineInputBorder(),
                ),
              ),

              const SizedBox(height: 20),

              TextField(
                controller: passwordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Password',
                  border: OutlineInputBorder(),
                ),
              ),

              const SizedBox(height: 10),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(children: [
                    Checkbox(value: true, onChanged: (_) {}),
                    const Text('Remember me')
                  ]),
                  TextButton(
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ResetPasswordPage()),
                    ),
                    child: const Text('Forgot Password?'),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              _isLoading
                  ? const CircularProgressIndicator()
                  : SizedBox(
                      width: double.infinity,
                      height: 54,
                      child: ElevatedButton(
                        onPressed: _signIn,
                        style: ElevatedButton.styleFrom(
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text(
                          'Sign In',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      )),

              const SizedBox(height: 20),

              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('New here? '),
                  GestureDetector(
                    onTap: () => Navigator.pushNamed(context, '/signup'),
                    child: const Text('Create account',
                        style: TextStyle(color: Colors.blue, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

class ResetPasswordPage extends StatefulWidget {
  const ResetPasswordPage({super.key});
  @override
  State<ResetPasswordPage> createState() => _ResetPasswordPageState();
}

class _ResetPasswordPageState extends State<ResetPasswordPage> {
  final _formKey = GlobalKey<FormState>();
  final _idCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();
  final _pwdCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _loading = false;
  bool _sending = false;
  bool _verifying = false;
  String? _resetOtpToken;
  String? _error;
  String? _info;
  static const String _baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'https://alvasglobalalumni.org');

  Future<void> _sendCode() async {
    final id = _idCtrl.text.trim();
    if (id.isEmpty) {
      setState(() { _error = 'Enter email or username'; });
      return;
    }
    setState(() { _sending = true; _error = null; _info = null; });
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/api/auth/forgot-password'),
        headers: { 'Content-Type': 'application/json' },
        body: jsonEncode({ 'identifier': id }),
      );
      if (!mounted) return;
      final body = res.body.isNotEmpty ? jsonDecode(res.body) : null;
      final msg = body?['message']?.toString() ?? 'If an account exists, a code was sent.';
      final dev = body?['devOtp']?.toString();
      setState(() {
        _info = dev != null ? '$msg (dev: $dev)' : msg;
      });
    } catch (_) {
      if (mounted) setState(() { _error = 'Network error'; });
    } finally {
      if (mounted) setState(() { _sending = false; });
    }
  }

  Future<void> _verifyCode() async {
    final id = _idCtrl.text.trim();
    final code = _otpCtrl.text.trim();
    if (code.length != 6) {
      setState(() { _error = 'Enter the 6-digit code'; });
      return;
    }
    setState(() { _verifying = true; _error = null; });
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/api/auth/verify-otp'),
        headers: { 'Content-Type': 'application/json' },
        body: jsonEncode({
          'purpose': 'password_reset',
          'identifier': id,
          'code': code,
        }),
      );
      if (!mounted) return;
      final body = res.body.isNotEmpty ? jsonDecode(res.body) : null;
      if (res.statusCode == 200 && body?['resetOtpToken'] != null) {
        setState(() {
          _resetOtpToken = body!['resetOtpToken'] as String;
          _info = 'Verified. Enter a new password below.';
        });
      } else {
        setState(() { _error = body?['message']?.toString() ?? 'Invalid code'; });
      }
    } catch (_) {
      if (mounted) setState(() { _error = 'Network error'; });
    } finally {
      if (mounted) setState(() { _verifying = false; });
    }
  }

  Future<void> _submitNewPassword() async {
    if (!_formKey.currentState!.validate()) return;
    final token = _resetOtpToken;
    if (token == null) {
      setState(() { _error = 'Verify SMS code first'; });
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/api/auth/reset-password'),
        headers: { 'Content-Type': 'application/json' },
        body: jsonEncode({
          'resetOtpToken': token,
          'newPassword': _pwdCtrl.text,
        }),
      );
      if (res.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Password reset successful')));
          Navigator.pop(context);
        }
      } else {
        final err = res.body.isNotEmpty ? jsonDecode(res.body) : null;
        if (mounted) setState(() { _error = err?['message']?.toString() ?? 'Failed to reset password'; });
      }
    } catch (_) {
      if (mounted) setState(() { _error = 'Network error'; });
    } finally {
      if (mounted) setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reset Password')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
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
                const SizedBox(height: 12),
              ],
              if (_info != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.1),
                    border: Border.all(color: Colors.green),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(_info!, style: const TextStyle(color: Colors.green.shade800)),
                ),
                const SizedBox(height: 12),
              ],
              TextFormField(
                controller: _idCtrl,
                enabled: _resetOtpToken == null,
                decoration: const InputDecoration(
                  labelText: 'Email or username',
                  border: OutlineInputBorder(),
                ),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              if (_resetOtpToken == null) ...[
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: _sending ? null : _sendCode,
                    child: Text(_sending ? 'Sending…' : 'Send SMS code'),
                  ),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _otpCtrl,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  decoration: const InputDecoration(
                    labelText: '6-digit SMS code',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: _verifying ? null : _verifyCode,
                    child: Text(_verifying ? 'Verifying…' : 'Verify code'),
                  ),
                ),
              ],
              if (_resetOtpToken != null) ...[
                TextFormField(
                  controller: _pwdCtrl,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'New Password', border: OutlineInputBorder()),
                  validator: (v) => (v == null || v.isEmpty) ? 'Enter password' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _confirmCtrl,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Confirm Password', border: OutlineInputBorder()),
                  validator: (v) => (v != _pwdCtrl.text) ? 'Passwords do not match' : null,
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _submitNewPassword,
                    child: _loading ? const CircularProgressIndicator() : const Text('Update password'),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
