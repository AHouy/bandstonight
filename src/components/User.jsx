import React from "react";
import DatePicker from "react-datepicker";
import Concerts from "./Concerts";

import "react-datepicker/dist/react-datepicker.css";

export default class User extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoaded: false,
      spotifyUser: {
        accessToken: localStorage.getItem("spotify_access_token"),
        authState: localStorage.getItem("spotify_auth_state")
      },
      user: { images: [{ url: null }] },
      location: "",
      locations: [],
      city: "",
      date: new Date()
    };
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  componentDidMount() {
    this.fetchUser();
    this.fetchLocation();
  }

  handleSubmit(event) {
    this.fetchLocation();
    event.preventDefault();
  }

  async fetchUser() {
    const data = await fetch("https://api.spotify.com/v1/me/", {
      headers: {
        Authorization: `Bearer ${this.state.spotifyUser.accessToken}`
      }
    }).then(res => res.json());
    if (data.error) {
      localStorage.removeItem("spotify_access_token");
      window.location.href = "/";
    }
    this.setState({ isLoaded: true, user: data });
    console.log(data);
  }

  async fetchLocation() {
    const data = await fetch(
      `/location?q=${this.state.location.toLowerCase()}`
    ).then(res => res.json());
    this.setState(state => {
      let result = { locations: data };
      if (data.length > 0) result.city = data[0].metroArea.id;
      else result.city = "";
      return result;
    });
  }

  renderLocationSearch() {
    return (
      <form>
        <div className="input-group mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="City"
            value={this.state.location}
            onChange={event => this.setState({ location: event.target.value })}
          />
          <div className="input-group-append">
            <button
              className="btn btn-dark"
              type="submit"
              onClick={this.handleSubmit}
              style={{ zIndex: 1 }}
            >
              Search for City
            </button>
          </div>
        </div>
      </form>
    );
  }

  renderLocations() {
    if (this.state.locations.length > 0)
      return (
        <select
          className="form-control"
          value={this.state.city}
          onChange={event => this.setState({ city: event.target.value })}
        >
          {this.state.locations.map(location => {
            let metroArea = location.metroArea;
            let display;
            if (metroArea.state)
              display = `${metroArea.displayName}, ${
                metroArea.state.displayName
              }, ${metroArea.country.displayName}`;
            else
              display = `${metroArea.displayName}, ${
                metroArea.country.displayName
              }`;
            return <option value={location.metroArea.id}>{display}</option>;
          })}
        </select>
      );
    else
      return (
        <select className="form-control" value={0}>
          <option value={0}>No locations found.</option>
        </select>
      );
  }

  renderDatePicker() {
    return (
      <div class="form-group">
        <DatePicker
          className="form-control"
          selected={this.state.date}
          placeholderText="Select a date"
          onChange={date => this.setState({ date: date })}
          popperPlacement="top-end"
        />
      </div>
    );
  }

  render() {
    if (this.state.isLoaded)
      return (
        <React.Fragment>
          <UserDisplay user={this.state.user} />
          <div className="row mt-3 mb-3">
            <div className="col-lg-8">
              <div className="row mb-3">
                <div className="col-md-6">{this.renderLocationSearch()}</div>
                <div className="col-md-6">{this.renderLocations()}</div>
              </div>
            </div>
            <div className="col-lg-4">{this.renderDatePicker()}</div>
          </div>
          <Concerts
            city={this.state.city}
            user={this.state.user}
            date={this.state.date.toISOString().split("T")[0]}
          />
        </React.Fragment>
      );
    else return <div className="loader mx-auto" />;
  }
}

function UserDisplay(props) {
  return (
    <div id="loggedin">
      <div id="user-profile">
        <div className="media">
          <img
            className="mr-3"
            width="150"
            src={props.user.images.length > 0 ? props.user.images[0].url : ""}
          />
          <div className="media-body">
            <h5 className="mt-0">Logged in as {props.user.display_name}</h5>
          </div>
        </div>
      </div>
    </div>
  );
}
