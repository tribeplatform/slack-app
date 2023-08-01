import { SERVER_URL, SLACK_CLIENT_ID, SLACK_CLIENT_SECRET } from '@config'
import { HubspotState } from '@interfaces'
import { globalLogger, verifyJwt } from '@utils'
import axios from 'axios'
import { Request, Response } from 'express'

const logger = globalLogger.setContext(`HubspotOAuthMiddleware`)

const BOT_SCOPES = ['chat:write', 'channels:read']
const USER_SCOPES = ['identity.basic']
const SLACK_AUTHORIZE_URL = 'https://slack.com/oauth/v2/authorize'
const SLACK_AUTHENTICATE_URL = 'https://slack.com/api/oauth.v2.access'

export const authorizeSlackMiddleware = (req: Request, res: Response) => {
  return res.redirect(
    `${SLACK_AUTHORIZE_URL}?scope=${BOT_SCOPES.join(',')}&user_scope=${USER_SCOPES.join(
      ',',
    )}&client_id=${SLACK_CLIENT_ID}&state=${req.query.jwt}`,
  )
}

export const authenticateSlackMiddleware = async (req: Request, res: Response, next) => {
  if (req.query.code) {
    const response = await axios.post(
      SLACK_AUTHENTICATE_URL,
      `client_id=${encodeURIComponent(
        SLACK_CLIENT_ID,
      )}&client_secret=${encodeURIComponent(
        SLACK_CLIENT_SECRET,
      )}&grant_type=authorization_code&redirect_uri=${encodeURIComponent(
        `${SERVER_URL}/oauth/callback`,
      )}&code=${encodeURIComponent(req.query.code as string)}`,
      {
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    )
    // eslint-disable-next-line require-atomic-updates
    req.user = response.data
    logger.log('response', { response: response.data })
  }
  next()
}

export const consumerExtractorMiddleware = async (req: Request, res: Response, next) => {
  logger.log('consumerExtractorMiddleware called', { query: req.query })
  const state = await verifyJwt<HubspotState>(
    (req.query.jwt || req.query.state) as string,
  )
  // eslint-disable-next-line require-atomic-updates
  req.state = state
  next()
}
