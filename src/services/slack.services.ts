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
    sentences[0] = text.startsWith(':bell:') ? text : `:bell: ${text}`
    sentences.forEach(sentence => blocks.push(blockUtils.createTextSection(sentence)))
    //here have to make sure the member or space are present otherwise
    //if we only have context and want to push it context as element we get the Internship 2023Internship 2023
    // Log in - Internship 2023
    // Join Internship 2023 to start sharing and connecting with like-minded people.
    if (context) {
      // blocks.concat({
      blocks.push({
        type: 'context',
        elements: context,
      })
    }
    // console.log('context', context)
    if (actions?.length > 0) {
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

    await slackClient.postMessage({
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
