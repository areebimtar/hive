import logger from 'logger';

export function assert(condition, message) {
  if (!condition) {
    logger.error(message);
    throw new Error(message);
  }
}
