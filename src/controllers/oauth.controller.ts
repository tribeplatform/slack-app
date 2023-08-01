import {
  authenticateSlackMiddleware,
  authorizeSlackMiddleware,
  consumerExtractorMiddleware,
} from '@middlewares'
import { globalLogger } from '@utils'
import { Request, Response } from 'express'
import { Controller, Get, HttpCode, Req, Res, UseBefore } from 'routing-controllers'
import { OpenAPI } from 'routing-controllers-openapi'

@Controller('/oauth')
export class OAuthController {
  readonly logger = globalLogger.setContext(OAuthController.name)

  @Get()
  @UseBefore(consumerExtractorMiddleware, authorizeSlackMiddleware)
  @OpenAPI({ summary: 'Redirects to the Hubspot for authorization.' })
  @HttpCode(302)
  async redirect(): Promise<void> {}

  @Get('/callback')
  @UseBefore(consumerExtractorMiddleware, authenticateSlackMiddleware)
  @OpenAPI({ summary: 'Redirects to the app settings page after authentication.' })
  @HttpCode(302)
  async callback(@Req() request: Request, @Res() response: Response): Promise<Response> {
    this.logger.verbose('Received oauth callback request', {
      req: request.query,
      user: request.user,
      state: request.state,
    })

    // await connectToHubspot({
    //   authInfo: request.user,
    //   state: request.state,
    // })
    response.redirect(request.state.redirectUrl)
    return response
  }
}
