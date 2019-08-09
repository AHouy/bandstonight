import React from "react";

export default class SpotifyPlaylistGenerator extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      spotifyUser: {
        accessToken: localStorage.getItem("spotify_access_token"),
        authState: localStorage.getItem("spotify_auth_state")
      },
      playlist: null,
      isLoading: false
    };
    this.handleButtonClick = this.handleButtonClick.bind(this);
  }

  componentDidMount() {
    console.log(this.props.user);
  }

  handleButtonClick() {
    this.setState({ isLoading: true });
    // Get each artist's spotify id
    let artistSpotifyIds = [];

    let artists = document.getElementsByClassName("artist");
    for (let artist of artists) {
      let spotifyId = artist.attributes.dataspotifyid.value;
      artistSpotifyIds.push(spotifyId);
    }

    // Generate the playlist
    fetch("/playlist", {
      method: "post",
      body: JSON.stringify({
        accessToken: this.state.spotifyUser.accessToken,
        userId: this.props.user.id,
        location: this.props.location,
        date: this.props.date,
        artistSpotifyIds: artistSpotifyIds
      })
    })
      .then(res => res.json())
      .then(data => this.setState({ playlist: data.id, isLoading: false }));
  }

  render() {
    let button = (
      <button
        type="button"
        onClick={this.handleButtonClick}
        className="btn btn-secondary btn-lg btn-block"
      >
        Generate {this.state.playlist ? "another " : ""}Playlist!
      </button>
    );
    if (this.state.isLoading)
      return (
        <div className="mt-2 mb-2">
          <h4 className="text-muted text-center">
            Generating {this.state.playlist ? "another " : ""}playlist...
          </h4>
          <div className="loader mx-auto" />
        </div>
      );
    if (this.state.playlist)
      return (
        <React.Fragment>
          {button}
          <div className="mx-auto mt-2 mb-2" style={{ width: "300px" }}>
            <iframe
              src={`https://open.spotify.com/embed/playlist/${
                this.state.playlist
              }`}
              width="300"
              height="380"
              frameborder="0"
              allowtransparency="true"
              allow="encrypted-media"
            />
          </div>
        </React.Fragment>
      );
    return button;
  }
}
