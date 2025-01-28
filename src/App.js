import React, { useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import axios from 'axios';

const REDIRECT_URI = 'https://lblauv.github.io/music-analyzer'; // Update with your deployed URI
const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const RESPONSE_TYPE = 'token';
const SCOPES = ['playlist-read-private', 'user-top-read', 'playlist-modify-public', 'playlist-modify-private'];

export default function SpotifyApp() {
  const [token, setToken] = useState(null);
  const [customPlaylist, setCustomPlaylist] = useState(null);
  const [trackData, setTrackData] = useState([]);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const hash = window.location.hash;
    let token = window.localStorage.getItem('token');

    if (!token && hash) {
      token = hash
        .substring(1)
        .split('&')
        .find(elem => elem.startsWith('access_token'))
        .split('=')[1];

      window.localStorage.setItem('token', token);
      window.location.hash = '';
    }

    setToken(token);
  }, []);

  const logout = () => {
    setToken(null);
    window.localStorage.removeItem('token');
  };

  const fetchTopTracks = async () => {
    try {
      const response = await axios.get('https://api.spotify.com/v1/me/top/tracks?limit=50', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setTrackData(response.data.items);
    } catch (error) {
      console.error('Error fetching top tracks:', error);
    }
  };

  const createDiscoverWeekly = async () => {
    try {
      // Create a new playlist
      const playlistResponse = await axios.post(
        'https://api.spotify.com/v1/me/playlists',
        {
          name: 'My Top Favorite Songs',
          description: 'A playlist of your top favorite songs with added insights',
          public: false,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const playlistId = playlistResponse.data.id;

      // Add tracks to the playlist
      const uris = trackData.map(track => track.uri);
      await axios.post(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        { uris },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setCustomPlaylist(playlistResponse.data);
      alert('Your playlist of top favorite songs has been created!');

      // Calculate metrics
      calculateMetrics(trackData);
    } catch (error) {
      console.error('Error creating playlist:', error);
    }
  };

  const calculateMetrics = (topTracks) => {
    // Metrics: Average popularity, genre diversity, and more insights
    const popularityScores = topTracks.map(track => track.popularity);
    const averagePopularity =
      popularityScores.reduce((sum, score) => sum + score, 0) / popularityScores.length;

    const releaseYears = topTracks.map(track => new Date(track.album.release_date).getFullYear());
    const averageReleaseYear =
      Math.round(releaseYears.reduce((sum, year) => sum + year, 0) / releaseYears.length);

    const uniqueArtists = new Set(topTracks.map(track => track.artists[0].name));

    const trackDurations = topTracks.map(track => track.duration_ms / 60000); // Convert ms to minutes
    const averageDuration =
      (trackDurations.reduce((sum, duration) => sum + duration, 0) / trackDurations.length).toFixed(2);

    setMetrics({
      averagePopularity: averagePopularity.toFixed(2),
      averageReleaseYear,
      uniqueArtists: uniqueArtists.size,
      averageDuration,
    });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Spotify Custom Music Analyzer</h1>
      {!token ? (
        <a
          href={`${AUTH_ENDPOINT}?client_id=${process.env.REACT_APP_SPOTIFY_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=${RESPONSE_TYPE}&scope=${SCOPES.join(",")}`}
        >
          <Button variant="contained" color="primary" className="mt-4">Login with Spotify</Button>
        </a>
      ) : (
        <div>
          <Button onClick={logout} variant="contained" color="secondary" className="mb-4">Logout</Button>
          <Button onClick={fetchTopTracks} variant="contained" color="success" className="mb-4">Fetch Top Tracks</Button>
          {trackData.length > 0 && (
            <Button onClick={createDiscoverWeekly} variant="contained" color="primary" className="mb-4">
              Create My Top Favorite Songs Playlist
            </Button>
          )}
          {customPlaylist && (
            <Card>
              <CardContent>
                <h2 className="text-xl font-bold">Custom Playlist Created</h2>
                <p>Playlist Name: {customPlaylist.name}</p>
                <a href={customPlaylist.external_urls.spotify} target="_blank" rel="noopener noreferrer">
                  Open Playlist on Spotify
                </a>
              </CardContent>
            </Card>
          )}
          {metrics && (
            <Card className="mt-4">
              <CardContent>
                <h2 className="text-xl font-bold">Playlist Insights</h2>
                <p>Average Popularity: {metrics.averagePopularity}</p>
                <p>Average Release Year: {metrics.averageReleaseYear}</p>
                <p>Unique Artists: {metrics.uniqueArtists}</p>
                <p>Average Duration: {metrics.averageDuration} minutes</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
