import { model, Schema, Document } from 'mongoose';
import { IncomingWebhook } from '@interfaces/incoming-webhook.interface';
const incomingWebhookSchema: Schema = new Schema({
  channel: {
    type: String,
    required: true,
  },
  channelId: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  configUrl: {
    type: String,
    required: true,
  },
  scope: {
    type: String,
    required: true,
  },
  accessToken: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  teamId: {
    type: String,
    required: true,
  },
  teamName: {
    type: String,
    required: true,
  },
  networkId: {
    type: String,
    required: true,
  },
});

incomingWebhookSchema.index({ networkId: 1 });

const IncomingWebhookModel = model<IncomingWebhook & Document>('IncomingWebhook', incomingWebhookSchema);

export default IncomingWebhookModel;
