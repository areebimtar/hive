import React, { Component } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment-timezone';

import { DETAIL_DATE_FORMAT } from '../../../constants/other';

class UserMainData extends Component {
  static propTypes = {
    user: PropTypes.object.isRequired
  };

  constructor(props) {
    super(props);
    // Define which properties from user to show and specify their titles
    const dateRenderer = content => moment(content).format(DETAIL_DATE_FORMAT);
    this.userProps = [
      { title: 'Id', key: 'id' },
      { title: 'Email', key: 'email' },
      { title: 'Company id', key: 'company_id' },
      { title: 'First name', key: 'first_name' },
      { title: 'Last name', key: 'last_name' },
      {
        title: 'Last login', key: 'last_login',
        renderer: dateRenderer
      },
      {
        title: 'Account created at', key: 'created_at',
        renderer: dateRenderer
      }
    ];
  }

  render() {
    const { user } = this.props;
    return (
      <div className="card">
        <div className="card-content">
          <div className="card-title detail-card-title">
            <span className="user-detail-title">{user.email}</span>
          </div>
          <ul className="collection with borderless">
            {this.userProps.map(({ title, key, renderer}) => {
              const valueElementId = `user-detail-${key}`;
              return (
                <li key={key} className="collection-item">
                  <div className="row">
                    <div className="col s4">
                      {title}
                    </div>
                    <div className="col s8" id={valueElementId}>
                      {renderer ? renderer(user[key], key) : user[key]}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }
}

export default UserMainData;
