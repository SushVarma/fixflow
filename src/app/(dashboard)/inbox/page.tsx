import { EmptyState } from "@/components/ui";

export default function InboxIndexPage() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <EmptyState
        icon="💬"
        title="Select a conversation"
        description="Choose a conversation from the list, or simulate a new customer message to see FixFlow turn it into a job."
      />
    </div>
  );
}
