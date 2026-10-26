import { loginAction } from "@/lib/actions";
import { Btn, Card, Input, Label } from "@/components/ui";
import { getBoothConfig } from "@/lib/booth-config";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const config = getBoothConfig();
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <Card className="relative w-full max-w-sm bg-white/95 shadow-xl">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-blue-700">
          {config.org.productName}
        </p>
        <h1 className="mb-4 text-2xl font-bold text-slate-900">Volunteer booth portal</h1>
        <form action={loginAction} className="space-y-4">
          <div>
            <Label>Portal password</Label>
            <Input
              name="password"
              type="text"
              autoComplete="off"
              spellCheck={false}
              required
              autoFocus
            />
          </div>
          <Btn type="submit" className="w-full">
            Sign in
          </Btn>
        </form>
        {params.error && (
          <p className="mt-3 text-sm text-red-600">Invalid password. Try again.</p>
        )}
      </Card>
    </main>
  );
}
