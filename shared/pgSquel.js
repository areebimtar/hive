import squel from 'squel';
import moment from 'moment';

const convertMomentToSqlString = (m) => m.isValid() ? m.toISOString() : null;

const pgSquel = squel.useFlavour('postgres');
pgSquel.registerValueHandler(moment().constructor, convertMomentToSqlString);

class ForUpdateBlock extends pgSquel.cls.Block {
  /** The method exposed by the query builder */
  forUpdate() {
    this.appendForUpdate = true;
  }

  /** The method which generates the output */
  _toParamString(/* options */) {
    return {
      text: this.appendForUpdate ? 'FOR UPDATE' : '',
      values: []  /* values for paramterized queries */
    };
  }
}

pgSquel.select_ = pgSquel.select;
pgSquel.select = (options) =>
  pgSquel.select_(options, [
    new pgSquel.cls.StringBlock(options, 'SELECT'),
    new pgSquel.cls.FunctionBlock(options),
    new pgSquel.cls.DistinctBlock(options),
    new pgSquel.cls.GetFieldBlock(options),
    new pgSquel.cls.FromTableBlock(options),
    new pgSquel.cls.JoinBlock(options),
    new pgSquel.cls.WhereBlock(options),
    new pgSquel.cls.GroupByBlock(options),
    new pgSquel.cls.HavingBlock(options),
    new pgSquel.cls.OrderByBlock(options),
    new pgSquel.cls.LimitBlock(options),
    new pgSquel.cls.OffsetBlock(options),
    new pgSquel.cls.UnionBlock(options),
    new ForUpdateBlock(options)
  ]);

export default pgSquel;

