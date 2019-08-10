import os
import re
import unicodedata
from datetime import date

import requests
from eventbrite import Eventbrite
from flask import Flask, jsonify, render_template, request
from flask_caching import Cache
from flask_sqlalchemy import SQLAlchemy
from flask_webpack_loader import WebpackLoader
from spotipy import Spotify
from spotipy.oauth2 import SpotifyClientCredentials

app = Flask(__name__)
cache = Cache(app, config={"CACHE_TYPE": "simple"})
webpack = WebpackLoader(app)
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", "sqlite:///./db.sqlite3"
)
db = SQLAlchemy(app)
spotify = Spotify(client_credentials_manager=SpotifyClientCredentials())


# Models


class Artist(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String)  # Name of the artist
    url = db.Column(db.String)  # URL linking to spotify page
    genres = db.Column(db.PickleType)  # Genres
    image = db.Column(db.String)  # Image of the artist
    spotifyId = db.Column(db.String)  # Spotify ID
    songkickId = db.Column(db.Integer)  # Songkick ID
    mbid = db.Column(db.String)  # MusicBrainz ID


# Views


@app.route("/", defaults={"path": None})
@app.route("/<path:path>")
def index(path):
    return render_template(
        "index.html",
        debug=app.debug,
        SPOTIFY_CLIENT_ID=os.environ.get("SPOTIFY_CLIENT_ID"),
    )


@app.route("/someurl", methods=["GET"])
def tbn():
    # print(request.get_json(force=True))
    data = {
        "location.address": "Austin, Texas",
        "location.within": "50mi",
        "categories": "103",  # The id for music category
        "start_date.keyword": "today",
    }
    result = eventbrite.event_search(**data)
    return result


@app.route("/location")
@cache.cached(query_string=True)
def fetch_location_id():
    data = {"apikey": os.environ.get("SONGKICK_API_KEY")}

    # Check whether location for location or not
    if "q" in request.args and request.args.get("q"):
        data["query"] = request.args.get("q")
    else:
        ip = (
            request.environ.get("HTTP_X_FORWARDED_FOR")
            or request.args.get("ip")
            or request.remote_addr
        )
        data["location"] = f"ip:{ip}"

    # Do the API call
    r = requests.get(
        "https://api.songkick.com/api/3.0/search/locations.json", params=data
    ).json()["resultsPage"]
    if "location" in r["results"]:
        return jsonify(remove_duplicates(r["results"]["location"]))
    else:
        return jsonify([])


def remove_duplicates(locations):
    result = []
    for location in locations:
        duplicate = False
        for val in result:
            if val["metroArea"]["id"] == location["metroArea"]["id"]:
                duplicate = True
                break
        if not duplicate:
            result.append(location)
    return result


@app.route("/bandstonight")
@cache.cached(query_string=True)
def fetch_artists():
    location = f"sk:{request.args.get('location')}"
    page = int(request.args.get("page", 1))
    day = (
        request.args.get("date")
        if "date" in request.args and request.args.get("date")
        else date.today()
    )

    # Set up parameters for api call
    data = {
        "apikey": os.environ.get("SONGKICK_API_KEY"),
        "location": location,
        "min_date": day,
        "max_date": day,
        "page": page,
        "per_page": 10,
    }
    r = requests.get(
        "https://api.songkick.com/api/3.0/events.json", params=data
    ).json()["resultsPage"]

    # List to hold our result
    l = []
    res = r.pop("results")
    if "event" in res:
        for event in res["event"]:
            d = {"artists": [], "event": event}
            for artist in event.pop("performance"):
                a = Artist.query.filter_by(songkickId=artist["artist"]["id"]).first()
                if not a:
                    a = search_spotify_artist(artist)
                else:
                    a = {
                        "name": a.name,
                        "url": a.url,
                        "genres": a.genres,
                        "image": a.image,
                        "spotifyId": a.spotifyId,
                        "songkickId": a.songkickId,
                        "spotify": True,
                    }
                d["artists"].append(a)
            l.append(d)
    if r["perPage"] * page <= r["totalEntries"]:
        r[
            "next"
        ] = f"/bandstonight?location={location.strip('sk:')}&page={page + 1}&date={day}"
    else:
        r["next"] = None
    r["results"] = l
    return jsonify(r)


