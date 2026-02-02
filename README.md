# MusicDott 2.0

**Modern SaaS Platform voor Muziekschool Management**

[![Production Ready](https://img.shields.io/badge/production-ready-brightgreen.svg)](https://github.com/jeroenhonig/Musicdott)
[![Docker](https://img.shields.io/badge/docker-supported-blue.svg)](./DEPLOYMENT.md)
[![Security](https://img.shields.io/badge/security-8.5%2F10-green.svg)](./DEPLOYMENT.md)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

MusicDott 2.0 is een complete full-stack SaaS applicatie voor muziekscholen en privé docenten. Het platform biedt tools voor student management, interactieve lessen, planning, facturering en veel meer.

---

## ✨ Features

### 🎓 Student & Docent Management
- Multi-tenant architectuur met school-scoped data isolation
- Role-based access control (Platform Owner, School Owner, Teacher, Student)
- Student portfolio met voortgangsregistratie
- Leraar assignments en monitoring

### 📚 Interactieve Lessen
- Rich content editor met multimedia blocks
- Music notation support (Sheet music, Tabs, ABC notation)
- GrooveScribe drum pattern editor
- Video embeds (YouTube, Vimeo)
- Spotify/Apple Music integratie
- PDF viewer voor bladmuziek

### 🎵 Song Library
- Uitgebreide song database
- Genre categorisatie en difficulty levels
- Embedded video en audio
- Drum patterns en notatie
- Search en filter functionaliteit

### 📅 Planning & Scheduling
- Interactieve kalender
- Recurring schedule management
- iCal import/export
- Birthday notifications
- Lesson reminders

### 💳 Billing & Subscriptions
- Stripe integratie
- Geautomatiseerde maandelijkse facturering
- Subscription management
- Payment history

### 🤖 AI Features (Optioneel)
- OpenAI integratie
- Automatische lesson recaps
- Practice feedback
- Smart assignment builder
- Teacher copilot

### 🏆 Gamification
- Achievement systeem
- Badges en rewards
- Practice streaks
- Leaderboards
- Student progress tracking

### 🔒 Security & Compliance
- OWASP Top 10 compliant
- Multi-factor authentication ready
- GDPR compliance features
- Secure password policies
- Rate limiting & input validation
- Security headers (Helmet.js)

---

## 🚀 Quick Start

### Vereisten

- **Docker** 20.10+ & **Docker Compose** 2.0+
- **Node.js** 20+ (alleen voor development)
- **PostgreSQL** 16+ (wordt meegeleverd via Docker)

### Installatie met Docker (Aanbevolen)

```bash
# 1. Clone repository
git clone git@github.com:jeroenhonig/Musicdott.git
cd Musicdott

# 2. Maak environment file
cp .env.example .env

# 3. Genereer sterke secrets
openssl rand -base64 32  # Voor SESSION_SECRET
openssl rand -hex 32     # Voor POSTGRES_PASSWORD

# 4. Edit .env en vul de secrets in
nano .env

# 5. Start applicatie
docker-compose up -d

# 6. Check status
docker-compose ps
curl http://localhost:5000/health
```

**De applicatie is nu beschikbaar op:** http://localhost:5000

### Development Setup (Zonder Docker)

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env met database URL en secrets

# 3. Run database migrations
npm run db:push

# 4. Start development server
npm run dev
```

**Development server:** http://localhost:5000

---

## 📖 Documentatie

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide voor Linux/Docker
- **[.env.example](./.env.example)** - Environment variabelen configuratie
- **[docs/GROOVESCRIBE_MODULE_SPEC.md](./docs/GROOVESCRIBE_MODULE_SPEC.md)** - Groovescribe module spec
- **[docs/GROOVESCRIBE_MONOLITHIC_PROMPT.md](./docs/GROOVESCRIBE_MONOLITHIC_PROMPT.md)** - Monolithic Claude system prompt
- **[docs/GROOVESCRIBE_EXAMPLE_LESSON.md](./docs/GROOVESCRIBE_EXAMPLE_LESSON.md)** - Example lesson (Groovescribe)
- Docs index: `docs/README.md`

---

## 🏗️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Radix UI** - Component library
- **React Query** - Server state management
- **Wouter** - Routing
- **Socket.IO Client** - Real-time updates

### Backend
- **Node.js 20** - Runtime
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Drizzle ORM** - Database ORM
- **PostgreSQL** - Database
- **Passport.js** - Authentication
- **Socket.IO** - Real-time communication
- **Stripe** - Payment processing

### DevOps
- **Docker** - Containerization
- **Nginx** - Reverse proxy
- **PostgreSQL 16** - Database
- **Vitest** - Testing framework

---

## 🐳 Docker Deployment

### Basis Setup (App + Database)

```bash
docker-compose up -d
```

### Productie Setup (Met Nginx & SSL)

```bash
# 1. Setup SSL certificates (Let's Encrypt)
sudo certbot certonly --standalone -d yourdomain.com

# 2. Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/*.pem ssl/

# 3. Start met Nginx
docker-compose --profile with-nginx up -d
```

**Zie [DEPLOYMENT.md](./DEPLOYMENT.md) voor gedetailleerde instructies.**

---

## 🔐 Environment Variables

### Verplichte Variabelen

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/musicdott
POSTGRES_PASSWORD=<strong-password>

# Security (VERPLICHT!)
SESSION_SECRET=<min-32-characters>
```

### Optionele Services

```bash
# Stripe (voor billing)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# SendGrid (voor emails)
SENDGRID_API_KEY=SG.your-key

# OpenAI (voor AI features)
OPENAI_API_KEY=sk-...
```

**Zie [.env.example](./.env.example) voor complete lijst.**

---

## 📊 Project Structure

```
MusicDott/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom hooks
│   │   └── lib/         # Utilities
│   └── index.html
│
├── server/              # Express backend
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── middleware/      # Express middleware
│   ├── ai-services/     # AI integrations
│   └── utils/           # Helper functions
│
├── shared/              # Shared code
│   ├── schema.ts        # Database schemas
│   └── events.ts        # Real-time events
│
├── tests/               # Test suites
│   ├── integration/
│   └── e2e/
│
├── Dockerfile           # Production Docker image
├── docker-compose.yml   # Docker stack
└── nginx.conf           # Reverse proxy config
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

---

## 🔧 Development

### Beschikbare Scripts

```bash
npm run dev       # Start development server
npm run build     # Build voor productie
npm start         # Start productie server
npm run check     # TypeScript check
npm run db:push   # Database migrations
```

### Database Migrations

```bash
# Push schema changes
npm run db:push

# Generate migration
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate
```

---

## 🚦 Health Checks

```bash
# Basic health check
curl http://localhost:5000/health

# Detailed API health
curl http://localhost:5000/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "database": { "status": "connected", "latency": "5ms" },
  "storage": { "mode": "database" },
  "uptime": 3600,
  "memory": { "used": 256, "heap": 128 }
}
```

---

## 🔒 Security

MusicDott 2.0 volgt industry best practices:

- ✅ OWASP Top 10 compliant
- ✅ Helmet.js security headers
- ✅ Rate limiting op API endpoints
- ✅ Input sanitization
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection
- ✅ CSRF protection
- ✅ Secure session management
- ✅ Password hashing (scrypt/bcrypt)
- ✅ HTTPS enforcement in production

**Security Score:** 8.5/10

---

## 📈 Performance

- ⚡ Database connection pooling
- ⚡ React Query caching
- ⚡ Vite optimized builds
- ⚡ Code splitting
- ⚡ Lazy loading
- ⚡ WebSocket voor real-time updates

---

## 🌍 Browser Support

- ✅ Chrome/Edge (latest 2 versions)
- ✅ Firefox (latest 2 versions)
- ✅ Safari (latest 2 versions)
- ✅ Mobile browsers (iOS Safari, Chrome Android)

---

## 📱 PWA Support

MusicDott 2.0 is een Progressive Web App:

- 📲 Installeerbaar op desktop en mobile
- 🔄 Service Worker voor offline functionaliteit
- 📬 Push notifications ready
- 🎨 App-like interface

---

## 🤝 Contributing

Contributions zijn welkom! Volg deze stappen:

1. Fork de repository
2. Maak een feature branch (`git checkout -b feature/amazing-feature`)
3. Commit je changes (`git commit -m 'Add amazing feature'`)
4. Push naar branch (`git push origin feature/amazing-feature`)
5. Open een Pull Request

---

## 📝 License

Dit project is gelicenseerd onder de MIT License.

---

## 🙏 Credits

Ontwikkeld door Jeroen Honig met behulp van:
- React & Express community
- Radix UI team
- Drizzle ORM contributors
- Open source community

**Powered by:**
- Node.js
- React
- PostgreSQL
- Docker
- TypeScript

---

## 📞 Support

Voor vragen of problemen:

- 📧 Email: support@musicdott.com
- 🐛 Issues: [GitHub Issues](https://github.com/jeroenhonig/Musicdott/issues)
- 📖 Docs: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 🗺️ Roadmap

**In Development:**
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support (EN, DE, FR)
- [ ] Video conferencing integration
- [ ] Advanced AI features

**Planned:**
- [ ] Parent portal
- [ ] Inventory management
- [ ] Advanced reporting
- [ ] API voor third-party integrations

---

**Made with ❤️ for music education**
