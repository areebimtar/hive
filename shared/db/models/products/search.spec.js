import Promise from 'bluebird';
import chai, {expect} from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';

chai.use(sinonChai);

import search from './search';

describe('getFiltered', () => {
  let getFiltered;
  let getFilteredIds;
  let getByIds;
  let result;

  beforeEach(async () => {
    getFilteredIds = sinon.stub().returns(Promise.resolve([2, 10, 20]));
    getByIds = sinon.stub().returns(Promise.resolve([
      { id: 2, title: 'test 2' },
      { id: 10, title: 'test 10' },
      { id: 20, title: 'test 20' }
    ]));
    search.__Rewire__('getFilteredIds', getFilteredIds);
    search.__Rewire__('getByIds', getByIds);
    getFiltered = search.__get__('getFiltered');

    result = await getFiltered({}, 1, null, null, { tags: ['boo', 'baa'], materials: ['rock', 'stone'], title: 'qweee', section_id: 12345 });
  });

  afterEach(() => {
    search.__ResetDependency__('getFilteredIds');
    search.__ResetDependency__('getByIds');
  });

  it('should get filtered product ids', () => {
    expect(getFilteredIds).to.have.been.calledOnce;
    expect(getByIds).to.have.been.calledOnce;
    expect(result).to.be.array;
    expect(result).to.eql([
      { id: 2, title: 'test 2' },
      { id: 10, title: 'test 10' },
      { id: 20, title: 'test 20' }
    ]);
  });
});

describe('getFilteredCount', () => {
  let getFilteredCount;
  let getFilteredOnlyIds;
  let result;

  beforeEach(async () => {
    getFilteredOnlyIds = sinon.stub().returns(Promise.resolve([2, 10, 20]));
    search.__Rewire__('getFilteredOnlyIds', getFilteredOnlyIds);
    getFilteredCount = search.__get__('getFilteredCount');

    result = await getFilteredCount({}, 1, { tags: ['boo', 'baa'], materials: ['rock', 'stone'], title: 'qweee', section_id: 12345 });
  });

  afterEach(() => {
    search.__ResetDependency__('getFilteredOnlyIds');
  });

  it('should get filtered product ids', () => {
    expect(getFilteredOnlyIds).to.have.been.calledOnce;
    expect(result).to.eql({ count: 3 });
  });
});

describe('getFilteredFilters', () => {
  let getFilteredFilters;
  let getGroupFilters;
  let filters;
  let result;

  beforeEach(async () => {
    filters = { tags: ['boo', 'baa'], materials: ['rock', 'stone'], title: 'qweee', section_id: 12345 };
    getGroupFilters = sinon.stub()
      .onCall(0).returns(Promise.resolve({ taxonomy: 'taxonomy' }))
      .onCall(1).returns(Promise.resolve({ materials: 'materials' }))
      .onCall(2).returns(Promise.resolve({ section: 'section' }))
      .onCall(3).returns(Promise.resolve({ tags: 'tags' }));
    search.__Rewire__('getGroupFilters', getGroupFilters);
    getFilteredFilters = search.__get__('getFilteredFilters');

    result = await getFilteredFilters({}, 1, filters);
  });

  afterEach(() => {
    search.__ResetDependency__('getGroupFilters');
  });

  it('should get results for supported filters', () => {
    expect(getGroupFilters).to.have.been.called;
    expect(getGroupFilters.args).to.have.length(4);
    expect(getGroupFilters.args[0]).to.eql([{}, 1, filters, 'taxonomy_id']);
    expect(getGroupFilters.args[1]).to.eql([{}, 1, filters, 'materials']);
    expect(getGroupFilters.args[2]).to.eql([{}, 1, filters, 'section_id']);
    expect(getGroupFilters.args[3]).to.eql([{}, 1, filters, 'tags']);
  });

  it('should merge results', () => {
    expect(result).to.eql({
      filters: {
        taxonomy: 'taxonomy',
        materials: 'materials',
        tags: 'tags',
        section: 'section'
      }
    });
  });
});

