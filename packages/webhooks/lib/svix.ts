import "server-only";
import { Svix } from "svix";
import { keys } from "../keys";

const svixToken = keys().SVIX_TOKEN;

/**
 * SVIX_TOKEN is optional, so "not configured" is a normal state rather than a
 * failure: callers get null and decide what to show. The workspace id is
 * supplied by the caller because this app is single-tenant and the package
 * must not reach into app-level constants.
 */
const getClient = (): Svix | null =>
  svixToken ? new Svix(svixToken) : null;

export const send = async (
  workspaceId: string,
  eventType: string,
  payload: object
) => {
  const svix = getClient();

  if (!svix) {
    return null;
  }

  return svix.message.create(workspaceId, {
    eventType,
    payload: {
      eventType,
      ...payload,
    },
    application: {
      name: workspaceId,
      uid: workspaceId,
    },
  });
};

export const getAppPortal = async (workspaceId: string) => {
  const svix = getClient();

  if (!svix) {
    return null;
  }

  return svix.authentication.appPortalAccess(workspaceId, {
    application: {
      name: workspaceId,
      uid: workspaceId,
    },
  });
};
