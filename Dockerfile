# Multi-stage build for MusicDott 2.0
# Stage 1: Build stage
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine AS production

# Install production dependencies only
RUN apk add --no-cache \
    tini \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --only=production && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy necessary files
COPY --chown=nodejs:nodejs shared ./shared

# Create necessary directories
RUN mkdir -p logs data export && \
    chown -R nodejs:nodejs logs data export

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Use tini as init system for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/index.cjs"]