describe('getGroupFilters', () => {
  let getGroupFilters;
  let getFilteredIds;
  let getRelGroupFilters;

  beforeEach(() => {
    getFilteredIds = sinon.stub().returns('product ids query');
    getRelGroupFilters = sinon.stub().returns(Promise.resolve('result filters'));
    search.__Rewire__('getFilteredIds', getFilteredIds);
    search.__Rewire__('getRelGroupFilters', getRelGroupFilters);
    getGroupFilters = search.__get__('getGroupFilters');
  });

  afterEach(() => {
    search.__ResetDependency__('getFilteredIds');
    search.__ResetDependency__('getRelGroupFilters');
  });

  it('should get product ids for filters without current group', async () => {
    await getGroupFilters({}, 1, { tags: ['boo', 'baa'], materials: ['rock', 'stone'], title: 'qweee', section_id: 12345 }, 'section_id');

    expect(getFilteredIds).to.have.been.calledOnce;
    expect(getFilteredIds.args[0]).to.eql([{}, 1, { tags: ['boo', 'baa'], materials: ['rock', 'stone'], title: 'qweee' }, null, null]);
  });

  it('should get filters only on given ids', async () => {
    const result = await getGroupFilters({}, 1, { tags: ['boo', 'baa'], materials: ['rock', 'stone'], title: 'qweee', section_id: 12345 }, 'section_id');

    expect(getRelGroupFilters).to.have.been.calledOnce;
    expect(getRelGroupFilters.args[0]).to.eql([{}, 'section_id', 'product ids query']);
    expect(result). to.eql({ section_id: 'result filters' });
  });
});

describe('getRelGroupFilters', () => {
  let getRelGroupFilters;
  let any;

  beforeEach(() => {
    any = sinon.stub();
    getRelGroupFilters = search.__get__('getRelGroupFilters');
  });

  it('should build query for taxonomy', async () => {
    any.returns(Promise.resolve([]));
    await getRelGroupFilters({ any }, 'taxonomy_id', [1, 2, 3]);

    expect(any).to.have.been.calledOnce;
    expect(any.args[0][0]).to.eql('SELECT taxonomy_id, COUNT(*) FROM product_properties WHERE (id IN ($1, $2, $3)) GROUP BY taxonomy_id');
    expect(any.args[0][1]).to.eql([1, 2, 3]);
  });

  it('should build query for taxonomy', async () => {
    any.returns(Promise.resolve([]));
    await getRelGroupFilters({ any }, 'section_id', [1, 2, 3]);

    expect(any).to.have.been.calledOnce;
    expect(any.args[0][0]).to.eql('SELECT section_id, COUNT(*) FROM product_properties WHERE (id IN ($1, $2, $3)) GROUP BY section_id');
    expect(any.args[0][1]).to.eql([1, 2, 3]);
  });

  it('should build query for tags', async () => {
    any.returns(Promise.resolve([]));
    await getRelGroupFilters({ any }, 'tags', [1, 2, 3]);

    expect(any).to.have.been.calledOnce;
    expect(any.args[0][0]).to.eql('SELECT tags, COUNT(*) FROM (SELECT unnest(tags) AS tags FROM product_properties WHERE (id IN ($1, $2, $3))) AS unnestSubQuery GROUP BY unnestSubQuery.tags');
    expect(any.args[0][1]).to.eql([1, 2, 3]);
  });

  it('should build query for materials', async () => {
    any.returns(Promise.resolve([]));
    await getRelGroupFilters({ any }, 'materials', [1, 2, 3]);

    expect(any).to.have.been.calledOnce;
    expect(any.args[0][0]).to.eql('SELECT materials, COUNT(*) FROM (SELECT unnest(materials) AS materials FROM product_properties WHERE (id IN ($1, $2, $3))) AS unnestSubQuery GROUP BY unnestSubQuery.materials');
    expect(any.args[0][1]).to.eql([1, 2, 3]);
  });

  it('should count results', async () => {
    any.returns(Promise.resolve([{ taxonomy_id: 'a', count: 3 }, { taxonomy_id: 'c', count: 1  }, { taxonomy_id: 'b', count: 2 }]));
    const result = await getRelGroupFilters({ any }, 'taxonomy_id', [1, 2, 3]);

    expect(result).to.eql({ a: 3, b: 2, c: 1 });
  });
});
