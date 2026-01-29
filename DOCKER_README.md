# Alumni Portal - Docker Deployment Guide

This guide explains how to deploy the Alumni Portal application using Docker.

## Prerequisites

- Docker Engine (20.10+)
- Docker Compose (v2.0+)

## Quick Start

### 1. Clone and Configure

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your settings
# IMPORTANT: Change the default passwords and JWT secret for production!
```

### 2. Build and Run

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f
```

### 3. Access the Application

- **Web Frontend**: http://localhost:80
- **API Backend**: http://localhost:5000
- **MongoDB**: localhost:27017

## Services Overview

| Service | Description | Port |
|---------|-------------|------|
| `mongodb` | MongoDB 7 database | 27017 |
| `backend` | Node.js Express API | 5000 |
| `web` | React frontend (nginx) | 80 |

## Environment Variables

### Required Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_ROOT_USER` | MongoDB root username | admin |
| `MONGO_ROOT_PASSWORD` | MongoDB root password | adminpassword |
| `MONGO_USER` | Application DB username | alumniuser |
| `MONGO_PASSWORD` | Application DB password | alumnipassword |
| `JWT_SECRET` | JWT signing secret | (change for production!) |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AZURE_STORAGE_CONNECTION_STRING` | Azure blob storage connection | (empty) |
| `AZURE_STORAGE_CONTAINER_NAME` | Azure container name | alumni-uploads |
| `EMAIL_HOST` | SMTP server host | smtp.gmail.com |
| `EMAIL_PORT` | SMTP server port | 587 |
| `EMAIL_USER` | SMTP username | (empty) |
| `EMAIL_PASS` | SMTP password | (empty) |
| `VITE_API_URL` | Frontend API URL | http://localhost:5000 |

## Common Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f [service_name]

# Restart a service
docker-compose restart [service_name]

# Rebuild a specific service
docker-compose up -d --build [service_name]

# Remove all containers and volumes (CAUTION: deletes data!)
docker-compose down -v

# Access MongoDB shell
docker exec -it alumni_mongodb mongosh -u admin -p adminpassword

# Access backend container
docker exec -it alumni_backend sh
```

## Production Deployment

### 1. Security Checklist

- [ ] Change all default passwords in `.env`
- [ ] Set a strong `JWT_SECRET` (32+ random characters)
- [ ] Configure HTTPS (use nginx reverse proxy or load balancer)
- [ ] Set up firewall rules
- [ ] Enable MongoDB authentication
- [ ] Configure backup strategy

### 2. HTTPS Configuration

For production, you should use HTTPS. Options:

1. **Using a reverse proxy (recommended)**:
   - Use nginx/Traefik/Caddy in front of the containers
   - Configure SSL certificates (Let's Encrypt)

2. **Using a load balancer**:
   - AWS ALB, GCP Load Balancer, etc.
   - Handle SSL termination at the load balancer

### 3. Scaling

```bash
# Scale backend service
docker-compose up -d --scale backend=3
```

Note: For multiple backend instances, you'll need:
- A load balancer in front
- Session storage (Redis) if using sessions
- Shared file storage (S3/Azure Blob) for uploads

## Troubleshooting

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
docker-compose ps mongodb

# View MongoDB logs
docker-compose logs mongodb

# Verify connection
docker exec -it alumni_backend node -e "
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGO_URI).then(() => console.log('Connected!')).catch(console.error);
"
```

### Backend Not Starting

```bash
# Check backend logs
docker-compose logs backend

# Verify environment variables
docker exec -it alumni_backend env | grep MONGO

# Test health endpoint
curl http://localhost:5000/api/health
```

### Frontend Issues

```bash
# Check web logs
docker-compose logs web

# Rebuild frontend
docker-compose up -d --build web

# Test frontend
curl http://localhost:80
```

### Port Conflicts

If ports are already in use:

```bash
# Check what's using the port
netstat -tulpn | grep :5000
netstat -tulpn | grep :80

# Change ports in docker-compose.yml:
# ports:
#   - "8080:80"  # Change host port to 8080
```

## Data Persistence

Data is persisted in Docker volumes:

- `mongodb_data`: Database files
- `backend_uploads`: Uploaded files

### Backup MongoDB

```bash
# Create backup
docker exec alumni_mongodb mongodump -u admin -p adminpassword --out /dump
docker cp alumni_mongodb:/dump ./backup

# Restore backup
docker cp ./backup alumni_mongodb:/dump
docker exec alumni_mongodb mongorestore -u admin -p adminpassword /dump
```

## Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| Debug mode | Enabled | Disabled |
| CORS | Open | Restricted |
| Passwords | Defaults | Strong, unique |
| SSL | Optional | Required |
| Logging | Verbose | Error-only |

## Architecture

```
                    ┌─────────────────┐
                    │   Load Balancer │
                    │   (HTTPS/SSL)   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │  Web/    │   │  Web/    │   │  Backend │
        │  Nginx   │   │  Nginx   │   │  API     │
        └────┬─────┘   └────┬─────┘   └────┬─────┘
             │              │              │
             └──────────────┼──────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   MongoDB     │
                    │   (Replica)   │
                    └───────────────┘
```

## Support

For issues, please check:
1. Docker logs: `docker-compose logs`
2. Container status: `docker-compose ps`
3. System resources: `docker stats`
