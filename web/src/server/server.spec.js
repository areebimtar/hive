import {expect} from 'chai';
import express from 'express';
import superagent from 'superagent';

const router = express.Router(); // eslint-disable-line new-cap


describe('server API tests', () => {
  it('should work', (cb) => {
    const app = express();
    const route = router.get('/shops', (req, res) => {
      res.send('test');
    });
    app.use(route);

    app.listen(3030, (err) => {
      expect(err).to.be.undefined;

      superagent.get('localhost:3030/shops').end(cb, cb);
    });
  });
});
