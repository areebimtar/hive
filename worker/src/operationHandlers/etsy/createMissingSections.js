import _ from 'lodash';
import { BULK_EDIT_OP_CONSTS } from '../../../../shared/modules/etsy/bulkOpsConstants';

export default async (models, shopId, ops, t) => {
  const sectionsMap = await models.sections.getSections(shopId, t);
  // translate section name to id if present in sectionsMap (op.value can be both, section name and id, dirty!)
  const sectionsNamesMap = _(sectionsMap).values().indexBy('value').value();
  const operations = _.map(ops, op => {
    if (op.type === BULK_EDIT_OP_CONSTS.SECTION_SET && !sectionsMap[op.value] && sectionsNamesMap[op.value]) {
      return { ...op, value: sectionsNamesMap[op.value].id };
    } else {
      return op;
    }
  });
  const shouldUpdate = (op) => op.type === BULK_EDIT_OP_CONSTS.SECTION_SET && !sectionsMap[op.value] && op.value !== 'none';
  // get missing sections (if any)
  const missingSections = _(operations).filter(shouldUpdate).map(op => { return {name: op.value}; }).value();
  // are there new sections to add?
  if (_.isEmpty(missingSections)) {
    return operations;
  }
  // yes, insert missing sections
  return models.sections.insert(shopId, missingSections, t).then(newSectionsMap => {
    // we have inserted missing sections into db, update operations (remap value to id)
    return _.map(operations, op => (shouldUpdate(op)) ? { ...op, value: newSectionsMap[op.value] } : op);
  });
};
