import 'dotenv/config';
import { loadConfig } from './config';
import { createApp } from './app';

const config = loadConfig();
const app = createApp({ config });

app.listen(config.port, () => {
  console.log(`Backend listening on port ${config.port}`);
});
