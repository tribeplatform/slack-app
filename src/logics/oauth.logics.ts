import { SERVER_URL } from '@config'
import { HubspotAuthInfo, HubspotState } from '@interfaces'
import { NetworkSettingsRepository } from '@repositories'
import { Network } from '@tribeplatform/gql-client/types'
import { getNetworkUrl, getSlackAppUrl, signJwt } from '@utils'

export const connectToHubspot = async (options: {
  authInfo: HubspotAuthInfo
  state: HubspotState
}) => {
  const { authInfo, state } = options
  const { networkId, actorId } = state
  const {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    profile: { hub_domain, hub_id, user_id },
    accessToken: token,
    refreshToken: refresh,
  } = authInfo
  await NetworkSettingsRepository.upsert(networkId, {
    memberId: actorId,
    userId: String(user_id),
    refresh,
    token,
    hubId: String(hub_id),
    domain: hub_domain,
    eventsSettings: {
      enabled: false,
    },
    listsSettings: {
      enabled: false,
    },
    contactsSettings: {
      fields: [],
      create: false,
      fieldCategory: null,
    },
    ticketCreationSettings: {
      enabled: false,
    },
    federatedSearchSettings: {
      enabled: false,
    },
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
