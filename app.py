from datetime import date
import os

from eventbrite import Eventbrite
from flask import Flask, jsonify, request, render_template
import requests

app = Flask(__name__)
eventbrite = Eventbrite(os.environ.get("EVENTBRITE_API_KEY"))


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


@app.route("/songkick")
def fetch_songkick():
    # Set up parameters for api call
    data = {
        "apikey": os.environ.get("SONGKICK_API_KEY"),
        "location": "sk:9179",
        # "location": "ip:" + request.remote_addr,
        "min_date": date.today(),
        "max_date": date.today(),
        "page": 1,
    }
    r = requests.get(
        "https://api.songkick.com/api/3.0/events.json", params=data
    ).json()["resultsPage"]

    # Dictionary to hold our result
    d = []

    # Set up loop
    total_entries = r["totalEntries"]
    num_results = 0
    while num_results < total_entries:
        num_results += len(r["results"]["event"])
        d += r["results"]["event"]
        r["page"] += 1
        r = requests.get(
            "https://api.songkick.com/api/3.0/events.json", params=data
        ).json()["resultsPage"]
    return jsonify(d)


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
    #     artistSpotifyIds,
    # }
    playlist = create_spotify_playlist(
        data["accessToken"], data["userId"], data["location"]
    )
    endpt = playlist["tracks"]["href"]
    uris = get_artist_top_tracks(data["accessToken"], data["artistSpotifyIds"])
    add_tracks_to_playlist(data["accessToken"], endpt, uris)
    return playlist


def create_spotify_playlist(access_token, id, location):
    headers = {"Authorization": f"Bearer {access_token}"}
    data = {
        "name": f"Bands playing tonight in {location} on {date.today():%m-%d-%Y}",
        "description": "Playlist generated by ",  # TODO: PUT URL HERE
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
        result.append(r["tracks"][0]["uri"])
    return result


def add_tracks_to_playlist(access_token, playlist_track_endpoint, uris):
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    data = {"uris": uris}
    r = requests.post(playlist_track_endpoint, headers=headers, json=data)


if __name__ == "__main__":
    app.run(debug=os.environ.get("DEBUG") !== "False")
