import mongoose from "mongoose";

export interface IncomingWebhook {
  _id: mongoose.Types.ObjectId | string
  id: string
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
  memberId: string
  spaceIds: string[]
  events: string[]
}
