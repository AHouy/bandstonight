import React from "react";
import LazyLoad from "react-lazy-load";

export default class Artist extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      include: true
    };
    this.handleButtonClick = this.handleButtonClick.bind(this);
  }

  handleButtonClick() {
    this.setState(state => ({ include: !state.include }));
  }

  render() {
    if (this.props.artist.spotify)
      return (
        <div className="row">
          <div className="col-md-8">
            <div
              className={
                this.state.include ? "media mt-3 artist" : "media mt-3"
              }
              dataSpotifyId={this.props.artist.spotifyId}
            >
              <LazyLoad>
                <img
                  className="mr-3"
                  src={this.props.artist.image}
                  alt={this.props.artist.name}
                  width="100px"
                />
              </LazyLoad>
              <div className="media-body">
                <h5 className="mt-0">
                  <a href={this.props.artist.url} target="_blank">
                    {this.props.artist.name}
                  </a>
                </h5>
                <p className="text-muted">
                  <b>{this.props.artist.genres.join(", ")}</b>
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 align-self-center col-md-4">
            <button
              type="button"
              className={
                this.state.include
                  ? "btn btn-danger btn-block"
                  : "btn btn-success btn-block"
              }
              onClick={this.handleButtonClick}
            >
              {this.state.include ? "Remove from Playlist" : "Add to Playlist"}
            </button>
          </div>
        </div>
      );
    else
      return (
        <div className="media mt-3">
          <img
            className="mr-3"
            src="https://via.placeholder.com/100"
            alt={this.props.artist.name}
            width="100px"
          />
          <div className="media-body">
            <h5 className="mt-0">
              {this.props.artist.name} -{" "}
              <span className="text-danger">Could not find on Spotify</span>
            </h5>
          </div>
        </div>
      );
  }
}
