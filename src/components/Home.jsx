import React from "react";
import { Redirect } from "react-router-dom";
import { User } from ".";
import SpotifyLoginButton from "./SpotifyLoginButton";

export default class Home extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      spotifyUser: {
        accessToken: localStorage.getItem("spotify_access_token"),
        authState: localStorage.getItem("spotify_auth_state")
      }
    };
  }

  render() {
    if (this.state.spotifyUser.accessToken) return <User />;
    else return <SpotifyLoginButton />;
  }
}
