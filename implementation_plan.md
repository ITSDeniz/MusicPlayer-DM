# High-Scalability Audio Streaming & Music Player Architecture Plan

This document outlines the system architecture, technical specifications, and step-by-step execution roadmap for the production-grade **Audio Streaming & Music Player Web Application**.

---

## 1. System Architecture Overview

```
                      +---------------------------------------+
                      |   Client: Next.js (App Router) / Vite |
                      |   Tailwind CSS (Deep Black / Pink-Red)|
                      |   Zustand Global Player + Wavesurfer  |
                      +-------------------+-------------------+
                                          |
                REST / WebSocket / Auth   | Direct Upload (PUT) & Streaming (GET)
                                          v
+-------------------------------+   +-----------------------------+
|    Backend: NestJS API        |   | S3 / Cloudflare R2 / MinIO  |
|    - Auth (JWT / Refresh)     |   | - High-Performance Audio    |
|    - Storage (Presigned URLs) |   | - Range Requests (HTTP 206) |
|    - Tracks & Playlists (DDD) |   +-----------------------------+
|    - Metadata Worker (Queue)  |
+---------------+---------------+
                |
       +--------+--------+
       v                 v
+--------------+  +--------------+
|  PostgreSQL  |  | Redis Cache  |
|  Prisma ORM  |  | - Rate Limit |
|  - Full Text |  | - Search/Feed|
|  - Indexing  |  | - Session    |
+--------------+  +--------------+
```

---

## 2. Technical Stack & Standards

| Layer | Technology | Key Responsibility |
|---|---|---|
| **Client** | Next.js 14+ (or Vite React 18+), TypeScript | SSR/CSR, Responsive UI, Accessible components |
| **Styling** | Tailwind CSS + Radix UI / Lucide Icons | Deep black base (`#09090b` / `#000000`), neon pink-to-red gradients (`#ec4899` to `#f43f5e`) |
| **Audio Core** | Web Audio API / Wavesurfer.js + Zustand | Persistent audio state across routes, buffer tracking, interactive waveform |
| **Server** | NestJS, TypeScript, Node.js 20+ | Clean Architecture / DDD, Dependency Injection, Guards, Interceptors |
| **ORM & DB** | Prisma ORM, PostgreSQL | Strict relational schema, full-text indexes, cursor pagination |
| **Media Pipeline** | AWS S3 / Cloudflare R2 / MinIO | Presigned upload/download, HTTP 206 Byte-Range streaming |
| **Caching & Queues**| Redis + BullMQ / NestJS Cron | Search cache, rate limiting, background audio metadata extraction |
| **DevOps** | Docker, docker-compose | Isolated local development environment (Postgres, Redis, MinIO) |

---

## 3. Execution Roadmap

We will proceed iteratively. At each step, exact file locations, complete TypeScript implementations, and instructions will be provided for you to integrate into your codebase.

### **Phase 1: Database Architecture (`schema.prisma`)**
- Models: `User`, `Track`, `Album`, `Artist`, `Playlist`, `PlaylistTrack`, `Like`, `ListenHistory`.
- Optimization:
  - B-tree and Gin indexes on `title`, `artist`, `genre` for instant search.
  - Cursor pagination indexes on `createdAt`, `id`.
  - Cascade deletion rules on junctions and relational items.
  - Duration and track counter consistency rules.

### **Phase 2: Infrastructure & Local Dev (`docker-compose.yml` & Config)**
- Docker Compose configuration:
  - PostgreSQL 16 (configured for full-text search extensions).
  - Redis 7 (Alpine).
  - Local S3-compatible storage (MinIO) for zero-cost offline local development.
- Environment variable schemas (`.env.example`) with strict validation.

### **Phase 3: Backend Scaffolding & Media Ingestion (NestJS)**
- NestJS Modular Architecture:
  - `CommonModule` (PrismaService, RedisService, Global Exception Filters, Cursor Pagination Helper).
  - `AuthModule` (JWT Access in-memory/header, Refresh token in secure HttpOnly cookie, Argon2 password hashing).
  - `StorageModule` (`S3Service` generating presigned PUT/GET URLs with content-type restrictions and short TTLs).
  - `TrackModule` (Track registration, presigned URL requests, cursor-based track feeds, search indexing).
  - `PlaylistModule` (Atomic Prisma transactions for adding/reordering tracks and updating total playlist duration).

### **Phase 4: Frontend Core & Audio Player Engine**
- Project initialization with Tailwind CSS design tokens:
  - Palette: Dark surface tokens, gradient utility classes (`from-pink-500 via-rose-500 to-red-500`).
- Zustand Audio Store (`usePlayerStore`):
  - State: `currentTrack`, `queue`, `history`, `isPlaying`, `volume`, `isMuted`, `repeatMode`, `isShuffled`, `duration`, `currentTime`, `bufferedTime`.
  - Actions: `playTrack`, `togglePlay`, `seek`, `nextTrack`, `prevTrack`, `addToQueue`, `setVolume`, `toggleShuffle`, `toggleRepeat`.
  - Native `<audio>` / Web Audio API abstraction handling partial content loading and seamless buffering.

### **Phase 5: Interactive Waveform & UI Components**
- Wavesurfer.js / Web Audio canvas integration:
  - Dynamic audio visualizer and interactive scrubber matching the pink-to-red theme.
  - Persistent bottom player bar across route transitions.
  - Accessible queue drawer, volume slider, playlist modal.

### **Phase 6: Search, Library, and Polishing**
- Debounced full-text search with Redis caching.
- Infinite scroll track feeds with cursor pagination (`nextCursor`).
- Playlists CRUD, Like/Favorite toggles with optimistic UI updates.

---

## 4. Verification & Quality Assurance Plan

### Automated Checks
- `npm run lint` & `npm run type-check` on both client and server.
- Prisma migration verification: `npx prisma migrate dev`.
- S3 presigned URL generation and client upload test via cURL / Postman.

### Manual Verification
- Verify audio plays without interruptions when navigating pages.
- Verify seek operations trigger HTTP 206 Byte-Range requests without redownloading the entire track.
- Verify dark aesthetic and responsive UI on desktop and mobile viewports.
