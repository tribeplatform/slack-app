import { cleanEnv, makeValidator, port, str, url } from 'envalid';
import { config } from 'dotenv';
const notEmpty = makeValidator((input: string) => {
  if(!!input && input.length) return input
  throw new Error('Must not be empty')
});
config({ path: `.env` });
cleanEnv(process.env, {
  NODE_ENV: str(),
  PORT: port(),
  DB_HOST: str(),
  GRAPHQL_URL: url(),
  SERVER_URL: url(),
  CLIENT_ID: notEmpty(),
  CLIENT_SECRET: notEmpty(),
  SIGNING_SECRET: notEmpty(),
  SLACK_CLIENT_ID: notEmpty(),
  SLACK_CLIENT_SECRET: notEmpty(),
  LOG_FORMAT: str({ devDefault: 'debug', default: 'info', choices: ['info', 'debug'] }),
});
