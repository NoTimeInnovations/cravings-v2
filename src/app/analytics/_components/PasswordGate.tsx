import { authenticateAnalytics } from "../actions";

export default function PasswordGate({ error }: { error?: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-neutral-200 p-6">
        <h1 className="text-lg font-semibold text-neutral-900">Analytics access</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Enter the password to view the dashboard.
        </p>
        <form action={authenticateAnalytics} className="mt-5 space-y-3">
          <input
            type="password"
            name="password"
            autoFocus
            required
            placeholder="Password"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
          {error && (
            <p className="text-sm text-red-600">Incorrect password.</p>
          )}
          <button
            type="submit"
            className="w-full rounded-lg bg-neutral-900 text-white py-2 text-sm font-medium hover:bg-neutral-800"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
