"use server";
//we cannot directed create database actions through browser side
//cors does not allow it. the above directed makes it work.
import { revalidatePath } from "next/cache";
import Thread from "../models/thread.model";
import User from "../models/user.model";
import { connectToDB } from "../mongoose";

type Params = {
  text: string;
  author: string;
  communityId: string | null;
  path: string;
};

type AddCommentParams ={
  threadId: string;
  commentText: string;
  userId: string;
  path: string
}

export async function createThread({
  text,
  author,
  communityId,
  path,
}: Params) {
  connectToDB();

  try {
    const createdThread = await Thread.create({
      text,
      author,
      community: null, // Assign communityId if provided, or leave it null for personal account
    });

    await User.findByIdAndUpdate(author, {
      $push: { threads: createdThread._id },
    });

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Could not create thread: ${error.message}`);
  }
}

export async function fetchPosts(pageNumber = 1, pageSize = 20) {
  connectToDB();

  try {
    //calculates the number of documents to skip based on the current page number and the page size.
    const skipAmount = (pageNumber - 1) * pageSize;

    // Fetch the posts that have no parentId(top-level threads...)
    //check if the parentId field matches in value in the array
    const postQuery = Thread.find({ parentId: { $in: [null, undefined] } })
      .sort({ createdAt: "desc" })
      .skip(skipAmount)
      .limit(pageSize)
      .populate({ path: "author", model: "User" })
      .populate({
        path: "children", //comment
        populate: {
          //user that made the comment
          path: "author",
          model: User,
          select: "_id name parentId image",
        },
      });

    const totalPostsCount = await Thread.countDocuments({
      parentId: { $in: [null, undefined] },
    });
    const posts = await postQuery.exec();

    //Determining if There Are More Posts to Fetch:
    const isNext = totalPostsCount > skipAmount + posts.length;

    return { posts, isNext };
  } catch (error: any) {
    throw new Error(`Could not create thread: ${error.message}`);
  }
}

export async function fetchThreadById(id: String) {
  await connectToDB();
  try {
    // TODO: Populate community
    const thread = await Thread.findById(id)
      .populate({
        path: "author",
        model: User,
        select: "_id id name image",
      })
      .populate({
        path: "children",
        model: Thread,
        populate: {
          path: "author",
          model: User,
          select: "_id id name parentId image",
        },
      })
      .exec();

    return thread;
  } catch (error: any) {
    throw new Error(`Error fetching thread: ${error.message}`);
  }
}

export async function addCommentToThread({threadId, commentText, userId, path}: AddCommentParams) {
  await connectToDB();

  try {
     const originalThread = await Thread.findById(threadId);
    
     if (!originalThread) {
       throw new Error("Thread Not Found");
     }

    //  Create a new Thread with comment thread
    const commentThread = new Thread({
      text: commentText,
      author: userId,
      parentId: threadId
    })
    const savedCommentThread = await commentThread.save();
   

    // // update the original thread to include the comment thread Id
    originalThread.children.push(savedCommentThread._id);
    // save original thread
    await originalThread.save();

    revalidatePath(path)

  } catch (error: any) {
    throw new Error(`Error adding comment to thread: ${error.message}`);
  }
}


