# Vortex

A web-based container management and deployment platform. Built with a modern Next.js stack, it allows you to effortlessly deploy, manage, and monitor applications from Git repositories, Docker registries, or manual Dockerfile configurations.

## Features

- **Automated Deployments**: Easily deploy applications from GitHub repositories. Vortex automatically detects your project type using Nixpacks or allows you to specify a custom Dockerfile.
- **Docker Registry Support**: Pull and run any image directly from public or private Docker registries.
- **Manual Configuration**: Write or upload a `Dockerfile` directly in the browser using the integrated Monaco Editor.
- **Real-Time Logs & Metrics**: View live container logs and monitor CPU and memory usage with real-time streaming charts.
- **Dynamic Port Mapping**: Configure host domains and custom exposed ports on the fly.
- **Secure Authentication**: Built-in authentication powered by `better-auth`.
- **Danger Zone Rules**: Prevent accidental deletions with project name confirmation.

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org) (App Router)
- **UI & Styling**: [React 19](https://react.dev), [Tailwind CSS v4](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com)
- **API**: [tRPC](https://trpc.io)
- **Database**: [Drizzle ORM](https://orm.drizzle.team) with libSQL
- **Container Management**: Docker API via [dockerode](https://github.com/apocas/dockerode)

## Quick Start

### Prerequisites

- Node.js (v20+ recommended)
- Docker running on the host machine
- Git

### Installation

1. Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/vortex.git
cd vortex
npm install
```

2. Set up your environment variables. Copy the sample file and fill in your details:

```bash
cp .env.example .env
```

3. Setup the database:

```bash
npm run db:push
```

4. Start the development server:

```bash
npm run dev
```

Visit `http://localhost:3000` to access the Vortex dashboard.

## To-Do

- [ ] Make the application fully responsive for mobile and tablet devices
- [ ] Add Docker Compose support with multi-service deployment capabilities

## License

This project is licensed under the MIT License.
