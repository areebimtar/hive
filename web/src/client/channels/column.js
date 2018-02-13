import _ from 'lodash';


export default class Column {
  constructor(data) {
    this._data = data;
  }

  _getConfigValue = (field, context, rowData) => {
    if (!(field && this._data)) { return undefined; }
    const value = this._data[field];
    return _.isFunction(value) ? value(this._data, context, rowData) : value;
  }

  _getValue = (field, context, rowData) => {
    const value = this._getConfigValue(field, context, rowData);
    return value ? value : rowData[this.field()];
  }

  id = () => this._getConfigValue('id')
  field = () => this._getConfigValue('field') || this.id()
  name = (context) => this._getConfigValue('name', context) || this.id()
  headerClass = (context) => this._getConfigValue('headerClass', context) || this.id()
  visible = (context) => { const val = this._getConfigValue('visible', context); return _.isBoolean(val) ? val : true; }
  class = (context, rowData) => this._getConfigValue('class', context, rowData) || this.id()
  value = (context, rowData) => this._getValue('value', context, rowData)
}
