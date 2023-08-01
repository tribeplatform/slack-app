import { Controller, Get } from 'routing-controllers'

@Controller('/_health')
export class HealthController {
  @Get()
  index() {
    return { status: 'ok' }
  }
}
