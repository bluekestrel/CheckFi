import React, { useReducer } from 'react';
import { Button, Col, FloatingLabel, Form, Row } from 'react-bootstrap';

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

function CheckForm({ update }) {
  const [values, setValues] = useReducer(reducer, initialState);

  const onChange = (e) => {
    setValues({key: e.target.name, value: e.target.value});
  };

  async function sendData() {
    console.log(values);
    // TODO: send ajax request with values from check
    update({ show: true, status: "success", msg: "Success!"});
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
      <Form as={Col} className='checkform__form'>
        <Row className="mb-2">
          <Form.Group as={Col} controlId="gridRecipient" className="checkform__field">
            <FloatingLabel controlId="recipient" label="Recipient">
              <Form.Control
                placeholder="Recipient"
                name="recipient"
                value={ values.recipient }
                onChange={ onChange }
              />
            </FloatingLabel>
          </Form.Group>

          <Form.Group as={Col} controlId="gridNumberAmount" className="checkform__field">
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

        <Row className="mb-1">
          <FloatingLabel controlId="writtenAmount" label="Written Amount" className="checkform__field">
            <Form.Control
              placeholder="Written Amount"
              name="writtenAmount"
              value={ values.writtenAmount }
              onChange={ onChange }
            />
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
              />
            </FloatingLabel>
          </Form.Group>

          <Form.Group as={Col} controlId="gridSignature" className="checkform__field">
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

        <div className='checkform__button'>
          <Button variant="outline-secondary" onClick={() => sendData()}>
            Send Check
          </Button>
        </div>

      </Form>
    </div>
  );
}

export default CheckForm;
