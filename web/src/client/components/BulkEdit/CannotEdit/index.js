import React from 'react';
import PropTypes from 'prop-types';

// Cannot edit inventory for "Retail & Wholesale" listings
export default function CannotEdit({message}) {
  return (
    <div className="variation-preview-message error">{message}</div>
  );
}

CannotEdit.propTypes = {
  message: PropTypes.string.isRequired
};
