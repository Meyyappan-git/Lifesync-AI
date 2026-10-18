# Render deployment

The `render.yaml` Blueprint deploys the Next.js frontend, FastAPI backend, and PostgreSQL database in Singapore. The frontend routes API requests over Render's private network.

## Deploy

1. In the Render Dashboard, create a new Blueprint and connect `Meyyappan-git/Lifesync-AI`.
2. Select the `codex/light-ui-dashboard-updates` branch.
3. Review the Blueprint and create the three free services.
4. Open the `lifesync-web` service URL after both web services are healthy.

## Demo limitations

This free setup is for temporary demonstration only. Render's free Postgres expires 30 days after creation, and the backend's local filesystem is ephemeral, so uploaded documents can disappear after a restart, spin-down, or redeploy. The app uses its console email backend; verification and reset links appear in the backend logs instead of being emailed. Render free web services can spin down when idle and take about a minute to wake up.
