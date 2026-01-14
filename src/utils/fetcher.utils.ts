import { CookieJar } from "tough-cookie";
import axios, { AxiosError, AxiosResponse } from "axios";

const jar = new CookieJar();
let axiosInstance: any;

async function getAxiosInstance() {
  if (axiosInstance) return axiosInstance;

  const { wrapper } = await import("axios-cookiejar-support");

  const jar = new CookieJar();
  axiosInstance = wrapper(
    axios.create({
      jar,
      withCredentials: true,
      timeout: 30000,
    })
  );

  return axiosInstance;
}

const SELECTED_HOST = process.env.MOVIEBOX_API_HOST || "h5.aoneroom.com";
const HOST_URL = `https://${SELECTED_HOST}`;

const DEFAULT_HEADERS = {
  'X-Client-Info': '{"timezone":"Africa/Nairobi"}',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept': 'application/json',
  'User-Agent': 'okhttp/4.12.0',
  'Referer': HOST_URL,
  'Host': SELECTED_HOST,
  'Connection': 'keep-alive',
  'X-Forwarded-For': '1.1.1.1',
  'CF-Connecting-IP': '1.1.1.1',
  'X-Real-IP': '1.1.1.1'
};

let movieboxAppInfo = null;
let cookiesInitialized = false;

export function processApiResponse(response: AxiosResponse) {
  if (response.data && response.data.data) {
    return response.data.data;
  }
  return response.data || response;
}

async function ensureCookiesAreAssigned() {
  if (!cookiesInitialized) {
    try {
      console.log('Initializing session cookies...');
      const client = await getAxiosInstance();
      const response = await client.get(`${HOST_URL}/wefeed-h5-bff/app/get-latest-app-pkgs?app_name=moviebox`, {
        headers: DEFAULT_HEADERS
      });

      movieboxAppInfo = processApiResponse(response);
      cookiesInitialized = true;
      console.log('Session cookies initialized successfully');

      // Log available cookies for debugging
      if (response.headers['set-cookie']) {
        console.log('Received cookies:', response.headers['set-cookie']);
      }

    } catch (error) {
      console.error('Failed to get app info:', (error as AxiosError).message);
      throw error;
    }
  }
  return cookiesInitialized;
}

export async function makeApiRequestWithCookies(url: string, options: Record<string, any> = {}) {
  await ensureCookiesAreAssigned();

  const config = {
    url: url,
    headers: { ...DEFAULT_HEADERS, ...options.headers },
    withCredentials: true,
    ...options
  };

  try {
    const client = await getAxiosInstance();
    const response = await client(config);
    return response;
  } catch (error) {
    console.error(`Request with cookies to ${url} failed:`, (error as AxiosError).response?.status, (error as AxiosError).response?.statusText);
    throw error;
  }
}

