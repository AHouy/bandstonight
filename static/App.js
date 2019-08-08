const Router = window.ReactRouterDOM.BrowserRouter;
const Route = window.ReactRouterDOM.Route;
const Link = window.ReactRouterDOM.Link;
const Prompt = window.ReactRouterDOM.Prompt;
const Switch = window.ReactRouterDOM.Switch;
const Redirect = window.ReactRouterDOM.Redirect;

const spotifyUser = {
  accessToken: localStorage.getItem("spotify_access_token"),
  authState: localStorage.getItem("spotify_auth_state")
};

window.addEventListener(
  "storage",
  e => (window.location.href = window.location.href)
);

class App extends React.Component {
  render() {
    return (
      <Router>
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
          </div>
        </div>
        <div className="container">
          {/* <Link to="/">HOME</Link> */}
          <Switch>
            <Route path="/" exact component={Home} />
            <Route path="/user/" component={User} />
            {/* <Route path="/about/" component={About} /> */}
          </Switch>
        </div>
      </Router>
    );
  }
}

class Home extends React.Component {
  constructor(props) {
    super(props);

    this.handleLoginClick = this.handleLoginClick.bind(this);
    this.state = {
      spotifyUser: spotifyUser
    };
  }

  handleLoginClick() {
    var redirect_uri = `${window.location.origin}/callback/`; // Your redirect uri
    var state = generateRandomString(16);
    localStorage.setItem(stateKey, state);
    var scope =
      "playlist-modify-private playlist-modify-public playlist-read-private playlist-read-collaborative user-library-read user-library-modify";
    var url = "https://accounts.spotify.com/authorize";
    url += "?response_type=token";
    url += "&client_id=" + encodeURIComponent(SPOTIFY_CLIENT_ID);
    url += "&scope=" + encodeURIComponent(scope);
    url += "&redirect_uri=" + encodeURIComponent(redirect_uri);
    url += "&state=" + encodeURIComponent(state);
    window.open = basicPopup(url);
  }

  render() {
    if (this.state.spotifyUser.accessToken) return <Redirect to="/user/" />;
    else
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

class User extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoaded: false,
      spotifyUser: spotifyUser,
      user: { images: [{ url: null }] },
      // songkickData: null,
      location: "",
      locations: [],
      city: ""
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

  renderUser() {
    return (
      <div className="media">
        <img
          className="mr-3"
          width="150"
          src={
            this.state.user.images.length > 0
              ? this.state.user.images[0].url
              : ""
          }
        />
        <div className="media-body">
          <h5 className="mt-0">Logged in as {this.state.user.display_name}</h5>
        </div>
      </div>
    );
  }

  renderLocationSearch() {
    return (
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
            type="button"
            onClick={this.handleSubmit}
          >
            Search
          </button>
        </div>
      </div>
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
  }

  render() {
    if (this.state.isLoaded)
      return (
        <React.Fragment>
          <div id="loggedin">
            <div id="user-profile">{this.renderUser()}</div>
          </div>
          <div className="row mt-3 mb-3">
            <div className="col-md-6">{this.renderLocationSearch()}</div>
            <div className="col-md-6">{this.renderLocations()}</div>
          </div>
          <Concert city={this.state.city} user={this.state.user} />
        </React.Fragment>
      );
    else return <div className="loader" />;
  }
}

class Concert extends React.Component {
  constructor(props) {
    super(props);

    this.state = { data: [], isLoading: false };
  }

  async fetchConcert(endpt) {
    if (this.props.city) {
      if (!endpt) endpt = `/bandstonight?location=${this.props.city}`;
      const data = await fetch(endpt).then(res => res.json());
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

  componentDidMount() {
    this.fetchConcert();
  }

  componentDidUpdate(prevProps) {
    if (this.props.city !== prevProps.city) {
      this.setState({ isLoading: true, data: [] });
      this.fetchConcert();
    }
  }

  render() {
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
      stateOrCountry =
        this.state.data[0].event.venue.metroArea.state ||
        this.state.data[0].event.venue.metroArea.country;
      location =
        this.state.data[0].event.venue.metroArea.displayName +
        ", " +
        stateOrCountry.displayName;
    }
    return (
      <React.Fragment>
        {loader
          ? loader
          : this.state.data.length > 1 && (
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
            {props.artists.map(artist => (
              <Artist artist={artist} key={artist.id} />
            ))}
          </div>
        </div>
      </li>
    </ul>
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
              <img
                className="mr-3"
                src={this.props.artist.image}
                alt={this.props.artist.name}
                width="100px"
              />
              <div className="media-body">
                <h5 className="mt-0">{this.props.artist.name}</h5>
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

class SpotifyPlaylistGenerator extends React.Component {
  constructor(props) {
    super(props);

    this.state = { spotifyUser: spotifyUser, playlist: null, isLoading: false };
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

class About extends React.Component {
  render() {
    return (
      <React.Fragment>
        <h1 className="text-center">Tools</h1>
        <div className="row">card here</div>
      </React.Fragment>
    );
  }
}

ReactDOM.render(<App />, document.getElementById("root"));
