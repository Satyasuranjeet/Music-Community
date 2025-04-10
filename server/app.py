from flask import Flask, jsonify, request
from flask_pymongo import PyMongo
from bson import ObjectId
import requests
import os
from flask_cors import CORS
from datetime import datetime , timezone

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Configuration
app.config["MONGO_URI"] = "mongodb+srv://satya:satya@cluster0.8thgg4a.mongodb.net/music_app"
mongo = PyMongo(app)

@app.route('/')
def home():
    return jsonify({
        "message": "Welcome to JStream API!",
        "endpoints": {
            "/songs": "Search for songs (GET)",
            "/playlists": "Get all playlists (GET), Create a playlist (POST)",
            "/playlists/<playlist_id>": "Get playlist details (GET), Delete a playlist (DELETE)",
            "/playlists/<playlist_id>/songs": "Get songs from a playlist (GET)",
            "/playlists/<playlist_id>/comments": "Get comments (GET), Add comment (POST)",
            "/playlists/<playlist_id>/like": "Like a playlist (POST)"
        }
    })

@app.route('/playlists', methods=['GET'])
def get_all_playlists():
    try:
        playlists = list(mongo.db.playlists.find({}).sort("created_at", -1))
        result = []
        for playlist in playlists:
            userId = playlist["user_id"]
            data = mongo.db.users.find_one({"_id": ObjectId(userId)})
            creator_name = data["name"]
            playlist_data = {
                "id": str(playlist["_id"]),
                "name": playlist["name"],
                "creator_name": creator_name,
                "song_count": len(playlist.get("songs", [])),
                "likes": playlist.get("likes", 0),
                "comment_count": len(playlist.get("comments", [])),
                "created_at": playlist["created_at"]
            }
            result.append(playlist_data)
            
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/playlists', methods=['POST'])
def create_playlist():
    try:
        creator_name = request.json.get('creator_name', 'Anonymous')
        name = request.json.get('name')
        
        if not name:
            return jsonify({"error": "Playlist name is required"}), 400

        playlist = {
            "creator_name": creator_name,
            "name": name,
            "songs": [],
            "comments": [],
            "likes": 0,
            "created_at": datetime.utcnow()
        }
        result = mongo.db.playlists.insert_one(playlist)

        return jsonify({
            "message": "Playlist created successfully",
            "playlist_id": str(result.inserted_id)
        })
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/playlists/<playlist_id>', methods=['GET'])
def get_playlist(playlist_id):
    try:
        playlist = mongo.db.playlists.find_one({"_id": ObjectId(playlist_id)})

        if not playlist:
            return jsonify({"error": "Playlist not found"}), 404

        playlist["id"] = str(playlist.pop("_id"))
        
        return jsonify(playlist)
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500



@app.route('/playlists/<playlist_id>/songs', methods=['GET'])
def get_playlist_songs(playlist_id):
    try:
        playlist = mongo.db.playlists.find_one({"_id": ObjectId(playlist_id)})

        if not playlist:
            return jsonify({"error": "Playlist not found"}), 404

        return jsonify(playlist.get('songs', []))
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route('/playlists/<playlist_id>/like', methods=['POST'])
def like_playlist(playlist_id):
    try:
        playlist = mongo.db.playlists.find_one({"_id": ObjectId(playlist_id)})

        if not playlist:
            return jsonify({"error": "Playlist not found"}), 404

        current_likes = playlist.get('likes', 0)
        
        mongo.db.playlists.update_one(
            {"_id": ObjectId(playlist_id)},
            {"$set": {"likes": current_likes + 1}}
        )

        return jsonify({"message": "Playlist liked successfully", "likes": current_likes + 1})
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/playlists/<playlist_id>/comments', methods=['GET'])
def get_comments(playlist_id):
    try:
        playlist = mongo.db.playlists.find_one(
            {"_id": ObjectId(playlist_id)},
            {"comments": 1}
        )

        if not playlist:
            return jsonify({"error": "Playlist not found"}), 404

        return jsonify(playlist.get('comments', []))
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/playlists/<playlist_id>/comments', methods=['POST'])
def add_comment(playlist_id):
    try:
        username = request.json.get('username', 'Anonymous')
        content = request.json.get('content')

        if not content:
            return jsonify({"error": "Comment content is required"}), 400

        comment = {
            "id": str(ObjectId()),
            "username": username,
            "content": content,
            "created_at": datetime.now(timezone.utc)
        }

        playlist = mongo.db.playlists.find_one({"_id": ObjectId(playlist_id)})

        if not playlist:
            return jsonify({"error": "Playlist not found"}), 404

        mongo.db.playlists.update_one(
            {"_id": ObjectId(playlist_id)},
            {"$push": {"comments": comment}}
        )

        return jsonify({"message": "Comment added successfully", "comment": comment})
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)