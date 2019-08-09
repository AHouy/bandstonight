import React from "react";
import { Route, Switch } from "react-router-dom";
import { Home, User } from "./components";

export default function Main() {
  return (
    <div className="container">
      <Switch>
        <Route path="/" exact component={Home} />
        <Route path="/user/" component={User} />
        {/* <Route path="/about/" component={About} /> */}
      </Switch>
    </div>
  );
}
