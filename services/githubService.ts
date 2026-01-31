import { GitHubConfig } from '../types';

// Helper for UTF-8 Safe Base64 Encoding/Decoding
// GitHub API requires Base64, but btoa/atob fails with Unicode (Chinese) characters
const utf8_to_b64 = (str: string) => {
  return window.btoa(unescape(encodeURIComponent(str)));
};

const b64_to_utf8 = (str: string) => {
  return decodeURIComponent(escape(window.atob(str)));
};

export const GitHubService = {
  // Check if config is valid
  validateConfig: (config: GitHubConfig) => {
    return config.token && config.owner && config.repo;
  },

  // Get current file SHA and Content
  getFile: async (config: GitHubConfig) => {
    if (!GitHubService.validateConfig(config)) throw new Error("Missing Configuration");

    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}?ref=${config.branch}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (response.status === 404) {
      return null; // File doesn't exist yet
    }

    if (!response.ok) {
      throw new Error(`GitHub API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = b64_to_utf8(data.content.replace(/\n/g, '')); // Remove newlines from base64
    
    return {
      sha: data.sha,
      content: content
    };
  },

  // Save/Update file
  saveFile: async (config: GitHubConfig, content: string, sha?: string, message: string = "Update data via LabNote Pro") => {
    if (!GitHubService.validateConfig(config)) throw new Error("Missing Configuration");

    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`;
    
    const body: any = {
      message: message,
      content: utf8_to_b64(content),
      branch: config.branch
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`GitHub Save Error: ${err.message}`);
    }

    return await response.json();
  }
};