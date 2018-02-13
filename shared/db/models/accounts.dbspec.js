import { expect } from 'chai';
import _ from 'lodash';
import { createDbHelper, deleteFrom, insert, select } from '../../../test/util';

const dbHelper = createDbHelper();

describe('Accounts model', () => {
  let db;
  let models;

  before(async function before() {
    db = dbHelper.getDb();
    models = dbHelper.getModels();
  });

  describe('updateCompanyId', () => {
    const TEST_ACCOUNTS_COUNT = 2;
    const accounts = {};

    before(async function before() {
      for (let i = 1; i < TEST_ACCOUNTS_COUNT + 1; ++i) {
        const newAccount = {
          id: i + '',
          channel_id: 1 + '',
          company_id: i + '',
          oauth_token: null,
          oauth_token_secret: null
        };
        await insert(db, 'accounts', newAccount);
        accounts[i] = newAccount;
      }
    });

    after(async function before() {
      const ids = _.range(1, TEST_ACCOUNTS_COUNT + 1);
      // Delete all accounts created for testing
      deleteFrom(db, 'accounts', ids);
    });


    it('updates id properly', async () => {
      await models.accounts.updateCompanyId(1, 3);
      const updatedAccount = await select(db, 'accounts', 1);
      expect(updatedAccount).to.eql(_.merge(accounts[1], { company_id: 3 + '' }));
    });

    it('does not update other accounts', async () => {
      await models.accounts.updateCompanyId(1, 3);
      const nonUpdatedAccount = await select(db, 'accounts', 2);
      expect(nonUpdatedAccount).to.eql(accounts[2]);
    });
  });
});
