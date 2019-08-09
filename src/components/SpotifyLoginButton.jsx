import React from "react";
import { stateKey, generateRandomString, basicPopup } from "./helpers";

export default class SpotifyLoginButton extends React.Component {
  constructor(props) {
    super(props);

    this.handleLoginClick = this.handleLoginClick.bind(this);
  }

  handleLoginClick() {
    var redirect_uri = `${window.location.origin}/callback/`; // Your redirect uri
    var state = generateRandomString(16);
    localStorage.setItem(stateKey, state);
    var scope =
      "playlist-modify-private playlist-modify-public playlist-read-private playlist-read-collaborative user-library-read user-library-modify";
    var url = "https://accounts.spotify.com/authorize";
    url += "?response_type=token";
    url +=
      "&client_id=" +
      encodeURIComponent(process.env.REACT_APP_ENV_SPOTIFY_CLIENT_ID);
    url += "&scope=" + encodeURIComponent(scope);
    url += "&redirect_uri=" + encodeURIComponent(redirect_uri);
    url += "&state=" + encodeURIComponent(state);
    window.open = basicPopup(url);
  }

  render() {
    return (
      <div id="login" className="text-center">
        <button
          id="login-button"
          className="btn btn-success btn-lg"
          onClick={this.handleLoginClick}
        >
          Log in with Spotify
        </button>
      </div>
    );
  }
}
