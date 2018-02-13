import _ from 'lodash';
import Promise from 'bluebird';
import AWS from 'aws-sdk';

import { AWS_SIGN_URL_EXPIRATION_TIMEOUT } from '../../constants';

export default class S3Images {
  constructor(bucketName, config, logger) {
    this._bucketName = bucketName;
    this._config = config;
    this._logger = logger;

    const options = {
      apiVersion: _.get(config, 'apiVersion', '2006-03-01'),
      region: _.get(config, 'region'),
      accessKeyId: _.get(config, 'accessKeyId'),
      secretAccessKey: _.get(config, 'secretAccessKey'),
      sslEnabled: _.get(config, 'sslEnabled'),
      logger: logger
    };

    this._s3 = new AWS.S3(options);
  }

  getUploadUrl(key, mime) {
    const params = {
      Bucket: this._bucketName,
      Key: key,
      ACL: 'public-read',
      Expires: _.get(this._config, 'signedURLExpiration', AWS_SIGN_URL_EXPIRATION_TIMEOUT),
      ContentType: mime
    };
    return this._s3.getSignedUrl('putObject', params);
  }

  getImage(key, range) {
    const params = {
      Bucket: this._bucketName,
      Key: key
    };
    if (range) {
      params.Range = range;
    }

    return new Promise((resolve) =>
      this._s3.getObject(params, (error, data) => {
        if (error && this._logger) {
          this._logger.debug(`Image not found in s3 bucket hash: ${key}, range: ${range}`);
          this._logger.debug(error);
        }
        resolve(error ? null : data);
      }));
  }

  getImageUrl(hash) {
    const { region, bucketName } = this._config;
    return `https://s3-${region}.amazonaws.com/${bucketName}/${hash}`;
  }
}
