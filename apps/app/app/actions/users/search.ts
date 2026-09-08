"use server";

import { auth, clerkClient, type User } from "@repo/auth/server";
import Fuse from "fuse.js";

const getName = (user: User): string | undefined => {
  let name = user.firstName;

  if (name && user.lastName) {
    name = `${name} ${user.lastName}`;
  } else if (!name) {
    name = user.emailAddresses.at(0)?.emailAddress ?? null;
  }

  return name ?? undefined;
};

export const searchUsers = async (
  query: string
): Promise<
  | {
      data: string[];
    }
  | {
      error: unknown;
    }
> => {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error("Not logged in");
    }

    const clerk = await clerkClient();

    // Single-tenant: mentions can resolve to any user in the instance.
    const members = await clerk.users.getUserList({ limit: 100 });

    const users = members.data.map((user) => ({
      id: user.id,
      name: getName(user),
      imageUrl: user.imageUrl,
    }));

    const fuse = new Fuse(users, {
      keys: ["name"],
      minMatchCharLength: 1,
      threshold: 0.3,
    });

    const results = fuse.search(query);
    const data = results.map((result) => result.item.id);

    return { data };
  } catch (error) {
    return { error };
  }
};
