import { HealthController } from './health.controller'
import { IndexController } from './index.controller'
import { OAuthController } from './oauth.controller'
import { WebhookController } from './webhook.controller'

export * from './index.controller'
export * from './webhook.controller'

const defaultControllers = [
  IndexController,
  WebhookController,
  OAuthController,
  HealthController,
]

export default defaultControllers
