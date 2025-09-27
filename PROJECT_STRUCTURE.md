# 🚀 HRL Traffic Tracking App - Project Structure

## 📁 Root Directory
```
traffic-takip/
├── 📄 package.json                    # Node.js dependencies & scripts
├── 📄 package-lock.json              # Dependency lock file
├── 📄 tsconfig.json                  # TypeScript configuration
├── 📄 shopify.app.toml               # Shopify app configuration
├── 📄 railway.json                   # Railway deployment config
├── 📄 env.example                    # Environment variables template
├── 📄 README.md                      # Project documentation
├── 📄 PROJECT_STRUCTURE.md           # This file
├── 📁 node_modules/                  # Dependencies (auto-generated)
├── 📁 public/                        # Static assets (empty)
├── 📁 dist/                          # Compiled JavaScript output
├── 📁 src/                           # Source code
└── 📁 extensions/                    # Shopify theme app extension
```

## 🎯 Source Code (`src/`)
```
src/
├── 📄 index.ts                       # Main application entry point
├── 📁 app/                           # Application-specific code (empty)
├── 📁 jobs/                          # Background jobs (empty)
├── 📁 migrations/                    # Database migrations
│   ├── 📄 001_create_shops_table.sql # Shops table creation
│   └── 📄 run-migrations.ts          # Migration runner
├── 📁 types/                         # TypeScript type definitions
│   └── 📄 index.ts                   # Global type definitions
└── 📁 tracking/                      # Core tracking functionality
    ├── 📁 active-users/              # Real-time user tracking
    │   ├── 📄 constants.ts           # Active users constants
    │   ├── 📄 ema.ts                 # Exponential moving average
    │   ├── 📄 heartbeat.ts           # Heartbeat mechanism
    │   ├── 📄 index.ts               # Active users main module
    │   ├── 📄 presence.ts            # User presence detection
    │   └── 📄 types.ts               # Active users types
    ├── 📁 consent/                   # GDPR consent management (empty)
    ├── 📁 core/                      # Core tracking logic (empty)
    ├── 📁 device-intel/              # Device intelligence (empty)
    ├── 📁 ecommerce/                 # E-commerce tracking
    │   ├── 📁 aggregators/           # Data aggregators (empty)
    │   └── 📁 collectors/            # Data collectors (empty)
    ├── 📁 geo-time/                  # Geographic & time tracking (empty)
    ├── 📁 meta-capi/                 # Meta Conversions API
    │   ├── 📁 api/                   # API handlers (empty)
    │   ├── 📁 collectors/            # Data collectors (empty)
    │   ├── 📁 processors/            # Data processors (empty)
    │   └── 📁 validators/            # Data validators (empty)
    ├── 📁 page-analytics/            # Page analytics (empty)
    ├── 📁 performance/               # Performance tracking
    │   ├── 📁 aggregators/           # Performance aggregators (empty)
    │   └── 📁 collectors/            # Performance collectors (empty)
    ├── 📁 sessions/                  # Session management (empty)
    ├── 📁 user-behavior/             # User behavior tracking (empty)
    └── 📁 utils/                     # Utility functions
        ├── 📄 constants.ts           # Global constants
        ├── 📄 database.ts            # Database connection & queries
        ├── 📄 helpers.ts             # Helper functions
        ├── 📄 hmac-verification.ts   # HMAC signature verification
        ├── 📄 index.ts               # Utils main export
        ├── 📄 observability.ts       # Logging & monitoring
        ├── 📄 rate-limiting.ts       # Rate limiting middleware
        ├── 📄 README.md              # Utils documentation
        ├── 📄 redis.ts               # Redis connection & operations
        ├── 📄 scope-error-handler.ts # Error handling for scopes
        ├── 📄 scope-manager.ts       # Scope management system
        ├── 📄 scope-test.ts          # Scope testing utilities
        ├── 📄 shopify-api.ts         # Shopify API client
        └── 📄 validation.ts          # Data validation utilities
```

