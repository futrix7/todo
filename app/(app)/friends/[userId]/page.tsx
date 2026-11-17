import type { Metadata } from "next";

import FriendProfileClientPage from "./friend-profile-client-page";

export const instant = false;

export const metadata: Metadata = {
  title: "Friend profile",
  description: "View a friend's profile, streaks, and recent performance.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function FriendProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  return <FriendProfileClientPage userId={userId} />;
}
