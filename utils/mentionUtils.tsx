import React from "react";
import { User } from "../types";

const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Parses a string for mentions and returns an array of user IDs.
 */
export const parseMentions = (text: string): string[] => {
  if (!text) return [];
  if (typeof text !== "string") return [];
  const matches = text.matchAll(MENTION_REGEX);
  const userIds = new Set<string>();
  for (const match of matches) {
    if (match[2]) {
      userIds.add(match[2]);
    }
  }
  return Array.from(userIds);
};

/**
 * Renders a string containing mentions as React-safe nodes.
 */
export const renderMentions = (
  text: string,
  allUsers: User[]
): React.ReactNode => {
  if (!text) return null;

  if (typeof text !== "string") {
    console.warn("renderMentions received non-string:", text);
    return (
      <span className="italic text-red-500">Invalid content provided</span>
    );
  }

  try {
    const parts = text.split(MENTION_REGEX);

    // If no matches, just return plain text
    if (parts.length === 1) {
      return <>{parts[0]}</>;
    }

    const result: React.ReactNode[] = [];
    let i = 0;

    while (i < parts.length) {
      // Regular text part
      if (parts[i]) {
        result.push(<span key={`text-${i}`}>{parts[i]}</span>);
      }
      i++;

      // Mention parts (displayName and userId)
      if (i < parts.length) {
        const displayName = parts[i];
        const userId = parts[i + 1];
        const user = allUsers.find((u) => u.id === userId);

        result.push(
          <span
            key={`mention-${userId}-${i}`}
            className="bg-primary-light text-primary font-semibold px-1.5 py-0.5 rounded-md mx-px"
          >
            @{user ? user.name : displayName}
          </span>
        );

        i += 2;
      }
    }

    return <span>{result}</span>;
  } catch (err) {
    console.error("renderMentions failed:", err, "for text:", text);
    return (
      <span className="italic text-red-500">Invalid mention content</span>
    );
  }
};
