"use server";

import { auth, clerkClient, type User } from "@repo/auth/server";

const getName = (user: User): string | undefined => {
  let name = user.firstName;

  if (name && user.lastName) {
    name = `${name} ${user.lastName}`;
  } else if (!name) {
    name = user.emailAddresses.at(0)?.emailAddress ?? null;
  }

  return name ?? undefined;
};

const colors = [
  "var(--color-red-500)",
  "var(--color-orange-500)",
  "var(--color-amber-500)",
  "var(--color-yellow-500)",
  "var(--color-lime-500)",
  "var(--color-green-500)",
  "var(--color-emerald-500)",
  "var(--color-teal-500)",
  "var(--color-cyan-500)",
  "var(--color-sky-500)",
  "var(--color-blue-500)",
  "var(--color-indigo-500)",
  "var(--color-violet-500)",
  "var(--color-purple-500)",
  "var(--color-fuchsia-500)",
  "var(--color-pink-500)",
  "var(--color-rose-500)",
];

export const getUsers = async (
  userIds: string[]
): Promise<
  | {
      data: Liveblocks["UserMeta"]["info"][];
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

    // Single-tenant: every signed-in user is part of the same workspace.
    const users = await clerk.users.getUserList({
      userId: userIds,
      limit: 100,
    });

    const data: Liveblocks["UserMeta"]["info"][] = users.data.map((user) => ({
      name: getName(user) ?? "Unknown user",
      picture: user.imageUrl ?? "",
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    return { data };
  } catch (error) {
    return { error };
  }
};
