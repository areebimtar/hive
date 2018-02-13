import React from 'react';
import ReactDOM from 'react-dom';
import { createStore } from 'redux';
import { createEffectCapableStore } from 'redux-side-effects';

import masterReducer from './reducers/masterReducer';
import initialState from './initialState';

import Application from './Application';

function createStoreWithDevtools(reducer, preloadedState) {
  const devtools = window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__();
  return createStore(reducer, preloadedState, devtools);
}

const createStoreFunc = process.env.NODE_ENV === 'development'
  ? createStoreWithDevtools : createStore;
const storeFactory = createEffectCapableStore(createStoreFunc);
const store = storeFactory(masterReducer, initialState);

ReactDOM.render(<Application store={store} />, document.getElementById('app'));
