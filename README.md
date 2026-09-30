<!-- Modifié par Giovanni malagnino — 2026-09-29 21:54 America/Toronto -->

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


## Infomaniak deployment (Node.js 24)

This Vite application builds to `dist`. The production server serves only that
directory and falls back to `index.html` for React Router navigation.
Calculations still run in the browser.

Configure the Infomaniak Node.js site as follows:

| Setting | Value |
| --- | --- |
| Node.js version | 24 |
| Working directory | Repository root containing `package.json` |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm start` |
| Listening port | `3000` |

`--include=dev` keeps Vite and the build tools available even when the hosting
build environment sets `NODE_ENV=production`. The `serve` package is a production
dependency. It listens on all IPv4 interfaces and fails if port 3000 is occupied,
instead of silently switching to a port the hosting proxy cannot reach.

After importing or updating the repository on Infomaniak, run **Build** and then
**Run** (or restart the application if it is already running). A GitHub import
does not establish automatic deployment by itself; verify the configured update
mechanism before expecting later commits to appear on the live site.

For a local production check with Node.js 24:

```sh
npm ci --include=dev
npm run build
npm start
```

Open `http://localhost:3000` and check both the home page and a direct application
route. Use the same port in the start command and the Infomaniak settings if you
change it. `npm run dev` and `npm run preview` are for local development and review;
use `npm start` for production.
