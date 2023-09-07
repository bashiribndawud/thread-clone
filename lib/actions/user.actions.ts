"use server";

import { revalidatePath } from "next/cache";
import User from "../models/user.model";
import { connectToDB } from "../mongoose";
import Thread from "../models/thread.model";

type Params = {
  userId: string;
  name: string;
  bio: string;
  image: string;
  path: string;
  username: string;
};

export async function updateUser({
  userId,
  name,
  bio,
  image,
  path,
  username,
}: Params): Promise<void> {
  connectToDB();

  try {
    await User.findOneAndUpdate(
      { id: userId },
      {
        username: username.toLowerCase(),
        name,
        bio,
        image,
        onboarded: true,
      },
      { upsert: true }
    );
    //Revalidation is a feature in Next.js that allows you to refresh and update specific pages or data on-demand
    //ensuring that certain paths are refreshed when necessary.
    if (path === "/profile/edit") {
      revalidatePath(path);
    }
  } catch (error: any) {
    throw new Error(`Failed to create/update user: ${error.message}`);
  }
}

export async function fetchUser(userId: string) {
  connectToDB();

  try {
    return await User.findOne({ id: userId });
    // .populate({
    //   path: 'communities',
    //   model: 'Community'
    // })
  } catch (error: any) {
    throw new Error(`Could not find user ${error.message}`);
  }
}

export async function fetchUserPost(userId: string) {
  try {
    connectToDB();

    // find all threads authored by a user with the given user id;
    const threads = await User.findOne({ id: userId }).populate({
      path: "threads",
      model: Thread,
      populate: {
        path: "children",
        model: Thread,
        populate: {
          path: "author",
          model: User,
          select: "name image id",
        },
      },
    });
  } catch (error: any) {
    throw new Error(`Error adding comment to thread: ${error.message}`);
  }
}
