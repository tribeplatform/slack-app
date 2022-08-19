import { cleanEnv, port, str } from 'envalid';
import { config } from 'dotenv';

config({ path: `.env` });
cleanEnv(process.env, {
  NODE_ENV: str(),
  PORT: port(),
  DB_HOST: str(),
  GRAPHQL_URL: str(),
  SERVER_URL: str(),
  CLIENT_ID: str(),
  CLIENT_SECRET: str(),
  SIGNING_SECRET: str(),
  SLACK_CLIENT_ID: str(),
  SLACK_CLIENT_SECRET: str(),
  LOG_FORMAT: str({ choices: ['info', 'debug'] }),
});