import _ from 'lodash';
import logger from './logger';
import { now } from './api/utils';

export default function create(config) {
  const INTERVAL = _.get(config, 'eventLoop.interval', 100);
  const THRESHOLD = _.get(config, 'eventLoop.threshold', 1000);

  let lastTime = now();

  setInterval(() => {
    const time = now();
    const diff = time - lastTime - INTERVAL;

    if ((diff) > THRESHOLD) {
      logger.info({
        topic: 'eventLoopTime',
        time: diff
      });
    }

    lastTime = time;
  }, INTERVAL);
}
