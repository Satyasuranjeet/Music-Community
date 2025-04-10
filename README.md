# JStream Music App

A React and Flask application for creating and sharing music playlists with a dark UI theme.

## Features

- Create and manage playlists
- Search for songs and add them to playlists
- Play music with auto-play feature
- Like playlists
- Comment on playlists
- Responsive design with dark theme

## Backend Setup

1. Make sure you have Python 3.7+ installed
2. Install the required packages:

```bash
pip install flask flask-cors flask-pymongo pymongo requests
```

3. Set up MongoDB:
   - You'll need a MongoDB database (the code uses MongoDB Atlas)
   - Update the MongoDB connection string in the backend code if needed

4. Run the Flask server:

```bash
python app.py
```

The server will run on http://localhost:5000

## Frontend Setup

1. Make sure you have Node.js installed
2. Create a new React app with Tailwind CSS:

```bash
npx create-react-app jstream-music
cd jstream-music
```

3. Install Tailwind CSS:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

4. Configure Tailwind CSS by updating `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

5. Add Tailwind directives to your CSS file (src/index.css):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

6. Install additional dependencies:

```bash
npm install lucide-react
```

7. Copy the React component code into your `src/App.js` file

8. Run the React app:

```bash
npm start
```

The frontend will run on http://localhost:3000

## Usage

1. Start by creating a playlist with a name and your username
2. Search for songs and add them to your playlist
3. Play songs from your playlist
4. Like and comment on playlists
5. Navigate between different playlists

## API Endpoints

- `GET /songs?query=<search_term>` - Search for songs
- `GET /playlists` - Get all playlists
- `GET /playlists/<playlist_id>` - Get playlist details
- `GET /playlists/<playlist_id>/songs` - Get songs from a playlist
- `POST /playlists/<playlist_id>/like` - Like a playlist
- `GET /playlists/<playlist_id>/comments` - Get playlist comments
- `POST /playlists/<playlist_id>/comments` - Add a comment to a playlist