# MusicDott Installatie Guide voor Debian 13

Complete stap-voor-stap installatie handleiding voor MusicDott op Debian 13.

**Belangrijk:** Kopieer elk command volledig (één regel per keer) en wacht tot het voltooid is voordat je het volgende command uitvoert.

---

## Stap 1: Systeem Updaten

```bash
sudo apt-get update
```

```bash
sudo apt-get upgrade -y
```

---

## Stap 2: Vereiste Packages Installeren

```bash
sudo apt-get install -y ca-certificates curl gnupg lsb-release git
```

---

## Stap 3: Docker Repository Toevoegen

### 3.1 Maak directory voor keyrings
```bash
sudo install -m 0755 -d /etc/apt/keyrings
```

### 3.2 Download Docker GPG key
```bash
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
```

### 3.3 Zet permissions
```bash
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

### 3.4 Voeg Docker repository toe
```bash
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

---

## Stap 4: Docker Installeren

### 4.1 Update package list
```bash
sudo apt-get update
```

### 4.2 Installeer Docker en componenten
```bash
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 4.3 Start Docker service
```bash
sudo systemctl start docker
```

### 4.4 Enable Docker bij boot
```bash
sudo systemctl enable docker
```

### 4.5 Voeg jezelf toe aan docker groep (geen sudo meer nodig)
```bash
sudo usermod -aG docker $USER
```

### 4.6 Activeer nieuwe groep
```bash
newgrp docker
```

### 4.7 Verificeer Docker installatie
```bash
docker --version
```

```bash
docker compose version
```

---

## Stap 5: MusicDott Clonen

### 5.1 Navigeer naar installatie directory
```bash
cd /opt
```

### 5.2 Clone repository (SSH - aanbevolen als je SSH key hebt)
```bash
git clone git@github.com:jeroenhonig/Musicdott.git
```

**Of als je geen SSH key hebt, gebruik HTTPS:**
```bash
git clone https://github.com/jeroenhonig/Musicdott.git
```

### 5.3 Ga naar project directory
```bash
cd Musicdott
```

---

## Stap 6: Environment Configuratie

### 6.1 Kopieer example file
```bash
cp .env.example .env
```

### 6.2 Genereer SESSION_SECRET
```bash
openssl rand -base64 32
```
**→ Kopieer de output en bewaar deze**

### 6.3 Genereer POSTGRES_PASSWORD
```bash
openssl rand -hex 32
```
**→ Kopieer de output en bewaar deze**

### 6.4 Edit .env bestand
```bash
nano .env
```

**Vul minimaal deze waarden in het .env bestand:**

```env
# Database - vul hier je gegenereerde password in
POSTGRES_PASSWORD=<plak-hier-jouw-postgres-password>

# Security - vul hier je gegenereerde secret in
SESSION_SECRET=<plak-hier-jouw-session-secret>

# Application URL - wijzig dit naar je domein of laat localhost staan
APP_URL=http://localhost:5000
```

**Sla op:** Druk `CTRL+O`, dan `Enter`, dan `CTRL+X`

---

## Stap 7: Docker Containers Starten

### 7.1 Start alle services
```bash
docker compose up -d
```

### 7.2 Check status
```bash
docker compose ps
```

### 7.3 Bekijk logs (wacht tot services gestart zijn)
```bash
docker compose logs -f app
```

**Wacht tot je ziet:** `Server running on port 5000`
**Stop logs met:** `CTRL+C`

---

## Stap 8: Database Migraties

### 8.1 Voer database schema uit
```bash
docker compose exec app npm run db:push
```

### 8.2 Verificeer database (optioneel)
```bash
docker compose exec postgres psql -U musicdott -d musicdott -c "\dt"
```

---

## Stap 9: Health Check

### 9.1 Test applicatie
```bash
curl http://localhost:5000/health
```

**Verwachte output:**
```json
{"status":"healthy","database":{"status":"connected"},...}
```

---

## Stap 10: Firewall Configureren (Optioneel)

### 10.1 Installeer UFW (als nog niet geïnstalleerd)
```bash
sudo apt-get install -y ufw
```

### 10.2 Allow poort 5000
```bash
sudo ufw allow 5000/tcp
```

### 10.3 Enable firewall
```bash
sudo ufw enable
```

### 10.4 Check status
```bash
sudo ufw status
```

---

## ✅ Installatie Compleet!

Je applicatie is nu beschikbaar op:

- **Lokaal:** http://localhost:5000
- **Extern:** http://jouw-server-ip:5000

---

## Handige Commands

### Status en Logs
```bash
docker compose ps
```

```bash
docker compose logs -f
```

```bash
docker compose logs -f app
```

### Containers Beheren
```bash
docker compose restart app
```

```bash
docker compose down
```

```bash
docker compose up -d
```

### Shell Toegang
```bash
docker compose exec app sh
```

```bash
docker compose exec postgres psql -U musicdott -d musicdott
```

### Database Backup
```bash
docker compose exec postgres pg_dump -U musicdott musicdott > backup_$(date +%Y%m%d).sql
```

---

## Troubleshooting

### 1. Check of Docker draait
```bash
sudo systemctl status docker
```

### 2. Herstart Docker service
```bash
sudo systemctl restart docker
```

### 3. Check alle container logs
```bash
docker compose logs
```

### 4. Check specifieke container
```bash
docker compose logs postgres
```

### 5. Herstart alles
```bash
docker compose down
```

```bash
docker compose up -d
```

### 6. Rebuild containers
```bash
docker compose build --no-cache
```

```bash
docker compose up -d
```

### 7. Check environment variables
```bash
docker compose exec app env | grep DATABASE
```

```bash
docker compose exec app env | grep SESSION
```

---

## Productie Setup (met SSL)

### Installeer Certbot
```bash
sudo apt-get install -y certbot
```

### Genereer SSL certificaat (vervang jouwdomein.nl)
```bash
sudo certbot certonly --standalone -d jouwdomein.nl -d www.jouwdomein.nl
```

### Kopieer certificaten
```bash
sudo mkdir -p ssl
```

```bash
sudo cp /etc/letsencrypt/live/jouwdomein.nl/fullchain.pem ssl/
```

```bash
sudo cp /etc/letsencrypt/live/jouwdomein.nl/privkey.pem ssl/
```

```bash
sudo chown -R $USER:$USER ssl/
```

### Start met Nginx
```bash
docker compose --profile with-nginx up -d
```

### Allow HTTPS in firewall
```bash
sudo ufw allow 80/tcp
```

```bash
sudo ufw allow 443/tcp
```

---

## Support

Voor vragen of problemen:
- GitHub Issues: https://github.com/jeroenhonig/Musicdott/issues
- Documentatie: README.md en DEPLOYMENT.md

---

**Laatst bijgewerkt:** 16 januari 2026
