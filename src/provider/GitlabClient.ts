import fetch, { RequestInit, Response } from 'node-fetch';
import {
  GitLabUser,
  GitLabGroup,
  GitLabProject,
  GitLabMergeRequest,
  GitLabUserRef,
} from './types';

export enum HttpMethod {
  GET = 'get',
  POST = 'post',
}

export enum ClientMode {
  SELF_HOSTED = 'self_hosted',
  SAAS = 'saas',
}

export class GitlabClient {
  // Might be not needed at all, but lets see
  private readonly clientMode: ClientMode;
  private readonly baseUrl: string;
  private readonly personalToken: string;

  constructor(baseUrl: string, personalToken: string) {
    this.clientMode = baseUrl.match(/gitlab.com/)
      ? ClientMode.SAAS
      : ClientMode.SELF_HOSTED;
    this.baseUrl = baseUrl;
    this.personalToken = personalToken;
  }

  // Works in both environments (returns auth-ed user)
  async fetchAccount(): Promise<GitLabUser> {
    return this.makeRequest(HttpMethod.GET, '/user');
  }

  // Works in both environments (returns all groups based on auth-ed user)
  async fetchGroups(): Promise<GitLabGroup[]> {
    return this.makeRequest(HttpMethod.GET, '/groups');
  }

  // Needs testing, might work in both environment (not used currently, we're getting projects different way)
  async fetchProjects(): Promise<GitLabProject[]> {
    return this.makeRequest(HttpMethod.GET, '/projects');
  }

  // Shouldn't be used for either environment (we want to grab users different way)
  async fetchUsers(): Promise<GitLabUser[]> {
    return await this.makeRequest(HttpMethod.GET, '/user');
  }

  async fetchProjectMergeRequests(
    projectId: number,
  ): Promise<GitLabMergeRequest[]> {
    return this.makeRequest(
      HttpMethod.GET,
      `/projects/${projectId}/merge_requests`,
    );
  }

  async fetchProjectMembers(projectId: number): Promise<GitLabUserRef[]> {
    return this.makeRequest(
      HttpMethod.GET,
      `/projects/${projectId}/members/all`,
    );
  }

  async fetchGroupMembers(groupId: number): Promise<GitLabUserRef[]> {
    return this.makeRequest(HttpMethod.GET, `/groups/${groupId}/members/all`);
  }

  async fetchGroupProjects(groupId: number): Promise<GitLabProject[]> {
    return this.makeRequest(HttpMethod.GET, `/groups/${groupId}/projects`);
  }

  async fetchGroupSubgroups(groupId: number): Promise<GitLabGroup[]> {
    return this.makeRequest(HttpMethod.GET, `/groups/${groupId}/subgroups`);
  }

  private async makeRequest<T>(method: HttpMethod, url: string): Promise<T> {
    const options: RequestInit = {
      method,
      headers: {
        'Private-Token': this.personalToken,
      },
    };

    const response: Response = await fetch(
      `${this.baseUrl}/api/v4${url}`,
      options,
    );

    if (!response) {
      throw new Error(`No response from '${this.baseUrl}/api/v4${url}'`);
    }

    if (!response.status.toString().startsWith('2')) {
      throw new Error(`No response from '${this.baseUrl}/api/v4${url}'`);
    }

    const responseBody: string = await response.text();

    return responseBody.length > 0 &&
      response.headers.get('content-type').match(/json/i)
      ? JSON.parse(responseBody)
      : {};
  }
}
