import _ from 'lodash';

function getTemplates(types, startingIndex = 1) {
  let index = startingIndex;
  return _.map(types, (type) => {
    if (type === 'timestamp') {
      // timestamp comes as ms since epoch but we need to store them as 'timestamp with time zone' at DB level
      return `to_timestamp($${index++}::bigint / 1000.0)`;
    } else {
      return `$${index++}::${type}`;
    }
  });
}

export default class PropertyValue {
  constructor(tableName, commonFields) {
    this._tableName = tableName; // Store tabe name for future use

    // Store sorted keys and types to keep fields order
    this._sortedKeys = _.sortBy(_.keys(commonFields));
    this._sortedTypes = _.map(this._sortedKeys, (key) => { return commonFields[key]; });

    // Prepare query for inserting first property, we know everything now for it
    // - Prepare list of fields names
    const _firstFieldsList = this._sortedKeys.concat('property_name', 'property_value').join(', ');
    // - Prepare list of numbered parameters in proper order
    const _firstFieldsTemplates = getTemplates(this._sortedTypes.concat('text', 'text')).join(', ');
    // - Finally, build whole query
    this._insertFirstPropertyQuery = `INSERT INTO ${this._tableName} (${_firstFieldsList}) VALUES (${_firstFieldsTemplates}) RETURNING id`;

    // We have not enough data for building query for inserting other properties, so
    // Prepare list of fields names for it
    this._otherFieldsList = ['id'].concat(this._sortedKeys, 'property_name', 'property_value').join(', ');
  }

  // 'Protected method' should be called from descendants only
  // id - entity id
  // commonValues - key value map where key is a common field name and value is a value
  // propertiesArray - array of one or more properties {name = property name, value = property value}
  // connection - db connection
  _set(id, commonValues, propertiesArray, connection) {
    if (!_.isArray(propertiesArray)) {
      throw new Error('PropertiesArray must be an array');
    }
    if (_.isEmpty(propertiesArray)) {
      throw new Error('At least one property should be provided');
    }
    if (!connection) {
      throw new Error('Connection is required');
    }


    // Build array of query arguments for common fields
    const commonArgs = _.map(this._sortedKeys, key => commonValues[key]);

    const templates = [];
    let idx = 1;
    const types = ['bigint'].concat(this._sortedTypes, 'text', 'text');
    let args = [];

    try {
      _.each(propertiesArray, (property) => {
        args = args.concat(id, commonArgs, property.name);

        // Do not put value to concat, because value can be an array or object
        if (_.isArray(property.value) || _.isObject(property.value)) {
          args.push(JSON.stringify(property.value));
        } else {
          const value = _.isString(property.value) ? property.value.replace(/\0/g, '') : property.value;
          args.push(value);
        }

        const template = getTemplates(types, idx);
        idx += types.length;
        templates.push(`(${template.join(', ')})`);
      });
    } catch (e) {
      console.log('exc');
      console.log(e.message);
    }

    const query = `INSERT INTO ${this._tableName} (${this._otherFieldsList}) VALUES ${templates.join(', ')}`;
    return connection.none(query, args)
      .catch((e) => {
        console.log('exc');
        console.log(e.message);
        throw e;
      });
  }
}
