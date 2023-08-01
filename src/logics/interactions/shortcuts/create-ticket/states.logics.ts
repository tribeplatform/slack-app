import { EntitiesByContext, ShortcutStatesInput, ShortcutStatesResult } from '@interfaces'
import { NetworkSettingsRepository } from '@repositories'
import { PermissionContext } from '@tribeplatform/gql-client/global-types'
import { RoleType } from '@tribeplatform/gql-client/types'
import { globalLogger } from '@utils'

import { Shortcut } from '../constants'

import { CreateTicketState } from './constants'

const logger = globalLogger.setContext(`CreateTicketShortcut`)

export const getCreateTicketShortcutStates = async (options: {
  data: ShortcutStatesInput
  entitiesByContext: EntitiesByContext
}): Promise<ShortcutStatesResult> => {
  logger.debug('getCreateTicketShortcutStates called', { options })

  const {
    data: { member, role },
    entitiesByContext,
  } = options

  if (role.type !== RoleType.admin) return []

  const settings = await NetworkSettingsRepository.findUniqueOrThrow(member.networkId)
  if (!settings) return []
  const { enabled } = settings?.ticketCreationSettings || { enabled: false }
  if (!enabled) return []
  const postIds = entitiesByContext.POST?.map(({ entity }) => entity.id) ?? []
  return postIds.map(postId => ({
    context: PermissionContext.POST,
    entityId: postId,
    shortcutState: {
      shortcut: Shortcut.CreateTicket,
      state: CreateTicketState.Create,
    },
  }))
}
