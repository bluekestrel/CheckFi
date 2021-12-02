import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Home from "./Home";
import Navigation from "./Navigation";
import WriteCheck from './WriteCheck';

function App() {
  return (
    <BrowserRouter>
      <Navigation />
      <Routes>
        <Route path="/" exact element={<Home />} />
        <Route path="/write_check" exact element={<WriteCheck />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
