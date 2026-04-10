# Beta Launch Checklist

## Technical (sign off before inviting users)
- [ ] CI green (`npm run ci`)
- [ ] Docker build succeeds
- [ ] Staging deployed and healthy
- [ ] All smoke tests pass (see `docs/smoke-test-critical-flows.md`)
- [ ] Sentry receiving events (backend + frontend)
- [ ] COOKIE_SECURE=true set in production
- [ ] SESSION_SECRET is a strong random value (not the example value)
- [ ] STRIPE_SECRET_KEY is the LIVE key (not test key) — or test key for limited beta
- [ ] Database backups configured on the server

## Content
- [ ] Landing page copy reviewed (no placeholder text)
- [ ] Pricing tiers reflect actual pricing decisions
- [ ] Privacy policy / AVG verklaring linked from footer
- [ ] Contact email in footer is monitored

## Access
- [ ] Beta invite list prepared
- [ ] Feedback channel set up (email / Discord / Slack)
- [ ] Support contact visible in the app
