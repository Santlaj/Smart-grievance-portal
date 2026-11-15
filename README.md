# Smart Grievance Redressal Portal

Citizen-facing React portal and Next.js API for reporting civic issues, routing grievances to departments, and tracking resolution.

## Architecture

- **Frontend:** React 19, Vite, Tailwind CSS.
- **API:** Next.js App Router API routes, Node.js 22.
- **Database:** MongoDB through Mongoose.
- **Evidence:** Cloudinary authenticated image storage; images are not stored in MongoDB.
- **Authentication:** JWT bearer tokens and role-based API guards.

## Local development

Install dependencies and run the services in separate terminals:

```powershell
npm ci --prefix backend
npm ci --prefix frontend
npm --prefix backend run dev
npm --prefix frontend run dev
```

The API listens on port `5000`; Vite listens on `8080`. The local backend may use its development-only in-memory fallback when MongoDB is unavailable. That fallback is disabled in production.

## Production environment

Copy [backend/.env.example](./backend/.env.example) and [frontend/.env.example](./frontend/.env.example) to local environment files for development, or configure equivalent variables in the hosting providers’ secret/environment settings. Do not commit `.env` files.

Required backend settings:

- `MONGO_URI`: production MongoDB connection string.
- `JWT_SECRET`: random secret of at least 32 characters.
- `CORS_ORIGINS`: comma-separated, exact frontend origins (scheme and hostname).
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: Cloudinary API credentials. Keep the API secret on the backend only.
- `PORT`: set by the hosting platform; local production start defaults to `5000`.

Frontend setting:

- `VITE_API_URL`: deployed API base URL ending with `/api`. This value is public and is embedded in the frontend build.

Evidence uploads use a short-lived server-generated signature and Cloudinary's authenticated delivery type. The browser uploads directly to Cloudinary; the backend verifies ownership, delivery type, format, and size before accepting the asset. Authenticated assets require signed delivery URLs, which the API returns only in authorized complaint responses and expire after one hour. Never use public delivery for grievance evidence.

## Build and run

```powershell
npm run build
npm start
```

The root build command builds both apps. The root start command runs the backend production server; host the frontend static output in `frontend/dist` using a static-site provider. The API readiness endpoint is `/api/health`; it returns `503` until MongoDB is connected.

Deploy the backend from the `backend` directory with:

- Build: `npm ci && npm run build`
- Start: `npm run start`
- Node: `22.12` or newer in the Node 22 line

Deploy the frontend from the `frontend` directory with:

- Build: `npm ci && npm run build`
- Output directory: `dist`
- Set `VITE_API_URL` before the build.

MongoDB Atlas and Cloudinary are used for production data and evidence storage. Keep database and Cloudinary credentials in the hosting provider’s secret manager, limit database network access to the API service where possible, and enable automated backups.

## Initial administrator

Public registration creates citizen accounts only. To provision the first administrator, run `node scripts/create-admin.js` from the backend directory with one-time `ADMIN_EMAIL`, `ADMIN_NAME`, and `ADMIN_PASSWORD` environment variables. Use a password of at least 12 characters and remove the password variable immediately after the command completes. Never expose administrator credentials in client-side environment variables.

## Operations checklist

- Use separate staging and production databases and Cloudinary environments/folders.
- Configure automated database backups and periodically test a restore.
- Configure provider-side request limits/WAF rules for login and upload routes; per-instance in-memory throttling is not suitable for a multi-instance deployment.
- Monitor `/api/health`, API errors, database connectivity, and Cloudinary upload failures.
- Keep evidence private; signed image links expire after one hour.
- Review MongoDB storage/index usage and hosting-provider retention policies as usage grows.
- Redis is not required for launch. Add a managed Redis/queue only when measured workloads need caching, distributed rate limiting, or background processing.

GitHub Actions runs dependency installation and both production builds for pushes to `main` and pull requests.
