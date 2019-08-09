import React from "react";
import { Home, User, SpotifyUserContext } from "./components";

function App() {
  console.log(process.env);
  return (
    <div>
      <div className="jumbotron">
        <div className="container text-center">
          <h1>Bands Tonight</h1>
          <h4 className="text-muted">
            Creating a Spotify playlist of the bands that are playing shows
            tonight!
          </h4>
          <p style={{ fontSize: "100px" }}>
            <a href="https://www.instagram.com/steeze_nasty/" target="_blank">
              <i className="fa fa-instagram mr-3" />
            </a>
            <a href="https://github.com/AHouy/bandstonight" target="_blank">
              <i className="fa fa-github" />
            </a>
          </p>
          {/* <div class="alert alert-warning" role="alert">
            Some concerts may not be listed or some information might not be
            correct.
          </div> */}
        </div>
      </div>
      {/* <SpotifyUserContext.Provider> */}
      <div className="container">
        <Home />
      </div>
      {/* </SpotifyUserContext.Provider> */}
    </div>
  );
}

export default App;
