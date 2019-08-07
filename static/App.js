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
        <div class="jumbotron">
          <div class="container text-center">
            <h1>Bands Tonight</h1>
            <h4 class="text-muted">
              Creating a Spotify playlist of the bands that are playing shows
              tonight!
            </h4>
          </div>
        </div>
        <div class="container">
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
    var redirect_uri = `${window.location.href}callback/`; // Your redirect uri
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
      songkickData: null
    };
  }

  componentDidMount() {
    this.fetchUser();
    this.fetchSongkick();
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

  async fetchSongkick() {
    const data = await fetch("/songkick").then(res => res.json());
    this.setState({ songkickData: data });
  }

  renderUser() {
    return (
      <div className="media">
        <img className="mr-3" src={this.state.user.images[0].url} />
        <div className="media-body">
          <h5 className="mt-0">Logged in as {this.state.user.display_name}</h5>
        </div>
      </div>
    );
  }

  renderSongkickConcerts() {
    if (this.state.songkickData !== null) {
      return this.state.songkickData.map(data => (
        <div className="row border-bottom">
          <SongkickConcert songkickData={data} />
        </div>
      ));
    }
  }

  render() {
    if (this.state.isLoaded)
      return (
        <React.Fragment>
          <div id="loggedin">
            <div id="user-profile">{this.renderUser()}</div>
          </div>
          <SpotifyPlaylistGenerator />
          {this.renderSongkickConcerts()}
        </React.Fragment>
      );
    else return <div className="loader" />;
  }
}

function SongkickConcert(props) {
  console.log(props);
  return (
    <ul className="list-unstyled" style={{ width: "100%" }}>
      <li className="media">
        <div className="media-body">
          <h5 className="mt-3">{props.songkickData.displayName}</h5>
          <div>
            {props.songkickData.performance.map((performance, i) => (
              <Artist artist={performance.displayName} key={i} />
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
      spotifyUser: spotifyUser,
      include: true
    };
    this.handleButtonClick = this.handleButtonClick.bind(this);
  }

  componentDidMount() {
    this.fetchSpotifyArtist();
  }

  handleButtonClick() {
    this.setState(state => ({ include: !state.include }));
  }

  async fetchSpotifyArtist() {
    const data = await fetch(
      `https://api.spotify.com/v1/search?q=${this.props.artist}&type=artist`,
      {
        headers: {
          Authorization: `Bearer ${this.state.spotifyUser.accessToken}`
        }
      }
    )
      .then(res => res.json())
      .then(data => data.artists);
    console.log(data);
    for (let artist of data.items)
      if (
        artist.name
          .normalize("NFD")
          .replace(/[^\w]/g, "")
          .toLowerCase() ===
        this.props.artist
          .normalize("NFD")
          .replace(/[^\w]/g, "")
          .toLowerCase()
      ) {
        this.setState({
          artist: {
            image: artist.images[0].url,
            id: artist.id,
            genres: artist.genres
          }
        });
        return;
      }
  }

  render() {
    if (this.state.artist)
      return (
        <div
          className={this.state.include ? "media mt-3 artist" : "media mt-3"}
          dataSpotifyId={this.state.artist.id}
        >
          <img
            className="mr-3"
            src={this.state.artist.image}
            alt={this.props.artist}
            width="100px"
          />
          <div className="media-body">
            <h5 className="mt-0">{this.props.artist}</h5>
            <p className="text-muted">
              <b>{this.state.artist.genres.join(", ")}</b>
            </p>
          </div>
          <div className="ml-3 align-self-center">
            <button
              type="button"
              class={this.state.include ? "btn btn-danger" : "btn btn-success"}
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
            alt={this.props.artist}
            width="100px"
          />
          <div className="media-body">
            <h5 className="mt-0">
              {this.props.artist}
              <span className="text-danger"> - Not on Spotify</span>
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
        userId: 122514778,
        location: "Austin, TX",
        artistSpotifyIds: artistSpotifyIds
      })
    })
      .then(res => res.json())
      .then(data => this.setState({ playlist: data.id }));
  }

  render() {
    if (this.state.playlist)
      return (
        <div width="300px" className="mx-auto mt-2 mb-2">
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
      );
    else if (this.state.isLoading)
      return (
        <div className="mt-2 mb-2">
          <h4 className="text-muted text-center">Generating playlist...</h4>
          <div className="loader mx-auto" />
        </div>
      );
    return (
      <button
        type="button"
        onClick={this.handleButtonClick}
        class="btn btn-secondary btn-lg btn-block"
      >
        Generate Playlist!
      </button>
    );
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
