"use server";

import { revalidatePath } from "next/cache";
import User from "../models/user.model";
import { connectToDB } from "../mongoose";
import Thread from "../models/thread.model";
import { FilterQuery, SortOrder } from "mongoose";

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
      populate: [
        // {
        //   path: "community",
        //   model: Community,
        //   select: "name id image _id", // Select the "name" and "_id" fields from the "Community" model
        // },
        {
          path: "children",
          model: Thread,
          populate: {
            path: "author",
            model: User,
            select: "name image id", // Select the "name" and "_id" fields from the "User" model
          },
        },
      ],
    });
    return threads;
  } catch (error: any) {
    throw new Error(`Error adding comment to thread: ${error.message}`);
  }
}

export async function fetchUsers({
  userId,
  searchString = "",
  pageNumber = 1,
  pageSize = 20,
  sortBy = "desc",
}: {
  userId: string;
  searchString?: string;
  pageNumber?: number;
  pageSize?: number;
  sortBy?: SortOrder;
}) {
  try {
    connectToDB();

    // Calculate the number of users to skip based on the page number and page size.
    const skipAmount = (pageNumber - 1) * pageSize; //default pageNumber=1, pageSize=20

    // Create a case-insensitive regular expression for the provided search string.
    const regex = new RegExp(searchString, "i");

    // Create an initial query object to filter users.
    const query: FilterQuery<typeof User> = {
      id: { $ne: userId }, // Exclude the current user from the results.
    };

    // If the search string is not empty, add the $or operator to match either username or name fields.
    if (searchString.trim() !== "") {
      query.$or = [
        { username: { $regex: regex } },
        { name: { $regex: regex } },
      ];
    }

    // Define the sort options for the fetched users based on createdAt field and provided sort order.
    const sortOptions = { createdAt: sortBy };

    // User.find({id: {$ne: userId}, $or: [{username:{$regex: regex}}, {name: {$regex: regex}}]})

    const usersQuery = User.find(query)
      .sort(sortOptions)
      .skip(skipAmount)
      .limit(pageSize);

    // Count the total number of users that match the search criteria (without pagination).
    const totalUsersCount = await User.countDocuments(query);

    const users = await usersQuery.exec();

    // Check if there are more users beyond the current page.
    const isNext = totalUsersCount > skipAmount + users.length;

    return { users, isNext };
  } catch (error: any) {
    console.error("Error fetching users:", error);
    throw error;
  }
}

export async function getActitvity(userId: string) {
  try {
    connectToDB();

    // find all thread created the user

    const userThreads = await Thread.find({ author: userId });
    
    // collect all the child thread ids(replies) from the children

    const childThreadsIds: [] = userThreads.reduce((acc, userThread) => {
      return acc.concat(userThread.children);
    }, []);
    

    const replies = await Thread.find({
      _id: { $in: childThreadsIds },
      author: { $ne: userId },
    }).populate({
      path: "author",
      model: User,
      select: "name image _id",
    });

    return  replies ;
  } catch (error: any) {
    console.error("Failed to fetch activity:", `${error.message}`);
  }
}
