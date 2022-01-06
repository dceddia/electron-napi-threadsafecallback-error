use std::{
  sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
  },
  thread::{self, JoinHandle},
  time::Duration,
};

use napi::{
  bindgen_prelude::*,
  threadsafe_function::{ThreadSafeCallContext, ThreadsafeFunction},
  JsNumber,
};

#[macro_use]
extern crate napi_derive;

#[napi]
pub fn sum(a: i32, b: i32) -> i32 {
  a + b
}

#[napi]
pub struct JsRepeater {
  handle: Option<JoinHandle<Result<()>>>,
  quit: Arc<AtomicBool>,
}

#[napi]
impl JsRepeater {
  #[napi(constructor)]
  pub fn new(env: Env, callback: JsFunction) -> Result<Self> {
    // Create a threadsafe function around the given callback
    let mut ts_callback: ThreadsafeFunction<u32> =
      callback.create_threadsafe_function(0, send_update)?;
    ts_callback.refer(&env).expect("failed to ref the callback");

    let quit = Arc::new(AtomicBool::new(false));
    let should_quit = quit.clone();
    let handle = thread::spawn(move || {
      let mut i = 0;
      while !should_quit.load(Ordering::SeqCst) {
        thread::sleep(Duration::from_millis(500));
        let status = ts_callback.call(
          Ok(i),
          napi::threadsafe_function::ThreadsafeFunctionCallMode::NonBlocking,
        );
        println!("called function with {}, {}", i, status);
        i += 1;
      }
      println!(
        "done with loop, callback is aborted? {:?}",
        ts_callback.aborted()
      );
      // ts_callback.abort().expect("failed to abort");

      Ok(())
    });

    Ok(JsRepeater {
      handle: Some(handle),
      quit,
    })
  }
}

impl Drop for JsRepeater {
  fn drop(&mut self) {
    self.quit.store(true, Ordering::SeqCst);

    if let Some(thread) = self.handle.take() {
      println!("joining Repeater thread...");
      let _ = thread.join();
      println!("joined");
    }
  }
}

fn send_update(ctx: ThreadSafeCallContext<u32>) -> Result<Vec<JsNumber>> {
  ctx.env.create_uint32(ctx.value).map(|v| vec![v])
}
