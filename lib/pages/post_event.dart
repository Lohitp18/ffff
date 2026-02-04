import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:http_parser/http_parser.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:io';

class PostEventPage extends StatefulWidget {
  const PostEventPage({super.key});

  @override
  State<PostEventPage> createState() => _PostEventPageState();
}

class _PostEventPageState extends State<PostEventPage> {
  final String _baseUrl = const String.fromEnvironment('API_BASE_URL', defaultValue: 'https://alvasglobalalumni.org');
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _dateController = TextEditingController();
  final _locationController = TextEditingController();
  
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

  Future<void> _postEvent() async {
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
          Uri.parse('$_baseUrl/api/content/events'),
        );

        // Add text fields
        request.fields['title'] = _titleController.text.trim();
        request.fields['description'] = _descriptionController.text.trim();
        request.fields['date'] = DateTime.parse('${_dateController.text.trim()}T00:00:00').toIso8601String();
        request.fields['location'] = _locationController.text.trim();
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
              const SnackBar(content: Text('Event posted successfully! Awaiting admin approval.')),
            );
            Navigator.pop(context);
          }
        } else {
          final errorData = jsonDecode(responseBody);
          print("Error data: $errorData");
          setState(() {
            _error = errorData['message'] ?? 'Failed to post event';
          });
        }
      } else {
        // Send JSON request when no image
        final response = await http.post(
          Uri.parse('$_baseUrl/api/content/events'),
          headers: {
            'Content-Type': 'application/json',
            if (token != null) 'Authorization': 'Bearer $token',
          },
          body: jsonEncode({
            'title': _titleController.text.trim(),
            'description': _descriptionController.text.trim(),
            'date': DateTime.parse('${_dateController.text.trim()}T00:00:00').toIso8601String(),
            'location': _locationController.text.trim().isEmpty ? null : _locationController.text.trim(),
            'status': 'pending',
          }),
        );
        
        print("Response status: ${response.statusCode}");
        print("Response body: ${response.body}");
        
        if (response.statusCode == 201) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Event posted successfully! Awaiting admin approval.')),
            );
            Navigator.pop(context);
          }
        } else {
          final errorData = jsonDecode(response.body);
          print("Error data: $errorData");
          setState(() {
            _error = errorData['message'] ?? 'Failed to post event';
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
        title: const Text('Post Event'),
        actions: [
          TextButton(
            onPressed: _isLoading ? null : _postEvent,
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
                  labelText: 'Event Title *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter event title';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Description field
              TextFormField(
                controller: _descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Description *',
                  border: OutlineInputBorder(),
                ),
                maxLines: 4,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter event description';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Date field
              TextFormField(
                controller: _dateController,
                decoration: const InputDecoration(
                  labelText: 'Event Date (YYYY-MM-DD) *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter event date';
                  }
                  try {
                    DateTime.parse('${value.trim()}T00:00:00');
                    return null;
                  } catch (e) {
                    return 'Please enter date in YYYY-MM-DD format';
                  }
                },
              ),
              const SizedBox(height: 16),

              // Location field
              TextFormField(
                controller: _locationController,
                decoration: const InputDecoration(
                  labelText: 'Location (optional)',
                  border: OutlineInputBorder(),
                ),
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
                  onPressed: _isLoading ? null : _postEvent,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue,
                    foregroundColor: Colors.white,
                  ),
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text(
                          'Post Event',
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
    _dateController.dispose();
    _locationController.dispose();
    super.dispose();
  }
}
