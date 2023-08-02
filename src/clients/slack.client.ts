import { NetworkSettings } from '@prisma/client'
import { WebClient } from '@slack/web-api'
import { globalLogger } from '@utils'

const logger = globalLogger.setContext('HubspotClient')

export class SlackClient {
  private accessToken?: string
  private client?: WebClient

  constructor(options: { accessToken: string }) {
    const { accessToken } = options
    this.accessToken = accessToken
  }

  public async initialize() {
    if (this.client) return
    try {
      this.client = new WebClient(this.accessToken)
    } catch (err) {
      logger.error(err)
      throw err
    }
  }

  public async getChannels() {
    return this.client?.conversations.list()
  }

  public async postMessage(options: { channel: string; text: string }) {
    return this.client?.chat.postMessage(options)
  }

  public async invite(options: { channel: string; users: string }) {
    return this.client?.conversations.invite(options)
  }

  public async join(options: { channel: string }) {
    return this.client?.conversations.join(options)
  }
}

export const getSlackBotClient = async (
  settings: NetworkSettings,
): Promise<SlackClient> => {
  const client = new SlackClient({
    accessToken: settings?.botToken?.accessToken,
  })
  await client.initialize()
  return client
}

export const getSlackUserClient = async (
  settings: NetworkSettings,
): Promise<SlackClient> => {
  const client = new SlackClient({
    accessToken: settings?.memberToken?.accessToken,
  })
  await client.initialize()
  return client
}
