# Kritieke Security Fixes - ACTIE VEREIST

## 🔴 URGENT: Deze issues moeten DIRECT worden opgelost

---

## 1. Hardcoded Default Password (KRITIEK)

**Locatie:** `server/importCsvData.ts:50`

**Huidige Code:**
```typescript
const plainPassword = 'musicdott2024'; // ❌ SECURITY RISK
```

**Probleem:**
- Alle geïmporteerde studenten krijgen hetzelfde wachtwoord
- Dit wachtwoord staat in de source code en is dus voor iedereen zichtbaar
- Iemand met toegang tot de code kan inloggen als elke geïmporteerde student

**Oplossing:**

```typescript
// Voeg toe bovenaan het bestand
import { randomBytes } from 'crypto';

// Genereer een random wachtwoord per student
function generateSecurePassword(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const randomBytesArray = randomBytes(length);
  let password = '';

  for (let i = 0; i < length; i++) {
    password += chars[randomBytesArray[i] % chars.length];
  }

  return password;
}

// In de import functie, vervang:
const plainPassword = generateSecurePassword();

// En log het wachtwoord zodat het naar de student kan worden gestuurd:
console.log(`Generated password for ${studentName}: ${plainPassword}`);
// Of beter: stuur het per email
```

**Alternatief (met email notificatie):**
```typescript
import { EmailNotificationService } from './services/email-notifications';

const plainPassword = generateSecurePassword();

// Stuur wachtwoord per email naar student/ouder
await EmailNotificationService.sendPasswordResetEmail({
  email: studentEmail,
  name: studentName,
  temporaryPassword: plainPassword
});
```

---

## 2. Session Secret Fallback in Code (HOOG)

**Locatie:** `server/auth.ts:63`

**Huidige Code:**
```typescript
const sessionSecret = process.env.SESSION_SECRET || "music-dott-session-secret-fallback-dev-only";
```

**Probleem:**
- Fallback secret staat in de code
- Als SESSION_SECRET niet is ingesteld, gebruikt het een bekende waarde
- Hiermee kunnen sessions worden geforged

**Oplossing:**
```typescript
const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  throw new Error(
    '❌ CRITICAL: SESSION_SECRET environment variable is not set!\n' +
    'Generate one with: openssl rand -base64 32\n' +
    'Add it to your .env file'
  );
}

if (sessionSecret.length < 32) {
  throw new Error(
    '❌ CRITICAL: SESSION_SECRET must be at least 32 characters long!\n' +
    'Generate a new one with: openssl rand -base64 32'
  );
}
```

---

## 3. Console.log Statements (HOOG)

**Probleem:**
- 914 console.log/error/warn statements gevonden
- Mogelijk gevoelige informatie in logs
- Performance impact
- Geen structured logging

**Oplossing:**

**Stap 1:** Update alle files om logger te gebruiken

```typescript
// ❌ VOOR:
console.log('User logged in:', username);
console.error('Database error:', error);
console.warn('Rate limit exceeded');

// ✅ NA:
import { logger } from './utils/logger';

logger.info('User logged in', { username, userId });
logger.error('Database error', { error: error.message, stack: error.stack });
logger.warn('Rate limit exceeded', { ip: req.ip, endpoint: req.path });
```

**Stap 2:** Script om alle console statements te vinden:
```bash
# Maak een script: scripts/find-console-logs.sh
#!/bin/bash
grep -r "console\.\(log\|error\|warn\|info\)" server/ --include="*.ts" > console-statements.txt
echo "Found $(wc -l < console-statements.txt) console statements"
```

**Stap 3:** Automatisch vervangen (gebruik met voorzichtigheid):
```bash
# Voor server code
find server -name "*.ts" -type f -exec sed -i 's/console\.log(/logger.info(/g' {} +
find server -name "*.ts" -type f -exec sed -i 's/console\.error(/logger.error(/g' {} +
find server -name "*.ts" -type f -exec sed -i 's/console\.warn(/logger.warn(/g' {} +
```

---

## 4. CSP Allows unsafe-inline/eval (MEDIUM)

**Locatie:** `server/index.ts:25`

**Huidige Code:**
```typescript
scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com", ...],
```

**Probleem:**
- `unsafe-inline` en `unsafe-eval` maken XSS attacks mogelijk
- Vermindert effectiviteit van CSP

