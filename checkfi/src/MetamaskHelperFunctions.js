// Helper functions for actions involving metamask
async function signTransaction(accounts, message) {
  let result;
  let resultData;
  try {
    const msgParams = [
      {
        type: "string",
        name: "Action",
        value: message.action,
      },
      {
        type: "string",
        name: "Data",
        value: message.data,
      },
    ];
    resultData = await window.ethereum.request({
      method: 'eth_signTypedData',
      params: [msgParams, accounts[0]],
    })
    result = "success";
  } catch (error) {
    console.log(error);
    result = "failure";
  }

  return { result, resultData };
}

export async function verify(action, data) {
  // first get the account info
  let accounts;
  try {
    accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });
  } catch (error) {
    console.error(error);
    return { result: "failure", msg: "Request account info from metamask failed"}
  }

  // now request for the user to sign a message depending on the action
  let signatureResult;
  let dataToSign;
  switch (action) {
    case "write":
      dataToSign = {
        action: "write_check",
        data: JSON.stringify(data),
      };
      signatureResult = await signTransaction(accounts, dataToSign);
      break;
    case "redeem":
      dataToSign = {
        action: "redeem_check",
        data: JSON.stringify(data),
      };
      signatureResult = await signTransaction(accounts, dataToSign);
      break;
    case "view":
      dataToSign = {
        action: "view_checks",
        data: JSON.stringify(data),
      }
      signatureResult = await signTransaction(accounts, dataToSign);
      break;
    default:
      return { result: "failure", msg: "Requested action not recognized"}
  }

  return {
    result: signatureResult.result,
    data: signatureResult.resultData,
  };
}
