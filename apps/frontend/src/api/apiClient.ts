import axios, { type AxiosInstance } from 'axios';
import { getIdToken } from '../auth/cognito';

export interface AvailabilityFields {
  mondayAvailability: string;
  tuesdayAvailability: string;
  wednesdayAvailability: string;
  thursdayAvailability: string;
  fridayAvailability: string;
  saturdayAvailability: string;
}

export interface Application extends AvailabilityFields {
  appId: number;
  email: string;
  discipline: string;
  appStatus: string;
  experienceType: string;
  interest: string[];
  license: string;
  phone: string;
  applicantType: string;
  school: string;
  weeklyHours: number;
  pronouns: string;
  resume: string;
  coverLetter: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
}

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
