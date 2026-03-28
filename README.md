# s3

`s3` is an open-source asset storage app with a single-port dashboard and API.

It runs the backend and frontend together on the same port, stores metadata in SQLite, serves public asset URLs, and supports authenticated uploads with web sessions or per-user API keys.

## Features

- single-port app on `4100`
- direct HTML, CSS, and JavaScript frontend
- SQLite for users, sessions, and asset metadata
- Open Sans UI
- public file URLs for read access
- admin-managed users
- unique API key for every user
- asset grid with modal preview
- Shuffle.js filtering
- password change and admin password reset

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
3. Update admin credentials and base URL if needed
4. Start the app with `npm run dev`
5. Sign in at `/login`
6. Add users from the dashboard if you want extra upload accounts

## Auth

The app supports two access patterns:

1. Dashboard login
- email + password
- creates an HTTP-only session cookie

2. API uploads
- send `Authorization: Bearer <api_key>`
- each user gets a unique API key automatically

## Routes

### Pages

- `GET /login`
- `GET /dashboard`

### Auth API

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/change-password`
- `PATCH /api/v1/auth/users/:id/password`

### User API

Admin only:

- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `POST /api/v1/users`

### Asset API

- `POST /api/v1/assets/upload`
  Requires session login or bearer API key.
- `GET /api/v1/assets`
  Public metadata list.
- `GET /api/v1/assets/:id`
  Public single asset metadata.
- `GET /storage/data/:id/:fileName`
  Public asset file URL.

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
- `STORAGE_META_FILE`
  Optional legacy JSON metadata file used only for one-time migration.
- `SQLITE_DB_FILE`
  SQLite database path.

## License

This project is licensed under the MIT License. See [LICENSE.md](E:/hiren/projects/school/s3/LICENSE.md).
