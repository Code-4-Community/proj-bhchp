import axios, { AxiosError, type AxiosInstance } from 'axios';
import { getIdToken } from '../auth/cognito';
import { useCallback, useEffect, useState } from 'react';
import {
  Application,
  AvailabilityFields,
  LearnerInfo,
  User,
  VolunteerInfo,
} from './types';

const defaultBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

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

    // Response interceptor kept for future request-specific diagnostics.
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: unknown) => {
        if (error instanceof AxiosError) {
          console.error('[api] Response error', {
            method: error.config?.method,
            url: error.config?.url,
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
          });
        } else {
          console.error('[api] Unknown response error', error);
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

  public async getCurrentUser(): Promise<User | null> {
    return this.get('/api/users/me') as Promise<User | null>;
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

  public async getTotalApplicationsCount(): Promise<number> {
    const response = (await this.get('/api/applications/count/total')) as {
      count: number;
    };
    return response.count;
  }

  public async getInReviewApplicationsCount(): Promise<number> {
    const response = (await this.get('/api/applications/count/in-review')) as {
      count: number;
    };
    return response.count;
  }

  public async getRejectedApplicationsCount(): Promise<number> {
    const response = (await this.get('/api/applications/count/rejected')) as {
      count: number;
    };
    return response.count;
  }

  public async getApprovedApplicationsCount(): Promise<number> {
    const response = (await this.get('/api/applications/count/approved')) as {
      count: number;
    };
    return response.count;
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

const apiClient = new ApiClient();
export default apiClient;

type CountHookResult = {
  count: number;
  isLoading: boolean;
  error: Error | null;
};

function useCount(
  getter: () => Promise<number>,
  initialCount = 0,
): CountHookResult {
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    getter()
      .then((value) => {
        if (mounted) {
          setCount(value);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [getter]);

  return { count, isLoading, error };
}

export function useTotalApplicationsCount(): CountHookResult {
  const getter = useCallback(() => apiClient.getTotalApplicationsCount(), []);
  return useCount(getter);
}

export function useInReviewApplicationsCount(): CountHookResult {
  const getter = useCallback(
    () => apiClient.getInReviewApplicationsCount(),
    [],
  );
  return useCount(getter);
}

export function useRejectedApplicationsCount(): CountHookResult {
  const getter = useCallback(
    () => apiClient.getRejectedApplicationsCount(),
    [],
  );
  return useCount(getter);
}

export function useApprovedApplicationsCount(): CountHookResult {
  const getter = useCallback(
    () => apiClient.getApprovedApplicationsCount(),
    [],
  );
  return useCount(getter);
}
