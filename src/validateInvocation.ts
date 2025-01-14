import {
  IntegrationExecutionContext,
  IntegrationValidationError,
} from '@jupiterone/integration-sdk-core';

import { createGitlabClient } from './provider/index';
import { GitlabIntegrationConfig } from './types';

export default async function validateInvocation({
  instance,
  logger,
}: IntegrationExecutionContext<GitlabIntegrationConfig>): Promise<void> {
  const config = instance.config;

  if (!config.baseUrl || !config.personalToken) {
    throw new IntegrationValidationError(
      'Integration configuration requires all of {baseUrl, personalToken}',
    );
  }

  if (config.baseUrl.endsWith('/')) {
    config.baseUrl = config.baseUrl.slice(0, -1);
  }

  if (config.mergeRequestsUpdatedAfter) {
    config.mergeRequestsUpdatedAfter = new Date(
      config.mergeRequestsUpdatedAfter,
    );
  } else {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    config.mergeRequestsUpdatedAfter = sevenDaysAgo;
  }

  const client = createGitlabClient(instance.config, logger);
  await client.fetchAccount();
}
