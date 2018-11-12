import React from 'react';
import classNames from 'classnames';

import UserMenu from './UserMenu';

import JsonRpc from '../../utils/JsonRpc';
import '../../cisco.svg';


function Header({ user, version, title, hasWriteTransaction }) {
  console.debug('NSO Header Render');
  return (
    <div className="nso-header">
      <div className="nso-header__inner">
        <a href="/webui-one/" className="nso-header__link">
          <img
            src="cisco.svg"
            className="nso-header__cisco-logo"
            alt="Cisco"
          />
        </a>
        <div className="nso-header__left">
          <div className="nso-header__title">{title}</div>
          <div className="nso-header__version">VERSION: {version}</div>
        </div>
        <div className="nso-header__right">
          <div className="nso-header__item">
          <button onClick={JsonRpc.revert} className={classNames('nso-btn', {
            'nso-btn--disabled': !hasWriteTransaction
          })}>Revert</button>
          </div>
          <div className="nso-header__item">
          <button onClick={JsonRpc.apply} className={classNames('nso-btn', {
              'nso-btn--disabled': !hasWriteTransaction
          })}>Commit</button>
          </div>
          <div className="nso-header__item">
            <UserMenu user={user}/>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Header;
