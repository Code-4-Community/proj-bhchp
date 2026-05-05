/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { type AxiosInstance } from 'axios';
import { getIdToken } from '../auth/cognito';
import { useCallback, useEffect, useState } from 'react';
import {
  AdminInfo,
  Application,
  AppStatus,
  AvailabilityFields,
  CandidateInfo,
  ConfidentialityFormResponse,
  ConfidentialityTemplateResponse,
  LearnerInfo,
  ProvisionAdminRequest,
  ProvisionAdminResponse,
  UploadConfidentialityFormResponse,
  DisciplineAdminMap,
  DisciplineCatalogItem,
  User,
} from './types';

const defaultBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({ baseURL: defaultBaseUrl });
    this.axiosInstance.interceptors.request.use(async (config) => {
      try {
        const idToken = await getIdToken();
        if (idToken) {
          if (!config.headers) config.headers = {} as any;
          const hasAuth =
            (config.headers as any).Authorization ||
            (config.headers as any)['Authorization'];
          if (!hasAuth) {
            (config.headers as any)['Authorization'] = `Bearer ${idToken}`;
            console.debug(
              'ApiClient: attached Authorization header from getIdToken',
            );
          }
        } else {
          console.debug('ApiClient: no idToken available from getIdToken');
        }
      } catch (err) {
        console.debug('ApiClient: error while retrieving idToken', err);
      }

      return config;
    });
  }

  public async getHello(): Promise<string> {
    return this.get('/api') as Promise<string>;
  }

  public async getApplications(): Promise<Application[]> {
    return this.get('/api/applications') as Promise<Application[]>;
  }

  public async getApplicationsByDiscipline(
    discipline: string,
  ): Promise<Application[]> {
    return this.get(
      `/api/applications/by-discipline?discipline=${encodeURIComponent(
        discipline,
      )}`,
    ) as Promise<Application[]>;
  }

  public async getApplicationsByDisciplines(
    disciplines: string[],
  ): Promise<Application[]> {
    const value = disciplines.map((discipline) => discipline.trim()).join(',');
    return this.get(
      `/api/applications/by-disciplines?disciplines=${encodeURIComponent(
        value,
      )}`,
    ) as Promise<Application[]>;
  }

  public async getDisciplines(): Promise<DisciplineCatalogItem[]> {
    return this.get('/api/disciplines') as Promise<DisciplineCatalogItem[]>;
  }

  public async getApplication(appId: number): Promise<Application> {
    return this.get(`/api/applications/${appId}`) as Promise<Application>;
  }

  public async getApplicants(): Promise<User[]> {
    return this.get('/api/users/standard') as Promise<User[]>;
  }

  public async getLearnerInfo(appId: number): Promise<LearnerInfo> {
    return this.get(`/api/learner_info/${appId}`) as Promise<LearnerInfo>;
  }

  public async getCandidateInfoByEmail(email: string): Promise<CandidateInfo> {
    return this.get(
      `/api/CandidateInfo/email/${encodeURIComponent(email)}`,
    ) as Promise<CandidateInfo>;
  }

  public async getUser(email: string): Promise<User> {
    return this.get(`/api/users/email/${email}`) as Promise<User>;
  }

  public async getAdminInfoByEmail(email: string): Promise<AdminInfo | null> {
    return this.get(
      `/api/admin-info/by-email/${encodeURIComponent(email)}`,
    ) as Promise<AdminInfo | null>;
  }

  public async getDisciplineAdminMap(): Promise<DisciplineAdminMap> {
    return this.get(
      '/api/admin-info/discipline-admin-map',
    ) as Promise<DisciplineAdminMap>;
  }

  public async provisionAdmin(
    payload: ProvisionAdminRequest,
  ): Promise<ProvisionAdminResponse> {
    return this.post(
      '/api/admins/provision',
      payload,
    ) as Promise<ProvisionAdminResponse>;
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

  public async updateApplicationStatus(
    appId: number,
    appStatus: AppStatus,
  ): Promise<Application> {
    return this.patch(`/api/applications/${appId}/status`, {
      appStatus,
    }) as Promise<Application>;
  }

  public async updateApplicationProposedStartDate(
    appId: number,
    proposedStartDate: string,
  ): Promise<Application> {
    return this.patch(`/api/applications/${appId}/start-date`, {
      proposedStartDate,
    }) as Promise<Application>;
  }

  public async updateApplicationActualStartDate(
    appId: number,
    actualStartDate: string,
  ): Promise<Application> {
    return this.patch(`/api/applications/${appId}/actual-start-date`, {
      actualStartDate,
    }) as Promise<Application>;
  }

  public async updateApplicationEndDate(
    appId: number,
    endDate: string,
  ): Promise<Application> {
    return this.patch(`/api/applications/${appId}/end-date`, {
      endDate,
    }) as Promise<Application>;
  }

  public async getConfidentialityTemplateUrl(): Promise<ConfidentialityTemplateResponse> {
    return this.get(
      '/api/applications/forms/confidentiality/template',
    ) as Promise<ConfidentialityTemplateResponse>;
  }

  public async getMyConfidentialityForm(): Promise<ConfidentialityFormResponse> {
    return this.get(
      '/api/applications/me/forms/confidentiality',
    ) as Promise<ConfidentialityFormResponse>;
  }

  public async uploadMyConfidentialityForm(
    file: File,
  ): Promise<UploadConfidentialityFormResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.axiosInstance
      .post('/api/applications/me/forms/confidentiality', formData)
      .then((response) => response.data as UploadConfidentialityFormResponse);
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
    console.debug('ApiClient GET: request start', {
      baseURL: defaultBaseUrl,
      path,
    });

    try {
      const response = await this.axiosInstance.get(path);
      console.debug('ApiClient GET: request success', {
        path,
        status: response.status,
      });
      return response.data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error('ApiClient GET: request failed', {
          path,
          status: err.response?.status,
          url: err.config?.url,
          method: err.config?.method,
          data: err.response?.data,
        });
      } else {
        console.error('ApiClient GET: request failed', { path, err });
      }
      throw err;
    }
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

  public async getCurrentUser(): Promise<User | null> {
    return this.get('/api/users/me') as Promise<User | null>;
  }

  public async getCurrentApplication(): Promise<Application | null> {
    return this.get('/api/applications/me') as Promise<Application | null>;
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
