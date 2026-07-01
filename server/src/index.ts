/** Server entry point: create the app and listen on the configured port. */
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3001);
const app = createApp();

app.listen(port, () => {
  console.log(`accounting API listening on http://localhost:${port}`);
});
