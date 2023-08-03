import { SERVER_URL, SLACK_CLIENT_ID, SLACK_CLIENT_SECRET } from '@config'
import { SlackState } from '@interfaces'
import { globalLogger, verifyJwt } from '@utils'
import axios from 'axios'
import { Request, Response } from 'express'

const logger = globalLogger.setContext(`HubspotOAuthMiddleware`)

const BOT_SCOPES = ['chat:write', 'channels:read', 'channels:join']
const USER_SCOPES = ['identity.basic']
const SLACK_AUTHORIZE_URL = 'https://slack.com/oauth/v2/authorize'
const SLACK_AUTHENTICATE_URL = 'https://slack.com/api/oauth.v2.access'

export const authorizeSlackMiddleware = (req: Request, res: Response) => {
  const slackUrl = new URL(SLACK_AUTHORIZE_URL)
  slackUrl.searchParams.append('client_id', SLACK_CLIENT_ID)
  if (req.query.jwt) {
    slackUrl.searchParams.append('state', req.query.jwt as string)
  }
  if (BOT_SCOPES.length > 0) {
    slackUrl.searchParams.append('scope', BOT_SCOPES.join(','))
  }
  if (USER_SCOPES.length > 0) {
    slackUrl.searchParams.append('user_scope', USER_SCOPES.join(','))
  }
  slackUrl.searchParams.append('redirect_uri', `${SERVER_URL}/oauth/callback`)
  return res.redirect(slackUrl.href)
}

export const authenticateSlackMiddleware = async (req: Request, res: Response, next) => {
  if (req.query.code) {
    const params = new URLSearchParams({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      client_id: SLACK_CLIENT_ID,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      client_secret: SLACK_CLIENT_SECRET,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      grant_type: 'authorization_code',
      // eslint-disable-next-line @typescript-eslint/naming-convention
      redirect_uri: `${SERVER_URL}/oauth/callback`,
      code: req.query.code as string,
    })
    const response = await axios.post(SLACK_AUTHENTICATE_URL, params, {
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    // eslint-disable-next-line require-atomic-updates
    req.user = response.data
    logger.log('response', { response: response.data })
  }
  next()
}

export const consumerExtractorMiddleware = async (req: Request, res: Response, next) => {
  logger.log('consumerExtractorMiddleware called', { query: req.query })
  const state = await verifyJwt<SlackState>((req.query.jwt || req.query.state) as string)
  // eslint-disable-next-line require-atomic-updates
  req.state = state
  next()
}
