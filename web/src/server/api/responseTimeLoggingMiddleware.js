import responseTime from 'response-time';
import logger from '../logger';
import _ from 'lodash';

export default function create(config) {
  const threshold = _.get(config, 'slowApiThresholdMs', 1000);

  return responseTime((req, res, time) => {
    if (time > threshold) {
      const info = {
        topic: 'apiResponseTime',
        time: time,
        route: _.get(req, 'route.path', '-'),
        method: req.method,
        url: req.originalUrl
      };

      if (res.perfData) {
        info.perfData = res.perfData;
      }

      logger.info(info);
    }
  });
}
