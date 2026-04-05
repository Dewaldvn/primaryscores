import { requireUser } from "@/lib/auth";

export default async function MySubmissionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return children;
}
