import './Check.scss';
import React from 'react';
import PropTypes from 'prop-types';

class ReactChecks extends React.Component {
  static propTypes = {
    focused: PropTypes.string,
    memo: PropTypes.string.isRequired,
    recipient: PropTypes.string.isRequired,
    writtenAmount: PropTypes.string.isRequired,
    numberAmount: PropTypes.string.isRequired,
    checkDate: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
    ]),
    signature: PropTypes.string.isRequired,
  };

  get checkDate() {
    const { checkDate = '' } = this.props;
    const date = typeof checkDate === 'number' ? checkDate.toString() : checkDate;
    let month = '';
    let day = '';
    let year = '';

    if (date.includes('/')) {
      [month, day, year] = date.split('/');
    }
    else if (date.length) {
      month = date.substr(0, 2);
      day = date.substr(2, 4);
      year = date.substr(4, 8);
    }

    while (month.length < 2) {
      month += 'M';
    }

    while (day.length < 2) {
      day += 'D'
    }

    while (year.length < 4) {
      year += 'Y';
    }

    return `${month}/${day}/${year}`;
  }

  get recipient() {
    const { recipient } = this.props;
    return recipient ? recipient : 'RECIPIENT';
  }

  get writtenAmount() {
    const { writtenAmount } = this.props;
    return writtenAmount ? writtenAmount : 'WRITTEN AMOUNT'
  }

  get numberAmount() {
    const { numberAmount } = this.props;
    console.log(numberAmount);
    return numberAmount ? `$ ${numberAmount}` : '$ AMOUNT'
  }

  get memo() {
    const { memo } = this.props;
    return memo ? memo : 'MEMO';
  }

  get signature() {
    const { signature } = this.props;
    return signature ? signature : '';
  }

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

  render() {
    const { focused } = this.props;
    const { checkDate, recipient, writtenAmount, numberAmount, memo, signature } = this;

    return (
      <div key="Checks" className="rcs">
        <div
          className={[
            'rcs__check',
            `rcs__check--${this.issuer}`,
          ].join(' ').trim()}
        >
          <div className="rcs__check--front">
            <div className="rcs__check__background" />
            <div className="rcs__issuer" />
            <div
              className={[
                'rcs__date',
                focused === 'checkDate' ? 'rcs--focused' : '',
                checkDate.substr(0, 1) !== 'M' ? 'rcs--filled' : '',
              ].join(' ').trim()}
            >
              {checkDate}
            </div>
            <div
              className={[
                'rcs__recipient',
                focused === 'recipient' ? 'rcs--focused' : '',
              ].join(' ').trim()}
            >
              {recipient}
            </div>
            <div
              className={[
                'rcs__written_amount',
                focused === 'writtenAmount' ? 'rcs--focused' : '',
              ].join(' ').trim()}
            >
              {writtenAmount}
            </div>
            <div
              className={[
                'rcs__number_amount',
                focused === 'numberAmount' ? 'rcs--focused' : '',
              ].join(' ').trim()}
            >
              {numberAmount}
            </div>
            <div
              className={[
                'rcs__memo',
                focused === 'memo' ? 'rcs--focused' : '',
                memo ? 'rcs--filled' : '',
              ].join(' ').trim()}
            >
              {memo}
            </div>
            <div
              className={[
                'rcs__signature',
                focused === 'signature' ? 'rcs--focused' : '',
              ].join(' ').trim()}
            >
              {signature}
            </div>
          </div>
          <div className="rcs__check--back">
            <div className="rcs__check__background" />
          </div>
        </div>
      </div>
    );
  }
}

export default ReactChecks;
