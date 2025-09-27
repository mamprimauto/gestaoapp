/**
 * Safe fetch wrapper that bypasses extension interference
 */

// Store original fetch reference
const originalFetch = typeof window !== 'undefined' 
  ? window.fetch.bind(window)
  : fetch;

// Create a safe fetch that fallbacks if extensions interfere
export async function safeFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // Check if this is a progress endpoint that we should silence 401s for
  const isProgressEndpoint = typeof input === 'string' && 
    input.includes('/api/courses/progress');
  
  try {
    // Override console methods temporarily for progress endpoints
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    if (isProgressEndpoint) {
      console.error = () => {};
      console.warn = () => {};
    }
    
    // Try with original fetch first
    const response = await originalFetch(input, init);
    
    // Restore console methods
    if (isProgressEndpoint) {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    }
    
    return response;
  } catch (error: any) {
    // If it's an extension error, try alternative approaches
    if (error?.message?.includes('Failed to fetch') || 
        error?.message?.includes('chrome-extension')) {

      // Try XMLHttpRequest as fallback for same-origin requests
      if (typeof window !== 'undefined' && typeof input === 'string' && 
          (input.startsWith('/') || input.startsWith(window.location.origin))) {
        
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const method = init?.method || 'GET';
          
          xhr.open(method, input.toString());
          
          // Set headers
          if (init?.headers) {
            const headers = init.headers;
            if (headers instanceof Headers) {
              headers.forEach((value, key) => {
                xhr.setRequestHeader(key, value);
              });
            } else if (Array.isArray(headers)) {
              headers.forEach(([key, value]) => {
                xhr.setRequestHeader(key, value);
              });
            } else {
              Object.entries(headers).forEach(([key, value]) => {
                xhr.setRequestHeader(key, String(value));
              });
            }
          }
          
          xhr.onload = () => {
            const headers = new Headers();
            const headerStr = xhr.getAllResponseHeaders();
            headerStr.split('\r\n').forEach(line => {
              const [key, value] = line.split(': ');
              if (key && value) headers.append(key, value);
            });
            
            resolve(new Response(xhr.responseText, {
              status: xhr.status,
              statusText: xhr.statusText,
              headers
            }));
          };
          
          xhr.onerror = () => {
            reject(new Error('Network request failed'));
          };
          
          // Send request
          if (init?.body) {
            xhr.send(init.body as any);
          } else {
            xhr.send();
          }
        });
      }
    }
    
    // Re-throw if not an extension error
    throw error;
  }
}

// Override global fetch if in browser
if (typeof window !== 'undefined') {
  // Store safe fetch globally
  (window as any).__safeFetch = safeFetch;
}