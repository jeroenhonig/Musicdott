# Test users (seeded)

This project can seed a default set of local test users via `npm run db:bootstrap` or `npm run db:seed`.
The application no longer seeds users automatically on normal server startup.

## Platform admin (creates drum schools)

- Username: `admin`
- Password: `admin`
- Role: `platform_owner`
- Email: `admin@musicdott.local`
- Purpose: platform-wide admin who can create and manage drum schools.

Note: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_NAME`, and `ADMIN_EMAIL` environment variables can override the default admin account.

## School owner

- Username: `stefan`
- Password: `schoolowner123`
- Role: `school_owner`
- Email: `stefan@stefanvandebrug.nl`

## Teacher

- Username: `mark`
- Password: `teacher123`
- Role: `teacher`
- Email: `mark@stefanvandebrug.nl`

## Student

- Username: `tim`
- Password: `student123`
- Role: `student`
- Email: `tim@student.stefanvandebrug.nl`
