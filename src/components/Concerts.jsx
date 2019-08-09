import React from "react";
import SpotifyPlaylistGenerator from "./SpotifyPlaylistGenerator";
import Artist from "./Artist";

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
