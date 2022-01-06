# Crash on Reload with Napi + Electron + threadsafe functions

## The Problem

When Electron calls a napi-rs module that uses threadsafe functions,
reloading the page causes an error: either the page goes blank (because
the renderer process died) or Napi panics when it tries to release the
threadsafe function, or both.

The problem is more apparent when there are 2 threadsafe functions. With
just 1, it's more likely to see the Napi assert panic than the page
going blank.

## How to Reproduce It

To reproduce the problem:

- Clone this repo
- `npm install`
- `npm run start:debug`
- In the command line terminal, you'll see the threads counting up
- Refresh the Electron app (Cmd+R / F5)

And then:

- The window will probably go blank. If devtools is open, it'll say "DevTools was disconnnected".
- The terminal will probably contain a message like `thread '<unnamed>' panicked at 'Threadsafe Function release failed with status 1'`

## What's Happening?

My theory is that when Electron reloads the page, it cleans up
everything in the JS environment (including releasing the threadsafe functions)
and then when `drop` runs, it tries to release the functions too.

Because there are 2 threadsafe functions, the double-release happens
twice and can cause either/both of:

- Napi-rs is able to call `napi_release_threadsafe_function` but it
  returns `napi_invalid_arg` because it's already been cleaned up.
- Napi-rs tries to call `napi_release_threadsafe_function` but it panics
  when it tries to acquire a mutex lock, because the lock is already
  held, presumably by Electron while it's doing cleanup.

## More Debugging

Try attaching a debugger to the Electron Renderer process before
reloading the page to catch the panic.

On a Mac,

- Look up the process ID in Activity Monitor (search for Electron, look
  for the "Electron Helper (Renderer)" process.
- `rust-lldb -p <pid>`
- Once it attaches, type `continue`
- Reload the Electron app and the debugger should have stopped at the
  panic

## How to Fix It?

I see that Napi has a way to register cleanup hooks with
`add_cleanup_hook` and `add_async_cleanup_hook` on Env. Maybe my code
needs to do this? I'm not sure where that would go.

Maybe Napi needs to register for this cleanup at a "global" level for
the whole module?

Maybe this is an Electron bug?
