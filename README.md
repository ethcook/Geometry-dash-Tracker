# Geometry Dash Tracker

A small web app for tracking Geometry Dash goals, demons, practice sessions, daily quests, coins, weaknesses, and player progress.

## Features

- Track goals, demons, attempt counts, and difficulty progress
- Log practice sessions and store progress in the browser
- Manage daily quests, quest points, and an icon machine-style shop
- View dashboard stats and a progress timeline
- Use a built-in chatbot powered by OpenRouter

## Run Locally

Requires Node.js 20.6+ and an OpenRouter API key.

Create a `.env` file:

```env
OPENROUTER_API_KEY=your-key
OPENROUTER_MODEL=google/gemini-3.1-flash-lite
```

Then run:

```sh
npm start
```

Open the app at <http://localhost:3000>.

## License

Unlicensed.
