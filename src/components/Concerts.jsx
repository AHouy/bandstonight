import React from "react";
import LazyLoad from "react-lazy-load";
import SpotifyPlaylistGenerator from "./SpotifyPlaylistGenerator";

export default class Concerts extends React.Component {
  constructor(props) {
    super(props);

    this.state = { data: [], isLoading: false };
  }

  async fetchConcert(endpt) {
    if (this.props.city) {
      this.setState({ isLoading: true });
      if (!endpt)
        endpt = `/bandstonight?location=${this.props.city}&date=${
          this.props.date
        }`;
      const data = await fetch(endpt)
        .then(res => {
          if (res.url.includes(endpt)) return res.json();
          else throw Error;
        })
        .catch(error => {
          console.log(error);
        });
      if (data) {
        this.setState(state => {
          return {
            data: state.data.concat(
              data.results.sort((a, b) => {
                let x = a.event.start.time;
                let y = b.event.start.time;
                if (x < y) {
                  return -1;
                }
                if (x > y) {
                  return 1;
                }
                return 0;
              })
            )
          };
        });
        if (data.next) this.fetchConcert(data.next);
        else this.setState({ isLoading: false });
      }
    }
  }

  componentDidMount() {
    this.fetchConcert();
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.city !== prevProps.city ||
      this.props.date !== prevProps.date
    ) {
      //   if (this.state.isLoading) this.controller.abort();
      this.setState({ data: [] });
      this.fetchConcert();
    }
  }

  render() {
    // Initialize loader
    let loader;
    if (this.state.isLoading)
      loader = (
        <div className="mt-2 mb-2">
          <h4 className="text-muted text-center">
            Getting {this.state.data.length > 0 ? "more of " : ""}tonight's
            concerts and bands...
          </h4>
          <div className="loader mx-auto" />
        </div>
      );

    let stateOrCountry, location;
    if (this.state.data.length > 0) {
      // Indicates that there should be concerts generated
      stateOrCountry =
        this.state.data[0].event.venue.metroArea.state ||
        this.state.data[0].event.venue.metroArea.country;
      location =
        this.state.data[0].event.venue.metroArea.displayName +
        ", " +
        stateOrCountry.displayName;
    } else if (this.props.city !== "" && !this.state.isLoading) {
      // No concerts found, city selected, and already finished fetching
      return (
        <p className="text-muted text-center">
          No concerts found in this city.
        </p>
      );
    } else if (!this.props.city)
      // Haven't searched yet
      return <p className="text-muted text-center">Search for a city.</p>;

    // Concerts found!
    return (
      <React.Fragment>
        {loader
          ? loader
          : this.state.data.length > 0 && (
              <SpotifyPlaylistGenerator
                user={this.props.user}
                location={location}
                date={
                  this.state.data.length !== 0
                    ? this.state.data[0].event.start.date
                    : ""
                }
              />
            )}
        {this.state.data.map(data => (
          <ConcertInfo artists={data.artists} event={data.event} />
        ))}
      </React.Fragment>
    );
  }
}

function ConcertInfo(props) {
  return (
    <ul className="list-unstyled" style={{ width: "100%" }}>
      <li className="media">
        <div className="media-body">
          <h5 className="mt-3">
            <a href={props.event.uri} target="_blank">
              {props.event.displayName}
              {props.event.start.time ? " @ " + props.event.start.time : ""}
            </a>
          </h5>
          <div>
            <EventInfo event={props.event} />
            {props.artists.map(artist => (
              <Artist artist={artist} key={artist.id} />
            ))}
          </div>
        </div>
      </li>
    </ul>
  );
}

function EventInfo(props) {
  let venue = props.event.venue;
  return (
    <div>
      <p>
        Venue:{" "}
        <a href={venue.uri} target="_blank">
          {venue.displayName}
        </a>
      </p>
      {venue.lat && (
        <p>
          Venue Location:{" "}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${
              venue.lat
            },${venue.lng}`}
            target="_blank"
          >
            Google Maps
          </a>
        </p>
      )}
      <p>
        Age restrictions:{" "}
        {props.event.ageRestriction
          ? props.event.ageRestriction
          : "No age restrictions"}
      </p>
      <p>
        {props.event.start &&
          props.event.start.datetime &&
          "Starts at: " + new Date(props.event.start.datetime).toLocaleString()}
      </p>
      <p>
        {props.event.end &&
          props.event.end.datetime &&
          "End: " + new Date(props.event.end.datetime).toLocaleString()}
      </p>
    </div>
  );
}

class Artist extends React.Component {
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
              dataSpotifyId={this.props.artist.id}
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
                  <a
                    href={this.props.artist.external_urls.spotify}
                    target="_blank"
                  >
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
