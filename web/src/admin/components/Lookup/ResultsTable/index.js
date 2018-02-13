import React, { Component } from 'react';
import PropTypes from 'prop-types';

class ResultsTable extends Component {
  static propTypes = {
    headers: PropTypes.array.isRequired,
    rows: PropTypes.array.isRequired,
    columnKeys: PropTypes.array.isRequired,
    onResultClick: PropTypes.func.isRequired,
    showArrow: PropTypes.bool
  };

  static defaultProps = {
    onResultClick: () => {},
    showArrow: true
  };

  renderHeader(index, value) {
    return (
      <th key={index} id={`results-header-${index}`}>
        {value}
      </th>
    );
  }

  renderRowCells(row) {
    const { columnKeys } = this.props;
    return columnKeys.map((columnKey, columnIndex) => (
      <td key={columnIndex} id={`results-row-${row.id}-value-${columnIndex}`}>
        {row[columnKey]}
      </td>
    ));
  }

  renderArrow() {
    return (
      <td>
        <div className="right-align">
          <a>
            <i className="material-icons grey-text text-darken-2">
              navigate_next
            </i>
          </a>
        </div>
      </td>
    );
  }

  renderRow(index, row) {
    const { onResultClick, showArrow } = this.props;
    return (
      <tr key={index}
        onClick={event => onResultClick(event, row.id)}
        className="clickable">
        {this.renderRowCells(row)}
        {showArrow ? this.renderArrow() : undefined}
      </tr>
    );
  }

  render() {
    const { headers, rows } = this.props;
    return (
      <table className="highlight">
        <thead>
          <tr>
            {headers.map((header, index) => this.renderHeader(index, header))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => this.renderRow(rowIndex, row))}
        </tbody>
      </table>
    );
  }
}

export default ResultsTable;
