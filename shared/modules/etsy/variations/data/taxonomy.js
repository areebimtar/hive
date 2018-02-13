import _ from 'lodash';
import TAXONOMY_DATA from '../../taxonomy.json';

export const getCategoryId = (taxonomyId) => _.get(TAXONOMY_DATA[taxonomyId], 'categoryId', null);
