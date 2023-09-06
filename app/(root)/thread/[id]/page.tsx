import ThreadCard from '@/components/cards/ThreadCard';
import React from 'react'

const Page = ({params}: {params: {id: string}}) => {
  return (
    <section className="relative">
      <ThreadCard
        key={post._id}
        id={post._id}
        currentUserId={user?.id || ""}
        parentId={post.parentId}
        content={post.text}
        author={post.author}
        community={post.community}
        createdAt={post.createdAt}
        comments={post.children}
      />
    </section>
  );
}

export default Page