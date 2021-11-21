import React from 'react';

import ReactChecks from './Check';

function Home() {
  return (
    <div>
      <ReactChecks
        focused=''
        memo='For Testing'
        numberAmount='50.00'
        writtenAmount='Fifty Dollars and 00/100'
        recipient='Test'
        checkDate='10/10/2021'
        signature='Test Person'
      />
    </div>
  );
}

export default Home;
