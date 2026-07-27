import React, { useEffect, useRef, useState } from 'react';
import shaka from 'shaka-player/dist/shaka-player.ui.js';
import 'shaka-player/dist/controls.css';
import { type Channel } from '../utils/m3uParser';
import { Loader2, AlertCircle } from 'lucide-react';

interface VideoPlayerProps {
  channel: Channel | null;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ channel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const uiRef = useRef<any>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Install polyfills when component mounts
    shaka.polyfill.installAll();
    if (!shaka.Player.isBrowserSupported()) {
      setError('Browser not supported for DRM playback');
    }
  }, []);

  useEffect(() => {
    if (!channel || !videoRef.current || !containerRef.current) return;

    setLoading(true);
    setError(null);

    const video = videoRef.current;
    
    if (!playerRef.current) {
        playerRef.current = new shaka.Player(video);
        uiRef.current = new shaka.ui.Overlay(playerRef.current, containerRef.current, video);
    }
    const player = playerRef.current;
    
    // Clear previous config
    player.configure({
      drm: { clearKeys: {} }
    });

    // Configure DRM if needed
    if (channel.licenseType === 'clearkey' || channel.licenseType === 'org.w3.clearkey') {
      if (channel.licenseKey) {
        const [keyId, key] = channel.licenseKey.split(':');
        if (keyId && key) {
           player.configure({
            drm: {
              clearKeys: {
                [keyId]: key
              }
            }
          });
        }
      }
    }

    // Configure user agent and CORS proxy
    player.getNetworkingEngine()?.registerRequestFilter((_type: any, request: any) => {
      // Prefix all requests with a local CORS proxy to bypass browser restrictions
      request.uris = request.uris.map((uri: string) => {
        // Only proxy absolute URLs. Relative URLs will naturally inherit the proxy path from the manifest URL
        if (uri.startsWith('http://') || uri.startsWith('https://')) {
          if (uri.startsWith('http://localhost')) return uri;
          return '/proxy/' + uri;
        }
        return uri;
      });
      
      // Attempt to set custom User-Agent if provided
      if (channel.userAgent) {
         // Note: Setting User-Agent might still be ignored by the browser natively
         // request.headers['User-Agent'] = channel.userAgent; 
      }
    });

    const onErrorEvent = (event: any) => {
      console.error('Error code', event.detail.code, 'object', event.detail);
      setError(`Playback error: ${event.detail.code}`);
      setLoading(false);
    };

    player.addEventListener('error', onErrorEvent);

    const loadPlayer = async () => {
      try {
        await player.load(channel.url);
        setLoading(false);
        video.play().catch(e => console.warn('Autoplay prevented', e));
      } catch (e: any) {
        console.error('Error loading video', e);
        setError(`Failed to load stream: ${e.message}`);
        setLoading(false);
      }
    };

    loadPlayer();

    return () => {
      player.removeEventListener('error', onErrorEvent);
    };
  }, [channel]);

  // Cleanup on unmount
  useEffect(() => {
      return () => {
          if (playerRef.current) {
              playerRef.current.destroy();
          }
          if (uiRef.current) {
              uiRef.current.destroy();
          }
      };
  }, []);


  if (!channel) {
    return (
      <div className="player-empty-state">
        <div className="empty-content">
           {/* Custom SVG logo or just text */}
          <div className="empty-icon-container">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="empty-icon">
                <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                <polyline points="17 2 12 7 7 2"></polyline>
            </svg>
          </div>
          <h2 className="empty-title">Select a Channel</h2>
          <p className="empty-subtitle">Choose a channel from the sidebar to start streaming</p>
        </div>
      </div>
    );
  }

  return (
    <div className="video-player-container">
       {loading && (
        <div className="player-overlay loading-overlay">
          <Loader2 className="spinner" />
          <p>Loading Stream...</p>
        </div>
      )}
      {error && (
        <div className="player-overlay error-overlay">
          <div className="error-box">
            <AlertCircle className="error-icon" />
            <p className="error-title">Stream Error</p>
            <p className="error-message">{error}</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="shaka-container">
        <video
          ref={videoRef}
          className="shaka-video"
          autoPlay
        />
      </div>
    </div>
  );
};
