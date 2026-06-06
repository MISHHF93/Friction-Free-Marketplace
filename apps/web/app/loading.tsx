import { LoadingSpinner } from "@/components/marketplace-design-system";

export default function Loading() {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-7xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <LoadingSpinner label="Loading marketplace page" size="lg" />
    </div>
  );
}
