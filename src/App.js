import React, { useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import axios from 'axios';

const REDIRECT_URI = 'https://lblauv.github.io/spotify-analyzer'; 
const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const RESPONSE_TYPE = 'token';
const SCOPES = ['playlist-read-private', 'user-top-read', 'playlist-modify-public', 'playlist-modify-private'];

export default function SpotifyApp() {
  const [token, setToken] = useState(null);
  const [customPlaylist, setCustomPlaylist] = useState(null);
  const [trackData, setTrackData] = useState([]);

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
          name: 'My Discover Weekly',
          description: 'Custom Discover Weekly playlist created with your top tracks',
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
      alert('Your custom Discover Weekly playlist has been created!');
    } catch (error) {
      console.error('Error creating playlist:', error);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Spotify Custom Discover Weekly</h1>
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
              Create Discover Weekly Playlist
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
        </div>
      )}
    </div>
  );
}
