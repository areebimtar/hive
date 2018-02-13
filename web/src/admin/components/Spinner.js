import React, { Component } from 'react';

class Spinner extends Component {
  render() {
    return (
      <div className="preloader-wrapper big active">
        <div className="spinner-layer spinner-layer-color">
          <div className="circle-clipper left">
            <div className="circle" />
          </div>
          <div className="gap-patch">
            <div className="circle" />
          </div>
          <div className="circle-clipper right">
            <div className="circle" />
          </div>
        </div>
      </div>
    );
  }
}

export default Spinner;
