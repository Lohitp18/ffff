# Stage 1: Build the React application using Vite
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the app for production
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:alpine

# Copy the custom nginx configuration if it exists
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built files from the builder stage to Nginx's default public directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
