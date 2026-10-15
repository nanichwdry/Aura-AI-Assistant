import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Play, Pause, SkipForward, SkipBack, Search, Minimize2, Maximize2 } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { loadYouTube, YouTubeAPI } from '../lib/youtube';

interface Song { videoId: string; title: string; channel: string; thumbnail: string }
interface Props {
  onClose: () => void;
  minimized?: boolean;
  onMinimize: () => void;
  onRestore: () => void;
}
type Player = InstanceType<YouTubeAPI['Player']>;

export function AuraMusicPlayer({ onClose, minimized = false, onMinimize, onRestore }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<Player | null>(null);
  const search = useRef<AbortController | null>(null);
  const queued = useRef<string | null>(null);
  const latest = useRef({ playlist, currentIndex });
  latest.current = { playlist, currentIndex };

  useEffect(() => {
    let disposed = false;
    let created: Player | null = null;
    const element = document.createElement('div');
    host.current!.appendChild(element);
    const timeout = setTimeout(() => { if (!disposed) setError('YouTube is taking too long to connect. Close Music and try again.'); }, 20000);
    loadYouTube().then(api => {
      if (disposed) return;
      created = new api.Player(element, {
        width: '100%', height: '100%',
        playerVars: { autoplay: 0, controls: 1, playsinline: 1, origin: window.location.origin },
        events: {
          onReady: () => {
            if (disposed) return;
            clearTimeout(timeout);
            setReady(true);
            setError('');
            if (queued.current) { created?.loadVideoById(queued.current); queued.current = null; }
          },
          onStateChange: ({ data }) => {
            if (disposed) return;
            setIsPlaying(data === 1);
            if (data === 0) {
              const { playlist: songs, currentIndex: index } = latest.current;
              if (index + 1 < songs.length) {
                latest.current.currentIndex = index + 1;
                setCurrentIndex(index + 1);
                created?.loadVideoById(songs[index + 1].videoId);
              }
            }
          },
          onError: () => { if (!disposed) { setIsPlaying(false); setError('This video cannot be played. Choose another song.'); } },
          onAutoplayBlocked: () => { if (!disposed) setError('Your browser paused autoplay. Press Play to start the song.'); },
        },
      });
      player.current = created;
    }).catch(error => { if (!disposed) { clearTimeout(timeout); setError(error.message); } });
    return () => {
      disposed = true;
      clearTimeout(timeout);
      search.current?.abort();
      created?.destroy();
      player.current = null;
      element.remove();
    };
  }, []);

  const playSong = (index: number, songs = playlist) => {
    if (!songs[index]) return;
    setError('');
    latest.current = { playlist: songs, currentIndex: index };
    setCurrentIndex(index);
    if (ready) player.current?.loadVideoById(songs[index].videoId);
    else queued.current = songs[index].videoId;
  };
  const searchMusic = async () => {
    if (!searchQuery.trim()) return;
    search.current?.abort();
    const controller = new AbortController();
    search.current = controller;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/music/search?q=${encodeURIComponent(searchQuery.trim())}`, { signal: controller.signal });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || data.message || 'Music search failed.');
      const songs = (Array.isArray(data.videos) ? data.videos : []).filter((song: Song) => typeof song.videoId === 'string' && typeof song.title === 'string');
      if (!songs.length) throw new Error(data.message || 'No songs found. Try another search.');
      setPlaylist(songs);
      playSong(0, songs);
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Music search failed.');
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  };
  const togglePlayback = () => {
    if (!ready) return;
    if (isPlaying) player.current?.pauseVideo();
    else player.current?.playVideo();
  };
  const song = playlist[currentIndex];

  return createPortal(<div className={minimized ? 'fixed bottom-4 right-4 z-[70] w-[320px] max-w-[calc(100vw-2rem)]' : 'fixed inset-0 z-[70] flex items-center justify-center p-4'}>
    {!minimized && <div onClick={onMinimize} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />}
    <section role={minimized ? 'region' : 'dialog'} aria-modal={!minimized || undefined} aria-label={minimized ? 'Mini music player' : 'Music player'} className="relative w-full max-w-xl max-h-[90dvh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 text-gray-100 shadow-2xl">
      <header className="flex items-center justify-between gap-3 border-b border-slate-700 p-3">
        <h2 className="min-w-0 truncate text-sm font-semibold">{minimized ? song?.title || 'Aura Music' : 'Aura Music'}</h2>
        <div className="flex shrink-0 gap-2">
          <button aria-label={minimized ? 'Restore music player' : 'Minimize music player'} title={minimized ? 'Restore music player' : 'Minimize music player'} onClick={minimized ? onRestore : onMinimize} className="rounded-lg p-2 hover:bg-slate-800">{minimized ? <Maximize2 size={17} /> : <Minimize2 size={17} />}</button>
          <button aria-label="Close music player and stop playback" title="Close and stop playback" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-800"><X size={17} /></button>
        </div>
      </header>
      <div className="aspect-video min-h-[180px] w-full bg-black" ref={host} />
      {!ready && !error && <p role="status" className="p-3 text-sm text-gray-400">Connecting to YouTube…</p>}
      {error && <p role="alert" className="p-3 text-sm text-amber-300">{error}</p>}
      <div className="flex items-center justify-center gap-4 p-3">
        <button aria-label="Previous song" disabled={!ready || currentIndex === 0} onClick={() => playSong(currentIndex - 1)} className="p-2 disabled:opacity-30"><SkipBack size={20} /></button>
        <button aria-label={isPlaying ? 'Pause song' : 'Play song'} disabled={!ready || !song} onClick={togglePlayback} className="rounded-full bg-emerald-400 p-3 text-slate-950 disabled:opacity-30">{isPlaying ? <Pause size={20} /> : <Play size={20} />}</button>
        <button aria-label="Next song" disabled={!ready || currentIndex >= playlist.length - 1} onClick={() => playSong(currentIndex + 1)} className="p-2 disabled:opacity-30"><SkipForward size={20} /></button>
      </div>
      {!minimized && <>
        <form className="flex gap-2 border-t border-slate-700 p-4" onSubmit={event => { event.preventDefault(); void searchMusic(); }}>
          <input aria-label="Search for songs" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search for songs…" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" />
          <button aria-label="Search music" disabled={isLoading || !searchQuery.trim()} className="rounded-lg bg-emerald-400 p-3 text-slate-950 disabled:opacity-30"><Search size={18} /></button>
        </form>
        <div className="max-h-48 overflow-y-auto px-4 pb-4">
          {isLoading ? <p role="status">Searching…</p> : playlist.length ? playlist.map((item, index) => <button key={`${item.videoId}-${index}`} onClick={() => playSong(index)} className={`mb-1 flex w-full items-center gap-3 rounded-lg p-2 text-left ${index === currentIndex ? 'bg-emerald-400/10' : 'hover:bg-slate-800'}`}>
            <img src={item.thumbnail} alt="" className="h-10 w-14 rounded object-cover" /><span className="min-w-0"><strong className="block truncate text-sm">{item.title}</strong><span className="text-xs text-gray-400">{item.channel}</span></span>
          </button>) : <p className="py-3 text-sm text-gray-400">Search for a song to start your playlist.</p>}
        </div>
      </>}
    </section>
  </div>, document.body);
}
