# Awaj – Social Media Platform

A modern, real-time social media application built with React, TypeScript, and Tailwind CSS.

> **Disclaimer:** *This project is an independent, educational clone inspired by the UI/UX of BlueSky. It is not affiliated with, endorsed by, or connected to BlueSky in any way. All source code is originally developed.*

## Features

- 📝 Create, like, repost, and bookmark posts with image uploads
- 💬 Real-time direct messaging with emoji reactions
- 🔔 Notification system (likes, follows, replies)
- 🔍 Search users and posts, trending topics, and interest-based discovery
- 📰 Custom feed management with pinning and reordering
- 👤 User profiles with avatar/banner uploads and verification system
- 🛡️ Admin dashboard with moderation, user management, and support tickets
- 🔒 Role-based access control (admin, moderator, user)

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS, shadcn/ui
- **Backend:** Lovable Cloud (Supabase)
- **State:** TanStack React Query
- **Routing:** React Router v6

## Getting Started

```sh
# Clone the repository
git clone https://github.com/raselshikdar/sky-post-clone

# Navigate to the project directory
cd sky-post-clone

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── contexts/       # React context providers (Auth)
├── hooks/          # Custom hooks
├── integrations/   # Backend client configuration
├── lib/            # Utility functions
├── pages/          # Route page components
│   └── admin/      # Admin dashboard pages
└── assets/         # Static assets
```

## License

This project is proprietary software. All rights reserved.
