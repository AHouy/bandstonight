import os
import re
import unicodedata
from datetime import date

import requests
from eventbrite import Eventbrite
from flask import Flask, jsonify, render_template, request
from flask_caching import Cache
from spotipy import Spotify
from spotipy.oauth2 import SpotifyClientCredentials

app = Flask(__name__)
cache = Cache(app, config={"CACHE_TYPE": "simple"})
eventbrite = Eventbrite(os.environ.get("EVENTBRITE_API_KEY"))
spotify = Spotify(client_credentials_manager=SpotifyClientCredentials())


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


def get_metro_area_id():
    params = {"apikey": os.environ.get("SONGKICK_API_KEY"), "query": "Austin, TX"}
    r = requests.get(
        "https://api.songkick.com/api/3.0/search/locations.json", params=params
    ).json()["resultsPage"]
    # if r["results"]:
    return r


@app.route("/location")
def fetch_location_id():
    data = {"apikey": os.environ.get("SONGKICK_API_KEY")}

    # Check whether location for location or not
    if "q" in request.args and request.args.get("q"):
        data["query"] = request.args.get("q")
    else:
        data["location"] = f"ip:{request.remote_addr}"

    # Do the API call
    r = requests.get(
        "https://api.songkick.com/api/3.0/search/locations.json", params=data
    ).json()["resultsPage"]
    return jsonify(r["results"]["location"])


@app.route("/bandstonight")
def fetch_artists():
    if "location" in request.args and request.args.get("location"):
        location = f"sk:{request.args.get('location')}"
    else:
        location = f"ip:{request.remote_addr}"

    key = f"{location}-{date.today()}"
    cached_data = cache.get(key)
    if cached_data:
        return cached_data

    day = request.args.get("date") if "date" in request.args else date.today()
    # Set up parameters for api call
    data = {
        "apikey": os.environ.get("SONGKICK_API_KEY"),
        "location": location,
        "min_date": day,
        "max_date": day,
        "page": 1,
    }
    r = requests.get(
        "https://api.songkick.com/api/3.0/events.json", params=data
    ).json()["resultsPage"]

    # List to hold our result
    l = []

    # Set up loop
    total_entries = r["totalEntries"]
    num_results = 0
    while num_results < total_entries:
        num_results += len(r["results"]["event"])
        for event in r["results"]["event"]:
            d = {"artists": [], "event": event}
            for artist in event.pop("performance"):
                results = spotify.search(artist["displayName"], type="artist")
                while results:
                    for a in results["artists"]["items"]:
                        if (
                            strip_accents(artist["displayName"]).lower()
                            == strip_accents(a["name"]).lower()
                        ):
                            a["spotify"] = True
                            if a["images"]:
                                a["image"] = a.pop("images")[0]["url"]
                            else:
                                a["image"] = "https://via.placeholder.com/100"
                            d["artists"].append(a)
                            results = None
                            break
                    else:
                        results = spotify.next(results) if "next" in results else None
                        if not results:
                            d["artists"].append(
                                {
                                    "name": artist["displayName"],
                                    "spotify": False,
                                    "image": "https://via.placeholder.com/100",
                                }
                            )
            l.append(d)
        r["page"] += 1
        r = requests.get(
            "https://api.songkick.com/api/3.0/events.json", params=data
        ).json()["resultsPage"]
    cached_data = jsonify(l)
    cache.set(key, cached_data)
    return cached_data


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
    app.run(debug=os.environ.get("DEBUG") != "False")
