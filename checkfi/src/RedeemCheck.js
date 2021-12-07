import { Button, Form, FloatingLabel, Col, Row, Toast, ToastContainer } from 'react-bootstrap';
import { useState, useReducer, useRef } from 'react';

import axios from 'axios';
import { ethers } from 'ethers';

import './RedeemCheck.scss';

const initialState = {
  show: false,
  status: '', // can be either 'success' or 'failure' to indicate toast styling
  msg: '', // optional status message
}

function reducer(prevState, { key, value }) {
  if (key === "clear") {
    return initialState;
  }
  return {
    ...prevState,
    [key]: value,
  }
}

function RedeemCheck() {
  const [state, setState] = useReducer(reducer, initialState);
  const [values, setValues] = useState('');
  const [validated, setValidated] = useState(false);
  const formRef = useRef(null);

  function update(toastData) {
    console.log(toastData);
    setState({key: 'show', value: toastData.show});
    setState({key: 'status', value: toastData.status});
    setState({key: 'msg', value: toastData.msg});
  }

  function onToastClose() {
    setState({key: 'show', value: false});
  }

  function handleReset() {
    formRef.current.reset();
    setValidated(false);
  }

  function onChange(e) {
    setValues(e.target.value);
  }

  function handleSubmit(event) {
    const form = event.currentTarget;

    // prevent the page from reloading regardless of whether form is valid or invalid
    event.preventDefault();
    event.stopPropagation();

    if (form.checkValidity() === false) {
      // form is invalid
      // indicate to form that validity has been checked, Note: this doesn't indicate whether
      // a form is valid or not, just that it has been checked
      setValidated(true);
    }
    else {
      // form is valid, can sendData to server
      // clear out form errors, if any
      handleReset();

      // convert values to JSON string
      const messageString = JSON.stringify(values);

      // ethers.js approach
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      signer.signMessage(messageString).then((rawSignature) => {
        const postJson = {
          messageString,
          messageSignature: rawSignature
        };

        axios.post('http://localhost:3042/redeem', postJson).then((res) => {
          const { data } = res;
          if (res.status === 200) {
            update({
              show: true,
              status: "success",
              msg: `Success! Tx: ${data.transactionHash}, New Balance: ${ data.balance }`
            });
          }
          else {
            update({
              show: true,
              status: "failure",
              msg: `Oops, something went wrong! ${data.reason}`
            });
          }
          setValues({key: "clear", value: "clear"});
        });
      });
    }
  }

  return(
    <div className="redeemcheck">

      <div className="redeemcheck__notification">
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

      <Form
        className="redeemcheck__form"
        ref={formRef}
        noValidate
        validated={validated}
        onSubmit={handleSubmit}
      >
        <Row>

          <Col>
            <FloatingLabel controlId="checkId" label="Check ID">
              <Form.Control
                placeholder="Check ID"
                name="checkId"
                value={ values }
                onChange={ onChange }
                required
              />
              <Form.Control.Feedback type="invalid">
                Check ID cannot be empty
              </Form.Control.Feedback>
            </FloatingLabel>
          </Col>

          <Col>
            <div className="redeemcheck__button">
            <Button variant="outline-secondary" type="submit">
              Redeem Check
            </Button>
            </div>
          </Col>

        </Row>
      </Form>

    </div>
  );
}

export default RedeemCheck