## 🎨 Shopify Theme Extension (`extensions/`)
```
extensions/
└── 📁 theme-app-extension/           # Shopify theme app extension
    ├── 📄 shopify.extension.toml     # Extension configuration
    ├── 📄 README.md                  # Extension documentation
    ├── 📁 assets/                    # Frontend assets
    │   ├── 📄 tracking-main.js       # Main tracking script
    │   ├── 📄 tracking.css           # Tracking styles
    │   └── 📄 tracking.js            # Core tracking logic
    ├── 📁 blocks/                    # Liquid template blocks
    │   └── 📄 tracking.liquid        # Tracking block template
    └── 📁 locales/                   # Internationalization
        └── 📄 en.default.json        # English translations
```

## 🏗️ Compiled Output (`dist/`)
```
dist/
├── 📄 index.js                       # Compiled main application
├── 📄 index.d.ts                     # TypeScript declarations
├── 📄 index.js.map                   # Source map
├── 📄 index.d.ts.map                 # TypeScript source map
├── 📁 migrations/                    # Compiled migrations
│   ├── 📄 run-migrations.js
│   ├── 📄 run-migrations.d.ts
│   └── 📄 run-migrations.js.map
├── 📁 tracking/                      # Compiled tracking modules
│   ├── 📁 active-users/              # Compiled active users
│   │   ├── 📄 constants.js/.d.ts/.js.map
│   │   ├── 📄 ema.js/.d.ts/.js.map
│   │   ├── 📄 heartbeat.js/.d.ts/.js.map
│   │   ├── 📄 index.js/.d.ts/.js.map
│   │   ├── 📄 presence.js/.d.ts/.js.map
│   │   └── 📄 types.js/.d.ts/.js.map
│   └── 📁 utils/                     # Compiled utilities
│       ├── 📄 constants.js/.d.ts/.js.map
│       ├── 📄 database.js/.d.ts/.js.map
│       ├── 📄 helpers.js/.d.ts/.js.map
│       ├── 📄 hmac-verification.js/.d.ts/.js.map
│       ├── 📄 index.js/.d.ts/.js.map
│       ├── 📄 observability.js/.d.ts/.js.map
│       ├── 📄 rate-limiting.js/.d.ts/.js.map
│       ├── 📄 redis.js/.d.ts/.js.map
│       ├── 📄 scope-error-handler.js/.d.ts/.js.map
│       ├── 📄 scope-manager.js/.d.ts/.js.map
│       ├── 📄 scope-test.js/.d.ts/.js.map
│       ├── 📄 shopify-api.js/.d.ts/.js.map
│       └── 📄 validation.js/.d.ts/.js.map
└── 📁 types/                         # Compiled type definitions
    └── 📄 index.js/.d.ts/.js.map
```

## 🏛️ Architecture Overview

### 🎯 Core Components
- **Main App** (`src/index.ts`): Fastify server with OAuth, API routes, and embedded app
- **Active Users** (`src/tracking/active-users/`): Real-time user presence tracking
- **Utils** (`src/tracking/utils/`): Shared utilities for database, Redis, validation, etc.

### 🔧 Key Features
- **OAuth Flow**: Shopify app installation and authentication
- **Embedded App**: Dashboard running inside Shopify admin
- **Real-time Tracking**: Active users and presence detection
- **Database Integration**: Supabase for data persistence
- **Redis Caching**: Upstash Redis for performance
- **Theme Extension**: Frontend tracking scripts for Shopify stores

### 🚀 Deployment
- **Platform**: Railway.app
- **Database**: Supabase (PostgreSQL)
- **Cache**: Upstash Redis
- **CDN**: Railway's built-in CDN

### 📦 Dependencies
- **Backend**: Fastify, TypeScript, Supabase, Redis
- **Frontend**: Vanilla JavaScript, CSS
- **Shopify**: App Bridge, Theme Extension API
- **Analytics**: Custom tracking implementation

## 🔄 Development Workflow
1. **Source Code**: Write in `src/` directory
2. **Compilation**: TypeScript compiles to `dist/`
3. **Testing**: Run locally with `npm run dev`
4. **Deployment**: Push to Railway for automatic deployment
5. **Theme Extension**: Deploy via Shopify CLI

## 📝 Notes
- Empty directories (`consent/`, `core/`, `device-intel/`, etc.) are placeholders for future features
- All TypeScript files are compiled to JavaScript with source maps
- The app follows Shopify's embedded app architecture
- Real-time features use WebSocket and Server-Sent Events
