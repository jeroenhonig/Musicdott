# MusicDott 2.0 - Docker Deployment Guide voor Linux

## Quick Start

```bash
# 1. Clone repository
git clone <repository-url>
cd MusicDott

# 2. Create environment file
cp .env.example .env
nano .env  # Edit with your values

# 3. Generate strong secrets
openssl rand -base64 32  # Voor SESSION_SECRET
openssl rand -base64 32  # Voor JWT_SECRET

# 4. Start services
docker-compose up -d

# 5. Check status
docker-compose ps
docker-compose logs -f app
```

## Inhoudsopgave

1. [Systeemvereisten](#systeemvereisten)
2. [Installatie](#installatie)
3. [Configuratie](#configuratie)
4. [Deployment](#deployment)
5. [Monitoring & Maintenance](#monitoring--maintenance)
6. [Troubleshooting](#troubleshooting)
7. [Production Deployment](#production-deployment)
8. [Backup & Restore](#backup--restore)

---

## Systeemvereisten

### Minimale Specificaties
- **OS:** Ubuntu 20.04 LTS / Debian 11+ / CentOS 8+ / RHEL 8+
- **CPU:** 2 cores
- **RAM:** 4 GB
- **Storage:** 20 GB
- **Docker:** 20.10+
- **Docker Compose:** 2.0+

### Aanbevolen Specificaties (Productie)
- **OS:** Ubuntu 22.04 LTS
- **CPU:** 4 cores
- **RAM:** 8 GB
- **Storage:** 100 GB SSD
- **Docker:** Latest stable
- **Docker Compose:** Latest stable

---

## Installatie

### 1. Installeer Docker op Linux

#### Ubuntu/Debian
```bash
# Update package index
sudo apt-get update

# Install prerequisites
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify installation
sudo docker --version
sudo docker compose version
```

#### CentOS/RHEL
```bash
# Install Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker
```

### 2. Configureer Docker (Optioneel)

```bash
# Add user to docker group (no sudo needed)
sudo usermod -aG docker $USER
newgrp docker

# Configure Docker daemon
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
EOF

sudo systemctl restart docker
```

---

## Configuratie

### 1. Environment Variables

Maak een `.env` bestand aan in de root directory:

```bash
cp .env.example .env
```

**Kritieke variabelen die MOETEN worden ingesteld:**

```bash
# Database
POSTGRES_PASSWORD=<kies-een-sterk-wachtwoord>

# Security (VERPLICHT!)
SESSION_SECRET=<genereer-met-openssl-rand-base64-32>

# Application
APP_URL=https://yourdomain.com  # Of http://localhost:5000 voor test
```

**Genereer sterke secrets:**
```bash
# Session secret
openssl rand -base64 32

# JWT secret (optioneel)
openssl rand -base64 32
```

### 2. Optionele Services

#### Stripe (voor billing)
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Email (SendGrid of SMTP)
```bash
# Option 1: SendGrid
SENDGRID_API_KEY=SG.your-api-key

# Option 2: SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

#### AI Features (optioneel)
```bash
OPENAI_API_KEY=sk-...
```

---

## Deployment

### Basic Deployment (zonder Nginx)

```bash
# Start alleen app en database
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app

# Check health
curl http://localhost:5000/health
```

### Production Deployment (met Nginx)

#### 1. SSL Certificaten Setup

**Optie A: Let's Encrypt (Gratis, Aanbevolen)**

```bash
# Install certbot
sudo apt-get install -y certbot

# Generate certificates
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates to project
sudo mkdir -p ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/
sudo chown -R $USER:$USER ssl/
```

**Optie B: Self-signed (Development)**

```bash
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/privkey.pem \
  -out ssl/fullchain.pem \
  -subj "/C=NL/ST=Noord-Holland/L=Amsterdam/O=MusicDott/CN=localhost"
```

#### 2. Start met Nginx

```bash
# Start all services including Nginx
docker-compose --profile with-nginx up -d

# Check Nginx status
docker-compose logs nginx

# Test configuration
docker-compose exec nginx nginx -t
```

#### 3. Configure Firewall

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### Database Migrations

```bash
# Run migrations
docker-compose exec app npm run db:push

# Check database
docker-compose exec postgres psql -U musicdott -d musicdott -c "\dt"
```

---

## Monitoring & Maintenance

### Health Checks

```bash
# Application health
curl http://localhost:5000/health

# Detailed API health
curl http://localhost:5000/api/health

# Database health
docker-compose exec postgres pg_isready
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres
docker-compose logs -f nginx

# Last 100 lines
docker-compose logs --tail=100 app
```

### Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker system df

# Prune unused data
docker system prune -a
```

### Updates

```bash
# Pull latest code
git pull

# Rebuild image
docker-compose build app

# Restart with new image
docker-compose up -d app

# Check logs
docker-compose logs -f app
```

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using port 5000
sudo lsof -i :5000
sudo netstat -tlnp | grep 5000

# Kill process or change port in docker-compose.yml
```

#### 2. Database Connection Failed
```bash
# Check database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres

# Check environment variables
docker-compose exec app env | grep DATABASE
```

#### 3. Permission Denied
```bash
# Fix volume permissions
sudo chown -R 1001:1001 data/ logs/ export/

# Or run as root (not recommended)
docker-compose exec -u root app bash
```

#### 4. Out of Memory
```bash
# Check memory
free -h

# Increase Docker memory limit
# Edit /etc/docker/daemon.json
{
  "default-ulimits": {
    "memlock": {
      "Name": "memlock",
      "Soft": -1,
      "Hard": -1
    }
  }
}
```

#### 5. Container Won't Start
```bash
# Check container logs
docker-compose logs app

# Check container status
docker-compose ps -a

# Remove and recreate
docker-compose down
docker-compose up -d
```

### Debug Commands

```bash
# Access container shell
docker-compose exec app sh

# Check environment
docker-compose exec app env

# Test database connection
docker-compose exec app node -e "require('./dist/index.js')"

# Check Node.js version
docker-compose exec app node --version
```

---

## Production Deployment

### 1. Server Setup Checklist

- [ ] Install Docker & Docker Compose
- [ ] Configure firewall (ports 80, 443, 5432)
- [ ] Setup SSL certificates (Let's Encrypt)
- [ ] Configure domain DNS (A record)
- [ ] Create .env with production values
- [ ] Generate strong secrets
- [ ] Disable SSH password auth (key only)
- [ ] Setup automatic updates
- [ ] Configure backup system

### 2. Security Hardening

```bash
# Disable password auth
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# Install fail2ban
sudo apt-get install -y fail2ban
sudo systemctl enable fail2ban

# Setup automatic security updates
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 3. Production docker-compose.yml

```yaml
# Add to docker-compose.yml for production
services:
  app:
    restart: always
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### 4. Setup Monitoring

```bash
# Install monitoring tools
docker run -d --name prometheus \
  -p 9090:9090 \
  prom/prometheus

docker run -d --name grafana \
  -p 3000:3000 \
  grafana/grafana
```

---

## Backup & Restore

### Database Backup

```bash
# Create backup
docker-compose exec postgres pg_dump -U musicdott musicdott > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated daily backup
echo "0 2 * * * docker-compose exec postgres pg_dump -U musicdott musicdott > /backups/musicdott_\$(date +\%Y\%m\%d).sql" | crontab -
```

### Restore Database

```bash
# Stop application
docker-compose stop app

# Restore from backup
cat backup_20260116.sql | docker-compose exec -T postgres psql -U musicdott musicdott

# Restart application
docker-compose start app
```

### Full System Backup

```bash
# Backup volumes
docker run --rm \
  -v musicdott_postgres_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/postgres_data_$(date +%Y%m%d).tar.gz /data

# Backup application data
tar czf app_data_$(date +%Y%m%d).tar.gz data/ logs/ export/
```

---

## Performance Tuning

### PostgreSQL Optimization

```bash
# Edit docker-compose.yml
services:
  postgres:
    command:
      - "postgres"
      - "-c"
      - "shared_buffers=256MB"
      - "-c"
      - "max_connections=200"
      - "-c"
      - "work_mem=4MB"
```

### Application Optimization

```bash
# Increase Node.js memory
services:
  app:
    environment:
      - NODE_OPTIONS=--max-old-space-size=4096
```

---

## Useful Commands Cheat Sheet

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart service
docker-compose restart app

# View logs
docker-compose logs -f app

# Execute command in container
docker-compose exec app sh

# Check health
curl http://localhost:5000/health

# Database backup
docker-compose exec postgres pg_dump -U musicdott musicdott > backup.sql

# Rebuild and restart
docker-compose up -d --build

# Clean everything
docker-compose down -v
docker system prune -a
```

---

## Support & Resources

- **Documentation:** Check included markdown files
- **Issues:** Report on GitHub
- **Docker Docs:** https://docs.docker.com
- **PostgreSQL Docs:** https://www.postgresql.org/docs

---

**Document Version:** 1.0
**Last Updated:** 16 januari 2026
