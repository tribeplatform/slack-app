import { SERVER_URL } from '@config'
import { TokenType } from '@prisma/client'
import { NetworkSettingsRepository } from '@repositories'
import { Network } from '@tribeplatform/gql-client/types'
import { getNetworkUrl, getSlackAppUrl, globalLogger, signJwt } from '@utils'

import { SlackAuthProfile, SlackState } from '@/interfaces'

const logger = globalLogger.setContext(`SlackOAuthLogics`)

export const connectToSlack = async (options: {
  authProfile: SlackAuthProfile
  state: SlackState
}) => {
  logger.log('connectToSlack called', { options })
  const { authProfile, state } = options
  const { networkId, actorId } = state
  const {
    app_id: appId,
    authed_user: memberToken,
    bot_user_id: botId,
    access_token: botAccessToken,
    scope: botScope,
    team,
    is_enterprise_install: isEnterpriseInstall,
  } = authProfile
  // logger.log('authprofile', authProfile)
  await NetworkSettingsRepository.upsert(networkId, {
    memberId: String(actorId),
    appId,
    memberToken: {
      id: memberToken.id,
      accessToken: memberToken.access_token,
      tokenType: TokenType.MEMBER,
      refreshToken: null,
      scope: memberToken.scope,
    },
    botToken: {
      id: botId,
      accessToken: botAccessToken,
      tokenType: TokenType.BOT,
      refreshToken: null,
      scope: botScope,
    },
    team: {
      id: team.id,
      name: team.name,
    },
    isEnterpriseInstall,
  })
}

export const getConnectSlackUrl = async (options: {
  network: Network
  actorId: string
}) => {
  const { network, actorId } = options
  return `${SERVER_URL}/oauth?jwt=${await signJwt({
    networkId: network.id,
    actorId,
    redirectUrl: getSlackAppUrl(getNetworkUrl(network)),
  })}`
}
