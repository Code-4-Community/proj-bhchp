import axios, { type AxiosInstance } from 'axios';
import { getIdToken } from '../auth/cognito';
import {
  Application,
  AvailabilityFields,
  LearnerInfo,
  User,
  VolunteerInfo,
} from './types';

const defaultBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

// Shared HTTP client for the app.
// A request interceptor attaches the Cognito ID token to every protected call
// so the backend can authenticate the request before loading application data.
export class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({ baseURL: defaultBaseUrl });

    this.axiosInstance.interceptors.request.use(async (config) => {
      const idToken = await getIdToken();

      // Log request metadata for debugging the signin -> backend user fetch flow
      try {
        console.debug('[api] Request', {
          method: config.method,
          url: config.url,
          hasAuth: !!idToken,
        });
      } catch {
        // swallow logging errors
      }

      if (idToken) {
        // NestJS reads this header in the JWT strategy.
        config.headers = config.headers ?? {};
        (
          config.headers as Record<string, string>
        ).Authorization = `Bearer ${idToken}`;
      }

      return config;
    });

    // Response interceptor to log responses for the user lookup path
    this.axiosInstance.interceptors.response.use(
      (response) => {
        try {
          const url = response.config.url ?? '';
          if (url.includes('/api/users/email')) {
            console.debug('[api] Response for getUserByEmail', {
              url,
              status: response.status,
              // Avoid printing full user object in logs in case of sensitive fields; print userType when available
              userType: response.data?.userType,
            });
          }
        } catch {
          /* noop */
        }

        return response;
      },
      (error) => {
        try {
          const cfg = error?.config;
          if (cfg?.url && cfg.url.includes('/api/users/email')) {
            console.error('[api] Error response for getUserByEmail', {
              url: cfg.url,
              message: error?.message,
            });
          }
        } catch {
          /* noop */
        }
        return Promise.reject(error);
      },
    );
  }

  public async getHello(): Promise<string> {
    return this.get('/api') as Promise<string>;
  }

  public async getApplication(appId: number): Promise<Application> {
    return this.get(`/api/applications/${appId}`) as Promise<Application>;
  }

  public async getVolunteerInfo(appId: number): Promise<VolunteerInfo> {
    return this.get(`/api/volunteer_info/${appId}`) as Promise<VolunteerInfo>;
  }

  public async getUserByEmail(email: string): Promise<User | null> {
    return this.get(
      `/api/users/email/${encodeURIComponent(email)}`,
    ) as Promise<User | null>;
  }

  public async getLearnerInfo(appId: number): Promise<LearnerInfo> {
    return this.get(`/api/learner_info/${appId}`) as Promise<LearnerInfo>;
  }

  public async updateAvailability(
    appId: number,
    availability: Partial<AvailabilityFields>,
  ): Promise<Application> {
    return this.patch(
      `/api/applications/${appId}/availability`,
      availability,
    ) as Promise<Application>;
  }

  private async get(path: string): Promise<unknown> {
    return this.axiosInstance.get(path).then((response) => response.data);
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    return this.axiosInstance
      .post(path, body)
      .then((response) => response.data);
  }

  private async patch(path: string, body: unknown): Promise<unknown> {
    return this.axiosInstance
      .patch(path, body)
      .then((response) => response.data);
  }

  private async delete(path: string): Promise<unknown> {
    return this.axiosInstance.delete(path).then((response) => response.data);
  }
}

export default new ApiClient();
