# s3

`s3` is an open-source asset storage app with a single-port dashboard and API.

It runs the backend and frontend together on the same port, stores metadata in SQLite, serves public asset URLs, and supports authenticated uploads with web sessions or bearer tokens.

It uses SQLite3 through the `sqlite3` package.

Recommended Node versions:
- `22`
- `24`

## Features

- single-port app on `4100`
- direct HTML, CSS, and JavaScript frontend
- SQLite for users, sessions, and asset metadata
- Open Sans UI
- admin login and user management
- temporary `SECRET_KEY` support for external project integration
- unique API key for every user
- asset grid with modal preview
- Shuffle.js filtering
- password change and admin password reset
- public file URLs for read access after upload

## Quick Start

```bash
npm install
copy .env.example .env
npm run dev
```

Open:

- [http://localhost:4100/login](http://localhost:4100/login)

## Default Admin

On first start, the app creates a default admin from your env values:

- `ADMIN_NAME=Admin`
- `ADMIN_EMAIL=admin@example.com`
- `ADMIN_PASSWORD=123456`

If the email already exists in SQLite, the app keeps that user.

## Setup Guide

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env`
3. Set `SECRET_KEY` to a strong private token for temporary integration use
4. Update admin credentials and base URL if needed
5. Start the app with `npm run dev`
6. Sign in at `/login`
7. Add users from the dashboard if you want extra upload accounts

## Temporary Integration Flow

Current intended flow:

1. Add this project to a user server and run it
2. Login with the default admin
3. Add users if needed, or use the admin integration token for now
4. In the other project, send `Authorization: Bearer <SECRET_KEY>`
5. The `s3` app verifies that token and allows asset create, update, delete, and protected reads
6. Later, when full user integration is ready, `SECRET_KEY` can be removed from the external flow

## Auth

The app currently supports:

1. Dashboard login
- email + password
- creates an HTTP-only session cookie

2. Temporary integration token
- send `Authorization: Bearer <SECRET_KEY>`
- mainly for external project asset API integration

3. User API key auth
- send `Authorization: Bearer <api_key>`
- can also be used for protected asset access

## Routes

### Public

- `GET /health`
- `GET /login`
- `GET /dashboard` with valid session
- `GET /storage/data/:id/:fileName`
- `POST /api/v1/auth/login`

### Session Auth

- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/change-password`

### Asset API

Protected asset routes accept:
- admin session, or
- `Authorization: Bearer <SECRET_KEY>`, or
- a user `api_key` where supported

- `POST /api/v1/assets/upload`
- `GET /api/v1/assets`
- `GET /api/v1/assets/:id`
- `PATCH /api/v1/assets/:id`
- `DELETE /api/v1/assets/:id`

### Admin Management API

- `PATCH /api/v1/auth/users/:id/password`
- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `POST /api/v1/users`

## Allowed File Types

- jpg
- png
- webp
- gif
- svg
- pdf
- mp4
- webm
- ogg
- mov

## Storage

- files are stored in `storage/files`
- temp uploads are stored in `storage/temp`
- metadata, users, and sessions are stored in SQLite

## Environment Variables

- `PORT`
  App port. Keep `4100` if you want the whole app on one port.
- `NODE_ENV`
  `development` or `production`
- `ALLOWED_ORIGINS`
  Comma-separated browser origins allowed to call the APIs with CORS.
- `PUBLIC_BASE_URL`
  Base URL used when returning public asset URLs.
- `PUBLIC_DIR`
  Directory for the dashboard HTML/CSS/JS files.
- `SESSION_COOKIE_NAME`
  Cookie name for web sessions.
- `SESSION_DAYS`
  Session lifetime in days.
- `SECRET_KEY`
  Temporary bearer token for external asset API integration.
- `ADMIN_NAME`
  Default admin display name.
- `ADMIN_EMAIL`
  Default admin login email.
- `ADMIN_PASSWORD`
  Default admin password used for first-time bootstrap.
- `STORAGE_ROOT_DIR`
  Final file storage directory.
- `STORAGE_TEMP_DIR`
  Temp upload directory for multer.
- `SQLITE_DB_FILE`
  SQLite database path.

## Asset API Examples

See [USES.md](E:/hiren/projects/school/s3/USES.md) for asset-only `curl` examples.

## License

This project is licensed under the MIT License. See [LICENSE.md](E:/hiren/projects/school/s3/LICENSE.md).
