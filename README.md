# Fitness Contributions

A web application that displays fitness activity contributions in a GitHub-style heatmap, similar to how GitHub shows developer contributions.

## Features

- **GitHub-style Heatmap**: Visualize your fitness activities in a beautiful contribution graph
- **Strava Integration**: Connect your Strava account via OAuth to automatically sync activities
- **Apple Health Support**: Upload exported Apple Health data to include additional activities
- **Smart Deduplication**: Automatically removes duplicate activities when both sources are used
- **Mobile-First Design**: Responsive design that works great on mobile and desktop
- **Strava Theming**: Beautiful orange color scheme inspired by Strava

## Tech Stack

- **Framework**: Next.js 14+ (App Router) with TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (via Vercel Postgres)
- **Authentication**: NextAuth.js with Strava OAuth
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Strava API application (for OAuth)
- A Vercel Postgres database (or any PostgreSQL database)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd strava-contributions
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `.env.local.example` to `.env.local` and fill in your values:
   ```bash
   cp .env.local.example .env.local
   ```

   Required environment variables:
   - `AUTH_SECRET`: Generate a random secret (e.g., `openssl rand -base64 32`)
   - `NEXTAUTH_URL`: Your app URL (e.g., `http://localhost:3000` for local dev)
   - `STRAVA_CLIENT_ID`: Your Strava API client ID
   - `STRAVA_CLIENT_SECRET`: Your Strava API client secret
   - `POSTGRES_URL`: Your PostgreSQL connection string

4. **Set up Strava API**

   - Go to https://www.strava.com/settings/api
   - Create a new application
   - Set the Authorization Callback Domain to your domain (e.g., `localhost:3000` for local dev)
   - Copy the Client ID and Client Secret to your `.env.local`

5. **Initialize the database**

   The database tables will be created automatically on first run. You can also manually initialize by calling the `initDatabase()` function.

6. **Run the development server**
```bash
npm run dev
   ```

7. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Connecting Strava

1. Click "Get Started with Strava" on the home page
2. Authorize the application to access your Strava data
3. Once connected, click "Sync Now" to fetch your activities

### Uploading Apple Health Data

1. On your iPhone, go to Settings → Health → Export Health Data
2. Wait for the export to complete (this may take a few minutes)
3. Transfer the ZIP file to your computer
4. In the dashboard, use the "Upload Apple Health Data" section to upload the file
5. The app will automatically parse and import your workouts (excluding walks)

### Viewing Your Activities

- The heatmap shows your activities over the past year
- Hover (desktop) or tap (mobile) on a day to see activity details
- The stats section shows your total activities, active days, total time, and distance

## Activity Filtering

The app automatically filters out:
- Walks (from both Strava and Apple Health)
- Hikes (from Apple Health)

## Deduplication

When both Strava and Apple Health data are present:
- Activities of the same type within ±5 minutes are considered duplicates
- Strava activities are preferred over Apple Health activities
- Only one activity per time slot is kept

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add your environment variables in Vercel dashboard
4. Deploy!

The app will automatically:
- Set up the database connection
- Initialize tables on first run
- Handle OAuth callbacks

## Project Structure

```
/app
  /api              # API routes
  /dashboard        # Dashboard page
  /providers.tsx    # NextAuth session provider
/components         # React components
/lib                # Utility functions
/types              # TypeScript type definitions
```

## License

MIT
