import React, { useEffect, useState } from 'react';
import { Table } from 'react-bootstrap';

import axios from 'axios';
import { ethers } from 'ethers';

import './ViewChecks.scss';

const receivedCheckHeader = {
  id: "",
  recipient: "",
  amount: "",
  redeemed: "",
};

const writtenCheckHeader = {
  id: "",
  recipient: "",
  amount: "",
};

const TableHeader = (props) => {
  const { headers } = props;
  return (
    <thead className="thead-dark" key="header-1">
        <tr key="header-0">
          { headers.length > 0 && headers.map((value, index) => {
              return <th key={index}><div>{value}</div></th>
          })}
        </tr>
    </thead>
  );
}

const TableBody = (props) => {
  const { headers, rows } = props;

  function buildRow(row, rindex, headers) {
    return (
         <tr key={rindex}>
         { headers.map((value, index) => {
            console.log(row);
             return <td key={index}>{row[value]}</td>
          })}
         </tr>
     )
  };

  return (
      <tbody>
        { rows.length > 0 && rows.map((value, index) => {
                return buildRow(value, index, headers);
            })}
      </tbody>
  );
}

const TableComponent = (props) => {
  const { headers, rows } = props;
  return (
    <Table>
      <TableHeader headers={headers}></TableHeader>
      <TableBody headers={headers} rows={rows}></TableBody>
    </Table>
  );
}

function ViewChecks() {
  const [writtenChecks, setWrittenChecks] = useState([]);
  const [receivedChecks, setReceivedChecks] = useState([]);

  function formatCheckInfo(checkInfo, type) {
    const checks = [];
    Object.keys(checkInfo).forEach((checkId) => {
      if (type === "written") {
        const info = checkInfo[checkId];
        console.log(info);
        checks.push({
          id: checkId,
          recipient: info.toAccount,
          amount: info.amount,
        });
      }
      else {
        const info = checkInfo[checkId];
        checks.push({
          id: checkId,
          recipient: info.toAccount,
          amount: info.amount,
          redeemed: "",
        });
      }
    });

    return checks;
  }

  useEffect(() => {
    // get a signature from the user, then query the backend for data
    // convert values to JSON string
    const messageString = "View check";

    // ethers.js approach
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    signer.signMessage(messageString).then((rawSignature) => {
      const postJson = {
        messageString,
        messageSignature: rawSignature
      };

      axios.post('http://localhost:3042/checks', postJson).then((res) => {
        const { data } = res;
        if (res.status === 200) {
          // sort the data into writer and recipient, then save to checkData
          const checksWritten = formatCheckInfo(data.checksWritten, "written");
          const checksReceived = formatCheckInfo(data.checksReceived, "redeemed");
          setWrittenChecks(checksWritten);
          setReceivedChecks(checksReceived);
        }
      });
    });
  }, []);

  return (
    <div className="checktable" >
      <h2 className="checktable_tableheader">Written Checks </h2>
      <TableComponent headers={Object.keys(writtenCheckHeader)} rows={writtenChecks} />
      <h2 className="checktable_tableheader">Received Checks </h2>
      <TableComponent headers={Object.keys(receivedCheckHeader)} rows={receivedChecks} />
    </div>
  );
}

export default ViewChecks;
