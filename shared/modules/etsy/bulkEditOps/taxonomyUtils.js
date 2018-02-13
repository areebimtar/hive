import _ from 'lodash';
import XRegExp from 'xregexp';
import TAXONOMY_MAP from '../taxonomy.json';


export const getIndexes = (id) => {
  if (!id || !TAXONOMY_MAP[id] || !TAXONOMY_MAP[id].fullPath) { return ['0']; }

  // get current taxonomy
  const taxonomy = TAXONOMY_MAP[id];
  // current taxonomy path length
  const currentLength = taxonomy.fullPath.length;
  // are there children for current taxonomy?
  const taxonomyRemainingMap = _.reduce(taxonomy.fullPath, (result, tid) => result[tid], TAXONOMY_MAP.taxonomy);
  // should we show additional dropdown?
  const additionalDD = (taxonomyRemainingMap && taxonomyRemainingMap.ids && taxonomyRemainingMap.ids.length) ? 1 : 0;
  const nDropdowns = currentLength + additionalDD;
  // retrun array of indexes
  return _.map(_.range(nDropdowns), val => val.toString());
};

export const getValues = (id) => {
  if (!id || !TAXONOMY_MAP[id] || !TAXONOMY_MAP[id].fullPath) { return [undefined]; }

  // get current taxonomy
  const taxonomy = TAXONOMY_MAP[id];
  // return current taxonomy path
  return taxonomy.fullPath;
};

export const getOptions = (id) => {
  if (!id || !TAXONOMY_MAP[id] || !TAXONOMY_MAP[id].fullPath) { return [TAXONOMY_MAP.taxonomy.ids]; }

  // get current taxonomy
  const taxonomy = TAXONOMY_MAP[id];
  // are there children for current taxonomy?
  const options = [];
  // push options for each part of the path into options array
  const remaining = _.reduce(taxonomy.fullPath, (result, tid) => { options.push(result.ids); return result[tid]; }, TAXONOMY_MAP.taxonomy);
  // if remainder has some options, append them as well
  if (remaining && remaining.ids && remaining.ids.length) { options.push(remaining.ids); }
  return options;
};

export const getTaxonomyArray = (id) => {
  if (!id || !TAXONOMY_MAP[id] || !TAXONOMY_MAP[id].fullPath) { return []; }

  // get current taxonomy
  const taxonomy = TAXONOMY_MAP[id];
  return _.map(taxonomy.fullPath, tid => TAXONOMY_MAP[tid].name);
};

const getQuotedTaxonomy = (taxonomy) => {
  const reg = XRegExp('[^\\p{L}\\p{Nd}]');
  return (reg.test(taxonomy)) ? `"${taxonomy}"` : taxonomy;
};

export const getTaxonomyPath = (id) => {
  const arr = getTaxonomyArray(id);

  // get current taxonomy
  const path = _.map(arr, taxonomy => getQuotedTaxonomy(taxonomy)).join(',');
  return `{${path}}`;
};

export const getTaxonomyName = (id) => {
  return (id && TAXONOMY_MAP[id] && TAXONOMY_MAP[id].name) ? TAXONOMY_MAP[id].name : '';
};

export const getTopTaxonomyName = taxonomyId => {
  const fullPath = getTaxonomyArray(taxonomyId);
  return _.get(fullPath, [0], null);
};
