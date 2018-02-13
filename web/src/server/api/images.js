import _ from 'lodash';
import express from 'express';
import S3Images from 'global/modules/aws';
import logger from 'logger';

const router = express.Router(); // eslint-disable-line new-cap

const getImage = (config, models, rabbitClient, req, res) => {
  const imageId = req.params.imageId;
  // get image from db
  models.compositeRequests.getVelaImageByImageId(imageId)
    .then((image) => {
      const { region, bucketName } = _.get(config, 'AWS.images');
      const hash = _.get(image, 'hash', null);
      const url = `https://s3-${region}.amazonaws.com/${bucketName}/${hash}`;
      res.redirect(url);
    })
    .catch(err => {
      res.json({error: err.message});
    });
};

const getUploadUrl = async (config, models, rabbitClient, req, res) => {
  const { hash, mime } = req.query;

  const bucketName = _.get(config, 'AWS.images.bucketName');
  const awsConfig = _.get(config, 'AWS.images');
  const bucket = new S3Images(bucketName, awsConfig, logger);

  // try to get 1 byte from image stored on s3
  const image = await bucket.getImage(hash, 'bytes=0-0');
  // if we do, image already exist and we should do nothing, otherwise send back signed url
  const uploadUrl = image ? null : bucket.getUploadUrl(hash, mime);
  res.json({
    uploadUrl: uploadUrl
  });
};

export default (config, dbModels, rabbitClient) => {
  const wrapper = (routeHandler) => async (req, res) => {
    const { session: { db } } = req;

    const models = dbModels[db];
    return routeHandler(config, models, rabbitClient, req, res);
  };

  const imagesRouter = express.Router({mergeParams: true}); // eslint-disable-line new-cap
  // add GET /images/getUploadUrl?hash=imageHash
  imagesRouter.get('/uploadUrl', wrapper(getUploadUrl));
  // add GET /images/:imageId route
  imagesRouter.get('/:imageId', wrapper(getImage));

  // use images routes in main router
  router.use('/images', imagesRouter);

  return router;
};