def search_spotify_artist(artist):
    results = spotify.search(artist["displayName"], type="artist")
    while results:
        for a in results["artists"]["items"]:
            if strip_accents(artist["displayName"]).lower().replace(
                "&", "and"
            ) == strip_accents(a["name"]).lower().replace("&", "and"):
                a["spotify"] = True
                if a["images"]:
                    a["image"] = a.pop("images")[0]["url"]
                else:
                    a["image"] = "https://via.placeholder.com/100"
                a["url"] = a.pop("external_urls")["spotify"]
                a["spotifyId"] = a.pop("id")

                # Add artist to the database
                db.session.add(
                    Artist(
                        name=a["name"],
                        url=a["url"],
                        genres=a["genres"],
                        image=a["image"],
                        spotifyId=a["spotifyId"],
                        songkickId=artist["artist"]["id"],
                        # mbid=artist["artist"]["identifier"][0]["mbid"],
                    )
                )
                db.session.commit()

                # Exit the while and for loop
                results = None
                break
        else:  # Still haven't found artist
            # Search some more
            results = spotify.next(results) if "next" in results else None
            if not results:  # Not able to search some more
                a = {
                    "name": artist["displayName"],
                    "spotify": False,
                    "image": "https://via.placeholder.com/100",
                }
    return a


@app.route("/callback/")
def handle_callback():
    return render_template("callback.html")


@app.route("/playlist", methods=["POST"])
def create_playlist():
    data = request.get_json(force=True)
    # data = {
    #     accessToken,
    #     userId,
    #     location,
    #     date,
    #     artistSpotifyIds,
    # }
    playlist = create_spotify_playlist(
        data["accessToken"], data["userId"], data["location"], data["date"]
    )
    endpt = playlist["tracks"]["href"]
    uris = get_artist_top_tracks(data["accessToken"], data["artistSpotifyIds"])
    add_tracks_to_playlist(data["accessToken"], endpt, uris)
    return playlist


def create_spotify_playlist(access_token, id, location, date):
    headers = {"Authorization": f"Bearer {access_token}"}
    data = {
        "name": f"Bands playing tonight in {location} on {date}",
        "description": "Playlist generated by https://bandstonight.herokuapp.com/",
        "public": False,
    }
    r = requests.post(
        f"https://api.spotify.com/v1/users/{id}/playlists", headers=headers, json=data
    )
    return r.json()


def get_artist_top_tracks(access_token, artist_ids):
    result = []
    headers = {"Authorization": f"Bearer {access_token}"}
    for id in artist_ids:
        r = requests.get(
            f"https://api.spotify.com/v1/artists/{id}/top-tracks?country=US",
            headers=headers,
        ).json()
        if r["tracks"]:
            result.append(r["tracks"][0]["uri"])
    return result


def add_tracks_to_playlist(access_token, playlist_track_endpoint, uris):
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    print(len(uris))
    size = 100
    while len(uris) > size:
        data = {"uris": uris[:size]}
        r = requests.post(playlist_track_endpoint, headers=headers, json=data)
        uris = uris[size:]
    else:
        data = {"uris": uris}
        r = requests.post(playlist_track_endpoint, headers=headers, json=data)

    print(r.json())


# https://stackoverflow.com/a/31607735
def strip_accents(text):
    """
    Strip accents from input String.

    :param text: The input string.
    :type text: String.

    :returns: The processed String.
    :rtype: String.
    """
    try:
        text = unicode(text, "utf-8")
    except (TypeError, NameError):  # unicode is a default on python 3
        pass
    text = unicodedata.normalize("NFD", text)
    text = text.encode("ascii", "ignore")
    text = text.decode("utf-8")
    return str(text)


if __name__ == "__main__":
    app.run()
