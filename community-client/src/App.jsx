import { useState, useEffect, useRef } from 'react';
import { Heart, MessageSquare, Play, Pause, SkipForward, SkipBack, Volume2, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = 'https://music-community-orcin.vercel.app';

export default function MusicApp() {
  const [playlists, setPlaylists] = useState([]);
  const [currentPlaylist, setCurrentPlaylist] = useState(null);
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [username, setUsername] = useState('Guest');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [likedPlaylists, setLikedPlaylists] = useState({});
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlayerVisible, setIsPlayerVisible] = useState(false); // Added player visibility state
  
  const audioRef = useRef(null);
  const progressInterval = useRef(null);

  // Format time (seconds to MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Update progress bar
  const updateProgress = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  // Handle progress bar seek
  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    setProgress(seekTime);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
    }
  };

  // Fetch all playlists on component mount
  useEffect(() => {
    const fetchData = async () => {
      await fetchPlaylists();
      setIsLoading(false);
    };

    fetchData();
    
    // Check localStorage for liked playlists
    const storedLikes = localStorage.getItem('likedPlaylists');
    if (storedLikes) {
      setLikedPlaylists(JSON.parse(storedLikes));
    }
  }, []);
  
  // Auto-play next song when current song ends
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener('ended', playNextSong);
      audioRef.current.addEventListener('timeupdate', updateProgress);
      audioRef.current.addEventListener('loadedmetadata', updateProgress);
      
      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('ended', playNextSong);
          audioRef.current.removeEventListener('timeupdate', updateProgress);
          audioRef.current.removeEventListener('loadedmetadata', updateProgress);
        }
        clearInterval(progressInterval.current);
      };
    }
  }, [currentSongIndex, playlistSongs]);

  // Play audio when isPlaying state changes
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(err => console.error("Error playing audio:", err));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentSongIndex]);

  // Load audio source when song changes
  useEffect(() => {
    if (playlistSongs.length > 0 && audioRef.current) {
      audioRef.current.src = playlistSongs[currentSongIndex].mp3_url;
      audioRef.current.volume = volume;
      if (isPlaying) {
        audioRef.current.play().catch(err => console.error("Error playing audio:", err));
      }
    }
  }, [currentSongIndex, playlistSongs]);

  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const fetchPlaylists = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/playlists`);
      const data = await response.json();
      setPlaylists(data);
    } catch (error) {
      console.error('Error fetching playlists:', error);
    }
  };

  const fetchPlaylistSongs = async (playlistId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}/songs`);
      const data = await response.json();
      setPlaylistSongs(data);
      setCurrentSongIndex(0);
      setIsPlaying(false);
      setIsPlayerVisible(true); // Show player when songs are loaded
    } catch (error) {
      console.error('Error fetching playlist songs:', error);
    }
  };

  const fetchPlaylistComments = async (playlistId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}/comments`);
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchPlaylistDetails = async (playlistId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}`);
      const data = await response.json();
      setCurrentPlaylist(data);
      fetchPlaylistSongs(playlistId);
      fetchPlaylistComments(playlistId);
      setIsCommentOpen(false);
    } catch (error) {
      console.error('Error fetching playlist details:', error);
    }
  };

  const likePlaylist = async (playlistId) => {
    if (likedPlaylists[playlistId]) {
      return;
    }

    try {
      await fetch(`${API_BASE_URL}/playlists/${playlistId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Update UI optimistically
      setPlaylists(playlists.map(p => {
        if (p.id === playlistId) {
          return { ...p, likes: (p.likes || 0) + 1 };
        }
        return p;
      }));
      
      if (currentPlaylist && currentPlaylist.id === playlistId) {
        setCurrentPlaylist({
          ...currentPlaylist,
          likes: (currentPlaylist.likes || 0) + 1
        });
      }

      const newLikes = {...likedPlaylists, [playlistId]: true};
      setLikedPlaylists(newLikes);
      localStorage.setItem('likedPlaylists', JSON.stringify(newLikes));
    } catch (error) {
      console.error('Error liking playlist:', error);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !currentPlaylist) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/playlists/${currentPlaylist.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          content: newComment
        })
      });
      
      const data = await response.json();
      setComments([...comments, data.comment]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const playPreviousSong = () => {
    if (playlistSongs.length === 0) return;
    
    setCurrentSongIndex(prevIndex => {
      if (prevIndex === 0) {
        return playlistSongs.length - 1;
      } else {
        return prevIndex - 1;
      }
    });
    setIsPlaying(true);
  };

  const playNextSong = () => {
    if (playlistSongs.length === 0) return;
    
    setCurrentSongIndex(prevIndex => {
      if (prevIndex === playlistSongs.length - 1) {
        return 0;
      } else {
        return prevIndex + 1;
      }
    });
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    if (playlistSongs.length > 0) {
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  // Format date for display
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString(); // or use toLocaleDateString(), etc.
  }

  // Close player and pause music
  const closePlayer = () => {
    setIsPlayerVisible(false);
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100">
      <audio ref={audioRef} />
      
      {/* Header */}
      <header className="bg-gray-800/80 backdrop-blur-sm px-6 py-4 sticky top-0 z-10 border-b border-gray-700/50">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">JStream</h1>
          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-gray-700/50 text-white px-4 py-2 rounded-full text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Your name"
            />
          </div>
        </div>
      </header>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-screen">
          <div className="bg-gray-800/50 rounded-xl shadow-xl p-10 text-center border border-gray-700/30 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-purple-500 border-solid mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-transparent bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text mb-4">Loading...</h2>
            <p className="text-gray-400">Fetching awesome playlists for you.</p>
          </div>
        </div>
      ) : (
        /* Main content */
        <main className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl">
          {/* Playlists Section */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="bg-gray-800/50 rounded-xl shadow-xl p-6 border border-gray-700/30 backdrop-blur-sm">
              <h2 className="text-xl font-bold mb-6 text-transparent bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text">Trending Playlists</h2>
              
              <div className="space-y-5">
                {playlists.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No playlists yet.</p>
                ) : (
                  playlists.map((playlist) => (
                    <motion.div 
                      key={playlist.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="bg-gray-800/60 rounded-xl shadow-md overflow-hidden border border-gray-700/30 hover:border-gray-600/50 transition-all duration-300"
                    >
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-3">
                          <h3 
                            className="font-bold text-lg cursor-pointer hover:text-purple-400 transition-colors"
                            onClick={() => fetchPlaylistDetails(playlist.id)}
                          >
                            {playlist.name}
                          </h3>
                          <button 
                            onClick={() => likePlaylist(playlist.id)}
                            className="flex items-center focus:outline-none"
                            disabled={likedPlaylists[playlist.id]}
                          >
                            <motion.div
                              whileTap={{ scale: 1.3 }}
                              animate={{ 
                                scale: likedPlaylists[playlist.id] ? [1, 1.2, 1] : 1,
                                color: likedPlaylists[playlist.id] ? '#ec4899' : '#9CA3AF'
                              }}
                              transition={{ duration: 0.4 }}
                            >
                              <Heart size={20} className={`${likedPlaylists[playlist.id] ? 'fill-pink-500' : ''}`} />
                            </motion.div>
                            <span className="ml-1 text-sm">{playlist.likes || 0}</span>
                          </button>
                        </div>
                        
                        <p className="text-gray-400 text-sm mb-4">by {playlist.creator_name}</p>
                        
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center text-gray-400">
                            <button 
                              onClick={() => {
                                fetchPlaylistDetails(playlist.id);
                                setIsCommentOpen(true);
                              }}
                              className="flex items-center hover:text-purple-400 transition-colors"
                            >
                              <MessageSquare size={16} className="mr-1" />
                              <span>{playlist.comment_count}</span>
                            </button>
                          </div>
                          <div className="text-gray-400">
                            {playlist.song_count} songs
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
          
          {/* Playlist Details and Songs */}
          <div className="lg:col-span-7 xl:col-span-8">
            {currentPlaylist ? (
              <div className="bg-gray-800/50 rounded-xl shadow-xl border border-gray-700/30 backdrop-blur-sm overflow-hidden">
                {/* Playlist header */}
                <div className="p-6 border-b border-gray-700/30 bg-gradient-to-r from-gray-800/50 to-gray-900/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{currentPlaylist.name}</h2>
                      <p className="text-gray-400">Created by {currentPlaylist.creator_name}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={() => likePlaylist(currentPlaylist.id)}
                        className={`flex items-center px-3 py-1 rounded-full text-sm ${likedPlaylists[currentPlaylist.id] ? 'text-pink-500' : 'text-gray-400 hover:text-pink-500'}`}
                        disabled={likedPlaylists[currentPlaylist.id]}
                      >
                        <motion.div
                          whileTap={{ scale: 1.3 }}
                          animate={{ 
                            scale: likedPlaylists[currentPlaylist.id] ? [1, 1.2, 1] : 1,
                            color: likedPlaylists[currentPlaylist.id] ? '#ec4899' : '#9CA3AF'
                          }}
                          transition={{ duration: 0.4 }}
                        >
                          <Heart size={18} className={`mr-1 ${likedPlaylists[currentPlaylist.id] ? 'fill-pink-500' : ''}`} />
                        </motion.div>
                        <span>{currentPlaylist.likes || 0}</span>
                      </button>
                      <button 
                        onClick={() => setIsCommentOpen(!isCommentOpen)}
                        className="flex items-center px-3 py-1 rounded-full text-sm text-gray-400 hover:text-purple-400"
                      >
                        <MessageSquare size={18} className="mr-1" />
                        <span>{currentPlaylist.comment_count}</span>
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Songs list */}
                <div className="p-6">
                  <h3 className="font-bold mb-4 text-lg">Songs</h3>
                  {playlistSongs.length === 0 ? (
                    <p className="text-gray-400">No songs in this playlist yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                      {playlistSongs.map((song, index) => (
                        <motion.div 
                          key={song.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                          onClick={() => {
                            setCurrentSongIndex(index);
                            setIsPlaying(true);
                            setIsPlayerVisible(true); // Show player when song is clicked
                          }}
                          className={`flex items-center p-3 hover:bg-gray-700/40 rounded-lg cursor-pointer transition-colors ${
                            currentSongIndex === index ? 'bg-gray-700/60' : ''
                          }`}
                        >
                          <div className="mr-4 w-8 flex-shrink-0 flex justify-center">
                            {currentSongIndex === index && isPlaying ? (
                              <div className="w-6 h-6 flex items-center justify-center text-purple-400">
                                <span className="animate-pulse">▶</span>
                              </div>
                            ) : (
                              <div className="w-6 h-6 flex items-center justify-center text-gray-400">
                                {index + 1}
                              </div>
                            )}
                          </div>
                          {song.thumbnail_url && (
                            <img 
                              src={song.thumbnail_url} 
                              alt={song.title} 
                              className="w-12 h-12 mr-4 rounded-lg object-cover flex-shrink-0" 
                            />
                          )}
                          <div className="flex-grow min-w-0">
                            <div className={`font-medium truncate ${currentSongIndex === index ? 'text-purple-400' : 'text-white'}`}>
                              {song.title}
                            </div>
                            <div className="text-sm text-gray-400 truncate">{song.artist}</div>
                          </div>
                          <div className="text-sm text-gray-400 ml-4 flex-shrink-0">
                            {song.duration ? formatTime(song.duration) : '--:--'}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Comments section */}
                <AnimatePresence>
                  {isCommentOpen && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-gray-700/30 overflow-hidden"
                    >
                      <div className="p-6">
                        <h3 className="font-bold mb-4 text-lg">Comments</h3>
                        
                        <div className="flex space-x-3 mb-6">
                          <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addComment()}
                            className="bg-gray-700/50 text-white px-4 py-2 rounded-full flex-grow border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="Add a comment..."
                          />
                          <button 
                            onClick={addComment}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-5 py-2 rounded-full font-medium transition-all"
                          >
                            Post
                          </button>
                        </div>
                        
                        <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                          {comments.length === 0 ? (
                            <p className="text-gray-400 text-center py-4">No comments yet. Be the first to comment!</p>
                          ) : (
                            comments.map((comment) => (
                              <motion.div 
                                key={comment.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/30"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="font-medium text-purple-300">{comment.username}</div>
                                  <div className="text-xs text-gray-400">
                                    {comment.created_at && formatDate(comment.created_at)}
                                  </div>
                                </div>
                                <div className="mt-2 text-gray-200">{comment.content}</div>
                              </motion.div>
                            ))
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gray-800/50 rounded-xl shadow-xl p-10 text-center border border-gray-700/30 backdrop-blur-sm"
              >
                <h2 className="text-2xl font-bold text-transparent bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text mb-4">Welcome to JStream</h2>
                <p className="text-gray-400 max-w-md mx-auto">Select a playlist from the left to start listening to amazing music collections shared by our community.</p>
              </motion.div>
            )}
          </div>
        </main>
      )}
      
      {/* Music Player */}
      <AnimatePresence>
        {isPlayerVisible && playlistSongs.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-0 left-0 right-0 bg-gray-800/90 backdrop-blur-sm border-t border-gray-700/30 p-4 shadow-2xl"
          >
            <div className="container mx-auto max-w-7xl">
              <div className="flex flex-col lg:flex-row items-center">
                {/* Close button */}
                <button 
                  onClick={closePlayer}
                  className="absolute top-3 right-4 text-gray-400 hover:text-white transition-colors lg:right-8"
                >
                  <X size={20} />
                </button>
                
                {/* Song info */}
                <div className="flex items-center mb-4 lg:mb-0 lg:w-1/4">
                  {playlistSongs[currentSongIndex].thumbnail_url && (
                    <img 
                      src={playlistSongs[currentSongIndex].thumbnail_url} 
                      alt="" 
                      className="w-14 h-14 mr-3 rounded-lg object-cover" 
                    />
                  )}
                  <div className="min-w-0">
                    <div className="font-medium truncate">{playlistSongs[currentSongIndex].title}</div>
                    <div className="text-sm text-gray-400 truncate">{playlistSongs[currentSongIndex].artist}</div>
                  </div>
                </div>
                
                {/* Progress bar and controls */}
                <div className="w-full lg:w-2/4 mb-4 lg:mb-0 px-0 lg:px-8">
                  {/* Progress bar */}
                  <div className="flex items-center mb-3">
                    <span className="text-xs text-gray-400 w-10 text-right mr-2">
                      {formatTime(progress)}
                    </span>
                    <input
                      type="range"
                      min="0"
                      max={duration || 100}
                      value={progress}
                      onChange={handleSeek}
                      className="flex-grow h-1 bg-gray-600 rounded-full appearance-none cursor-pointer accent-purple-500"
                    />
                    <span className="text-xs text-gray-400 w-10 text-left ml-2">
                      {formatTime(duration)}
                    </span>
                  </div>
                  
                  {/* Controls */}
                  <div className="flex items-center justify-center">
                    <button 
                      onClick={playPreviousSong}
                      className="mx-2 text-gray-300 hover:text-white transition-colors"
                    >
                      <SkipBack size={22} />
                    </button>
                    
                    <button 
                      onClick={togglePlayPause}
                      className="mx-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition-all"
                    >
                      {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                    </button>
                    
                    <button 
                      onClick={playNextSong}
                      className="mx-2 text-gray-300 hover:text-white transition-colors"
                    >
                      <SkipForward size={22} />
                    </button>
                  </div>
                </div>
                
                {/* Volume */}
                <div className="flex items-center lg:w-1/4 lg:justify-end">
                  <Volume2 size={18} className="mr-3 text-gray-400" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-24 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer accent-purple-500"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}