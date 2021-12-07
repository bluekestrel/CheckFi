import React, { useReducer } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';

import CheckForm from './CheckForm';

import './WriteCheck.scss';

const initialState = {
  show: false,
  status: '', // can be either 'success' or 'failure' to indicate toast styling
  msg: '', // optional status message
}

function reducer(prevState, { key, value }) {
  return {
    ...prevState,
    [key]: value,
  }
}

function WriteCheck() {
  const [state, setState] = useReducer(reducer, initialState);

  function update(toastData) {
    console.log(toastData);
    setState({key: 'show', value: toastData.show});
    setState({key: 'status', value: toastData.status});
    setState({key: 'msg', value: toastData.msg});
  }

  function onToastClose() {
    setState({key: 'show', value: false});
  }

  return(
    <div className="writecheck">

      <div className="writecheck__notification">
        <ToastContainer position="top-end" className="p-3">
          <Toast onClose={onToastClose} show={state.show} delay={8000} autohide>
            <Toast.Header>
              <strong className="me-auto">CheckFi</strong>
              <small>Just Now</small>
            </Toast.Header>
            <Toast.Body>{state.msg}</Toast.Body>
          </Toast>
        </ToastContainer>
      </div>

      <CheckForm update={update} />
    </div>
  );
}

export default WriteCheck;