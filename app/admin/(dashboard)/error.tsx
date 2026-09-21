"use client";

// A24: the boundary used to replace every failure with one generic sentence,
// so operator-facing validation messages thrown by the server actions
// ("Event end must be after its start.", "Published content requires an
// approved image.") never reached the person who could act on them.
//
// Caveat worth knowing: Next.js redacts Server Action error messages in
// production builds and passes only a digest, so `error.message` is the real
// text in development and a generic string in production. Showing it is still
// strictly better than discarding it, and the digest is rendered too so a
// production report can be matched against the server log. Moving these
// validations to `useActionState` returns is the durable fix and is tracked
// separately (A23).
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const message = error.message?.trim();
  const isGeneric = !message || message.toLowerCase().startsWith("an error occurred in the server components render");

  return (
    <section className="border border-line bg-sand p-6 sm:p-8">
      <h1 className="font-serif text-3xl sm:text-4xl">CMS action failed.</h1>
      <p className="mt-3 text-ink">No changes were applied.</p>
      {isGeneric ? (
        <p className="mt-2 text-ink">Check the form and try again.</p>
      ) : (
        <p role="alert" className="mt-4 break-words border-l-4 border-terracotta bg-white px-4 py-3 text-sm text-rust">
          {message}
        </p>
      )}
      {error.digest ? <p className="mt-3 text-xs text-ink-muted">Reference: {error.digest}</p> : null}
      <button className="mt-6 bg-forest px-4 py-2 text-sm font-semibold text-white" onClick={() => reset()}>Try again</button>
    </section>
  );
}
