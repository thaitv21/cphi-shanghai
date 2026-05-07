import axios, { type AxiosInstance } from "axios";
import { CPHI_BASE_URL, buildHeaders } from "./config";

export class CphiHttpClient {
  private readonly client: AxiosInstance;

  constructor(cookie: string) {
    this.client = axios.create({
      baseURL: CPHI_BASE_URL,
      timeout: 30_000,
      headers: buildHeaders(cookie),
    });
  }

  async post<TResponse>(path: string, body: URLSearchParams): Promise<TResponse> {
    try {
      const response = await this.client.post<TResponse>(path, body);

      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  private formatError(error: unknown): unknown {
    if (!axios.isAxiosError(error) || !error.response) {
      return error;
    }

    return new Error(
      `CPHI request failed: ${error.response.status} ${error.response.statusText}\n${JSON.stringify(
        error.response.data,
        null,
        2,
      )}`,
    );
  }
}