**Oplossing:**

**Optie 1: Gebruik nonces (beste optie)**
```typescript
// In server/index.ts
import { randomBytes } from 'crypto';

app.use((req, res, next) => {
  res.locals.cspNonce = randomBytes(16).toString('base64');
  next();
});

app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        (req, res) => `'nonce-${res.locals.cspNonce}'`,
        "https://js.stripe.com",
        "https://checkout.stripe.com"
      ],
      // ... rest van CSP
    }
  } : false
}));
```

**Optie 2: Remove unsafe-inline/eval (simpeler maar kan dingen breken)**
```typescript
scriptSrc: ["'self'", "https://js.stripe.com", "https://checkout.stripe.com"],
styleSrc: ["'self'", "https://fonts.googleapis.com"],
```

⚠️ **LET OP:** Test grondig na deze wijziging, inline scripts werken niet meer!

---

## 5. In-Memory Fallback in Production (MEDIUM)

**Locatie:** `server/storage-wrapper.ts` en `server/db.ts`

**Probleem:**
- Bij database problemen valt systeem terug op in-memory storage
- Data gaat verloren bij restart
- In horizontally scaled deployment gaat data out-of-sync

**Oplossing:**

**Optie 1: Disable fallback in production**
```typescript
// In server/storage-wrapper.ts
export async function initializeStorage() {
  try {
    if (isDatabaseAvailable) {
      storage = new DatabaseStorage();
      logger.info('Using database storage');
    } else {
      // In production, don't fall back to memory
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'Database is not available and in-memory fallback is disabled in production. ' +
          'Please check DATABASE_URL configuration and database connectivity.'
        );
      }

      // Only allow in-memory in development
      logger.warn('Using in-memory storage (development only)');
      storage = new InMemoryStorage();
    }
  } catch (error) {
    logger.error('Storage initialization failed', error);
    throw error; // Don't continue without storage in production
  }
}
```

**Optie 2: Use Redis as fallback**
```typescript
// Install: npm install ioredis
import Redis from 'ioredis';

if (!isDatabaseAvailable) {
  if (process.env.REDIS_URL) {
    logger.info('Database unavailable, using Redis fallback');
    storage = new RedisStorage(new Redis(process.env.REDIS_URL));
  } else if (process.env.NODE_ENV !== 'production') {
    logger.warn('Using in-memory storage (development only)');
    storage = new InMemoryStorage();
  } else {
    throw new Error('No storage backend available in production');
  }
}
```

---

## Implementatie Volgorde

### Dag 1 (Vandaag)
1. ✅ Fix hardcoded password in import
2. ✅ Fix session secret fallback
3. ✅ Test dat alles nog werkt

### Week 1
1. ✅ Replace console.log met logger (100 per dag)
2. ✅ Disable in-memory fallback voor production
3. ✅ Update tests

### Week 2
1. ✅ Fix CSP policy (test grondig!)
2. ✅ Security audit
3. ✅ Deploy naar staging

### Week 3
1. ✅ Load testing
2. ✅ Final security review
3. ✅ Production deployment

---

## Testing Checklist

Na elke fix:

```bash
# 1. Lokaal testen
npm run dev

# 2. Build testen
npm run build
npm start

# 3. Docker build testen
docker-compose build
docker-compose up

# 4. Health checks
curl http://localhost:5000/health
curl http://localhost:5000/api/health

# 5. Authentication testen
# - Login met bestaande user
# - Registreer nieuwe user
# - Test password reset

# 6. Database operaties testen
# - Maak nieuwe data aan
# - Update data
# - Delete data
# - Check data isolation tussen schools

# 7. Security scan
npm audit
docker scan musicdott:latest
```

---

## Hulp Nodig?

Als je vastloopt met een van deze fixes:

1. Check de error logs: `docker-compose logs -f app`
2. Test in development first: `NODE_ENV=development npm run dev`
3. Rollback als nodig: `git checkout -- <file>`
4. Check de audit report: `SECURITY_QUALITY_AUDIT.md`

---

**BELANGRIJK:** Maak een backup voordat je deze wijzigingen implementeert!

```bash
# Backup database
docker-compose exec postgres pg_dump -U musicdott musicdott > backup_before_security_fixes.sql

# Backup code
git add -A
git commit -m "Backup before security fixes"
git tag backup-$(date +%Y%m%d)
```
