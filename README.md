# Geometry Dash Tracker

A local Geometry Dash progress tracker with an OpenRouter-powered general-purpose chatbot.

## Run locally

Requires Node.js 20.6 or newer and an OpenRouter API key. Add the key to the ignored `.env` file:

```dotenv
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL=google/gemini-3.1-flash-lite
```

Then start the server and open `http://localhost:3000`:

```sh
npm start
```

The key is read only by the Node server and is never sent to the browser.

The chatbot defaults to Gemini 3.1 Flash Lite through OpenRouter. Change `OPENROUTER_MODEL` if you want to use another OpenRouter model. To attribute requests to a deployed site, optionally set `OPENROUTER_SITE_URL` as well:

```dotenv
OPENROUTER_SITE_URL=https://example.com
```

Keep API keys out of source control. Local `.env` files are ignored; for deployment, configure the same variables in your hosting provider's secret settings.
