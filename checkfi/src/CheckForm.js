import React, { useReducer, useRef, useState } from 'react';
import { Button, Col, FloatingLabel, Form, Row } from 'react-bootstrap';

import axios from 'axios';
import { ethers } from 'ethers';
import html2canvas from 'html2canvas';

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
  const checkRef = useRef();

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

  async function handleSubmit(event) {
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

      const canvas = await html2canvas(checkRef.current);

      // wrapper to make async usage of toBlob cleaner
      // ref: https://github.com/jbccollins/async-canvas-to-blob/blob/master/index.js
      function getBlob(myCanvas) {
        return new Promise(function(resolve) {
          myCanvas.toBlob(resolve);
        });
      }

      const blob = await getBlob(canvas);
      const arrayBuffer = await blob.arrayBuffer();
      // encoding arrayBuffer as base64 String
      // ref: https://stackoverflow.com/questions/9267899/arraybuffer-to-base64-encoded-string
      const imageBase64 = btoa(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer)));

      // add to values
      values.imageBase64 = imageBase64;

      // convert values to JSON string
      const messageString = JSON.stringify(values);

      // ethers.js approach
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      const rawSignature = await signer.signMessage(messageString);
      const postJson = {
        messageString,
        messageSignature: rawSignature,
      };

      const res = await axios.post('http://localhost:3042/write', postJson);
      const { data } = res;
      if (res.status === 200) {
        update({
          show: true,
          status: "success",
          msg: `Success! Tx: ${data.transactionHash}, Check Number: ${data.checkNumber}`
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
    }
  }

  return (
    <div className='checkform__main'>
      <div ref={checkRef} className='checkform__image'>
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
