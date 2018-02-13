import React, {Component} from 'react';

export default class NotFound extends Component {
  render() {
    return (
        <div className="special-page">
            <h4>What you're looking for isn't here<div>(this is a 404 error)</div></h4>
            <p>You may have typed the URL incorrectly, or this page may have been moved</p>
        </div>
    );
  }
}
