import React, { Component } from 'react';

export default class Popup extends Component {
  render() {
    return (
      <app-popup>

        <div className="app-popup--wrapper">

          <h3 className="feedback-msg"><i className="fa fa-check success" /> You've succesfully logged in !</h3>
          <h3 className="feedback-msg"><i className="fa fa-times error" /> Something wrong happened. Please try again.</h3>

          <div className="app-popup--header">
            <h3>Bulk Edit</h3>
            <button>Close</button>
          </div>

          <div className="app-popup--content">

            <ul className="app-popup--sidebar">
              <li className="active"><a href="#">Title</a></li>
              <li><a href="#">Description</a></li>
              <li><a href="#">Category</a></li>
              <li><a href="#">Photos</a></li>
              <li><a href="#">Price</a></li>
              <li><a href="#">Quantity</a></li>
              <li><a href="#">Variations</a></li>
              <li><a href="#">Tags</a></li>
              <li><a href="#">Materials</a></li>
              <li><a href="#">Shop Section</a></li>
              <li><a href="#">Recipient</a></li>
              <li><a href="#">Occasion</a></li>
              <li><a href="#">Style</a></li>
              <li><a href="#">Shipping</a></li>
            </ul>

            <div className="app-popup--table">

              <table>

                <tbody>

                <tr>
                  <td><input type="checkbox" /></td>
                  <td><img src="http://placehold.it/36x36" /></td>
                  <td className="title">
                    Men's Vintage STEAMSHIP Illustration Shirt<br />
                    <span className="edit">123 charcaters remaining</span>
                  </td>
                </tr>
                <tr>
                  <td><input type="checkbox" /></td>
                  <td><img src="http://placehold.it/36x36" /></td>
                  <td className="title">
                    Kids Urban ROOSTAR T-Shirt<br />
                    <span className="edit">96 charcaters remaining</span>
                  </td>
                </tr>
                <tr>
                  <td><input type="checkbox" /></td>
                  <td><img src="http://placehold.it/36x36" /></td>
                  <td className="title">
                    Kids Urban ROOSTAR T-Shirt<br />
                    <span className="edit">119 charcaters remaining</span>
                  </td>
                </tr>

                </tbody>

              </table>

            </div>

          </div>

        </div>

      </app-popup>

    );
  }

}
