import { getHubspotClient } from '@clients'
import { ErrorCode, WebhookStatus } from '@enums'
import { FederatedSearchWebhook, FederatedSearchWebhookResponse } from '@interfaces'
import { NetworkSettingsRepository } from '@repositories'
import { globalLogger } from '@utils'
import { htmlToText } from 'html-to-text'

const logger = globalLogger.setContext(`FederatedSearch`)

export const handleFederatedSearchWebhook = async (
  webhook: FederatedSearchWebhook,
): Promise<FederatedSearchWebhookResponse> => {
  logger.debug('handleFederatedSearchWebhook called', { webhook })
  const { networkId } = webhook
  const settings = await NetworkSettingsRepository.findUniqueOrThrow(networkId)
  const { enabled } = settings?.federatedSearchSettings || { enabled: false }
  if (!enabled) {
    return {
      type: webhook.type,
      status: WebhookStatus.Failed,
      errorCode: ErrorCode.InvalidRequest,
      errorMessage: 'Federated search is not supported.',
    }
  }
  const hubspotClient = await getHubspotClient(settings)
  const {
    data: { query },
  } = webhook
  const response = await hubspotClient.findArticles(query)
  logger.debug('handleFederatedSearchWebhook response', { response })
  return {
    type: webhook.type,
    status: WebhookStatus.Succeeded,
    data: response.results.map(article => ({
      id: String(article.id),
      url: article.url,
      title: htmlToText(article.title),
      description: htmlToText(article.description),
    })),
  }
}
