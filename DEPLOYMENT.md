# Render deployment

The `render.yaml` Blueprint deploys the Next.js frontend, FastAPI backend, and PostgreSQL database in Singapore. The backend has a persistent disk for uploaded documents, and the frontend routes API requests over Render's private network.

## Deploy

1. In the Render Dashboard, create a new Blueprint and connect `Meyyappan-git/Lifesync-AI`.
2. Select the `codex/light-ui-dashboard-updates` branch.
3. Enter SMTP credentials and the sender address when Render prompts for `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM`.
4. Review the listed services and costs, then create the Blueprint.
5. Open the `lifesync-web` service URL after both web services are healthy.

The Blueprint uses paid compute and persistent storage so user uploads and database records survive restarts. Render's free web services cannot use persistent disks, and free Postgres expires after 30 days.
