import { useEffect, useState, useMemo } from 'react';
import { Search, MonitorPlay, Menu, Radio, X } from 'lucide-react';
import { type Channel, parseM3U } from './utils/m3uParser';
import { VideoPlayer } from './components/VideoPlayer';

function App() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchM3U = async () => {
      try {
        setLoading(true);
        // We use cors proxy or rely on raw github content which usually has CORS enabled
        const response = await fetch('https://raw.githubusercontent.com/MaybeUnknown404/404/refs/heads/main/NEW%20NASIONAL.m3u');
        
        if (!response.ok) throw new Error('Failed to fetch playlist');
        
        const text = await response.text();
        const parsedChannels = parseM3U(text);
        setChannels(parsedChannels);
      } catch (err: any) {
        console.error('Fetch error:', err);
        setError(err.message || 'Error loading playlist');
      } finally {
        setLoading(false);
      }
    };

    fetchM3U();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(channels.map(c => c.group));
    return ['All', ...Array.from(cats)].sort();
  }, [channels]);

  const filteredChannels = useMemo(() => {
    return channels.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'All' || c.group === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [channels, searchQuery, activeCategory]);

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel);
    setIsSidebarOpen(false); // Close sidebar on mobile
  };

  if (loading) {
    return (
      <div className="app-loading">
        <MonitorPlay className="w-16 h-16 text-[#00f2fe] animate-pulse" />
        <h2>Initializing WebTV...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-loading">
        <div style={{color: '#ff4757', textAlign: 'center'}}>
          <h2 style={{color: '#ff4757'}}>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-mobile-header" style={{ display: 'none', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
             <div className="logo-container" style={{margin: 0}}>
                <div className="logo-icon">
                  <MonitorPlay size={20} />
                </div>
                <span className="logo-text">WebTV</span>
              </div>
              <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(false)}>
                <X size={24} />
              </button>
          </div>
          <div className="logo-container sidebar-desktop-header">
            <div className="logo-icon">
              <MonitorPlay size={20} />
            </div>
            <span className="logo-text">WebTV Premium</span>
          </div>
          
          <div className="search-container">
            <Search className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search channels..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="categories-wrapper">
          {categories.map(cat => (
            <button
              key={cat}
              className={`category-pill ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat.replace('📁 ', '').replace('📂 ', '')}
            </button>
          ))}
        </div>

        <div className="channel-list">
          {filteredChannels.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              No channels found.
            </div>
          ) : (
            filteredChannels.map(channel => (
              <div
                key={channel.id}
                className={`channel-item ${selectedChannel?.id === channel.id ? 'active' : ''}`}
                onClick={() => handleChannelSelect(channel)}
              >
                {channel.logo ? (
                  <img src={channel.logo} alt={channel.name} className="channel-logo" loading="lazy" onError={(e) => {
                    (e.target as any).style.display = 'none';
                    (e.target as any).nextSibling.style.display = 'flex';
                  }}/>
                ) : null}
                <div className="channel-logo-placeholder" style={{display: channel.logo ? 'none' : 'flex'}}>
                  {channel.name.substring(0, 1)}
                </div>
                
                <div className="channel-info">
                  <div className="channel-name">{channel.name}</div>
                  <div className="channel-group">{channel.group.replace(/📁 |📂 /g, '')}</div>
                </div>
                
                {selectedChannel?.id === channel.id && (
                  <div className="playing-indicator">
                    <Radio size={16} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Area */}
      <main className="main-area">
        <header className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="now-playing-info">
              {selectedChannel ? (
                <>
                  <span className="live-badge">LIVE</span>
                  <span className="now-playing-title">{selectedChannel.name}</span>
                </>
              ) : (
                <span className="now-playing-title" style={{ color: 'var(--text-secondary)' }}>Not playing</span>
              )}
            </div>
          </div>
          
          <div className="clock">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </header>

        <div className="player-wrapper">
          <VideoPlayer channel={selectedChannel} />
        </div>
      </main>
    </div>
  );
}

export default App;
