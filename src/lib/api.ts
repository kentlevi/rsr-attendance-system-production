import { auth } from './firebase';

const BASE_URL = typeof window !== 'undefined' && window.location.protocol.startsWith('http') && !window.location.hostname.includes('localhost') && !window.location.protocol.includes('capacitor') 
    ? '' 
    : 'https://ais-pre-tw46rmcl7obttb2wrr7agj-564595886567.asia-southeast1.run.app';

export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await auth.currentUser?.getIdToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const fullUrl = url.startsWith('/api') ? `${BASE_URL}${url}` : url;
  
  return fetch(fullUrl, {
    ...options,
    headers
  });
}
