import React from 'react';
import ReactDOM from 'react-dom';
import { createStore } from 'redux';
import { createEffectCapableStore } from 'redux-side-effects';

import masterReducer from './reducers/masterReducer';
import initialState from './initialState';

import Application from './components/Application';


const storeFactory = createEffectCapableStore(createStore);
const store = storeFactory(masterReducer, initialState);

ReactDOM.render(<Application store={store} />, document.getElementById('app'));
