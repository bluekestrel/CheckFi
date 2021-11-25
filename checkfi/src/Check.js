import React, { useState, useEffect } from 'react';

import './Check.scss';
/*
const [values, setValues] = useState[{
    focused: false,
    memo: '',
    recipient: '',
    writtenAmount: '',
    numberAmount: '',
    checkDate: '',
    signature: '',
  }];
*/

function ReactChecks(props) {
  const [values, setValues] = useState(props);

  useEffect(() => {
    setValues(prevValues => ({ ...prevValues, checkDate: props.checkDate }));
  }, [props.checkDate]);

  useEffect(() => {
    setValues(prevValues => ({ ...prevValues, recipient: props.recipient }));
  }, [props.recipient]);

  useEffect(() => {
    setValues(prevValues => ({ ...prevValues, numberAmount: props.numberAmount }));
  }, [props.numberAmount]);

  useEffect(() => {
    setValues(prevValues => ({ ...prevValues, writtenAmount: props.writtenAmount }));
  }, [props.writtenAmount]);

  useEffect(() => {
    setValues(prevValues => ({ ...prevValues, memo: props.memo }));
  }, [props.memo]);

  useEffect(() => {
    setValues(prevValues => ({ ...prevValues, signature: props.signature }));
  }, [props.signature]);

  /* May need this number html for check amount later
    <div
    className={[
      'rcs__number',
      number.replace(/ /g, '').length > 16 ? 'rcs__number--large' : '',
      focused === 'number' ? 'rcs--focused' : '',
      number.substr(0, 1) !== '•' ? 'rcs--filled' : '',
    ].join(' ').trim()}
  >
    {number}
  </div>
   */

  /* This component shows how to layer words on top of components
  <div
  className={[
    'rcs__expiry',
    focused === 'expiry' ? 'rcs--focused' : '',
    expiry.substr(0, 1) !== '•' ? 'rcs--filled' : '',
  ].join(' ').trim()}
  >
    <div className="rcs__expiry__valid">{locale.valid}</div>
    <div className="rcs__expiry__value">{expiry}</div>
  </div>
   */

  return (
    <div key="Checks" className="rcs">
      <div
        className={[
          'rcs__check',
        ].join(' ').trim()}
      >
        <div className="rcs__check--front">
          <div className="rcs__check__background" />
          <div className="rcs__issuer" />
          <div
            className={[
              'rcs__date',
              values.checkDate.substr(0, 1) !== 'M' ? 'rcs--filled' : '',
            ].join(' ').trim()}
          >
            {values.checkDate}
          </div>
          <div
            className={[
              'rcs__recipient',
            ].join(' ').trim()}
          >
            {values.recipient}
          </div>
          <div
            className={[
              'rcs__written_amount',
            ].join(' ').trim()}
          >
            {values.writtenAmount}
          </div>
          <div
            className={[
              'rcs__number_amount',
            ].join(' ').trim()}
          >
            ${values.numberAmount}
          </div>
          <div
            className={[
              'rcs__memo',
            ].join(' ').trim()}
          >
            {values.memo}
          </div>
          <div
            className={[
              'rcs__signature',
            ].join(' ').trim()}
          >
            {values.signature}
          </div>
        </div>
        <div className="rcs__check--back">
          <div className="rcs__check__background" />
        </div>
      </div>
    </div>
  );
}

export default ReactChecks;
