import { expect } from 'chai';
import _ from 'lodash';
import { createDbHelper } from '../../../test/util';

import pgSquel from '../../pgSquel';

const dbHelper = createDbHelper();

describe('Users foreign data wrapper', () => {
  let db;
  let models;
  let originalUsers;
  let highestId;

  before(async function before() {
    db = dbHelper.getDb();
    models = dbHelper.getModels();

    // Get ids of all users
    const { text, values } = pgSquel
      .select()
      .from('hive_auth.users')
      .toParam();
    originalUsers = await db.many(text, values);

    // Select highest user id from the users table
    const idQuery = pgSquel
      .select()
      .field('max(id)')
      .from('hive_auth.users')
      .toParam();
    const highestIdResult = await db.one(idQuery.text, idQuery.values);
    highestId = highestIdResult.max;
  });

  describe('isAdmin', () => {
    const ADMINS_COUNT = 3;
    const adminUserIds = [];

    const NON_ADMINS_COUNT = 3;
    const nonadminUserIds = [];

    before(async function before() {
      // Create admin users
      // Insert user id manually, FDW does not import default values
      let nextId = highestId;
      for (let i = 0; i < ADMINS_COUNT; ++i) {
        ++nextId;

        const { text, values } = pgSquel
          .insert()
          .into('hive_auth.users')
          .set('id', nextId)
          .set('email', 'admin' + i)
          .set('hash', '$2a$10$1j1kJPFS7UmrAf/LR97i2OnlOD6IJPvB6RC2cH9/r23ef4K2KKqve')
          .set('admin', 'true')
          .set('db', 'db1')
          .set('type', 'stable')
          .toParam();
        await db.none(text, values);
        adminUserIds.push(nextId);
      }

      // Create non-admin users
      for (let i = 0; i < NON_ADMINS_COUNT; ++i) {
        ++nextId;

        const { text, values } = pgSquel
          .insert()
          .into('hive_auth.users')
          .set('id', nextId)
          .set('email', 'non-admin' + i)
          .set('hash', '$2a$10$1j1kJPFS7UmrAf/LR97i2OnlOD6IJPvB6RC2cH9/r23ef4K2KKqve')
          .set('admin', 'false')
          .set('db', 'db1')
          .set('type', 'stable')
          .toParam();
        await db.none(text, values);
        nonadminUserIds.push(nextId);
      }
    });

    after(async function before() {
      // Delete all users created for testing
      const { text, values } = pgSquel
        .delete()
        .from('hive_auth.users')
        .where('id IN ?', adminUserIds.concat(nonadminUserIds))
        .toParam();
      await db.none(text, values);
    });

    it('returns that original accounts are admins according to their status', async function test() {
      for (const user of originalUsers) {
        const isReallyAdmin = user.admin;

        const isAdmin = await models.auth.users.isAdmin(user.id);
        expect(isAdmin).to.eql(isReallyAdmin);
      }
    });

    it('returns that testing admin accounts are admins', async function test() {
      for (const userId of adminUserIds) {
        const isAdmin = await models.auth.users.isAdmin(userId);
        expect(isAdmin).to.eql(true);
      }
    });

    it('returns that testing non-admin accounts are not admins', async function test() {
      for (const userId of nonadminUserIds) {
        const isAdmin = await models.auth.users.isAdmin(userId);
        expect(isAdmin).to.eql(false);
      }
    });
  });

  describe('getByCompanyId', () => {
    const returnedFields = ['id', 'email'];
    const newUserIds = [];

    before(async function before() {
      // Add user with company id 3 a 5 into the database
      const companyIds = [3, 5];
      let nextId = highestId;
      for (const companyId of companyIds) {
        ++nextId;

        const { text, values } = pgSquel
          .insert()
          .into('hive_auth.users')
          .set('id', nextId)
          .set('company_id', companyId)
          .set('email', 'nonadmin' + nextId)
          .set('hash', '$2a$10$1j1kJPFS7UmrAf/LR97i2OnlOD6IJPvB6RC2cH9/r23ef4K2KKqve')
          .set('admin', 'false')
          .set('db', 'db1')
          .set('type', 'stable')
          .toParam();
        await db.none(text, values);

        newUserIds.push(nextId);
      }
    });

    after(async function before() {
      // Delete all users created for testing
      const { text, values } = pgSquel
        .delete()
        .from('hive_auth.users')
        .where('id IN ?', newUserIds)
        .toParam();
      await db.none(text, values);
    });

    it('it returns single user when only one user has given company id', async function test() {
      const singleUserCompanyIds = [1, 2, 4];
      for (const companyId of singleUserCompanyIds) {
        const { text, values } = pgSquel
          .select()
          .from('hive_auth.users')
          .where('company_id = ?', companyId)
          .toParam();
        const user = await db.one(text, values);
        const usersFromDb = await models.auth.users.getByCompanyId(companyId);

        expect(usersFromDb.length).to.eql(1);
        expect(usersFromDb[0]).to.eql(_.pick(user, returnedFields));
      }
    });

    it('it returns no user when no user has given company id', async function test() {
      const noUserCompanyIds = [6, 8, 12];
      for (const companyId of noUserCompanyIds) {
        const usersFromDb = await models.auth.users.getByCompanyId(companyId);
        expect(usersFromDb.length).to.eql(0);
      }
    });

    it('it returns all users that have given company id', async function test() {
      const twoUserCompanyIds = [3, 5];
      for (const companyId of twoUserCompanyIds) {
        const { text, values } = pgSquel
          .select()
          .from('hive_auth.users')
          .where('company_id = ?', companyId)
          .toParam();
        const realUsers = await db.many(text, values);
        const usersFromDb = await models.auth.users.getByCompanyId(companyId);

        expect(usersFromDb.length).to.eql(2);
        for (const userFromDb of usersFromDb) {
          const realUser = _.find(realUsers, user => user.id === userFromDb.id);
          expect(userFromDb).to.eql(_.pick(realUser, returnedFields));
        }
      }
    });
  });

  describe('getById', () => {
    it('finds every user', async () => {
      for (const user of originalUsers) {
        const returnedUser = await models.auth.users.getById(user.id);
        expect(returnedUser).to.eql(_.pick(user, [
          'id', 'email', 'company_id', 'first_name', 'last_name',
          'created_at', 'first_login', 'last_login',
          'login_count', 'admin', 'db', 'type'
        ]));
      }
    });

    it('does not find non existing user', async () => {
      const maxUserId = originalUsers.reduce((maxId, nextUser) => {
        return nextUser.id > maxId ? nextUser.id : maxId;
      }, 0);
      const returnedUser = await models.auth.users.getById(maxUserId + 1);
      expect(returnedUser).to.eql(null);
    });
  });

  describe('searchUsers', () => {
    const returnedFields = ['id', 'email', 'company_id'];
    const testUserEmails = ['search-121212', 'search', 'user0'];
    const newUsers = [];
    const allUsers = [];

    before(async function before() {
      allUsers.push(...originalUsers);

      let nextId = highestId;
      for (const testUserEmail of testUserEmails) {
        ++nextId;

        const { text, values } = pgSquel
          .insert()
          .into('hive_auth.users')
          .set('id', nextId)
          .set('company_id', 1)
          .set('email', testUserEmail)
          .set('hash', '$2a$10$1j1kJPFS7UmrAf/LR97i2OnlOD6IJPvB6RC2cH9/r23ef4K2KKqve')
          .set('admin', 'false')
          .set('db', 'db1')
          .set('type', 'stable')
          .toParam();
        await db.none(text, values);

        const newUser = {
          id: nextId.toString(),
          email: testUserEmail,
          company_id: '1'
        };
        newUsers.push(newUser);
        allUsers.push(newUser);
      }
    });

    after(async function before() {
      // Delete all users created for testing
      const { text, values } = pgSquel
        .delete()
        .from('hive_auth.users')
        .where('id IN ?', newUsers.map(user => user.id))
        .toParam();
      await db.none(text, values);
    });


    it('returns all users when no query is provided', async () => {
      const users = await models.auth.users.searchUsers();
      expect(users.length).to.eql(allUsers.length);
      for (const user of users) {
        const controlUser = _.find(allUsers, userTmp => user.id === userTmp.id);
        expect(user).to.eql(_.pick(controlUser, returnedFields));
      }
    });

    it('returns all users when empty query is provided', async () => {
      const users = await models.auth.users.searchUsers('');
      expect(users.length).to.eql(allUsers.length);
      for (const user of users) {
        const controlUser = _.find(allUsers, userTmp => user.id === userTmp.id);
        expect(user).to.eql(_.pick(controlUser, returnedFields));
      }
    });

    it('returns appropriate user when single one should be returned', async () => {
      const users = await models.auth.users.searchUsers('121212');
      expect(users.length).to.eql(1);
      expect(users[0].email).to.eql(testUserEmails[0]);
    });

    it('returns appropriate users when multiple users should be returned', async () => {
      const users = await models.auth.users.searchUsers('search');
      expect(users.length).to.eql(2);
      for (const user of users) {
        const controlUser = _.find(newUsers, userTmp => user.id === userTmp.id);
        expect(user).to.eql(_.pick(controlUser, returnedFields));
      }
    });

    it('returns appropriate user when query is number 0', async () => {
      const users = await models.auth.users.searchUsers(0);
      expect(users.length).to.eql(1);
      expect(users[0].email).to.eql(testUserEmails[2]);
    });

    it('returns appropriate user when query is non-zero number', async () => {
      const users = await models.auth.users.searchUsers(121212);
      expect(users.length).to.eql(1);
      expect(users[0].email).to.eql(testUserEmails[0]);
    });

    it('case of the query is ignored', async () => {
      const users = await models.auth.users.searchUsers('SeArcH');
      expect(users.length).to.eql(2);
      for (const user of users) {
        const controlUser = _.find(newUsers, userTmp => user.id === userTmp.id);
        expect(user).to.eql(_.pick(controlUser, returnedFields));
      }
    });
  });
});
