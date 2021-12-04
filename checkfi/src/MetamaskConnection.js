import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Badge, Button } from 'react-bootstrap';
import { ethers } from 'ethers';

import MetaMaskOnboarding from '@metamask/onboarding';

import './MetamaskConnection.scss';

const ONBOARD_TEXT = 'Install MetaMask';
const CONNECT_TEXT = 'Connect Wallet';

function MetamaskConnection() {
  const [buttonText, setButtonText] = useState(ONBOARD_TEXT);
  const [unlocked, setUnLocked] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [provider, setProvider] = useState();
  const onboarding = useRef();

  const isMetamaskUnlocked = useCallback(async () => {
    const isUnlocked = await window.ethereum._metamask.isUnlocked();
    setUnLocked(isUnlocked);
  }, []);

  function handleNewAccounts(newAccounts) {
    setAccounts(newAccounts);
  }

  useEffect(() => {
    if (!onboarding.current) {
      onboarding.current = new MetaMaskOnboarding();
    }
  }, []);

  useEffect(() => {
    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
      if (accounts.length > 0) {
        onboarding.current.stopOnboarding();
        // get the metamask JSONRPC provider
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(provider);
      } else {
        setButtonText(CONNECT_TEXT);
      }
    }
  }, [accounts]);

  useEffect(() => {
    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
      isMetamaskUnlocked();
      if (unlocked) {
        window.ethereum
          .request({ method: 'eth_requestAccounts' })
          .then(handleNewAccounts);
      }
    }
  }, [isMetamaskUnlocked, unlocked]);

  const onClick = () => {
    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
      window.ethereum
        .request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }],
        })
        .then((permissions) => {
          const accountsPermission = permissions.find(
            (permission) => permission.parentCapability === 'eth_accounts'
          );

          if (accountsPermission) {
            window.ethereum
              .request({ method: 'eth_requestAccounts'})
              .then((newAccounts) => {
                setAccounts(newAccounts);
                window.ethereum.on('accountsChanged', handleNewAccounts);
              });
          }
        });
    } else {
      onboarding.current.startOnboarding();
    }
  };

  if (accounts.length > 0) {
    const account = accounts[0];
    const abbreviatedAccount = `${account.substr(0,4)}...${account.substr(-4)}`
    return (
      <div className="metamask_account_container">
        <Badge pill bg="dark" text="light">{abbreviatedAccount}</Badge>
      </div>
    );
  }
  else {
    return (
      <div className="metamask_button_container">
        <Button variant="outline-info" onClick={onClick}>
          {buttonText}
        </Button>
      </div>
    );
  }
}

export default MetamaskConnection;
