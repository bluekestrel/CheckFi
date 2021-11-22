import React, { useReducer } from 'react';
import { Col, FloatingLabel, Form, Row } from 'react-bootstrap';

import ReactChecks from './Check';

import './CheckForm.scss';

const initialState = {
  memo: '',
  recipient: '',
  writtenAmount: '',
  numberAmount: '',
  checkDate: (new Date()).toLocaleDateString(),
  signature: '',
}

function reducer(prevState, { key, value }) {
  return {
    ...prevState,
    [key]: value,
  }
}

function CheckForm() {
  const [values, setValues] = useReducer(reducer, initialState);

  const onChange = (e) => {
    setValues({key: e.target.name, value: e.target.value});
  };

  return (
    <div>
      <ReactChecks
        memo={ values.memo }
        numberAmount={ values.numberAmount }
        writtenAmount={ values.writtenAmount }
        recipient={ values.recipient }
        checkDate={ values.checkDate }
        signature={ values.signature }
      />
      <Form>
        <Row className="mb-2">
          <Form.Group as={Col} controlId="gridRecipient">
            <FloatingLabel controlId="recipient" label="Recipient">
              <Form.Control
                placeholder="Recipient"
                name="recipient"
                value={ values.recipient }
                onChange={ onChange }
              />
            </FloatingLabel>
          </Form.Group>

          <Form.Group as={Col} controlId="gridNumberAmount">
            <FloatingLabel controlId="numberAmount" label="$ Numerical Amount">
              <Form.Control
                placeholder="$ Numerical Amount"
                name="numberAmount"
                value={ values.numberAmount }
                onChange={ onChange }
              />
            </FloatingLabel>
          </Form.Group>
        </Row>

        <FloatingLabel controlId="writtenAmount" label="Written Amount">
          <Form.Control
            placeholder="Written Amount"
            name="writtenAmount"
            value={ values.writtenAmount }
            onChange={ onChange }
          />
        </FloatingLabel>

        <Row className="mb-2">
          <Form.Group as={Col} controlId="gridMemo">
            <FloatingLabel controlId="memo" label="Memo">
              <Form.Control
                placeholder="Memo"
                name="memo"
                value={ values.memo }
                onChange={ onChange }
              />
            </FloatingLabel>
          </Form.Group>

          <Form.Group as={Col} controlId="gridSignature">
            <FloatingLabel controlId="signature" label="Signature">
              <Form.Control
                placeholder="Signature"
                name="signature"
                value={ values.signature }
                onChange={ onChange }
              />
            </FloatingLabel>
          </Form.Group>
        </Row>
      </Form>
    </div>
  );
}

export default CheckForm;
