import { getNetworkClient } from '@clients'
import { Member, Post } from '@tribeplatform/gql-client/types'
import { globalLogger } from './logger.utils'

const logger = globalLogger.setContext('QueryUtils')

export const getMember = async (options: {
  networkId: string
  memberId: string
}): Promise<Member> => {
  try {
    const { networkId, memberId } = options
    const gqlClient = await getNetworkClient(networkId)
    return await gqlClient.query({
      name: 'member',
      args: { variables: { id: memberId }, fields: 'basic' },
    })
  } catch (error) {
    logger.log(error)
  }
}

export const getPost = async (options: {
  networkId: string
  postId: string
}): Promise<Post> => {
  try {
    const { networkId, postId } = options
    const gqlClient = await getNetworkClient(networkId)
    return await gqlClient.query({
      name: 'post',
      args: { variables: { id: postId }, fields: 'basic' },
    })
  } catch (error) {
    logger.debug(error)
  }
}

export const getSpaces = async (networkId: string) => {
  try {
    const gqlClient = await getNetworkClient(networkId)

    const spaces = await gqlClient.query({
      name: 'spaces',
      args: {
        fields: { nodes: 'basic' },
        variables: {
          limit: 100,
        },
      },
    })
    return spaces.nodes
  } catch (error) {
    logger.debug(error)
  }
}

export const getNetwork = async (networkId: string) => {
  try {
    const gqlClient = await getNetworkClient(networkId)
    const network = await gqlClient.query({
      name: 'network',
      args: 'basic',
    })
    return network
  } catch (error) {
    logger.debug(error)
  }
}

export const getImage = async (options: { networkId: string; mediaId: string }) => {
  try {
    const { networkId, mediaId } = options
    const gqlClient = await getNetworkClient(networkId)
    const network = await gqlClient.query({
      name: 'getMedia',
      args: { fields: 'all', variables: { mediaId } },
    })
    return network
  } catch (error) {
    logger.debug(error)
  }
}

export const getImageII = async (options: { networkId: string; mediaId: string }) => {
  try {
    const { networkId, mediaId } = options
    const gqlClient = await getNetworkClient(networkId)
    const network = await gqlClient.query({
      name: 'media',
      args: { fields: 'all', variables: { id: mediaId } },
    })
    return network
  } catch (error) {
    logger.debug(error)
  }
}

export const getModeration = async (options: {
  networkId: string
  moderationId: string
}) => {
  try {
    const { networkId, moderationId } = options
    const gqlClient = await getNetworkClient(networkId)
    const network = await gqlClient.query({
      name: 'getModerationById',
      args: { fields: 'basic', variables: { moderationId } },
    })
    return network
  } catch (error) {
    logger.debug(error)
  }
}
