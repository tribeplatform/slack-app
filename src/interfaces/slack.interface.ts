import { Types } from '@tribeplatform/gql-client'

// import { SFieldInputType } from '@enums'
enum SlackTokenType {
  Bot = 'bot',
  User = 'user',
}
export interface SlackAuthProfile {
  ok: boolean
  // eslint-disable-next-line @typescript-eslint/naming-convention
  app_id: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  authed_user: {
    id: string
    scope: string
    // eslint-disable-next-line @typescript-eslint/naming-convention
    access_token: string
    // eslint-disable-next-line @typescript-eslint/naming-convention
    token_type: SlackTokenType
  }
  scope: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  token_type: SlackTokenType
  // eslint-disable-next-line @typescript-eslint/naming-convention
  access_token: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  bot_user_id: string
  team: {
    id: string
    name: string
  }
  enterprise?: boolean
  // eslint-disable-next-line @typescript-eslint/naming-convention
  is_enterprise_install?: boolean
}
export interface SlackState {
  networkId: string
  actorId: string
  redirectUrl: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    export interface Request {
      state?: SlackState
      user?: SlackAuthProfile
    }
  }
}

export interface UpdateMessagePayload {
  event: string
  member?: Types.Member
  actor?: Types.Member
  space?: Types.Space
  post?: Types.Post
  network: Types.Network
  context?: boolean
}

export interface PostMessageArguments {
  channel: string
  username?: string
  image?: string
  text: string
  blocks?: any
}
