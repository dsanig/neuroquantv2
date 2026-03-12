# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## FTP test/list backend architecture

The FTP browse/test flow now uses a dedicated Node runtime service (`backend/ftp-gateway/server.mjs`) instead of relying on Supabase Edge Functions for FTP socket handling.

### Why this architecture

Supabase Edge Functions run on Deno edge runtime constraints where low-level FTP socket/data-channel behavior can fail at invocation/runtime boundaries for real FTP servers. The new gateway uses Node TCP sockets for reliable FTP control + passive data channel handling.

### Required environment variables

Frontend:

- `VITE_FTP_GATEWAY_URL` (example: `http://localhost:8787`)

FTP gateway backend:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FTP_GATEWAY_ALLOWED_ORIGIN` (optional, default `*`)
- `FTP_GATEWAY_TIMEOUT_MS` (optional, default `10000`)
- `PORT` (optional, default `8787`)

### Running locally

1. Run frontend as usual (`npm run dev`).
2. In another terminal run FTP gateway:

```sh
npm run ftp-gateway
```

3. Ensure your browser app can reach `VITE_FTP_GATEWAY_URL`.

### Deployment

Deploy `backend/ftp-gateway/server.mjs` to a Node-capable backend (container/VM/serverless Node runtime) and set all backend env vars above. Then set `VITE_FTP_GATEWAY_URL` in your frontend environment to the deployed base URL.
