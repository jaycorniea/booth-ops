export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative left-1/2 w-[min(100rem,calc(100vw-1.5rem))] max-w-none -translate-x-1/2">
      {children}
    </div>
  );
}
