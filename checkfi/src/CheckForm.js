import React, { useReducer, useRef, useState } from 'react';
import { Button, Col, FloatingLabel, Form, Row } from 'react-bootstrap';

import axios from 'axios';

import ReactChecks from './Check';

import './CheckForm.scss';

const initialState = {
  memo: '',
  recipient: '',
  writtenAmount: '',
  numberAmount: '',
  checkDate: (new Date()).toLocaleDateString(),
  signature: '',
};

function reducer(prevState, { key, value }) {
  if (key === "clear") {
    return initialState;
  }
  return {
    ...prevState,
    [key]: value,
  }
}

function CheckForm({ update }) {
  const [values, setValues] = useReducer(reducer, initialState);
  const [validated, setValidated] = useState(false);
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);

  function handleReset() {
    formRef.current.reset();
    setValidated(false);
  }

  function onChange(e) {
    setValues({key: e.target.name, value: e.target.value});
  }

  function checkForErrors() {
    const { numberAmount } = values;
    const errors = {};
    if (numberAmount === '') {
      errors.numberAmount = "Numerical amount cannot be empty";
      return errors;
    }

    // check to make sure numerical amount is a valid number
    const isNum = /^\d+(\.\d{1,2})?$/.test(numberAmount);
    if (!isNum) {
      errors.numberAmount = "Numerical amount must be an integer";
    }

    return errors;
  }

  function handleSubmit(event) {
    const form = event.currentTarget;

    // prevent the page from reloading regardless of whether form is valid or invalid
    event.preventDefault();
    event.stopPropagation();
    const validationErrors = checkForErrors();

    if (form.checkValidity() === false || Object.keys(validationErrors).length !== 0) {
      // form is invalid
      setErrors(validationErrors);
      // indicate to form that validity has been checked, Note: this doesn't indicate whether
      // a form is valid or not, just that it has been checked
      setValidated(true);
    }
    else {
      // form is valid, can sendData to server
      // clear out form errors, if any
      handleReset();
      setErrors({});

      // TODO: send ajax request with values from check
      axios.post('http://localhost:3042/write', values).then((res) => {
        const { data } = res;
        if (res.status === 200) {
          update({
            show: true,
            status: "success",
            msg: `Success! Transaction hash: ${data.transactionHash}`
          });
        }
        else {
          update({
            show: true,
            status: "failure",
            msg: `Oops, something went wrong! ${JSON.stringify(res)}`
          });
        }
        setValues({key: "clear", value: "clear"});
      });
    }
  }

  return (
    <div className='checkform__main'>
      <div className='checkform__image'>
        <ReactChecks
          memo={ values.memo }
          numberAmount={ values.numberAmount }
          writtenAmount={ values.writtenAmount }
          recipient={ values.recipient }
          checkDate={ values.checkDate }
          signature={ values.signature }
        />
      </div>
      <Form
        className="checkform__form"
        ref={formRef}
        noValidate
        validated={validated}
        onSubmit={handleSubmit}
      >
        <Row className="mb-2">
          <Form.Group as={Col} controlId="gridRecipient" className="checkform__field">
            <FloatingLabel controlId="recipient" label="Recipient">
              <Form.Control
                placeholder="Recipient"
                name="recipient"
                value={ values.recipient }
                onChange={ onChange }
                required
              />
              <Form.Control.Feedback type="invalid">
                Recipient cannot be empty
              </Form.Control.Feedback>
            </FloatingLabel>
          </Form.Group>

          <Form.Group as={Col} controlId="gridNumberAmount" className="checkform__field">
            <FloatingLabel controlId="numberAmount" label="$ Numerical Amount">
              <Form.Control
                placeholder="$ Numerical Amount"
                name="numberAmount"
                value={ values.numberAmount }
                onChange={ onChange }
                isInvalid={ !!errors.numberAmount }
                required
              />
              <Form.Control.Feedback type="invalid">
                { errors.numberAmount }
              </Form.Control.Feedback>
            </FloatingLabel>
          </Form.Group>
        </Row>

        <Row className="mb-1">
          <FloatingLabel controlId="writtenAmount" label="Written Amount" className="checkform__field">
            <Form.Control
              placeholder="Written Amount"
              name="writtenAmount"
              value={ values.writtenAmount }
              onChange={ onChange }
              required
            />
            <Form.Control.Feedback type="invalid">
              Written amount cannot be empty
            </Form.Control.Feedback>
          </FloatingLabel>
        </Row>

        <Row className="mb-2">
          <Form.Group as={Col} controlId="gridMemo" className="checkform__field">
            <FloatingLabel controlId="memo" label="Memo" className="checkform__control">
              <Form.Control
                placeholder="Memo"
                name="memo"
                value={ values.memo }
                onChange={ onChange }
                required
              />
              <Form.Control.Feedback type="invalid">
                Memo cannot be empty
              </Form.Control.Feedback>
            </FloatingLabel>
          </Form.Group>

          <Form.Group as={Col} controlId="gridSignature" className="checkform__field">
            <FloatingLabel controlId="signature" label="Signature">
              <Form.Control
                placeholder="Signature"
                name="signature"
                value={ values.signature }
                onChange={ onChange }
                required
              />
              <Form.Control.Feedback type="invalid">
                Signature cannot be empty
              </Form.Control.Feedback>
            </FloatingLabel>
          </Form.Group>
        </Row>

        <div className='checkform__button'>
          <Button variant="outline-secondary" type="submit">
            Send Check
          </Button>
        </div>

      </Form>
    </div>
  );
}

export default CheckForm;
