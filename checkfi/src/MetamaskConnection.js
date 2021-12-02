import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import { ethers } from 'ethers';

import './MetamaskConnection.scss';

const MetamaskButtonAndIcon = ({props, handler}) => {
  // contains logic to render different buttons/icons depending on the state of metamask,
  // which gets passed in from the parent component via props

  // the parent component also passes in a function called 'handler' to handle metamask actions
  // such as logging in
  const [values, setValues] = useState(props);

  useEffect(() => {
    setValues(prevValues => ({ ...prevValues, installed: props.installed }));
  }, [props.installed]);

  useEffect(() => {
    setValues(prevValues => ({ ...prevValues, loggedIn: props.loggedIn }));
  }, [props.loggedIn]);

  // check on the state of the parent component in order to figure out which button/icon component
  // to render
  if (!values.installed) {
    return <Button variant="outline-info" onClick={handler}>Install Metamask</Button>
  }
  else if (values.installed && !values.loggedIn) {
    return <Button variant="outline-info" onClick={handler}>Connect Wallet</Button>
  }
  else if (values.installed && values.loggedIn) {
    // TODO: return an icon with some info about the current metamask account
    return <div></div>
  }
  else {
    return <div></div>
  }
}

function MetamaskConnection() {
  const [metaInfo, setMetaInfo] = useState({
    installed: false,
    loggedIn: false,
    provider: undefined,
  });
  const [accountInfo, setAccountInfo] = useState();

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      // get the metamask JSONRPC provider
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      setMetaInfo(prevMetaInfo => ({ ...prevMetaInfo, installed: true }));
      setMetaInfo(prevMetaInfo => ({ ...prevMetaInfo, provider: provider }));
      console.log(window.ethereum.selectedAddress);

      console.log(provider);
      // TODO: this isn't 100% accurate in determining whether a user has connected their
      //       metamask account, need to use a different method so that the connect button
      //       doesn't appear when a user has already connected their metamask
      if (window.ethereum.selectedAddress) {
        setMetaInfo(prevMetaInfo => ({ ...prevMetaInfo, loggedIn: true }));
      }
    }
  }, []);

  async function metamaskHandler() {
    if (metaInfo.installed && !metaInfo.loggedIn) {
      let accounts;
      try {
        accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      } catch(err) {
        // request can fail for several reasons, one of which is if a request for accounts is
        // already pending
        return null;
      }
      setMetaInfo(prevMetaInfo => ({ ...prevMetaInfo, loggedIn: true }));
      setAccountInfo(accounts[0]);
      return null;
    }
  }

  // if metamask extension has been installed, then show the 'Connect Wallet' button,
  // otherwise show an 'Install Metamask' button with a link to metamask.io
  return (
    <div className="metamask">
      <MetamaskButtonAndIcon props={metaInfo} handler={metamaskHandler} />
    </div>
  );
}

export default MetamaskConnection;
