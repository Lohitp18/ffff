import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:http_parser/http_parser.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:io';

class PostOpportunityPage extends StatefulWidget {
  const PostOpportunityPage({super.key});

  @override
  State<PostOpportunityPage> createState() => _PostOpportunityPageState();
}

class _PostOpportunityPageState extends State<PostOpportunityPage> {
  final String _baseUrl = const String.fromEnvironment('API_BASE_URL', defaultValue: 'https://alvasglobalalumni.org');
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _companyController = TextEditingController();
  final _applyLinkController = TextEditingController();
  final _typeController = TextEditingController();
  
  File? _selectedImage;
  bool _isLoading = false;
  String? _error;

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);
    if (pickedFile != null) {
      setState(() {
        _selectedImage = File(pickedFile.path);
      });
    }
  }

  Future<void> _postOpportunity() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Add auth token
      final token = await const FlutterSecureStorage().read(key: 'auth_token');
      print("Auth token: $token");
      
      if (_selectedImage != null) {
        // Create multipart request for image upload
        var request = http.MultipartRequest(
          'POST',
          Uri.parse('$_baseUrl/api/content/opportunities'),
        );

        // Add text fields
        request.fields['title'] = _titleController.text.trim();
        request.fields['description'] = _descriptionController.text.trim();
        request.fields['company'] = _companyController.text.trim();
        request.fields['applyLink'] = _applyLinkController.text.trim();
        request.fields['type'] = _typeController.text.trim();
        request.fields['status'] = 'pending'; // Set as pending for admin approval

        // Add image with content type
        final filePath = _selectedImage!.path;
        final extension = filePath.split('.').last.toLowerCase();
        final subtype = (extension == 'jpg') ? 'jpeg' : extension;
        request.files.add(
          await http.MultipartFile.fromPath(
            'image',
            filePath,
            contentType: MediaType('image', subtype),
          ),
        );

        // Add auth token
        if (token != null) {
          request.headers['Authorization'] = 'Bearer $token';
        }

        final response = await request.send();
        final responseBody = await response.stream.bytesToString();
        
        print("Response status: ${response.statusCode}");
        print("Response body: $responseBody");
        
        if (response.statusCode == 201) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Opportunity posted successfully! Awaiting admin approval.')),
            );
            Navigator.pop(context);
          }
        } else {
          final errorData = jsonDecode(responseBody);
          print("Error data: $errorData");
          setState(() {
            _error = errorData['message'] ?? 'Failed to post opportunity';
          });
        }
      } else {
        // Send JSON request when no image
        final response = await http.post(
          Uri.parse('$_baseUrl/api/content/opportunities'),
          headers: {
            'Content-Type': 'application/json',
            if (token != null) 'Authorization': 'Bearer $token',
          },
          body: jsonEncode({
            'title': _titleController.text.trim(),
            'description': _descriptionController.text.trim(),
            'company': _companyController.text.trim().isEmpty ? null : _companyController.text.trim(),
            'applyLink': _applyLinkController.text.trim().isEmpty ? null : _applyLinkController.text.trim(),
            'type': _typeController.text.trim().isEmpty ? null : _typeController.text.trim(),
            'status': 'pending',
          }),
        );
        
        print("Response status: ${response.statusCode}");
        print("Response body: ${response.body}");
        
        if (response.statusCode == 201) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Opportunity posted successfully! Awaiting admin approval.')),
            );
            Navigator.pop(context);
          }
        } else {
          final errorData = jsonDecode(response.body);
          print("Error data: $errorData");
          setState(() {
            _error = errorData['message'] ?? 'Failed to post opportunity';
          });
        }
      }
    } catch (e) {
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Post Opportunity'),
        actions: [
          TextButton(
            onPressed: _isLoading ? null : _postOpportunity,
            child: Text(
              'Post',
              style: TextStyle(
                color: _isLoading ? Colors.grey : Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Image picker
              Center(
                child: GestureDetector(
                  onTap: _pickImage,
                  child: Container(
                    width: 200,
                    height: 150,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: _selectedImage != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.file(
                              _selectedImage!,
                              fit: BoxFit.cover,
                            ),
                          )
                        : const Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.add_photo_alternate, size: 50),
                              SizedBox(height: 8),
                              Text('Tap to add image'),
                            ],
                          ),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Title field
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(
                  labelText: 'Job Title *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter job title';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Description field
              TextFormField(
                controller: _descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Job Description *',
                  border: OutlineInputBorder(),
                ),
                maxLines: 4,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter job description';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Company field
              TextFormField(
                controller: _companyController,
                decoration: const InputDecoration(
                  labelText: 'Company *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter company name';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Apply Link field (mandatory URL)
              TextFormField(
                controller: _applyLinkController,
                decoration: const InputDecoration(
                  labelText: 'Apply Link * (https://...)',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.url,
                validator: (value) {
                  final v = value?.trim() ?? '';
                  if (v.isEmpty) return 'Apply link is required';
                  final uri = Uri.tryParse(v);
                  if (uri == null || (!uri.isScheme("http") && !uri.isScheme("https"))) {
                    return 'Enter a valid URL (http/https)';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Type field
              TextFormField(
                controller: _typeController,
                decoration: const InputDecoration(
                  labelText: 'Job Type (e.g., Internship, Full-time) *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter job type';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 20),

              // Error message
              if (_error != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.error, color: Colors.red.shade600),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_error!, style: TextStyle(color: Colors.red.shade600))),
                    ],
                  ),
                ),

              const SizedBox(height: 20),

              // Post button
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _postOpportunity,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                  ),
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text(
                          'Post Opportunity',
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

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _companyController.dispose();
    _applyLinkController.dispose();
    _typeController.dispose();
    super.dispose();
  }
}
