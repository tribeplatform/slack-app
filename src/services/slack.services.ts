// import { createLogger } from '@/utils/logger';
import { getSlackBotClient } from '@clients'
import { NetworkSettings } from '@prisma/client'
import { Types } from '@tribeplatform/gql-client'
import { Network } from '@tribeplatform/gql-client/types'
import { globalLogger } from '@utils'

import * as blockUtils from '../utils/blockParser'

const logger = globalLogger.setContext('SendSlackMesseges was Called!')

export const sendSlackMessage = async ({
  sentences,
  channel,
  context,
  actions,
  settings,
  network,
}: {
  sentences: string[]
  channel: string
  context?: any[]
  actions?: {
    text: string
    type: 'plain_text'
    emoji: boolean
    url: string
  }[]
  settings: NetworkSettings
  network: Network
}) => {
  try {
    const blocks = []
    const text = sentences[0]
    sentences[0] = `:bell: ${text}`
    sentences.forEach(sentence => blocks.push(blockUtils.createTextSection(sentence)))
    if (context) {
      blocks.push({
        type: 'context',
        elements: context,
      })
    }
    if (actions?.length) {
      blocks.push({
        type: 'actions',
        elements: actions.map(action => [
          {
            type: 'button',
            text: {
              type: action?.type,
              text: action?.text,
              emoji: true,
            },
            url: action.url,
          },
        ]),
      })
    }

    const image = (network.favicon as Types.Image)?.urls?.small

    const [slackClient] = await Promise.all([getSlackBotClient(settings)])
    await slackClient.postMessageII({
      text,
      blocks,
      channel,
      username: network.name,
      image,
    })
  } catch (err) {
    logger.error(err)
  }
}
