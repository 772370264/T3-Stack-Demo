"use client";

import { useState, useEffect } from "react";
import { apiClient } from "~/lib/api-client";

interface Post {
  id: number;
  name: string;
  createdAt: string;
}

export function LatestPost() {
  const [latestPost, setLatestPost] = useState<Post | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestPost = async () => {
    try {
      const posts = await apiClient.get<Post[]>("/posts");
      if (posts && posts.length > 0) {
        setLatestPost(posts[0] || null);
      }
    } catch (err) {
      console.error("Failed to fetch latest post:", err);
    }
  };

  useEffect(() => {
    void fetchLatestPost();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);
    try {
      // 假设创建帖子的 URL 是 /posts
      // 注意：runtime-service 的帖子创建逻辑可能需要对应的 userId
      // 为了演示，这里假设后端处理了默认用户或者简单的创建
      await apiClient.post("/posts", { name });
      setName("");
      await fetchLatestPost();
    } catch (err) {
      setError("发布失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xs">
      {latestPost ? (
        <p className="truncate">Your most recent post: {latestPost.name}</p>
      ) : (
        <p>You have no posts yet.</p>
      )}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2"
      >
        <input
          type="text"
          placeholder="Title"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-full bg-white/10 px-4 py-2 text-white"
        />
        <button
          type="submit"
          className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
          disabled={loading}
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </form>
    </div>
  );
}
