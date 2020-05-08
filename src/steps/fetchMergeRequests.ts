import {
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  createIntegrationEntity,
} from '@jupiterone/integration-sdk';

import { createGitlabClient } from '../provider';
import {
  STEP_ID as PROJECT_STEP,
  PROJECT_TYPE,
  createProjectEntityIdentifier,
} from './fetchProjects';
import { GitLabMergeRequest } from '../provider/types';
import { createUserEntityIdentifier } from './fetchUsers';

export const STEP_ID = 'fetch-merge-requests';
export const MERGE_REQUEST_TYPE = 'gitlab_merge_request';

const step: IntegrationStep = {
  id: STEP_ID,
  name: 'Fetch merge requests',
  types: [MERGE_REQUEST_TYPE],
  dependsOn: [PROJECT_STEP],
  async executionHandler({
    instance,
    jobState,
  }: IntegrationStepExecutionContext) {
    const client = createGitlabClient(instance);

    await jobState.iterateEntities({ _type: PROJECT_TYPE }, async (project) => {
      const [, id] = project.id.toString().split(':');

      const mergeRequests = await client.fetchProjectMergeRequests(
        parseInt(id, 10),
      );

      await jobState.addEntities(
        mergeRequests.map((mergeRequest) =>
          createMergeRequestEntity(mergeRequest, project.displayName),
        ),
      );
    });
  },
};

export function createMergeRequestEntity(
  mergeRequest: GitLabMergeRequest,
  projectName: string,
): Entity {
  const id = createMergeRequestEntityIdentifier(mergeRequest.id);

  return createIntegrationEntity({
    entityData: {
      source: mergeRequest,
      assign: {
        _key: id,
        _type: MERGE_REQUEST_TYPE,
        _class: ['Review', 'PR'],

        id,
        iid: mergeRequest.iid,
        projectId: createProjectEntityIdentifier(mergeRequest.project_id),
        name: mergeRequest.title,
        title: mergeRequest.title,
        state: mergeRequest.state,
        source: mergeRequest.source_branch,
        target: mergeRequest.target_branch,
        repository: projectName,
        createdOn: new Date(mergeRequest.created_at).getTime(),
        authorId: createUserEntityIdentifier(mergeRequest.author.id),
        webLink: mergeRequest.web_url,
        mergeWhenPipelineSucceeds: mergeRequest.merge_when_pipeline_succeeds,
        shouldRemoveSourceBranch: mergeRequest.should_remove_source_branch,
        forceRemoveSourceBranch: mergeRequest.force_remove_source_branch,
        allowCollaboration: mergeRequest.allow_collaboration,
        allowMaintainerToPush: mergeRequest.allow_maintainer_to_push,
        squash: mergeRequest.squash,
      },
    },
  });
}

const MERGE_REQUEST_ID_PREFIX = 'gitlab-merge-request';
export function createMergeRequestEntityIdentifier(id: number): string {
  return `${MERGE_REQUEST_ID_PREFIX}:${id}`;
}

export default step;
