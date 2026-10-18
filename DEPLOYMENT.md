# Render deployment

The `render.yaml` Blueprint deploys the Next.js frontend, FastAPI backend, and PostgreSQL database in Singapore. The frontend routes API requests over Render's private network.

## Deploy

1. In the Render Dashboard, create a new Blueprint and connect `Meyyappan-git/Lifesync-AI`.
2. Select the `codex/light-ui-dashboard-updates` branch.
3. Review the Blueprint and create the three free services.
4. Open the `lifesync-web` service URL after both web services are healthy.

## Demo limitations

This free setup is for temporary demonstration only. Render's free Postgres expires 30 days after creation, and the backend's local filesystem is ephemeral, so uploaded documents can disappear after a restart, spin-down, or redeploy. The app uses its console email backend; verification and reset links appear in the backend logs instead of being emailed. Render free web services can spin down when idle and take about a minute to wake up.

## AI Assistant answers

The assistant needs an LLM provider key to generate natural-language answers grounded in retrieved records. Add either `GROQ_API_KEY` (optionally set `GROQ_MODEL`) or `OPENAI_API_KEY` (optionally set `OPENAI_MODEL`) to the `lifesync-api` service's Environment settings in Render, then redeploy. Keep provider keys in Render's environment settings; do not commit them to the repository. Without a provider key, the assistant uses a local extractive fallback that returns a matching field or passage when it can, instead of echoing an entire uploaded file.
