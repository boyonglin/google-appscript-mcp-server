import { getAuthHeaders } from '../../../lib/oauth-helper.js';

/**
 * Function to list all Google Apps Script projects via Google Drive API.
 * Searches for files with mimeType 'application/vnd.google-apps.script'.
 *
 * @param {Object} args - Arguments for the request.
 * @param {number} [args.pageSize=50] - Maximum number of projects to return.
 * @param {string} [args.pageToken] - Token for fetching the next page of results.
 * @param {string} [args.query] - Additional search query to filter projects by name.
 * @returns {Promise<Object>} - List of script projects.
 */
const executeFunction = async ({ pageSize = 50, pageToken, query }) => {
  const baseUrl = 'https://www.googleapis.com/drive/v3/files';

  try {
    console.log('🔍 Listing Google Apps Script projects...');

    const url = new URL(baseUrl);

    // Filter for Apps Script files
    let q = "mimeType='application/vnd.google-apps.script' and trashed=false";
    if (query) {
      q += ` and name contains '${query.replace(/'/g, "\\'")}'`;
    }

    url.searchParams.append('q', q);
    url.searchParams.append('pageSize', String(pageSize));
    url.searchParams.append('fields', 'nextPageToken,files(id,name,createdTime,modifiedTime,owners)');
    url.searchParams.append('orderBy', 'modifiedTime desc');

    if (pageToken) {
      url.searchParams.append('pageToken', pageToken);
    }

    console.log('🌐 API URL:', url.toString());

    const headers = await getAuthHeaders();
    console.log('🔐 Authorization headers obtained successfully');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers
    });

    console.log('📡 API Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      const detailedError = {
        status: response.status,
        statusText: response.statusText,
        url: url.toString(),
        error: errorData,
        timestamp: new Date().toISOString()
      };

      console.error('❌ API Error Details:', JSON.stringify(detailedError, null, 2));
      throw new Error(`API Error (${response.status}): ${errorData.error?.message || errorData.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const projects = (data.files || []).map(file => ({
      scriptId: file.id,
      name: file.name,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
      owner: file.owners?.[0]?.emailAddress || 'unknown'
    }));

    console.log(`✅ Found ${projects.length} Apps Script project(s)`);

    return {
      projects,
      totalCount: projects.length,
      nextPageToken: data.nextPageToken || null
    };

  } catch (error) {
    console.error('❌ Error listing script projects:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    return {
      error: true,
      message: error.message,
      details: {
        timestamp: new Date().toISOString(),
        errorType: error.name || 'Unknown'
      }
    };
  }
};

/**
 * Tool configuration for listing Google Apps Script projects.
 * Uses Google Drive API to discover all script files.
 * @type {Object}
 */
const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'script_projects_list',
      description: 'List all Google Apps Script projects owned by or shared with the authenticated user. Uses Google Drive API to discover script files.',
      parameters: {
        type: 'object',
        properties: {
          pageSize: {
            type: 'number',
            description: 'Maximum number of projects to return (1-100).',
            default: 50
          },
          pageToken: {
            type: 'string',
            description: 'Token for fetching the next page of results.'
          },
          query: {
            type: 'string',
            description: 'Filter projects by name (partial match).'
          }
        },
        required: []
      }
    }
  }
};

export { apiTool };
