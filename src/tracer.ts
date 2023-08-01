import tracer from 'dd-trace'

import { globalLogger } from './utils/logger.utils'

const logger = globalLogger.setContext('DDTracer')

tracer.init({
  logInjection: true,
  logger: {
    error: err => logger.error(err),
    warn: message => logger.warn(message),
    info: message => logger.log(message),
    debug: message => logger.debug(message),
  },
})
export default tracer
