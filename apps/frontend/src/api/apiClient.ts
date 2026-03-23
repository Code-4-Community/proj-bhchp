import axios, { type AxiosInstance } from 'axios';
import { getIdToken } from '../auth/cognito';
import {
  Application,
  AvailabilityFields,
  LearnerInfo,
  VolunteerInfo,
} from './types';

const defaultBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({ baseURL: defaultBaseUrl });

    this.axiosInstance.interceptors.request.use(async (config) => {
      const idToken = await getIdToken();

      if (idToken) {
        config.headers = config.headers ?? {};
        (
          config.headers as Record<string, string>
        ).Authorization = `Bearer ${idToken}`;
      }

      return config;
    });
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
