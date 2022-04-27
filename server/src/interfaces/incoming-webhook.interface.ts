export interface IncomingWebhook {
  channel: string;
  channelId: string,
  url: string,
  configUrl: string,
  scope: string,
  accessToken: string,
  userId: string,
  teamId: string,
  teamName: string,
  networkId: string
  events: string[]
}
