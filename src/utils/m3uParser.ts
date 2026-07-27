export interface Channel {
  id: string;
  name: string;
  logo: string;
  group: string;
  url: string;
  licenseType?: string;
  licenseKey?: string;
  userAgent?: string;
}

export const parseM3U = (content: string): Channel[] => {
  const lines = content.split('\n').map(line => line.trim());
  const channels: Channel[] = [];
  
  let currentChannel: Partial<Channel> = {};

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    if (line.includes('|User-Agent=')) {
        // Some URLs have user agent appended like url|User-Agent=...
        const parts = line.split('|User-Agent=');
        line = parts[0];
        currentChannel.userAgent = parts[1];
    }

    if (line.startsWith('#EXTINF:')) {
      // Extract tvg-logo
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      if (logoMatch) currentChannel.logo = logoMatch[1];
      else currentChannel.logo = '';
      
      // Extract group-title
      const groupMatch = line.match(/group-title="([^"]+)"/);
      if (groupMatch) currentChannel.group = groupMatch[1];
      else currentChannel.group = 'Uncategorized';
      
      // Extract name
      const commaIndex = line.lastIndexOf(',');
      if (commaIndex !== -1) {
        currentChannel.name = line.substring(commaIndex + 1).trim();
      } else {
        currentChannel.name = 'Unknown Channel';
      }
      
      // ID generation
      currentChannel.id = Math.random().toString(36).substring(2, 9);
    } 
    else if (line.startsWith('#KODIPROP:inputstream.adaptive.license_type=')) {
      currentChannel.licenseType = line.split('=')[1].trim();
    }
    else if (line.startsWith('#KODIPROP:inputstream.adaptive.license_key=')) {
      currentChannel.licenseKey = line.split('=')[1].trim();
    }
    else if (line.startsWith('#EXTVLCOPT:http-user-agent=')) {
      currentChannel.userAgent = line.substring('#EXTVLCOPT:http-user-agent='.length).trim();
    }
    else if (!line.startsWith('#') && line.length > 0) {
      if (line.includes('===========================')) continue;
      
      currentChannel.url = line;
      if (currentChannel.name && currentChannel.url) {
        channels.push(currentChannel as Channel);
      }
      // Reset for next channel
      currentChannel = {};
    }
  }

  return channels;
};
